import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import * as claimService from './claim.service';
import { asyncHandler } from '../../shared/middleware/errorHandler';
import { AuthRequest } from '../../shared/types';

export const createClaimValidation = [
  body('title').trim().isLength({ min: 10, max: 200 }).withMessage('Title must be 10–200 characters'),
  body('body').optional().trim().isLength({ max: 2000 }).withMessage('Body max 2000 characters'),
  body('category')
    .optional()
    .isIn(['politics', 'health', 'science', 'technology', 'entertainment', 'sports', 'finance', 'other'])
    .withMessage('Invalid category'),
];

export const getFeed = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await claimService.getFeed(
    req.query as Record<string, string>,
    req.user?.id
  );
  res.status(200).json(result);
});

export const createClaim = asyncHandler(async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: errors.array() } });
    return;
  }
  const claim = await claimService.createClaim(
    req.user!.id,
    req.user!.role,
    req.body,
    req.file
  );
  res.status(201).json({ data: claim, message: 'Claim submitted. ML analysis in progress.' });
});

export const getClaimById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const claim = await claimService.getClaimById(req.params.id, req.user?.id);
  res.status(200).json({ data: claim });
});

export const deleteClaim = asyncHandler(async (req: AuthRequest, res: Response) => {
  await claimService.deleteClaim(req.params.id, req.user!.id, req.user!.role);
  res.status(204).send();
});

export const searchClaims = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await claimService.searchClaims(
    req.query.q as string,
    req.query as Record<string, string>
  );
  res.status(200).json(result);
});

export const getTrendingFacts = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const claims = await claimService.getTrending('facts');
  res.status(200).json({ data: claims });
});

export const getTrendingRumors = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const claims = await claimService.getTrending('rumors');
  res.status(200).json({ data: claims });
});
