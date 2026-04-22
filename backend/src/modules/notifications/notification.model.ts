import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INotificationDocument extends Document {
  recipient: mongoose.Types.ObjectId;
  type: 'verdict_set' | 'verified_granted' | 'vote_milestone' | 'admin_message';
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

const notificationSchema = new Schema<INotificationDocument>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['verdict_set', 'verified_granted', 'vote_milestone', 'admin_message'],
      required: true,
    },
    title: { type: String, required: true, maxlength: 100 },
    message: { type: String, required: true, maxlength: 300 },
    link: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
// TTL: auto-delete notifications after 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

export const Notification: Model<INotificationDocument> =
  mongoose.models.Notification || mongoose.model<INotificationDocument>('Notification', notificationSchema);
