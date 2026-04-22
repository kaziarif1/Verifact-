import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import swaggerUi from 'swagger-ui-express';
import path from 'path';

import { config } from './config/env';
import { swaggerSpec } from './config/swagger';
import { generalLimiter } from './shared/middleware/rateLimiter';
import { errorHandler } from './shared/middleware/errorHandler';
import { logger } from './shared/utils/logger';

import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/user.routes';
import claimRoutes from './modules/claims/claim.routes';
import voteRoutes from './modules/votes/vote.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import adminRoutes from './modules/admin/admin.routes';
import groupRoutes from './modules/groups/group.routes';
import messageRoutes from './modules/messages/message.routes';

const app = express();

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: config.isProduction,
    crossOriginEmbedderPolicy: config.isProduction,
    crossOriginResourcePolicy: config.isProduction ? { policy: 'same-origin' } : { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(mongoSanitize());
app.use(hpp());

// ─── Request Parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use('/local-media', express.static(path.resolve(process.cwd(), '.tmp', 'local-media'), {
  setHeaders: (res) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  },
}));

// ─── Logging ─────────────────────────────────────────────────────────────────
if (!config.isTest) {
  app.use(
    morgan('combined', {
      stream: { write: (message) => logger.http(message.trim()) },
    })
  );
}

// ─── Rate Limiting ────────────────────────────────────────────────────────────
app.use('/api', generalLimiter);

// ─── API Docs ─────────────────────────────────────────────────────────────────
if (!config.isProduction) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Verifact API Docs',
    customCss: '.swagger-ui .topbar { background-color: #DC2626; }',
  }));
}

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    env: config.env,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
const API = '/api/v1';

app.use(`${API}/auth`, authRoutes);
app.use(`${API}/users`, userRoutes);
app.use(`${API}/claims`, claimRoutes);
app.use(`${API}/claims/:id/vote`, voteRoutes);
app.use(`${API}/notifications`, notificationRoutes);
app.use(`${API}/admin`, adminRoutes);
app.use(`${API}/groups`, groupRoutes);
app.use(`${API}/messages`, messageRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'The requested endpoint does not exist' },
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
