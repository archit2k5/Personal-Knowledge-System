import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const transporter = nodemailer.createTransport({
  host: env.MAILTRAP_HOST,
  port: env.MAILTRAP_PORT,
  auth: {
    user: env.MAILTRAP_USER,
    pass: env.MAILTRAP_PASS,
  },
});

export async function sendEmail({ to, subject, text, html }) {
  if (!env.MAILTRAP_USER || !env.MAILTRAP_PASS) {
    logger.warn('Email skipped: Mailtrap credentials not configured', {
      to,
      subject,
    });
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject,
      text,
      html,
    });
    logger.info('Email sent successfully', { messageId: info.messageId, to });
  } catch (error) {
    logger.error('Failed to send email', { error: String(error), to });
    throw error;
  }
}

