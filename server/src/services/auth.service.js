import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User } from '../models/user.model.js';
import { RefreshToken } from '../models/refreshToken.model.js';
import { ApiError } from '../utils/ApiError.js';
import {
  generateRandomToken,
  hashToken,
  signAccessToken,
} from '../utils/tokens.js';
import { env } from '../config/env.js';
import { queue } from '../jobs/queue.js';
import {
  getVerifyEmailTemplate,
  getResetPasswordTemplate,
  getPasswordChangedTemplate,
} from '../mail/templates.js';

export class AuthService {
  async register(data) {
    const existing = await User.findOne({ email: data.email.toLowerCase() });
    if (existing) {
      throw ApiError.conflict('Email is already registered');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const rawToken = generateRandomToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const user = await User.create({
      email: data.email.toLowerCase(),
      passwordHash,
      name: data.name,
      emailVerified: false,
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: expiresAt,
      emailVerificationSentAt: new Date(),
    });

    const verifyUrl = `${env.CLIENT_ORIGIN}/verify-email?token=${rawToken}`;
    const emailTemplate = getVerifyEmailTemplate(user.name, verifyUrl);

    await queue.enqueueEmail({
      type: 'verify-email',
      options: {
        to: user.email,
        subject: emailTemplate.subject,
        text: emailTemplate.text,
        html: emailTemplate.html,
      },
    });

    return { message: 'Verification email sent' };
  }

  async verifyEmail(token) {
    const tokenHash = hashToken(token);
    const user = await User.findOne({
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      throw ApiError.invalidToken('Invalid or expired email verification token');
    }

    user.emailVerified = true;
    user.emailVerifiedAt = new Date();
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpiresAt = undefined;
    await user.save();

    return { user };
  }

  async resendVerification(email) {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (user && !user.emailVerified) {
      if (
        user.emailVerificationSentAt &&
        Date.now() - user.emailVerificationSentAt.getTime() <
          env.EMAIL_RESEND_COOLDOWN_SEC * 1000
      ) {
        return { message: 'If an account exists, a verification email has been sent' };
      }

      const rawToken = generateRandomToken(32);
      user.emailVerificationTokenHash = hashToken(rawToken);
      user.emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      user.emailVerificationSentAt = new Date();
      await user.save();

      const verifyUrl = `${env.CLIENT_ORIGIN}/verify-email?token=${rawToken}`;
      const template = getVerifyEmailTemplate(user.name, verifyUrl);

      await queue.enqueueEmail({
        type: 'verify-email',
        options: {
          to: user.email,
          subject: template.subject,
          text: template.text,
          html: template.html,
        },
      });
    }

    return { message: 'If an account exists, a verification email has been sent' };
  }

  async forgotPassword(email) {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      if (!user.emailVerified) {
        return this.resendVerification(email);
      }

      if (
        user.passwordResetRequestedAt &&
        Date.now() - user.passwordResetRequestedAt.getTime() <
          env.EMAIL_RESEND_COOLDOWN_SEC * 1000
      ) {
        return { message: 'If an account exists, a reset link has been sent' };
      }

      const rawToken = generateRandomToken(32);
      user.passwordResetTokenHash = hashToken(rawToken);
      user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h
      user.passwordResetRequestedAt = new Date();
      await user.save();

      const resetUrl = `${env.CLIENT_ORIGIN}/reset-password?token=${rawToken}`;
      const template = getResetPasswordTemplate(user.name, resetUrl);

      await queue.enqueueEmail({
        type: 'reset-password',
        options: {
          to: user.email,
          subject: template.subject,
          text: template.text,
          html: template.html,
        },
      });
    }

    return { message: 'If an account exists, a reset link has been sent' };
  }

  async resetPassword(token, newPassword) {
    const tokenHash = hashToken(token);
    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      throw ApiError.invalidToken('Invalid or expired password reset token');
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    user.passwordChangedAt = new Date();
    await user.save();

    await RefreshToken.deleteMany({ userId: user._id });

    const template = getPasswordChangedTemplate(user.name);
    await queue.enqueueEmail({
      type: 'password-changed',
      options: {
        to: user.email,
        subject: template.subject,
        text: template.text,
        html: template.html,
      },
    });

    return { message: 'Password reset successful' };
  }

  async login(data) {
    const user = await User.findOne({ email: data.email.toLowerCase() });
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (!user.emailVerified) {
      throw ApiError.emailNotVerified('Please verify your email before logging in');
    }

    const accessToken = signAccessToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    const rawRefreshToken = generateRandomToken(40);
    const tokenHash = hashToken(rawRefreshToken);
    const family = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7d

    await RefreshToken.create({
      userId: user._id,
      tokenHash,
      family,
      expiresAt,
      userAgent: data.userAgent,
      ip: data.ip,
    });

    return {
      user,
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  async refresh(oldRefreshToken, userAgent, ip) {
    if (!oldRefreshToken) {
      throw ApiError.unauthorized('Refresh token is required');
    }

    const tokenHash = hashToken(oldRefreshToken);
    const existing = await RefreshToken.findOne({ tokenHash });

    if (!existing) {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    if (existing.revokedAt) {
      await RefreshToken.deleteMany({ family: existing.family });
      throw ApiError.unauthorized('Refresh token was previously revoked; session terminated');
    }

    if (existing.expiresAt < new Date()) {
      throw ApiError.unauthorized('Refresh token expired');
    }

    const user = await User.findById(existing.userId);
    if (!user) {
      throw ApiError.unauthorized('User not found');
    }

    existing.revokedAt = new Date();
    await existing.save();

    const newRawRefreshToken = generateRandomToken(40);
    const newTokenHash = hashToken(newRawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await RefreshToken.create({
      userId: user._id,
      tokenHash: newTokenHash,
      family: existing.family,
      expiresAt,
      userAgent,
      ip,
    });

    const accessToken = signAccessToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    return {
      accessToken,
      newRefreshToken: newRawRefreshToken,
    };
  }

  async logout(refreshToken) {
    if (!refreshToken) return;
    const tokenHash = hashToken(refreshToken);
    const tokenDoc = await RefreshToken.findOne({ tokenHash });
    if (tokenDoc) {
      await RefreshToken.deleteMany({ family: tokenDoc.family });
    }
  }

  async getMe(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return { user };
  }

  async updateMe(userId, data) {
    const user = await User.findByIdAndUpdate(
      userId,
      { ...(data.name ? { name: data.name } : {}) },
      { new: true }
    );
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return { user };
  }

  async changePassword(userId, currentPass, newPass) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const isMatch = await bcrypt.compare(currentPass, user.passwordHash);
    if (!isMatch) {
      throw ApiError.badRequest('Incorrect current password');
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPass, salt);
    user.passwordChangedAt = new Date();
    await user.save();

    await RefreshToken.deleteMany({ userId: user._id });
  }
}

export const authService = new AuthService();

