import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IMessageDocument extends Document {
  from: mongoose.Types.ObjectId;
  to: mongoose.Types.ObjectId;
  content: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessageDocument>(
  {
    from: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    to: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content: { type: String, required: true, trim: true, maxlength: 1000 },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

messageSchema.index({ from: 1, to: 1, createdAt: -1 });
messageSchema.index({ to: 1, from: 1, isRead: 1 });

export const Message: Model<IMessageDocument> = mongoose.models.Message || mongoose.model<IMessageDocument>('Message', messageSchema);
