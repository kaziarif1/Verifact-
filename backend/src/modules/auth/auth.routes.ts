import { Router } from 'express';
import * as authController from './auth.controller';
import { registerValidation, loginValidation, forgotPasswordValidation, resetPasswordValidation } from './auth.validation';
import { authenticate } from '../../shared/middleware/authenticate';
import { authLimiter, passwordResetLimiter } from '../../shared/middleware/rateLimiter';

const router = Router();

router.post('/register', authLimiter, registerValidation, authController.register);
router.post('/login', authLimiter, loginValidation, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/forgot-password', passwordResetLimiter, forgotPasswordValidation, authController.forgotPassword);
router.post('/reset-password', passwordResetLimiter, resetPasswordValidation, authController.resetPassword);
router.get('/me', authenticate, authController.getMe);

export default router;
