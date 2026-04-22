import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import * as authService from './auth.service';
import { asyncHandler } from '../../shared/middleware/errorHandler';
import { AuthRequest } from '../../shared/types';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days ms
};

const handleValidationErrors = (req: Request, res: Response): boolean => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: errors.array() },
    });
    return true;
  }
  return false;
};

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  if (handleValidationErrors(req, res)) return;
  const { user, accessToken, refreshToken } = await authService.register(req.body);
  if (refreshToken) {
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
  }
  res.status(201).json({
    data: { user, accessToken },
    message: 'Registration successful. Please verify your email.',
  });
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  if (handleValidationErrors(req, res)) return;
  const { email, password } = req.body;
  const { user, accessToken, refreshToken } = await authService.login(email, password);
  if (refreshToken) {
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
  }
  res.status(200).json({ data: { user, accessToken } });
});

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token cookie
 *     tags: [Auth]
 */
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) {
    res.status(401).json({ error: { code: 'MISSING_REFRESH_TOKEN', message: 'Refresh token missing' } });
    return;
  }
  const tokens = await authService.refreshTokens(refreshToken);
  res.cookie('refreshToken', tokens.refreshToken, COOKIE_OPTIONS);
  res.status(200).json({ data: { accessToken: tokens.accessToken } });
});

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout — invalidates refresh token
 *     tags: [Auth]
 */
export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user) await authService.logout(req.user.id);
  res.clearCookie('refreshToken');
  res.status(204).send();
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.params;
  await authService.verifyEmail(token);
  res.status(200).json({ message: 'Email verified successfully' });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  if (handleValidationErrors(req, res)) return;
  await authService.forgotPassword(req.body.email);
  // Always return 200 to prevent email enumeration
  res.status(200).json({ message: 'If that email exists, a reset link has been sent.' });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  if (handleValidationErrors(req, res)) return;
  const { token, password } = req.body;
  await authService.resetPassword(token, password);
  res.status(200).json({ message: 'Password reset successfully. Please log in.' });
});

export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.status(200).json({ data: req.user });
});
