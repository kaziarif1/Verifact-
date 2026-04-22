import { User } from './user.model';
import { Claim } from '../claims/claim.model';
import { Vote } from '../votes/vote.model';
import { TrustScoreEvent } from './trustScoreEvent.model';
import { uploadToCloudinary, deleteFromCloudinary } from '../../config/cloudinary';
import { AppError, notFound } from '../../shared/middleware/errorHandler';
import {
  parseCursorPagination,
  buildCursorMeta,
} from '../../shared/utils/pagination';

export const getPublicProfile = async (username: string, viewerId?: string) => {
  const user = await User.findOne({ username, isBanned: false });
  if (!user) throw notFound('User');
  const profile = user.toJSON() as Record<string, unknown>;

  return {
    ...profile,
    followerCount: user.followers?.length ?? 0,
    followingCount: user.following?.length ?? 0,
    isFollowing: !!viewerId && (user.followers ?? []).some((id) => id.toString() === viewerId),
  };
};

export const updateProfile = async (
  userId: string,
  data: { displayName?: string; username?: string; bio?: string }
) => {
  if (data.username) {
    const existing = await User.findOne({
      username: data.username,
      _id: { $ne: userId },
    });
    if (existing) throw new AppError('Username already taken', 409, 'USERNAME_EXISTS');
  }

  const user = await User.findByIdAndUpdate(userId, { $set: data }, {
    new: true,
    runValidators: true,
  });
  if (!user) throw notFound('User');
  return user;
};

export const uploadAvatar = async (userId: string, filePath: string) => {
  const user = await User.findById(userId);
  if (!user) throw notFound('User');

  // BUG FIX: Extract publicId correctly from Cloudinary secure_url
  // URL format: https://res.cloudinary.com/<cloud>/image/upload/v<ver>/<folder>/<publicId>.<ext>
  if (user.avatarUrl && user.avatarUrl.includes('cloudinary')) {
    try {
      const url = new URL(user.avatarUrl);
      // pathname: /cloud/image/upload/v.../verifact/avatars/xxx.jpg
      // publicId is everything after /upload/ minus version segment if present, no extension
      const parts = url.pathname.split('/upload/');
      if (parts[1]) {
        // Remove leading version segment like "v1234567890/"
        const withoutVersion = parts[1].replace(/^v\d+\//, '');
        // Remove file extension
        const publicId = withoutVersion.replace(/\.[^/.]+$/, '');
        await deleteFromCloudinary(publicId, 'image');
      }
    } catch {
      // Ignore delete errors — old avatar cleanup is non-critical
    }
  }

  const { url } = await uploadToCloudinary(filePath, 'avatars', 'image');
  user.avatarUrl = url;
  await user.save();
  return user;
};

export const getMyStats = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) throw notFound('User');

  const scoreHistory = await TrustScoreEvent.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return {
    trustScore: user.trustScore,
    stats: user.stats,
    scoreHistory,
  };
};

export const getMyPosts = async (
  userId: string,
  query: { cursor?: string; limit?: string }
) => {
  const { limit, cursor } = parseCursorPagination(query);
  const filter: Record<string, unknown> = { author: userId, isDeleted: false };
  if (cursor) filter['_id'] = { $lt: cursor };

  const claims = await Claim.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('author', 'username displayName avatarUrl role trustScore.current')
    .lean();

  return { data: claims, meta: buildCursorMeta(claims, limit) };
};

export const getMyVotes = async (
  userId: string,
  query: { cursor?: string; limit?: string }
) => {
  const { limit, cursor } = parseCursorPagination(query);
  const filter: Record<string, unknown> = { user: userId };
  if (cursor) filter['_id'] = { $lt: cursor };

  const votes = await Vote.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate({
      path: 'claim',
      match: { isDeleted: false },
      select: 'title finalVerdict adminDecision category createdAt',
    })
    .lean();

  return { data: votes, meta: buildCursorMeta(votes, limit) };
};

export const followUser = async (viewerId: string, targetUserId: string) => {
  if (viewerId === targetUserId) throw new AppError('You cannot follow yourself', 400, 'SELF_FOLLOW_BLOCKED');

  const [viewer, target] = await Promise.all([
    User.findById(viewerId),
    User.findById(targetUserId),
  ]);

  if (!viewer || !target || target.isBanned) throw notFound('User');

  if (!viewer.following.some((id) => id.toString() === targetUserId)) {
    viewer.following.push(target._id as any);
  }
  if (!target.followers.some((id) => id.toString() === viewerId)) {
    target.followers.push(viewer._id as any);
  }

  await Promise.all([viewer.save(), target.save()]);
  return getPublicProfile(target.username, viewerId);
};

export const unfollowUser = async (viewerId: string, targetUserId: string) => {
  const [viewer, target] = await Promise.all([
    User.findById(viewerId),
    User.findById(targetUserId),
  ]);

  if (!viewer || !target) throw notFound('User');

  viewer.following = viewer.following.filter((id) => id.toString() !== targetUserId);
  target.followers = target.followers.filter((id) => id.toString() !== viewerId);

  await Promise.all([viewer.save(), target.save()]);
  return getPublicProfile(target.username, viewerId);
};
