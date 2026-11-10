import rateLimit from 'express-rate-limit';
import { ApiError } from '../utils/ApiError.js';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(ApiError.rateLimited('Too many attempts from this IP, please try again in 15 minutes'));
  },
});

export const strictAuthRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(ApiError.rateLimited('Too many requests, please try again in an hour'));
  },
});

export const messageRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip || 'anonymous',
  handler: (_req, _res, next) => {
    next(ApiError.rateLimited('Message rate limit exceeded, please slow down'));
  },
});

export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip || 'anonymous',
  handler: (_req, _res, next) => {
    next(ApiError.rateLimited('Upload rate limit exceeded, please slow down'));
  },
});

