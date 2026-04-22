import http from 'http';
import app from './app';
import { config } from './config/env';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { initSocket } from './config/socket';
import { startMlWorker } from './workers/ml.worker';
import { startTrustScoreWorker } from './workers/trust.worker';
import { startEmailWorker } from './workers/email.worker';
import { recalculateTrendingScores } from './modules/claims/claim.service';
import { logger } from './shared/utils/logger';

const httpServer = http.createServer(app);

// ─── Startup ─────────────────────────────────────────────────────────────────
const start = async (): Promise<void> => {
  try {
    // Connect data stores
    await connectDatabase();
    await connectRedis();

    // Initialize Socket.io (must be after HTTP server creation)
    initSocket(httpServer);

    // Start BullMQ workers only when external Redis is enabled
    if (!config.useInMemoryServices) {
      startMlWorker();
      startTrustScoreWorker();
      startEmailWorker();
    }

    // Trending score cron: recalculate every 10 minutes
    const TRENDING_INTERVAL = 10 * 60 * 1000;
    setInterval(async () => {
      try {
        await recalculateTrendingScores();
        logger.info('Trending scores recalculated');
      } catch (err) {
        logger.error('Trending score cron failed:', err);
      }
    }, TRENDING_INTERVAL);

    // Run once on startup
    recalculateTrendingScores().catch((err) =>
      logger.error('Initial trending score run failed:', err)
    );

    // Listen
    httpServer.listen(config.port, () => {
      logger.info(`🚀 Verifact API running on port ${config.port} [${config.env}]`);
      if (!config.isProduction) {
        logger.info(`📖 API Docs: http://localhost:${config.port}/api-docs`);
      }
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const shutdown = (signal: string) => {
  logger.info(`Received ${signal}. Gracefully shutting down...`);
  httpServer.close(async () => {
    const { disconnectDatabase } = await import('./config/database');
    const { getRedisClient } = await import('./config/redis');
    await disconnectDatabase();
    await getRedisClient().quit();
    logger.info('Server shut down cleanly');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time. Forcing exit.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

start();
