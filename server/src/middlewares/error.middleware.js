import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    logger.warn('Handled API Error', {
      statusCode: err.statusCode,
      code: err.code,
      message: err.message,
      path: req.path,
      method: req.method,
    });

    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
  }

  logger.error('Unhandled Server Error', {
    message: err.message,
    stack: env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    error: {
      code: 'INTERNAL',
      message: 'Internal server error',
    },
  });
}

