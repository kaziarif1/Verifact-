import { Worker, Job } from 'bullmq';
import { getRedisClient } from '../config/redis';
import { Claim } from '../modules/claims/claim.model';
import { emitToClaimRoom } from '../config/socket';
import { config } from '../config/env';
import { logger } from '../shared/utils/logger';
import { MLJobData } from '../queues';
import { classifyClaimLocally } from '../services/localMl';

const processMlJob = async (job: Job<MLJobData>): Promise<void> => {
  const { claimId, text } = job.data;
  logger.info(`[ML Worker] Processing claim ${claimId}`);

  try {
    let result: {
      label: 'FACT' | 'RUMOR' | 'UNCERTAIN';
      confidence: number;
      modelVersion: string;
    };

    const shouldUseLocalMl =
      config.ml.provider === 'local'
      || !config.ml.serviceUrl
      || config.useInMemoryRedis
      || config.isServerless;

    if (shouldUseLocalMl) {
      result = classifyClaimLocally(text);
    } else {
      const response = await fetch(`${config.ml.serviceUrl}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Key': config.ml.internalKey,
        },
        body: JSON.stringify({ claim_id: claimId, text }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`ML service responded with ${response.status}`);
      }

      const remoteResult = await response.json() as {
        label: 'FACT' | 'RUMOR' | 'UNCERTAIN';
        confidence: number;
        model_version: string;
      };

      result = {
        label: remoteResult.label,
        confidence: remoteResult.confidence,
        modelVersion: remoteResult.model_version,
      };
    }

    await Claim.findByIdAndUpdate(claimId, {
      $set: {
        'mlPrediction.label': result.label,
        'mlPrediction.confidence': result.confidence,
        'mlPrediction.modelVersion': result.modelVersion,
        'mlPrediction.processedAt': new Date(),
      },
    });

    // Emit real-time update to all viewers of this claim
    emitToClaimRoom(claimId, 'ml:result', {
      claimId,
      label: result.label,
      confidence: result.confidence,
      modelVersion: result.modelVersion,
    });

    logger.info(`[ML Worker] Claim ${claimId} classified as ${result.label} (confidence: ${result.confidence})`);

  } catch (error) {
    logger.error(`[ML Worker] Failed for claim ${claimId}:`, error);

    // On final failure, mark as UNCERTAIN so the UI doesn't hang
    if (job.attemptsMade >= (job.opts.attempts ?? 3) - 1) {
      await Claim.findByIdAndUpdate(claimId, {
        $set: {
          'mlPrediction.label': 'UNCERTAIN',
          'mlPrediction.confidence': 0,
          'mlPrediction.modelVersion': 'fallback',
          'mlPrediction.processedAt': new Date(),
        },
      });
      logger.warn(`[ML Worker] Claim ${claimId} marked UNCERTAIN after all retries exhausted`);
    }

    throw error; // Re-throw to trigger BullMQ retry
  }
};

export const processMlJobData = async (data: MLJobData): Promise<void> => {
  await processMlJob({
    data,
    attemptsMade: 0,
    opts: { attempts: 1 },
  } as Job<MLJobData>);
};

export const startMlWorker = (): Worker => {
  const worker = new Worker<MLJobData>('ml-prediction', processMlJob, {
    connection: getRedisClient(),
    concurrency: 5,
  });

  worker.on('completed', (job) => {
    logger.info(`[ML Worker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`[ML Worker] Job ${job?.id} failed: ${err.message}`);
  });

  logger.info('✅ ML Worker started');
  return worker;
};
