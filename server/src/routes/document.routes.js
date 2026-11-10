import { Router } from 'express';
import { documentController } from '../controllers/document.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { checkChatOwnership } from '../middlewares/chatOwnership.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  uploadMiddleware,
  verifyMagicBytes,
} from '../middlewares/upload.middleware.js';
import { uploadRateLimiter } from '../middlewares/rateLimit.middleware.js';
import { chatIdParamSchema } from '../validators/chat.schema.js';
import { documentIdParamSchema } from '../validators/document.schema.js';

const router = Router();

router.use(authenticate);

router.post(
  '/chats/:chatId/documents',
  uploadRateLimiter,
  validate({ params: chatIdParamSchema }),
  checkChatOwnership,
  uploadMiddleware.array('files', 5),
  verifyMagicBytes,
  asyncHandler(documentController.uploadDocuments.bind(documentController))
);

router.get(
  '/chats/:chatId/documents',
  validate({ params: chatIdParamSchema }),
  checkChatOwnership,
  asyncHandler(documentController.listDocuments.bind(documentController))
);

router.get(
  '/chats/:chatId/documents/:documentId',
  validate({ params: documentIdParamSchema }),
  checkChatOwnership,
  asyncHandler(documentController.getDocument.bind(documentController))
);

router.get(
  '/chats/:chatId/documents/:documentId/file',
  validate({ params: documentIdParamSchema }),
  checkChatOwnership,
  asyncHandler(documentController.getPresignedFileUrl.bind(documentController))
);

router.post(
  '/chats/:chatId/documents/:documentId/reprocess',
  validate({ params: documentIdParamSchema }),
  checkChatOwnership,
  asyncHandler(documentController.reprocessDocument.bind(documentController))
);

router.delete(
  '/chats/:chatId/documents/:documentId',
  validate({ params: documentIdParamSchema }),
  checkChatOwnership,
  asyncHandler(documentController.deleteDocument.bind(documentController))
);

export default router;

