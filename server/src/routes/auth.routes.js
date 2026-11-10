import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middlewares/validate.middleware.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import {
  authRateLimiter,
  strictAuthRateLimiter,
} from '../middlewares/rateLimit.middleware.js';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateMeSchema,
} from '../validators/auth.schema.js';

const router = Router();

router.post(
  '/auth/register',
  authRateLimiter,
  validate({ body: registerSchema }),
  asyncHandler(authController.register.bind(authController))
);

router.post(
  '/auth/verify-email',
  authRateLimiter,
  validate({ body: verifyEmailSchema }),
  asyncHandler(authController.verifyEmail.bind(authController))
);

router.post(
  '/auth/resend-verification',
  strictAuthRateLimiter,
  validate({ body: resendVerificationSchema }),
  asyncHandler(authController.resendVerification.bind(authController))
);

router.post(
  '/auth/forgot-password',
  strictAuthRateLimiter,
  validate({ body: forgotPasswordSchema }),
  asyncHandler(authController.forgotPassword.bind(authController))
);

router.post(
  '/auth/reset-password',
  authRateLimiter,
  validate({ body: resetPasswordSchema }),
  asyncHandler(authController.resetPassword.bind(authController))
);

router.post(
  '/auth/login',
  authRateLimiter,
  validate({ body: loginSchema }),
  asyncHandler(authController.login.bind(authController))
);

router.post(
  '/auth/refresh',
  asyncHandler(authController.refresh.bind(authController))
);

router.post(
  '/auth/logout',
  asyncHandler(authController.logout.bind(authController))
);

router.get(
  '/auth/me',
  authenticate,
  asyncHandler(authController.getMe.bind(authController))
);

router.patch(
  '/auth/me',
  authenticate,
  validate({ body: updateMeSchema }),
  asyncHandler(authController.updateMe.bind(authController))
);

router.post(
  '/auth/change-password',
  authenticate,
  validate({ body: changePasswordSchema }),
  asyncHandler(authController.changePassword.bind(authController))
);

export default router;

