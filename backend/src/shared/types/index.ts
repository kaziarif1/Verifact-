import { Request } from 'express';
import { Types } from 'mongoose';

// ─── User Types ───────────────────────────────────────────────────────────────

export type UserRole = 'user' | 'verified' | 'admin';

export interface TrustScoreHistory {
  date: Date;
  value: number;
  reason: string;
}

export interface TrustScore {
  current: number;
  history: TrustScoreHistory[];
  totalVotesCast: number;
  correctVotes: number;
  incorrectVotes: number;
  pendingVotes: number;
  lastCalculatedAt: Date;
}

export interface UserStats {
  totalClaims: number;
  factsPosted: number;
  rumorsPosted: number;
}

export interface IUser {
  _id: Types.ObjectId;
  email: string;
  username: string;
  passwordHash: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  role: UserRole;
  isEmailVerified: boolean;
  isBanned: boolean;
  trustScore: TrustScore;
  stats: UserStats;
  verifiedAt?: Date;
  verifiedBy?: Types.ObjectId;
  emailVerifyToken?: string;
  passwordResetToken?: string;
  passwordResetExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type PublicUser = Omit<IUser, 'passwordHash' | 'emailVerifyToken' | 'passwordResetToken' | 'passwordResetExpiry'>;

// ─── Claim Types ──────────────────────────────────────────────────────────────

export type ClaimCategory = 'politics' | 'health' | 'science' | 'technology' | 'entertainment' | 'sports' | 'finance' | 'other';
export type MediaType = 'none' | 'image' | 'video';
export type MLLabel = 'FACT' | 'RUMOR' | 'UNCERTAIN' | 'PENDING';
export type AdminDecision = 'Processing' | 'Fact' | 'Rumor';
export type FinalVerdict = 'Pending' | 'Fact' | 'Rumor';

export interface ClaimMedia {
  type: MediaType;
  url?: string;
  publicId?: string;
  thumbnailUrl?: string;
}

export interface VoteStats {
  totalUpvotes: number;
  totalDownvotes: number;
  totalVotes: number;
  upvotePct: number;
  downvotePct: number;
  trustedUpvotes: number;
  trustedDownvotes: number;
  trustedTotalVotes: number;
  trustedUpvotePct: number;
  weightedScore: number;
}

export interface MLPrediction {
  label: MLLabel;
  confidence: number;
  modelVersion: string;
  processedAt?: Date;
}

export interface IClaim {
  _id: Types.ObjectId;
  author: Types.ObjectId | IUser;
  title: string;
  body?: string;
  category: ClaimCategory;
  media: ClaimMedia;
  voteStats: VoteStats;
  mlPrediction: MLPrediction;
  adminDecision: AdminDecision;
  adminNote?: string;
  adminDecidedBy?: Types.ObjectId;
  adminDecidedAt?: Date;
  finalVerdict: FinalVerdict;
  trendingScore: number;
  viewCount: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Vote Types ───────────────────────────────────────────────────────────────

export type VoteDirection = 'up' | 'down';
export type VoteOutcome = 'pending' | 'correct' | 'incorrect' | 'inconclusive';

export interface IVote {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  claim: Types.ObjectId;
  direction: VoteDirection;
  userRole: 'user' | 'verified';
  userTrustScore: number;
  outcome: VoteOutcome;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Notification Types ───────────────────────────────────────────────────────

export type NotificationType = 'verdict_set' | 'verified_granted' | 'vote_milestone' | 'admin_message';

export interface INotification {
  _id: Types.ObjectId;
  recipient: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

// ─── Request Extensions ───────────────────────────────────────────────────────

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: UserRole;
    email: string;
  };
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationMeta {
  total?: number;
  cursor?: string;
  hasMore: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data?: T;
  meta?: PaginationMeta;
  message?: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
