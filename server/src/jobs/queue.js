import { sendEmail } from '../mail/mailer.js';
import { logger } from '../utils/logger.js';
import { processDocumentIngest } from './ingest.worker.js';

class JobQueue {
  constructor() {
    this.emailQueue = [];
    this.isProcessingEmail = false;
    this.ingestQueue = [];
    this.isProcessingIngest = false;
  }

  async enqueueEmail(job) {
    this.emailQueue.push(job);
    logger.info('Enqueued email job', { type: job.type, to: job.options.to });
    this.processNextEmail();
  }

  async processNextEmail() {
    if (this.isProcessingEmail || this.emailQueue.length === 0) {
      return;
    }

    this.isProcessingEmail = true;
    const job = this.emailQueue.shift();

    if (job) {
      try {
        await sendEmail(job.options);
      } catch (error) {
        logger.error('Failed to send email in queue worker', {
          type: job.type,
          error: String(error),
        });
      } finally {
        this.isProcessingEmail = false;
        this.processNextEmail();
      }
    } else {
      this.isProcessingEmail = false;
    }
  }

  async enqueueIngest(job) {
    this.ingestQueue.push(job);
    logger.info('Enqueued document ingest job', { documentId: job.documentId });
    this.processNextIngest();
  }

  async processNextIngest() {
    if (this.isProcessingIngest || this.ingestQueue.length === 0) {
      return;
    }

    this.isProcessingIngest = true;
    const job = this.ingestQueue.shift();

    if (job) {
      try {
        await processDocumentIngest(job);
      } catch (error) {
        logger.error('Failed to process document ingest in worker', {
          documentId: job.documentId,
          error: String(error),
        });
      } finally {
        this.isProcessingIngest = false;
        this.processNextIngest();
      }
    } else {
      this.isProcessingIngest = false;
    }
  }
}

export const queue = new JobQueue();
