import { Router } from 'express';
import * as claimController from './claim.controller';
import { authenticate, optionalAuthenticate } from '../../shared/middleware/authenticate';
import { uploadMedia } from '../../shared/middleware/uploadHandler';
import { generalLimiter } from '../../shared/middleware/rateLimiter';

const router = Router();

// Public / optional auth
router.get('/', optionalAuthenticate, claimController.getFeed);
router.get('/search', optionalAuthenticate, claimController.searchClaims);
router.get('/trending/facts', claimController.getTrendingFacts);
router.get('/trending/rumors', claimController.getTrendingRumors);
router.get('/:id', optionalAuthenticate, claimController.getClaimById);

// Authenticated
router.post(
  '/',
  authenticate,
  generalLimiter,
  uploadMedia.single('media'),
  claimController.createClaimValidation,
  claimController.createClaim
);
router.delete('/:id', authenticate, claimController.deleteClaim);

export default router;
