import Redis from 'ioredis';
import { config } from './env';
import { logger } from '../shared/utils/logger';

type RedisLike = {
  connect(): Promise<void>;
  quit(): Promise<void>;
  ping(): Promise<string>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, ttlSeconds?: number): Promise<string>;
  del(...keys: string[]): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  on(event: string, handler: (...args: unknown[]) => void): unknown;
};

class MemoryRedisClient implements RedisLike {
  private store = new Map<string, { value: string; expiresAt?: number }>();

  private cleanupExpired(key: string): void {
    const entry = this.store.get(key);
    if (entry?.expiresAt && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
    }
  }

  async connect(): Promise<void> {}

  async quit(): Promise<void> {}

  async ping(): Promise<string> {
    return 'PONG';
  }

  async get(key: string): Promise<string | null> {
    this.cleanupExpired(key);
    return this.store.get(key)?.value ?? null;
  }

  async set(key: string, value: string, mode?: string, ttlSeconds?: number): Promise<string> {
    const expiresAt = mode === 'EX' && typeof ttlSeconds === 'number'
      ? Date.now() + ttlSeconds * 1000
      : undefined;
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let deleted = 0;
    keys.forEach((key) => {
      if (this.store.delete(key)) deleted += 1;
    });
    return deleted;
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
    return Array.from(this.store.keys()).filter((key) => {
      this.cleanupExpired(key);
      return this.store.has(key) && regex.test(key);
    });
  }

  on(_event: string, _handler: (...args: unknown[]) => void): undefined {
    return undefined;
  }
}

let redisClient: RedisLike | null = null;

export const getRedisClient = (): RedisLike => {
  if (!redisClient) {
    if (config.useInMemoryRedis) {
      redisClient = new MemoryRedisClient();
      logger.warn('Using in-memory Redis substitute');
      return redisClient;
    }

    const client = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      retryStrategy: (times) => {
        if (times > 3) {
          logger.error('Redis: max retries reached');
          return null;
        }
        return Math.min(times * 200, 1000);
      },
    });

    client.on('connect', () => logger.info('Redis connected'));
    client.on('error', (err) => logger.error('Redis error:', err));
    client.on('reconnecting', () => logger.warn('Redis reconnecting...'));
    redisClient = client;
  }

  return redisClient;
};

export const connectRedis = async (): Promise<void> => {
  const client = getRedisClient();
  await client.connect();
};
