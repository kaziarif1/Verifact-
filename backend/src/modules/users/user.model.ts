import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IUserDocument extends Document {
  email: string;
  username: string;
  passwordHash: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  followers: mongoose.Types.ObjectId[];
  following: mongoose.Types.ObjectId[];
  role: 'user' | 'verified' | 'admin';
  isEmailVerified: boolean;
  isBanned: boolean;
  trustScore: {
    current: number;
    history: Array<{ date: Date; value: number; reason: string }>;
    totalVotesCast: number;
    correctVotes: number;
    incorrectVotes: number;
    pendingVotes: number;
    lastCalculatedAt: Date;
  };
  stats: {
    totalClaims: number;
    factsPosted: number;
    rumorsPosted: number;
  };
  verifiedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId;
  emailVerifyToken?: string;
  passwordResetToken?: string;
  passwordResetExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const trustScoreHistorySchema = new Schema(
  { date: { type: Date, default: Date.now }, value: Number, reason: String },
  { _id: false }
);

const userSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String, required: true, unique: true,
      lowercase: true, trim: true, index: true,
    },
    username: {
      type: String, required: true, unique: true,
      lowercase: true, trim: true,
      minlength: 3, maxlength: 30,
      match: /^[a-z0-9_]+$/,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    displayName: { type: String, required: true, trim: true, maxlength: 50 },
    bio: { type: String, trim: true, maxlength: 200 },
    avatarUrl: { type: String },
    followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    role: {
      type: String,
      enum: ['user', 'verified', 'admin'],
      default: 'user',
      index: true,
    },
    isEmailVerified: { type: Boolean, default: false },
    isBanned: { type: Boolean, default: false },

    trustScore: {
      current: { type: Number, default: 50, min: 0, max: 100, index: true },
      history: { type: [trustScoreHistorySchema], default: [] },
      totalVotesCast: { type: Number, default: 0 },
      correctVotes: { type: Number, default: 0 },
      incorrectVotes: { type: Number, default: 0 },
      pendingVotes: { type: Number, default: 0 },
      lastCalculatedAt: { type: Date, default: Date.now },
    },

    stats: {
      totalClaims: { type: Number, default: 0 },
      factsPosted: { type: Number, default: 0 },
      rumorsPosted: { type: Number, default: 0 },
    },

    verifiedAt: { type: Date },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    emailVerifyToken: { type: String, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpiry: { type: Date, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.passwordHash;
        delete ret.emailVerifyToken;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpiry;
        return ret;
      },
    },
  }
);

// Indexes
userSchema.index({ 'trustScore.current': -1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ role: 1, 'trustScore.current': -1 });

// Instance method
userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash);
};

export const User: Model<IUserDocument> = mongoose.models.User || mongoose.model<IUserDocument>('User', userSchema);
