import { Vote } from './vote.model';
import { Claim } from '../claims/claim.model';
import { User } from '../users/user.model';
import { emitToClaimRoom } from '../../config/socket';
import { notFound, forbidden } from '../../shared/middleware/errorHandler';
import { calculateWeightedVotes } from '../../shared/utils/trustScore';
import { calculateTrendingScore } from '../../shared/utils/trendingScore';
import { cache, TTL } from '../../shared/utils/cache';

const recalculateVoteStats = async (claimId: string): Promise<void> => {
  const votes = await Vote.find({ claim: claimId })
    .populate<{ user: { trustScore: { current: number }; role: string } }>('user', 'trustScore.current role')
    .lean();

  let totalUpvotes = 0, totalDownvotes = 0, trustedUpvotes = 0, trustedDownvotes = 0;
  const weightedInputs: { direction: 'up' | 'down'; trustScore: number }[] = [];

  for (const vote of votes) {
    const isUp = vote.direction === 'up';
    if (isUp) totalUpvotes++; else totalDownvotes++;
    if (vote.userRole === 'verified') { if (isUp) trustedUpvotes++; else trustedDownvotes++; }
    const score = (vote.user as any)?.trustScore?.current ?? vote.userTrustScore;
    weightedInputs.push({ direction: vote.direction, trustScore: score });
  }

  const totalVotes = totalUpvotes + totalDownvotes;
  const upvotePct = totalVotes > 0 ? Math.round((totalUpvotes / totalVotes) * 1000) / 10 : 0;
  const downvotePct = totalVotes > 0 ? Math.round((100 - upvotePct) * 10) / 10 : 0;
  const trustedTotal = trustedUpvotes + trustedDownvotes;
  const trustedUpvotePct = trustedTotal > 0 ? Math.round((trustedUpvotes / trustedTotal) * 1000) / 10 : 0;
  const { weightedUpPct } = calculateWeightedVotes(weightedInputs);

  const claim = await Claim.findByIdAndUpdate(claimId, {
    $set: {
      'voteStats.totalUpvotes': totalUpvotes,
      'voteStats.totalDownvotes': totalDownvotes,
      'voteStats.totalVotes': totalVotes,
      'voteStats.upvotePct': upvotePct,
      'voteStats.downvotePct': downvotePct,
      'voteStats.trustedUpvotes': trustedUpvotes,
      'voteStats.trustedDownvotes': trustedDownvotes,
      'voteStats.trustedTotalVotes': trustedTotal,
      'voteStats.trustedUpvotePct': trustedUpvotePct,
      'voteStats.weightedScore': Math.round(weightedUpPct * 10) / 10,
      trendingScore: calculateTrendingScore(totalVotes, new Date()),
    },
  }, { new: true });

  // Phase 5.3: Invalidate claim detail cache on every vote
  await cache.del(`claim:${claimId}`);
  await cache.delPattern('feed:*');

  if (claim) {
    emitToClaimRoom(claimId, 'vote:updated', {
      claimId,
      upvotePct: claim.voteStats.upvotePct,
      downvotePct: claim.voteStats.downvotePct,
      totalVotes: claim.voteStats.totalVotes,
      trustedUpvotePct: claim.voteStats.trustedUpvotePct,
      weightedScore: claim.voteStats.weightedScore,
    });
  }
};

export const castVote = async (claimId: string, userId: string, userRole: string, direction: 'up' | 'down') => {
  const claim = await Claim.findOne({ _id: claimId, isDeleted: false });
  if (!claim) throw notFound('Claim');
  if (claim.author.toString() === userId) throw forbidden('You cannot vote on your own claim');

  const user = await User.findById(userId).select('trustScore.current role');
  if (!user) throw notFound('User');

  const existingVote = await Vote.findOne({ user: userId, claim: claimId });

  if (existingVote) {
    if (existingVote.direction === direction) {
      await Vote.deleteOne({ _id: existingVote._id });
      await User.findByIdAndUpdate(userId, { $inc: { 'trustScore.totalVotesCast': -1 }, $max: { 'trustScore.pendingVotes': 0 } });
      await recalculateVoteStats(claimId);
      return { action: 'removed', direction: null };
    } else {
      existingVote.direction = direction;
      existingVote.userTrustScore = user.trustScore.current;
      existingVote.userRole = userRole === 'verified' ? 'verified' : 'user';
      await existingVote.save();
      await recalculateVoteStats(claimId);
      return { action: 'updated', direction };
    }
  }

  await Vote.create({ user: userId, claim: claimId, direction, userRole: userRole === 'verified' ? 'verified' : 'user', userTrustScore: user.trustScore.current });
  await User.findByIdAndUpdate(userId, { $inc: { 'trustScore.totalVotesCast': 1, 'trustScore.pendingVotes': 1 } });
  await recalculateVoteStats(claimId);
  return { action: 'cast', direction };
};

export const removeVote = async (claimId: string, userId: string) => {
  const claim = await Claim.findOne({ _id: claimId, isDeleted: false });
  if (!claim) throw notFound('Claim');
  const vote = await Vote.findOneAndDelete({ user: userId, claim: claimId });
  if (!vote) throw notFound('Vote');
  await User.findByIdAndUpdate(userId, [{ $set: {
    'trustScore.totalVotesCast': { $max: [{ $subtract: ['$trustScore.totalVotesCast', 1] }, 0] },
    'trustScore.pendingVotes':   { $max: [{ $subtract: ['$trustScore.pendingVotes', 1] }, 0] },
  }}]);
  await recalculateVoteStats(claimId);
  return { action: 'removed' };
};

export const getVoteSummary = async (claimId: string) => {
  const claim = await Claim.findOne({ _id: claimId, isDeleted: false }).select('voteStats');
  if (!claim) throw notFound('Claim');
  return claim.voteStats;
};
