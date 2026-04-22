/**
 * Phase 5 — claim.service.ts with Redis caching (Step 5.3)
 */
import { Types } from 'mongoose';
import { Claim } from './claim.model';
import { Vote } from '../votes/vote.model';
import { User } from '../users/user.model';
import { mlQueue } from '../../queues';
import { uploadToCloudinary } from '../../config/cloudinary';
import { notFound, forbidden, badRequest } from '../../shared/middleware/errorHandler';
import { parseCursorPagination, buildCursorMeta } from '../../shared/utils/pagination';
import { calculateTrendingScore } from '../../shared/utils/trendingScore';
import { cache, TTL } from '../../shared/utils/cache';
import { logger } from '../../shared/utils/logger';
import fs from 'fs';
import path from 'path';
import { config } from '../../config/env';

const AUTHOR_POPULATE = 'username displayName avatarUrl role trustScore.current';
const LOCAL_MEDIA_DIR = path.resolve(process.cwd(), '.tmp', 'local-media');

const saveMediaLocally = (file: Express.Multer.File, resourceType: 'image' | 'video') => {
  fs.mkdirSync(LOCAL_MEDIA_DIR, { recursive: true });
  const ext = path.extname(file.originalname) || (resourceType === 'video' ? '.mp4' : '.jpg');
  const filename = `${path.basename(file.filename, path.extname(file.filename))}${ext}`;
  const targetPath = path.join(LOCAL_MEDIA_DIR, filename);
  fs.copyFileSync(file.path, targetPath);
  const publicUrl = `http://localhost:${config.port}/local-media/${filename}`;

  return {
    type: resourceType,
    url: publicUrl,
    publicId: `local:${filename}`,
    thumbnailUrl: resourceType === 'image' ? publicUrl : undefined,
  };
};

export const createClaim = async (
  userId: string,
  userRole: string,
  data: { title: string; body?: string; category: string },
  file?: Express.Multer.File
) => {
  let mediaData: {
    type: 'none' | 'image' | 'video';
    url?: string;
    publicId?: string;
    thumbnailUrl?: string;
  } = { type: 'none' };

  if (file) {
    const resourceType = file.mimetype.startsWith('video/') ? 'video' : 'image';
    try {
      const uploaded = await uploadToCloudinary(file.path, 'claims', resourceType);
      mediaData = { type: resourceType, url: uploaded.url, publicId: uploaded.publicId, thumbnailUrl: uploaded.thumbnailUrl };
    } catch (error) {
      if (config.useInMemoryServices || process.env.NODE_ENV === 'development') {
        logger.warn('Media upload failed in development, continuing without media:', error);
        mediaData = saveMediaLocally(file, resourceType);
      } else {
        throw error;
      }
    } finally {
      // Clean up temp file regardless of upload outcome
      fs.unlink(file.path, () => {});
    }
  }

  const claim = await Claim.create({
    author: userId,
    title: data.title,
    body: data.body,
    category: data.category || 'other',
    media: mediaData,
  });

  // Update user claim count
  await User.findByIdAndUpdate(userId, { $inc: { 'stats.totalClaims': 1 } });

  // Enqueue ML prediction
  const mlText = [data.title, data.body].filter(Boolean).join(' ');
  await mlQueue.add('predict', { claimId: claim.id, text: mlText });

  // Invalidate feed caches
  await cache.delPattern('feed:*');

  return claim.populate('author', AUTHOR_POPULATE);
};

export const getFeed = async (query: Record<string, string>, userId?: string) => {
  const { limit, cursor } = parseCursorPagination(query);
  const { category, verdict, sort = 'newest', mediaType } = query;

  const cacheKey = `feed:${sort}:${category}:${verdict}:${mediaType}:${cursor}:${limit}`;
  const cached = await cache.get<{ data: unknown[]; meta: unknown }>(cacheKey);
  if (cached && !userId) return cached; // Don't cache personalised (myVote) responses

  const filter: Record<string, unknown> = { isDeleted: false };
  if (cursor) filter['_id'] = { $lt: new Types.ObjectId(cursor) };
  if (category) filter['category'] = category;
  if (verdict) filter['finalVerdict'] = verdict;
  if (mediaType && mediaType !== 'none') filter['media.type'] = mediaType;

  const sortMap: Record<string, Record<string, number>> = {
    newest:   { createdAt: -1 },
    trending: { trendingScore: -1 },
    mostVoted:{ 'voteStats.totalVotes': -1 },
  };

  const claims = await Claim.find(filter)
    .sort(sortMap[sort] || sortMap.newest)
    .limit(limit)
    .populate('author', AUTHOR_POPULATE)
    .lean();

  if (userId) {
    const claimIds = claims.map(c => c._id);
    const userVotes = await Vote.find({ user: userId, claim: { $in: claimIds } }).lean();
    const voteMap = new Map(userVotes.map(v => [v.claim.toString(), v.direction]));
    return {
      data: claims.map(c => ({ ...c, myVote: voteMap.get(c._id.toString()) || null })),
      meta: buildCursorMeta(claims, limit),
    };
  }

  const result = { data: claims, meta: buildCursorMeta(claims, limit) };
  await cache.set(cacheKey, result, TTL.FEED_PAGE);
  return result;
};

