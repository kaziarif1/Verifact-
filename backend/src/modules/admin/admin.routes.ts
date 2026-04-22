import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import * as adminService from './admin.service';
import { asyncHandler } from '../../shared/middleware/errorHandler';
import { authenticate, authorize } from '../../shared/middleware/authenticate';
import { AuthRequest } from '../../shared/types';

// ─── Controllers ──────────────────────────────────────────────────────────────

const getDashboardStats = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const stats = await adminService.getDashboardStats();
  res.status(200).json({ data: stats });
});

const getClaimsQueue = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await adminService.getClaimsQueue(req.query as Record<string, string>);
  res.status(200).json(result);
});

const setVerdictValidation = [
  body('decision').isIn(['Fact', 'Rumor']).withMessage('Decision must be "Fact" or "Rumor"'),
  body('adminNote').optional().trim().isLength({ max: 500 }),
];

const setVerdict = asyncHandler(async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: errors.array() } });
    return;
  }
  const claim = await adminService.setVerdict(
    req.params.id,
    req.user!.id,
    req.body.decision,
    req.body.adminNote
  );
  res.status(200).json({ data: claim, message: `Claim marked as ${req.body.decision}` });
});

const getUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await adminService.getUsers(req.query as Record<string, string>);
  res.status(200).json(result);
});

const verifyUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await adminService.verifyUser(req.params.id, req.user!.id);
  res.status(200).json({ data: user, message: 'User verified successfully' });
});

const banUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await adminService.banUser(req.params.id);
  res.status(200).json({ data: user, message: `User ${user.isBanned ? 'banned' : 'unbanned'} successfully` });
});

const getVerificationCandidates = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const users = await adminService.getVerificationCandidates();
  res.status(200).json({ data: users });
});

// ─── Routes ───────────────────────────────────────────────────────────────────

const router = Router();
const adminAuth = [authenticate, authorize('admin')];

router.get('/dashboard', ...adminAuth, getDashboardStats);
router.get('/claims/queue', ...adminAuth, getClaimsQueue);
router.get('/claims/verification-candidates', ...adminAuth, getVerificationCandidates);
router.patch('/claims/:id/verdict', ...adminAuth, setVerdictValidation, setVerdict);
router.get('/users', ...adminAuth, getUsers);
router.patch('/users/:id/verify', ...adminAuth, verifyUser);
router.patch('/users/:id/ban', ...adminAuth, banUser);

import { systemHealth } from './health';
router.get('/system/health', ...adminAuth, systemHealth);

export default router;
