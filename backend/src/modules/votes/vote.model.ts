import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVoteDocument extends Document {
  user: mongoose.Types.ObjectId;
  claim: mongoose.Types.ObjectId;
  direction: 'up' | 'down';
  userRole: 'user' | 'verified';
  userTrustScore: number;
  outcome: 'pending' | 'correct' | 'incorrect' | 'inconclusive';
  createdAt: Date;
  updatedAt: Date;
}

const voteSchema = new Schema<IVoteDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    claim: { type: Schema.Types.ObjectId, ref: 'Claim', required: true },
    direction: { type: String, enum: ['up', 'down'], required: true },
    userRole: { type: String, enum: ['user', 'verified'], required: true },
    userTrustScore: { type: Number, required: true, min: 0, max: 100 },
    outcome: {
      type: String,
      enum: ['pending', 'correct', 'incorrect', 'inconclusive'],
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true }
);

// Enforce one vote per user per claim at DB level
voteSchema.index({ user: 1, claim: 1 }, { unique: true });
voteSchema.index({ claim: 1 });
voteSchema.index({ user: 1, outcome: 1 });

export const Vote: Model<IVoteDocument> = mongoose.models.Vote || mongoose.model<IVoteDocument>('Vote', voteSchema);
