import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';

export class AppError extends Error {
  statusCode: number;
  code: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Helper factories
export const notFound = (resource: string) =>
  new AppError(`${resource} not found`, 404, `${resource.toUpperCase().replace(' ', '_')}_NOT_FOUND`);

export const forbidden = (msg = 'Forbidden') => new AppError(msg, 403, 'FORBIDDEN');
export const badRequest = (msg: string, code = 'BAD_REQUEST') => new AppError(msg, 400, code);
export const conflict = (msg: string, code = 'CONFLICT') => new AppError(msg, 409, code);
export const unauthorized = (msg = 'Unauthorized') => new AppError(msg, 401, 'UNAUTHORIZED');

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  // Operational errors (AppError)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
    return;
  }

  // Mongoose validation error
  if (err instanceof mongoose.Error.ValidationError) {
    const details: Record<string, string> = {};
    Object.values(err.errors).forEach((e) => { details[e.path] = e.message; });
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Input validation failed', details },
    });
    return;
  }

  // Mongoose duplicate key
  if ((err as NodeJS.ErrnoException).code === 11000) {
    const field = Object.keys((err as unknown as { keyValue: Record<string, unknown> }).keyValue || {})[0];
    res.status(409).json({
      error: { code: 'DUPLICATE_KEY', message: `${field} already exists` },
    });
    return;
  }

  // Mongoose cast error (bad ObjectId)
  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({
      error: { code: 'INVALID_ID', message: `Invalid ${err.path}: ${err.value}` },
    });
    return;
  }

  // Unknown / unexpected error
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  });
};

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
