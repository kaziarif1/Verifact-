import { Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import * as userService from './user.service';
import { asyncHandler } from '../../shared/middleware/errorHandler';
import { AuthRequest } from '../../shared/types';

export const updateProfileValidation = [
  body('displayName').optional().trim().isLength({ min: 2, max: 50 }),
  body('username').optional().trim().isLength({ min: 3, max: 30 }).matches(/^[a-z0-9_]+$/i),
  body('bio').optional().trim().isLength({ max: 200 }),
];

export const getPublicProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await userService.getPublicProfile(req.params.username, req.user?.id);
  res.status(200).json({ data: user });
});

export const followValidation = [
  param('userId').isMongoId().withMessage('Valid user id is required'),
];

export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: errors.array() } });
    return;
  }
  const user = await userService.updateProfile(req.user!.id, req.body);
  res.status(200).json({ data: user });
});

export const uploadAvatar = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: { code: 'NO_FILE', message: 'No file uploaded' } });
    return;
  }
  const user = await userService.uploadAvatar(req.user!.id, req.file.path);
  res.status(200).json({ data: user });
});

export const getMyStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const stats = await userService.getMyStats(req.user!.id);
  res.status(200).json({ data: stats });
});

export const getMyPosts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await userService.getMyPosts(req.user!.id, req.query as Record<string, string>);
  res.status(200).json(result);
});

export const getMyVotes = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await userService.getMyVotes(req.user!.id, req.query as Record<string, string>);
  res.status(200).json(result);
});

export const followUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: errors.array() } });
    return;
  }

  const user = await userService.followUser(req.user!.id, req.params.userId);
  res.status(200).json({ data: user });
});

export const unfollowUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: errors.array() } });
    return;
  }

  const user = await userService.unfollowUser(req.user!.id, req.params.userId);
  res.status(200).json({ data: user });
});