export const getClaimById = async (claimId: string, userId?: string) => {
  if (!userId) {
    const cacheKey = `claim:${claimId}`;
    const cached = await cache.get<unknown>(cacheKey);
    if (cached) {
      // Fire-and-forget view increment
      Claim.findByIdAndUpdate(claimId, { $inc: { viewCount: 1 } }).exec();
      return cached;
    }
  }

  const claim = await Claim.findOne({ _id: claimId, isDeleted: false })
    .populate('author', AUTHOR_POPULATE)
    .populate('adminDecidedBy', 'username displayName')
    .lean();

  if (!claim) throw notFound('Claim');

  Claim.findByIdAndUpdate(claimId, { $inc: { viewCount: 1 } }).exec();

  let myVote = null;
  if (userId) {
    const vote = await Vote.findOne({ user: userId, claim: claimId }).lean();
    myVote = vote?.direction || null;
  }

  const result = { ...claim, myVote };
  if (!userId) await cache.set(`claim:${claimId}`, result, TTL.CLAIM_DETAIL);
  return result;
};

export const deleteClaim = async (claimId: string, userId: string, userRole: string) => {
  const claim = await Claim.findOne({ _id: claimId, isDeleted: false });
  if (!claim) throw notFound('Claim');
  if (claim.author.toString() !== userId && userRole !== 'admin') throw forbidden('You can only delete your own claims');

  claim.isDeleted = true;
  await claim.save();
  await cache.del(`claim:${claimId}`);
  await cache.delPattern('feed:*');
};

export const searchClaims = async (q: string, query: Record<string, string>) => {
  if (!q || q.trim().length < 2) throw badRequest('Search query must be at least 2 characters', 'QUERY_TOO_SHORT');

  const cacheKey = `search:${q}:${query.verdict ?? ''}:${query.category ?? ''}`;
  const cached = await cache.get<unknown>(cacheKey);
  if (cached) return cached;

  const { limit, cursor } = parseCursorPagination(query);
  const filter: Record<string, unknown> = { $text: { $search: q }, isDeleted: false };
  if (cursor) filter['_id'] = { $lt: new Types.ObjectId(cursor) };
  if (query.verdict) filter['finalVerdict'] = query.verdict;
  if (query.category) filter['category'] = query.category;

  const claims = await Claim.find(filter, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
    .limit(limit)
    .populate('author', AUTHOR_POPULATE)
    .lean();

  const result = { data: claims, meta: buildCursorMeta(claims, limit) };
  await cache.set(cacheKey, result, TTL.SEARCH);
  return result;
};

export const getTrending = async (type: 'facts' | 'rumors', limit = 10) => {
  const cacheKey = `trending:${type}:${limit}`;
  const cached = await cache.get<unknown[]>(cacheKey);
  if (cached) return cached;

  const verdictFilter = type === 'facts' ? 'Fact' : 'Rumor';
  const claims = await Claim.find({
    isDeleted: false,
    $or: [{ finalVerdict: verdictFilter }, { adminDecision: verdictFilter }],
  })
    .sort({ trendingScore: -1 })
    .limit(limit)
    .populate('author', AUTHOR_POPULATE)
    .lean();

  await cache.set(cacheKey, claims, TTL.TRENDING);
  return claims;
};

export const recalculateTrendingScores = async (): Promise<void> => {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const recentClaims = await Claim.find({ isDeleted: false, createdAt: { $gte: cutoff } })
    .select('createdAt voteStats.totalVotes');

  const bulkOps = recentClaims.map(claim => ({
    updateOne: {
      filter: { _id: claim._id },
      update: { $set: { trendingScore: calculateTrendingScore(claim.voteStats.totalVotes, claim.createdAt) } },
    },
  }));

  if (bulkOps.length > 0) await Claim.bulkWrite(bulkOps);

  // Invalidate trending caches after recalculation
  await cache.delPattern('trending:*');
  logger.info(`Trending recalculated for ${bulkOps.length} claims`);
};
