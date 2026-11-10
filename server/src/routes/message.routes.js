import { Router } from 'express';
import { messageController } from '../controllers/message.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { checkChatOwnership } from '../middlewares/chatOwnership.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { messageRateLimiter } from '../middlewares/rateLimit.middleware.js';
import { chatIdParamSchema } from '../validators/chat.schema.js';
import {
  listMessagesQuerySchema,
  createMessageSchema,
  messageIdParamSchema,
} from '../validators/message.schema.js';

const router = Router();

router.use(authenticate);

router.get(
  '/chats/:chatId/messages',
  validate({ params: chatIdParamSchema, query: listMessagesQuerySchema }),
  checkChatOwnership,
  asyncHandler(messageController.listMessages.bind(messageController))
);

router.post(
  '/chats/:chatId/messages',
  messageRateLimiter,
  validate({ params: chatIdParamSchema, body: createMessageSchema }),
  checkChatOwnership,
  asyncHandler(messageController.createMessage.bind(messageController))
);

router.post(
  '/chats/:chatId/messages/:messageId/regenerate',
  messageRateLimiter,
  validate({ params: messageIdParamSchema }),
  checkChatOwnership,
  asyncHandler(messageController.regenerateMessage.bind(messageController))
);

router.post(
  '/chats/:chatId/messages/stop',
  validate({ params: chatIdParamSchema }),
  checkChatOwnership,
  asyncHandler(messageController.stopMessage.bind(messageController))
);

router.delete(
  '/chats/:chatId/messages',
  validate({ params: chatIdParamSchema }),
  checkChatOwnership,
  asyncHandler(messageController.clearMessages.bind(messageController))
);

export default router;
