import { app } from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { ensureCollection } from './rag/qdrant.js';
import { startCleanupSchedule } from './jobs/cleanup.job.js';
import { logger } from './utils/logger.js';

async function bootstrap() {
  await connectDB();
  await ensureCollection();
  startCleanupSchedule();

  const server = app.listen(env.PORT, () => {
    logger.info(`Personal Knowledge System API running on port ${env.PORT}`, {
      port: env.PORT,
      env: env.NODE_ENV,
      clientOrigin: env.CLIENT_ORIGIN,
    });
  });

  async function gracefulShutdown(signal) {
    logger.info(`Received ${signal}. Shutting down gracefully...`);

    server.close(async () => {
      logger.info('HTTP server closed');
      await disconnectDB();
      logger.info('Process terminated');
      process.exit(0);
    });

    // Force close if graceful shutdown takes too long
    setTimeout(() => {
      logger.error('Forced shutdown due to timeout');
      process.exit(1);
    }, 10000);
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

bootstrap().catch((error) => {
  logger.error('Fatal bootstrap error', { error: String(error) });
  process.exit(1);
});
