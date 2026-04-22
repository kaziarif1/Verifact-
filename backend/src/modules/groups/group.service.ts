import { Types } from 'mongoose';
import { Claim } from '../claims/claim.model';
import { Group } from './group.model';
import { User } from '../users/user.model';
import { badRequest, conflict, notFound } from '../../shared/middleware/errorHandler';

const GROUP_POPULATE = 'email username displayName avatarUrl role trustScore.current';

const slugify = (value: string) => value
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 50);

const withMembership = <T extends { members?: Types.ObjectId[] | string[] }>(group: T, userId?: string) => ({
  ...group,
  isMember: !!userId && (group.members ?? []).some((member) => member.toString() === userId),
});

export const getAllGroups = async (userId?: string): Promise<any[]> => {
  const groups = await Group.find()
    .sort({ memberCount: -1, createdAt: -1 })
    .populate('createdBy', GROUP_POPULATE)
    .lean();

  return groups.map((group) => {
    const { members, ...rest } = group;
    return withMembership({ ...rest, members }, userId);
  });
};

export const createGroup = async (userId: string, data: { name: string; description: string; category: string }) => {
  const slugBase = slugify(data.name);
  if (!slugBase) throw badRequest('Group name must contain letters or numbers', 'INVALID_GROUP_NAME');

  const existingName = await Group.findOne({ name: data.name.trim() }).select('_id');
  if (existingName) throw conflict('A group with this name already exists', 'GROUP_EXISTS');

  let slug = slugBase;
  let suffix = 1;
  while (await Group.findOne({ slug }).select('_id')) {
    suffix += 1;
    slug = `${slugBase.slice(0, Math.max(1, 50 - String(suffix).length - 1))}-${suffix}`;
  }

  const group = await Group.create({
    name: data.name.trim(),
    slug,
    description: data.description.trim(),
    category: data.category || 'other',
    createdBy: userId,
    members: [new Types.ObjectId(userId)],
    memberCount: 1,
  });

  return group.populate('createdBy', GROUP_POPULATE);
};

export const getGroupBySlug = async (slug: string, userId?: string) => {
  const group = await Group.findOne({ slug })
    .populate('createdBy', GROUP_POPULATE)
    .lean();

  if (!group) throw notFound('Group');

  return withMembership(group, userId);
};

export const joinGroup = async (groupId: string, userId: string) => {
  if (!Types.ObjectId.isValid(groupId)) throw badRequest('Invalid group id', 'INVALID_GROUP_ID');

  const group = await Group.findById(groupId);
  if (!group) throw notFound('Group');

  if (!group.members.some((member) => member.toString() === userId)) {
    group.members.push(new Types.ObjectId(userId));
    group.memberCount = group.members.length;
    await group.save();
  }

  return group;
};

export const leaveGroup = async (groupId: string, userId: string) => {
  if (!Types.ObjectId.isValid(groupId)) throw badRequest('Invalid group id', 'INVALID_GROUP_ID');

  const group = await Group.findById(groupId);
  if (!group) throw notFound('Group');

  group.members = group.members.filter((member) => member.toString() !== userId);
  group.memberCount = group.members.length;
  await group.save();

  return group;
};

export const getGroupMembers = async (slug: string) => {
  const group = await Group.findOne({ slug })
    .populate('members', GROUP_POPULATE)
    .lean();

  if (!group) throw notFound('Group');

  return group.members;
};

export const getGroupClaims = async (slug: string) => {
  const group = await Group.findOne({ slug }).select('_id');
  if (!group) throw notFound('Group');

  const claims = await Claim.find({ group: group._id, isDeleted: false })
    .sort({ createdAt: -1 })
    .populate('author', GROUP_POPULATE)
    .lean();

  return {
    data: claims,
    meta: { hasMore: false },
  };
};
