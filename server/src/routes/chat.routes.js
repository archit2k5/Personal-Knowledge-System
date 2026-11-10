import { Router } from 'express';
import { chatController } from '../controllers/chat.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { checkChatOwnership } from '../middlewares/chatOwnership.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createChatSchema,
  listChatsQuerySchema,
  chatIdParamSchema,
  updateChatSchema,
} from '../validators/chat.schema.js';

const router = Router();

router.use(authenticate);

router.post(
  '/chats',
  validate({ body: createChatSchema }),
  asyncHandler(chatController.createChat.bind(chatController))
);

router.get(
  '/chats',
  validate({ query: listChatsQuerySchema }),
  asyncHandler(chatController.listChats.bind(chatController))
);

router.get(
  '/chats/:chatId',
  validate({ params: chatIdParamSchema }),
  checkChatOwnership,
  asyncHandler(chatController.getChat.bind(chatController))
);

router.patch(
  '/chats/:chatId',
  validate({ params: chatIdParamSchema, body: updateChatSchema }),
  checkChatOwnership,
  asyncHandler(chatController.updateChat.bind(chatController))
);

router.delete(
  '/chats/:chatId',
  validate({ params: chatIdParamSchema }),
  checkChatOwnership,
  asyncHandler(chatController.deleteChat.bind(chatController))
);

export default router;

