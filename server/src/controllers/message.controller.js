import { messageService } from '../services/message.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { createSSEWriter } from '../utils/sse.js';

export class MessageController {
  async listMessages(req, res) {
    const result = await messageService.listMessages(req.params.chatId, {
      cursor: req.query.cursor,
      limit: req.query.limit,
    });
    return ApiResponse.success(res, 200, result);
  }

  async createMessage(req, res) {
    const sseWriter = createSSEWriter(res);

    await messageService.streamMessage(
      {
        userId: req.user.id,
        chatId: req.params.chatId,
        content: req.body.content,
        documentIds: req.body.documentIds,
      },
      sseWriter
    );
  }

  async regenerateMessage(req, res) {
    const sseWriter = createSSEWriter(res);

    await messageService.regenerateMessage(
      {
        userId: req.user.id,
        chatId: req.params.chatId,
        messageId: req.params.messageId,
      },
      sseWriter
    );
  }

  async stopMessage(_req, res) {
    return ApiResponse.noContent(res);
  }

  async clearMessages(req, res) {
    await messageService.clearMessages(req.params.chatId);
    return ApiResponse.noContent(res);
  }
}

export const messageController = new MessageController();
