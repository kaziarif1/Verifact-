import { Router } from 'express';
import * as voteController from './vote.controller';
import { authenticate } from '../../shared/middleware/authenticate';
import { voteLimiter } from '../../shared/middleware/rateLimiter';

const router = Router({ mergeParams: true }); // mergeParams to access :id from parent

router.post('/', authenticate, voteLimiter, voteController.castVoteValidation, voteController.castVote);
router.delete('/', authenticate, voteController.removeVote);
router.get('/summary', voteController.getVoteSummary);

export default router;
