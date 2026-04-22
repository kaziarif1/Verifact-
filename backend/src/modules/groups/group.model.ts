import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IGroupDocument extends Document {
  name: string;
  slug: string;
  description: string;
  avatarUrl?: string;
  bannerUrl?: string;
  category: 'politics' | 'health' | 'science' | 'technology' | 'entertainment' | 'sports' | 'finance' | 'other';
  rules: string[];
  createdBy: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  memberCount: number;
  claimCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const groupSchema = new Schema<IGroupDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80, unique: true },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    description: { type: String, required: true, trim: true, maxlength: 300 },
    avatarUrl: String,
    bannerUrl: String,
    category: {
      type: String,
      enum: ['politics', 'health', 'science', 'technology', 'entertainment', 'sports', 'finance', 'other'],
      default: 'other',
      index: true,
    },
    rules: { type: [String], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    memberCount: { type: Number, default: 1 },
    claimCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Group: Model<IGroupDocument> = mongoose.models.Group || mongoose.model<IGroupDocument>('Group', groupSchema);
