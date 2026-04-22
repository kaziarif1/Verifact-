import { Queue } from 'bullmq';
import { config } from '../config/env';
import { getRedisClient } from '../config/redis';
import { logger } from '../shared/utils/logger';
import { processEmailJobData } from '../workers/email.worker';
import { processMlJobData } from '../workers/ml.worker';
import { processTrustScoreJobData } from '../workers/trust.worker';

const connection = { connection: getRedisClient() };

const runInBackground = (task: () => Promise<void>) => {
  return task().catch((error) => logger.error('In-memory background task failed:', error));
};

const createMemoryQueue = <T>(processor: (data: T) => Promise<void>) => ({
  async add(_name: string, data: T) {
    await runInBackground(() => processor(data));
    return { id: `memory-${Date.now()}` };
  },
});

export const mlQueue = config.useInMemoryRedis
  ? createMemoryQueue(processMlJobData)
  : new Queue('ml-prediction', {
      ...connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });

export const trustScoreQueue = config.useInMemoryRedis
  ? createMemoryQueue(processTrustScoreJobData)
  : new Queue('trust-score', {
      ...connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });

export const emailQueue = config.useInMemoryRedis
  ? createMemoryQueue(processEmailJobData)
  : new Queue('email', {
      ...connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: 50,
        removeOnFail: 100,
      },
    });

// Job type interfaces
export interface MLJobData {
  claimId: string;
  text: string;
}

export interface TrustScoreJobData {
  claimId: string;
  finalVerdict: 'Fact' | 'Rumor';
}

export interface EmailJobData {
  type: 'verify_email' | 'reset_password' | 'welcome';
  to: string;
  subject: string;
  html: string;
}
