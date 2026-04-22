import { Types } from 'mongoose';
import { Notification } from './notification.model';
import { emitToUser } from '../../config/socket';
import { parseCursorPagination, buildCursorMeta } from '../../shared/utils/pagination';
import { notFound } from '../../shared/middleware/errorHandler';

export const createNotification = async (data: {
  recipientId: string;
  type: 'verdict_set' | 'verified_granted' | 'vote_milestone' | 'admin_message';
  title: string;
  message: string;
  link: string;
  metadata?: Record<string, unknown>;
}) => {
  const notification = await Notification.create({
    recipient: data.recipientId,
    type: data.type,
    title: data.title,
    message: data.message,
    link: data.link,
    metadata: data.metadata || {},
  });

  emitToUser(data.recipientId, 'notification', {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    link: notification.link,
    createdAt: notification.createdAt,
  });

  return notification;
};

export const getNotifications = async (
  userId: string,
  query: { cursor?: string; limit?: string }
) => {
  const { limit, cursor } = parseCursorPagination(query);

  // BUG FIX: cursor must be cast to ObjectId for correct comparison
  const filter: Record<string, unknown> = { recipient: userId };
  if (cursor) {
    try {
      filter['_id'] = { $lt: new Types.ObjectId(cursor) };
    } catch {
      // Invalid ObjectId — ignore cursor
    }
  }

  const notifications = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const unreadCount = await Notification.countDocuments({
    recipient: userId,
    isRead: false,
  });

  return {
    data: notifications,
    meta: { ...buildCursorMeta(notifications, limit), unreadCount },
  };
};

export const markAllRead = async (userId: string): Promise<void> => {
  await Notification.updateMany(
    { recipient: userId, isRead: false },
    { $set: { isRead: true } }
  );
};

export const markOneRead = async (
  notificationId: string,
  userId: string
): Promise<void> => {
  const notification = await Notification.findOne({
    _id: notificationId,
    recipient: userId,
  });
  if (!notification) throw notFound('Notification');
  notification.isRead = true;
  await notification.save();
};
