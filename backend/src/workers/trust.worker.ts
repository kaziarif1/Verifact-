import { Worker, Job } from 'bullmq';
import { getRedisClient } from '../config/redis';
import { Vote } from '../modules/votes/vote.model';
import { User } from '../modules/users/user.model';
import { TrustScoreEvent } from '../modules/users/trustScoreEvent.model';
import { calculateTrustScore } from '../shared/utils/trustScore';
import { logger } from '../shared/utils/logger';
import { TrustScoreJobData } from '../queues';

const processTrustScoreJob = async (job: Job<TrustScoreJobData>): Promise<void> => {
  const { claimId, finalVerdict } = job.data;
  logger.info(`[Trust Worker] Recalculating trust scores for claim ${claimId}, verdict: ${finalVerdict}`);

  // Get all PENDING votes for this claim
  const votes = await Vote.find({ claim: claimId, outcome: 'pending' });
  if (votes.length === 0) {
    logger.info(`[Trust Worker] No pending votes for claim ${claimId}`);
    return;
  }

  // Determine outcome for each vote and group by user
  const userResolvedDelta = new Map<string, { correct: number; incorrect: number }>();

  for (const vote of votes) {
    const isCorrect =
      (vote.direction === 'up' && finalVerdict === 'Fact') ||
      (vote.direction === 'down' && finalVerdict === 'Rumor');

    vote.outcome = isCorrect ? 'correct' : 'incorrect';
    await vote.save();

    const uid = vote.user.toString();
    const existing = userResolvedDelta.get(uid) || { correct: 0, incorrect: 0 };
    if (isCorrect) existing.correct++; else existing.incorrect++;
    userResolvedDelta.set(uid, existing);
  }

  // Recalculate trust score for each affected user
  const userUpdatePromises = Array.from(userResolvedDelta.entries()).map(
    async ([userId, delta]) => {
      const user = await User.findById(userId);
      if (!user) return;

      // Count ALL resolved votes for this user (from DB, not just this batch)
      const allResolved = await Vote.countDocuments({
        user: userId,
        outcome: { $in: ['correct', 'incorrect'] },
      });
      const correctTotal = await Vote.countDocuments({
        user: userId,
        outcome: 'correct',
      });
      const incorrectTotal = allResolved - correctTotal;

      const result = calculateTrustScore({
        correctVotes: correctTotal,
        incorrectVotes: incorrectTotal,
      });

      const scoreBefore = user.trustScore.current;
      const scoreAfter = result.score;
      const scoreDelta = Math.round((scoreAfter - scoreBefore) * 100) / 100;

      // BUG FIX: decrement pendingVotes by actual number of votes resolved for this user
      const resolvedCount = delta.correct + delta.incorrect;

      user.trustScore.current = scoreAfter;
      user.trustScore.correctVotes = correctTotal;
      user.trustScore.incorrectVotes = incorrectTotal;
      // Clamp pendingVotes to 0
      user.trustScore.pendingVotes = Math.max(0, user.trustScore.pendingVotes - resolvedCount);
      user.trustScore.lastCalculatedAt = new Date();
      user.trustScore.history.push({
        date: new Date(),
        value: scoreAfter,
        reason: `verdict_resolved_${finalVerdict.toLowerCase()}`,
      });

      // Keep history to last 100 entries
      if (user.trustScore.history.length > 100) {
        user.trustScore.history = user.trustScore.history.slice(-100);
      }

      await user.save();

      // Audit log (fire and forget)
      TrustScoreEvent.create({
        user: userId,
        claim: claimId,
        vote: votes.find((v) => v.user.toString() === userId)?._id,
        scoreBefore,
        scoreAfter,
        delta: scoreDelta,
        reason: `verdict_${finalVerdict.toLowerCase()}`,
      }).catch((err) => logger.error('TrustScoreEvent write failed:', err));

      logger.info(
        `[Trust Worker] User ${userId}: ${scoreBefore} → ${scoreAfter} (Δ${scoreDelta >= 0 ? '+' : ''}${scoreDelta})`
      );
    }
  );

  await Promise.all(userUpdatePromises);
  logger.info(`[Trust Worker] Updated ${userResolvedDelta.size} users for claim ${claimId}`);
};

export const processTrustScoreJobData = async (data: TrustScoreJobData): Promise<void> => {
  await processTrustScoreJob({
    data,
  } as Job<TrustScoreJobData>);
};

export const startTrustScoreWorker = (): Worker => {
  const worker = new Worker<TrustScoreJobData>('trust-score', processTrustScoreJob, {
    connection: getRedisClient(),
    concurrency: 3,
  });

  worker.on('completed', (job) =>
    logger.info(`[Trust Worker] Job ${job.id} completed`)
  );
  worker.on('failed', (job, err) =>
    logger.error(`[Trust Worker] Job ${job?.id} failed: ${err.message}`)
  );

  logger.info('✅ Trust Score Worker started');
  return worker;
};
