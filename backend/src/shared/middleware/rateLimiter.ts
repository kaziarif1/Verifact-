import rateLimit from 'express-rate-limit';
import { config } from '../../config/env';

// General API rate limit
export const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests, please try again later.' },
  },
});

// Strict limit for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: { code: 'AUTH_RATE_LIMIT', message: 'Too many auth attempts. Please wait 1 minute.' },
  },
});

// Vote endpoint limit
export const voteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: { code: 'VOTE_RATE_LIMIT', message: 'You have reached the voting limit for this hour.' },
  },
});

// Password reset limit
export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: { code: 'RESET_RATE_LIMIT', message: 'Too many password reset attempts. Please wait 15 minutes.' },
  },
});
