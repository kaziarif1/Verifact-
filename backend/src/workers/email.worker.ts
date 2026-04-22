import { Worker, Job } from 'bullmq';
import { getRedisClient } from '../config/redis';
import { sendEmail } from '../shared/utils/email';
import { logger } from '../shared/utils/logger';
import { EmailJobData } from '../queues';

const processEmailJob = async (job: Job<EmailJobData>): Promise<void> => {
  const { to, subject, html } = job.data;
  await sendEmail(to, subject, html);
};

export const processEmailJobData = async (data: EmailJobData): Promise<void> => {
  await sendEmail(data.to, data.subject, data.html);
};

export const startEmailWorker = (): Worker => {
  const worker = new Worker<EmailJobData>('email', processEmailJob, {
    connection: getRedisClient(),
    concurrency: 10,
  });

  worker.on('completed', (job) => logger.info(`[Email Worker] Sent to ${job.data.to}`));
  worker.on('failed', (job, err) => logger.error(`[Email Worker] Failed for ${job?.data?.to}: ${err.message}`));

  logger.info('✅ Email Worker started');
  return worker;
};
