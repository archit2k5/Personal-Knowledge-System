import { z } from 'zod';
import { objectIdSchema } from './common.schema.js';

export const chatIdParamSchema = z.object({
  chatId: objectIdSchema,
});

export const createChatSchema = z.object({
  title: z.string().trim().max(100, 'Title cannot exceed 100 characters').optional(),
});

export const listChatsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  q: z.string().trim().optional(),
});

export const updateChatSchema = z.object({
  title: z.string().trim().min(1).max(100).optional(),
  settings: z
    .object({
      topK: z.number().int().min(1).max(20).optional(),
      model: z.string().optional(),
      temperature: z.number().min(0).max(2).optional(),
    })
    .optional(),
});

