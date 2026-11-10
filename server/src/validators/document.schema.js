import { z } from 'zod';
import { objectIdSchema } from './common.schema.js';

export const documentIdParamSchema = z.object({
  chatId: objectIdSchema,
  documentId: objectIdSchema,
});

