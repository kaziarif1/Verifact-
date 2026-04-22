/**
 * Phase 5 — Redis Cache Helpers
 * Thin wrapper around ioredis for typed get/set/del with TTL.
 */
import { getRedisClient } from '../../config/redis';
import { logger } from './logger';

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await getRedisClient().get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (e) {
      logger.warn(`Cache GET error [${key}]:`, e);
      return null;
    }
  },

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await getRedisClient().set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (e) {
      logger.warn(`Cache SET error [${key}]:`, e);
    }
  },

  async del(...keys: string[]): Promise<void> {
    try {
      if (keys.length) await getRedisClient().del(...keys);
    } catch (e) {
      logger.warn('Cache DEL error:', e);
    }
  },

  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await getRedisClient().keys(pattern);
      if (keys.length) await getRedisClient().del(...keys);
    } catch (e) {
      logger.warn(`Cache DEL pattern error [${pattern}]:`, e);
    }
  },
};

// Cache TTLs (seconds)
export const TTL = {
  TRENDING:     5 * 60,   // 5 minutes
  CLAIM_DETAIL: 30,       // 30 seconds — invalidated on vote
  FEED_PAGE:    60,       // 1 minute
  DASHBOARD:    2 * 60,   // 2 minutes
  SEARCH:       60,
};
