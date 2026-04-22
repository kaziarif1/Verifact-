import { Router } from 'express';
import { authenticate, optionalAuthenticate } from '../../shared/middleware/authenticate';
import * as groupController from './group.controller';

const router = Router();

router.get('/', optionalAuthenticate, groupController.getAllGroups);
router.get('/:slug', optionalAuthenticate, groupController.groupSlugValidation, groupController.getGroupBySlug);
router.get('/:slug/claims', optionalAuthenticate, groupController.groupSlugValidation, groupController.getGroupClaims);
router.get('/:slug/members', optionalAuthenticate, groupController.groupSlugValidation, groupController.getGroupMembers);

router.post('/', authenticate, groupController.createGroupValidation, groupController.createGroup);
router.post('/:groupId/join', authenticate, groupController.groupIdValidation, groupController.joinGroup);
router.delete('/:groupId/join', authenticate, groupController.groupIdValidation, groupController.leaveGroup);

export default router;
