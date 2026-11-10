import { z } from 'zod';
import { objectIdSchema } from './common.schema.js';

export const listMessagesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const createMessageSchema = z.object({
  content: z.string().trim().min(1, 'Message cannot be empty').max(4000, 'Message cannot exceed 4000 characters'),
  documentIds: z.array(objectIdSchema).optional(),
});

export const messageIdParamSchema = z.object({
  chatId: objectIdSchema,
  messageId: objectIdSchema,
});

