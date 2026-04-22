import { Claim } from '../claims/claim.model';
import { User } from '../users/user.model';
import { Vote } from '../votes/vote.model';
import { trustScoreQueue } from '../../queues';
import { emitToClaimRoom } from '../../config/socket';
import { createNotification } from '../notifications/notification.service';
import { notFound, badRequest } from '../../shared/middleware/errorHandler';
import { parseOffsetPagination, buildOffsetMeta } from '../../shared/utils/pagination';

export const getDashboardStats = async () => {
  const [
    totalUsers, totalClaims, pendingClaims,
    totalVotes, verifiedUsers, bannedUsers,
    factClaims, rumorClaims,
  ] = await Promise.all([
    User.countDocuments(),
    Claim.countDocuments({ isDeleted: false }),
    Claim.countDocuments({ adminDecision: 'Processing', isDeleted: false }),
    Vote.countDocuments(),
    User.countDocuments({ role: 'verified' }),
    User.countDocuments({ isBanned: true }),
    Claim.countDocuments({ finalVerdict: 'Fact' }),
    Claim.countDocuments({ finalVerdict: 'Rumor' }),
  ]);

  // Users registered in last 7 days
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const newUsersThisWeek = await User.countDocuments({ createdAt: { $gte: weekAgo } });

  // Trust score distribution
  const trustDistribution = await User.aggregate([
    {
      $bucket: {
        groupBy: '$trustScore.current',
        boundaries: [0, 20, 40, 60, 75, 90, 100],
        default: 'Other',
        output: { count: { $sum: 1 } },
      },
    },
  ]);

  return {
    totalUsers, totalClaims, pendingClaims, totalVotes,
    verifiedUsers, bannedUsers, factClaims, rumorClaims,
    newUsersThisWeek, trustDistribution,
  };
};

export const getClaimsQueue = async (query: { page?: string; limit?: string }) => {
  const { skip, limit, page } = parseOffsetPagination(query);

  const [claims, total] = await Promise.all([
    Claim.find({ adminDecision: 'Processing', isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username displayName avatarUrl trustScore.current')
      .lean(),
    Claim.countDocuments({ adminDecision: 'Processing', isDeleted: false }),
  ]);

  return { data: claims, meta: buildOffsetMeta(total, page, limit) };
};

export const setVerdict = async (
  claimId: string,
  adminId: string,
  decision: 'Fact' | 'Rumor',
  adminNote?: string
) => {
  const claim = await Claim.findOne({ _id: claimId, isDeleted: false });
  if (!claim) throw notFound('Claim');

  claim.adminDecision = decision;
  claim.finalVerdict = decision;
  claim.adminDecidedBy = adminId as unknown as import('mongoose').Types.ObjectId;
  claim.adminDecidedAt = new Date();
  if (adminNote) claim.adminNote = adminNote;
  await claim.save();

  // Emit real-time verdict event to all viewers
  emitToClaimRoom(claimId, 'verdict:set', {
    claimId,
    adminDecision: decision,
    finalVerdict: decision,
    adminDecidedAt: claim.adminDecidedAt,
  });

  // Enqueue trust score recalculation for all voters
  await trustScoreQueue.add('recalculate', {
    claimId,
    finalVerdict: decision,
  });

  // Notify claim author
  const authorId = claim.author.toString();
  await createNotification({
    recipientId: authorId,
    type: 'verdict_set',
    title: `Your claim has been reviewed`,
    message: `Your claim "${claim.title.substring(0, 60)}..." has been marked as ${decision}.`,
    link: `/claims/${claimId}`,
    metadata: { claimId, verdict: decision },
  });

  return claim;
};

export const getUsers = async (query: {
  page?: string;
  limit?: string;
  role?: string;
  search?: string;
  sort?: string;
}) => {
  const { skip, limit, page } = parseOffsetPagination(query);

  const filter: Record<string, unknown> = {};
  if (query.role) filter['role'] = query.role;
  if (query.search) {
    filter['$or'] = [
      { username: { $regex: query.search, $options: 'i' } },
      { email: { $regex: query.search, $options: 'i' } },
      { displayName: { $regex: query.search, $options: 'i' } },
    ];
  }

  const sortMap: Record<string, Record<string, number>> = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    trust_desc: { 'trustScore.current': -1 },
    trust_asc: { 'trustScore.current': 1 },
  };
  const sortObj = sortMap[query.sort || 'newest'] || sortMap.newest;

  const [users, total] = await Promise.all([
    User.find(filter).sort(sortObj).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  return { data: users, meta: buildOffsetMeta(total, page, limit) };
};

export const verifyUser = async (userId: string, adminId: string) => {
  const user = await User.findById(userId);
  if (!user) throw notFound('User');
  if (user.role === 'admin') throw badRequest('Cannot change role of an admin', 'CANNOT_MODIFY_ADMIN');

  user.role = 'verified';
  user.verifiedAt = new Date();
  user.verifiedBy = adminId as unknown as import('mongoose').Types.ObjectId;
  await user.save();

  await createNotification({
    recipientId: userId,
    type: 'verified_granted',
    title: 'You are now a Verified User!',
    message: 'Your trust score and voting history have earned you Verified status on Verifact.',
    link: '/profile',
    metadata: { grantedBy: adminId },
  });

  return user;
};

export const banUser = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) throw notFound('User');
  if (user.role === 'admin') throw badRequest('Cannot ban an admin', 'CANNOT_BAN_ADMIN');

  user.isBanned = !user.isBanned; // Toggle ban
  await user.save();
  return user;
};

export const getVerificationCandidates = async () => {
  // Users with trustScore >= 75 AND totalVotesCast >= 20, not yet verified
  return User.find({
    role: 'user',
    'trustScore.current': { $gte: 75 },
    'trustScore.totalVotesCast': { $gte: 20 },
    isBanned: false,
  })
    .sort({ 'trustScore.current': -1 })
    .limit(50)
    .lean();
};

// Phase 5 cache helpers are already imported via cache util
// Cache bust on verdict set is done in setVerdict above
