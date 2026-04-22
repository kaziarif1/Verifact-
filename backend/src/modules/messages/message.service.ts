import { Types } from 'mongoose';
import { badRequest, notFound } from '../../shared/middleware/errorHandler';
import { Message } from './message.model';
import { User } from '../users/user.model';

const USER_POPULATE = 'email username displayName avatarUrl role trustScore.current';

export const getConversations = async (userId: string) => {
  const messages = await Message.find({
    $or: [{ from: userId }, { to: userId }],
  })
    .sort({ createdAt: -1 })
    .populate('from', USER_POPULATE)
    .populate('to', USER_POPULATE)
    .lean();

  const seen = new Set<string>();
  const conversations = [];

  for (const message of messages) {
    const fromId = (message.from as { _id: Types.ObjectId })._id.toString();
    const toId = (message.to as { _id: Types.ObjectId })._id.toString();
    const partner = fromId === userId ? message.to : message.from;
    const partnerId = (partner as { _id: Types.ObjectId })._id.toString();

    if (seen.has(partnerId)) continue;
    seen.add(partnerId);

    const unreadCount = await Message.countDocuments({
      from: partnerId,
      to: userId,
      isRead: false,
    });

    conversations.push({
      partner,
      lastMessage: message,
      unreadCount,
    });
  }

  return conversations;
};

export const getConversation = async (userId: string, partnerId: string) => {
  if (!Types.ObjectId.isValid(partnerId)) throw badRequest('Invalid user id', 'INVALID_USER_ID');

  const partner = await User.findById(partnerId).select('_id');
  if (!partner) throw notFound('User');

  return Message.find({
    $or: [
      { from: userId, to: partnerId },
      { from: partnerId, to: userId },
    ],
  })
    .sort({ createdAt: 1 })
    .populate('from', USER_POPULATE)
    .lean();
};

export const sendMessage = async (fromUserId: string, toUserId: string, content: string) => {
  if (!Types.ObjectId.isValid(toUserId)) throw badRequest('Invalid recipient id', 'INVALID_USER_ID');
  if (fromUserId === toUserId) throw badRequest('You cannot message yourself', 'SELF_MESSAGE_BLOCKED');

  const recipient = await User.findById(toUserId).select('_id');
  if (!recipient) throw notFound('User');

  const message = await Message.create({
    from: fromUserId,
    to: toUserId,
    content: content.trim(),
  });

  return message.populate('from', USER_POPULATE);
};

export const markConversationRead = async (userId: string, partnerId: string) => {
  if (!Types.ObjectId.isValid(partnerId)) throw badRequest('Invalid user id', 'INVALID_USER_ID');

  await Message.updateMany(
    { from: partnerId, to: userId, isRead: false },
    { $set: { isRead: true } }
  );
};
