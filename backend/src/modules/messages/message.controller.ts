import { Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { asyncHandler } from '../../shared/middleware/errorHandler';
import { AuthRequest } from '../../shared/types';
import * as messageService from './message.service';

const validationFailed = (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;

  res.status(400).json({
    error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: errors.array() },
  });
  return true;
};

export const getConversationValidation = [
  param('userId').isMongoId().withMessage('Valid user id is required'),
];

export const sendMessageValidation = [
  body('to').isMongoId().withMessage('Valid recipient is required'),
  body('content').trim().isLength({ min: 1, max: 1000 }).withMessage('Message must be 1-1000 characters'),
];

export const getConversations = asyncHandler(async (req: AuthRequest, res: Response) => {
  const conversations = await messageService.getConversations(req.user!.id);
  res.status(200).json({ data: conversations });
});

export const getConversation = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (validationFailed(req, res)) return;

  const messages = await messageService.getConversation(req.user!.id, req.params.userId);
  res.status(200).json({ data: messages });
});

export const sendMessage = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (validationFailed(req, res)) return;

  const message = await messageService.sendMessage(req.user!.id, req.body.to, req.body.content);
  res.status(201).json({ data: message });
});

export const markRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (validationFailed(req, res)) return;

  await messageService.markConversationRead(req.user!.id, req.params.userId);
  res.status(200).json({ message: 'Conversation marked as read' });
});
