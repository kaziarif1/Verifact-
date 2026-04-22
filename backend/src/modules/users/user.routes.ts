import { Router } from 'express';
import * as userController from './user.controller';
import { authenticate, optionalAuthenticate } from '../../shared/middleware/authenticate';
import { uploadAvatar } from '../../shared/middleware/uploadHandler';

const router = Router();

// Public
router.get('/:username', optionalAuthenticate, userController.getPublicProfile);

// Authenticated
router.put('/me', authenticate, userController.updateProfileValidation, userController.updateProfile);
router.post('/me/avatar', authenticate, uploadAvatar.single('avatar'), userController.uploadAvatar);
router.get('/me/stats', authenticate, userController.getMyStats);
router.get('/me/posts', authenticate, userController.getMyPosts);
router.get('/me/votes', authenticate, userController.getMyVotes);
router.post('/:userId/follow', authenticate, userController.followValidation, userController.followUser);
router.delete('/:userId/follow', authenticate, userController.followValidation, userController.unfollowUser);

export default router;
