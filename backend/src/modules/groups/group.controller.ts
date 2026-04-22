import { Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { asyncHandler } from '../../shared/middleware/errorHandler';
import { AuthRequest } from '../../shared/types';
import * as groupService from './group.service';

const validationFailed = (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;

  res.status(400).json({
    error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: errors.array() },
  });
  return true;
};

export const createGroupValidation = [
  body('name').trim().isLength({ min: 3, max: 80 }).withMessage('Group name must be 3-80 characters'),
  body('description').trim().isLength({ min: 10, max: 300 }).withMessage('Description must be 10-300 characters'),
  body('category').optional().isIn(['politics', 'health', 'science', 'technology', 'entertainment', 'sports', 'finance', 'other']),
];

export const groupIdValidation = [
  param('groupId').isMongoId().withMessage('Valid group id is required'),
];

export const groupSlugValidation = [
  param('slug').trim().isLength({ min: 1 }).withMessage('Group slug is required'),
];

export const getAllGroups = asyncHandler(async (req: AuthRequest, res: Response) => {
  const groups = await groupService.getAllGroups(req.user?.id);
  res.status(200).json({ data: groups });
});

export const createGroup = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (validationFailed(req, res)) return;

  const group = await groupService.createGroup(req.user!.id, req.body);
  res.status(201).json({ data: group });
});

export const getGroupBySlug = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (validationFailed(req, res)) return;

  const group = await groupService.getGroupBySlug(req.params.slug, req.user?.id);
  res.status(200).json({ data: group });
});

export const joinGroup = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (validationFailed(req, res)) return;

  await groupService.joinGroup(req.params.groupId, req.user!.id);
  res.status(200).json({ message: 'Joined group' });
});

export const leaveGroup = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (validationFailed(req, res)) return;

  await groupService.leaveGroup(req.params.groupId, req.user!.id);
  res.status(200).json({ message: 'Left group' });
});

export const getGroupClaims = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (validationFailed(req, res)) return;

  const claims = await groupService.getGroupClaims(req.params.slug);
  res.status(200).json(claims);
});

export const getGroupMembers = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (validationFailed(req, res)) return;

  const members = await groupService.getGroupMembers(req.params.slug);
  res.status(200).json({ data: members });
});
