import { Router } from 'express';
import { authenticate } from '../../shared/middleware/authenticate';
import * as messageController from './message.controller';

const router = Router();

router.use(authenticate);

router.get('/', messageController.getConversations);
router.get('/:userId', messageController.getConversationValidation, messageController.getConversation);
router.post('/', messageController.sendMessageValidation, messageController.sendMessage);
router.patch('/:userId/read', messageController.getConversationValidation, messageController.markRead);

export default router;
