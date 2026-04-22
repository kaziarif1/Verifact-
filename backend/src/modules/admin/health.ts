import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { getRedisClient } from '../../config/redis';
import { config } from '../../config/env';
import { asyncHandler } from '../../shared/middleware/errorHandler';

export const systemHealth = asyncHandler(async (_req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

  let redisState = 'disconnected';
  try {
    const pong = await getRedisClient().ping();
    redisState = pong === 'PONG' ? 'connected' : 'error';
  } catch { redisState = 'error'; }

  let mlState = 'unknown';
  try {
    const r = await fetch(`${config.ml.serviceUrl}/health`, { signal: AbortSignal.timeout(3000) });
    mlState = r.ok ? 'ok' : 'degraded';
  } catch { mlState = 'unreachable'; }

  const healthy = dbState === 'connected' && redisState === 'connected';
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    services: { database: dbState, redis: redisState, mlService: mlState },
  });
});
