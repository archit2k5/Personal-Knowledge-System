import { ApiError } from '../utils/ApiError.js';

export function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`Cannot ${req.method} ${req.originalUrl}`));
}

