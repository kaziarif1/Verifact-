import { body } from 'express-validator';

export const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 }).withMessage('Username must be 3–30 characters')
    .matches(/^[a-z0-9_]+$/i).withMessage('Username can only contain letters, numbers, and underscores'),
  body('displayName').trim().isLength({ min: 2, max: 50 }).withMessage('Display name must be 2–50 characters'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
];

export const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const forgotPasswordValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
];

export const resetPasswordValidation = [
  body('token').notEmpty().withMessage('Token is required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
];
