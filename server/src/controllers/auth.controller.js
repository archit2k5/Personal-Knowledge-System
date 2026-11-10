import { authService } from '../services/auth.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { env } from '../config/env.js';

const REFRESH_COOKIE_NAME = 'refreshToken';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export class AuthController {
  async register(req, res) {
    const result = await authService.register(req.body);
    return ApiResponse.created(res, result);
  }

  async verifyEmail(req, res) {
    const result = await authService.verifyEmail(req.body.token);
    return ApiResponse.success(res, 200, result);
  }

  async resendVerification(req, res) {
    const result = await authService.resendVerification(req.body.email);
    return ApiResponse.accepted(res, result);
  }

  async forgotPassword(req, res) {
    const result = await authService.forgotPassword(req.body.email);
    return ApiResponse.accepted(res, result);
  }

  async resetPassword(req, res) {
    const result = await authService.resetPassword(req.body.token, req.body.newPassword);
    return ApiResponse.success(res, 200, result);
  }

  async login(req, res) {
    const { user, accessToken, refreshToken } = await authService.login({
      email: req.body.email,
      password: req.body.password,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, COOKIE_OPTIONS);
    return ApiResponse.success(res, 200, { user, accessToken });
  }

  async refresh(req, res) {
    const oldRefreshToken = req.cookies[REFRESH_COOKIE_NAME];
    const { accessToken, newRefreshToken } = await authService.refresh(
      oldRefreshToken,
      req.headers['user-agent'],
      req.ip
    );

    res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, COOKIE_OPTIONS);
    return ApiResponse.success(res, 200, { accessToken });
  }

  async logout(req, res) {
    const refreshToken = req.cookies[REFRESH_COOKIE_NAME];
    await authService.logout(refreshToken);
    res.clearCookie(REFRESH_COOKIE_NAME, COOKIE_OPTIONS);
    return ApiResponse.noContent(res);
  }

  async getMe(req, res) {
    const result = await authService.getMe(req.user.id);
    return ApiResponse.success(res, 200, result);
  }

  async updateMe(req, res) {
    const result = await authService.updateMe(req.user.id, req.body);
    return ApiResponse.success(res, 200, result);
  }

  async changePassword(req, res) {
    await authService.changePassword(
      req.user.id,
      req.body.currentPassword,
      req.body.newPassword
    );
    res.clearCookie(REFRESH_COOKIE_NAME, COOKIE_OPTIONS);
    return ApiResponse.noContent(res);
  }
}

export const authController = new AuthController();

