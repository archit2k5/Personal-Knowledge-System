export class ApiError extends Error {
  constructor(statusCode, code, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad Request', details) {
    return new ApiError(400, 'VALIDATION_ERROR', message, details);
  }

  static invalidToken(message = 'Invalid or expired token') {
    return new ApiError(400, 'INVALID_OR_EXPIRED_TOKEN', message);
  }

  static unauthorized(message = 'Unauthenticated') {
    return new ApiError(401, 'UNAUTHENTICATED', message);
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  static emailNotVerified(message = 'Email is not verified') {
    return new ApiError(403, 'EMAIL_NOT_VERIFIED', message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, 'NOT_FOUND', message);
  }

  static conflict(message = 'Resource conflict') {
    return new ApiError(409, 'CONFLICT', message);
  }

  static payloadTooLarge(message = 'Payload too large') {
    return new ApiError(413, 'PAYLOAD_TOO_LARGE', message);
  }

  static unsupportedMediaType(message = 'Unsupported media type') {
    return new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', message);
  }

  static rateLimited(message = 'Too many requests, please try again later') {
    return new ApiError(429, 'RATE_LIMITED', message);
  }

  static upstreamError(message = 'Upstream service error') {
    return new ApiError(502, 'UPSTREAM_ERROR', message);
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, 'INTERNAL', message);
  }
}

