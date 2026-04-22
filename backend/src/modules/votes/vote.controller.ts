import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import * as voteService from './vote.service';
import { asyncHandler } from '../../shared/middleware/errorHandler';
import { AuthRequest } from '../../shared/types';

export const castVoteValidation = [
  body('direction').isIn(['up', 'down']).withMessage('Direction must be "up" or "down"'),
];

export const castVote = asyncHandler(async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: errors.array() } });
    return;
  }
  const result = await voteService.castVote(
    req.params.id,
    req.user!.id,
    req.user!.role,
    req.body.direction
  );
  res.status(200).json({ data: result });
});

export const removeVote = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await voteService.removeVote(req.params.id, req.user!.id);
  res.status(200).json({ data: result });
});

export const getVoteSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
  const summary = await voteService.getVoteSummary(req.params.id);
  res.status(200).json({ data: summary });
});
