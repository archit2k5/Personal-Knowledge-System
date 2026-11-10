import { User } from '../models/user.model.js';
import { logger } from '../utils/logger.js';

/**
 * Daily cleanup job:
 * Deletes user accounts that remain unverified after 7 days (168 hours).
 */
export async function runUnverifiedAccountsCleanup() {
  try {
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

    const result = await User.deleteMany({
      emailVerified: false,
      createdAt: { $lt: cutoffDate },
    });

    if (result.deletedCount > 0) {
      logger.info('Cleaned up unverified stale user accounts', {
        deletedCount: result.deletedCount,
      });
    }
  } catch (error) {
    logger.error('Failed to run unverified accounts cleanup', {
      error: String(error),
    });
  }
}

/**
 * Starts periodic schedule (runs once daily)
 */
export function startCleanupSchedule() {
  // Run on startup
  runUnverifiedAccountsCleanup();

  // Run every 24 hours
  const intervalMs = 24 * 60 * 60 * 1000;
  setInterval(runUnverifiedAccountsCleanup, intervalMs);
}

