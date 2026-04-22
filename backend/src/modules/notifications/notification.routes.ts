import { Router, Response } from 'express';
import * as notificationService from './notification.service';
import { asyncHandler } from '../../shared/middleware/errorHandler';
import { authenticate } from '../../shared/middleware/authenticate';
import { AuthRequest } from '../../shared/types';

const getNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await notificationService.getNotifications(
    req.user!.id,
    req.query as Record<string, string>
  );
  res.status(200).json(result);
});

const markAllRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  await notificationService.markAllRead(req.user!.id);
  res.status(204).send();
});

const markOneRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  await notificationService.markOneRead(req.params.id, req.user!.id);
  res.status(204).send();
});

const router = Router();
router.get('/', authenticate, getNotifications);
router.patch('/read-all', authenticate, markAllRead);
router.patch('/:id/read', authenticate, markOneRead);

export default router;
