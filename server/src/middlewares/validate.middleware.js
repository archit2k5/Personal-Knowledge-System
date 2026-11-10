import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError.js';

export function validate(schema) {
  return async (req, _res, next) => {
    try {
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      if (schema.query) {
        req.query = await schema.query.parseAsync(req.query);
      }
      if (schema.params) {
        req.params = await schema.params.parseAsync(req.params);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        }));
        next(ApiError.badRequest('Validation error', details));
      } else {
        next(error);
      }
    }
  };
}

