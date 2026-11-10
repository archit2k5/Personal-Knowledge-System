import { Router } from 'express';
import { searchController } from '../controllers/search.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { checkChatOwnership } from '../middlewares/chatOwnership.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { chatIdParamSchema } from '../validators/chat.schema.js';

const router = Router();

router.use(authenticate);

router.post(
  '/chats/:chatId/search',
  validate({ params: chatIdParamSchema }),
  checkChatOwnership,
  asyncHandler(searchController.search.bind(searchController))
);

export default router;

