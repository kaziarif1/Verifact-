import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITrustScoreEventDocument extends Document {
  user: mongoose.Types.ObjectId;
  claim: mongoose.Types.ObjectId;
  vote: mongoose.Types.ObjectId;
  scoreBefore: number;
  scoreAfter: number;
  delta: number;
  reason: string;
  createdAt: Date;
}

const trustScoreEventSchema = new Schema<ITrustScoreEventDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    claim: { type: Schema.Types.ObjectId, ref: 'Claim', required: true },
    vote: { type: Schema.Types.ObjectId, ref: 'Vote', required: true },
    scoreBefore: { type: Number, required: true },
    scoreAfter: { type: Number, required: true },
    delta: { type: Number, required: true },
    reason: { type: String, required: true },
  },
  { timestamps: true }
);

trustScoreEventSchema.index({ user: 1, createdAt: -1 });
// TTL: auto-delete audit events after 1 year
trustScoreEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });

export const TrustScoreEvent: Model<ITrustScoreEventDocument> =
  mongoose.models.TrustScoreEvent || mongoose.model<ITrustScoreEventDocument>('TrustScoreEvent', trustScoreEventSchema);
