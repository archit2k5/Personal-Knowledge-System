import { chatService } from '../services/chat.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export class ChatController {
  async createChat(req, res) {
    const result = await chatService.createChat(req.user.id, req.body.title);
    return ApiResponse.created(res, result);
  }

  async listChats(req, res) {
    const result = await chatService.listChats(req.user.id, {
      cursor: req.query.cursor,
      limit: req.query.limit,
      q: req.query.q,
    });
    return ApiResponse.success(res, 200, result);
  }

  async getChat(req, res) {
    const result = await chatService.getChat(req.user.id, req.params.chatId);
    return ApiResponse.success(res, 200, result);
  }

  async updateChat(req, res) {
    const result = await chatService.updateChat(
      req.user.id,
      req.params.chatId,
      req.body
    );
    return ApiResponse.success(res, 200, result);
  }

  async deleteChat(req, res) {
    await chatService.deleteChat(req.user.id, req.params.chatId);
    return ApiResponse.noContent(res);
  }
}

export const chatController = new ChatController();

