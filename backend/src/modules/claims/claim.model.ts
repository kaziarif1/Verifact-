import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IClaimDocument extends Document {
  author: mongoose.Types.ObjectId;
  group?: mongoose.Types.ObjectId;
  title: string;
  body?: string;
  category: 'politics' | 'health' | 'science' | 'technology' | 'entertainment' | 'sports' | 'finance' | 'other';
  media: {
    type: 'none' | 'image' | 'video';
    url?: string;
    publicId?: string;
    thumbnailUrl?: string;
  };
  voteStats: {
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
  };
  mlPrediction: {
    label: 'FACT' | 'RUMOR' | 'UNCERTAIN' | 'PENDING';
    confidence: number;
    modelVersion: string;
    processedAt?: Date;
  };
  adminDecision: 'Processing' | 'Fact' | 'Rumor';
  adminNote?: string;
  adminDecidedBy?: mongoose.Types.ObjectId;
  adminDecidedAt?: Date;
  finalVerdict: 'Pending' | 'Fact' | 'Rumor';
  trendingScore: number;
  viewCount: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const claimSchema = new Schema<IClaimDocument>(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    group: { type: Schema.Types.ObjectId, ref: 'Group', index: true },
    title: { type: String, required: true, trim: true, minlength: 10, maxlength: 200 },
    body: { type: String, trim: true, maxlength: 2000 },
    category: {
      type: String,
      enum: ['politics', 'health', 'science', 'technology', 'entertainment', 'sports', 'finance', 'other'],
      default: 'other',
      index: true,
    },

    media: {
      type: { type: String, enum: ['none', 'image', 'video'], default: 'none' },
      url: String,
      publicId: String,
      thumbnailUrl: String,
    },

    voteStats: {
      totalUpvotes: { type: Number, default: 0 },
      totalDownvotes: { type: Number, default: 0 },
      totalVotes: { type: Number, default: 0 },
      upvotePct: { type: Number, default: 0 },
      downvotePct: { type: Number, default: 0 },
      trustedUpvotes: { type: Number, default: 0 },
      trustedDownvotes: { type: Number, default: 0 },
      trustedTotalVotes: { type: Number, default: 0 },
      trustedUpvotePct: { type: Number, default: 0 },
      weightedScore: { type: Number, default: 50 },
    },

    mlPrediction: {
      label: { type: String, enum: ['FACT', 'RUMOR', 'UNCERTAIN', 'PENDING'], default: 'PENDING' },
      confidence: { type: Number, default: 0 },
      modelVersion: { type: String, default: 'none' },
      processedAt: Date,
    },

    adminDecision: {
      type: String,
      enum: ['Processing', 'Fact', 'Rumor'],
      default: 'Processing',
      index: true,
    },
    adminNote: { type: String, trim: true, maxlength: 500 },
    adminDecidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    adminDecidedAt: Date,

    finalVerdict: {
      type: String,
      enum: ['Pending', 'Fact', 'Rumor'],
      default: 'Pending',
      index: true,
    },

    trendingScore: { type: Number, default: 0, index: true },
    viewCount: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound indexes
claimSchema.index({ author: 1, createdAt: -1 });
claimSchema.index({ createdAt: -1 });
claimSchema.index({ trendingScore: -1 });
claimSchema.index({ finalVerdict: 1, createdAt: -1 });
claimSchema.index({ category: 1, createdAt: -1 });
claimSchema.index({ isDeleted: 1, createdAt: -1 });

// Full-text search index
claimSchema.index({ title: 'text', body: 'text' });

export const Claim: Model<IClaimDocument> = mongoose.models.Claim || mongoose.model<IClaimDocument>('Claim', claimSchema);
