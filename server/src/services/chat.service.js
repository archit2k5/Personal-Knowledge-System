import { Chat } from '../models/chat.model.js';
import { Message } from '../models/message.model.js';
import { Document } from '../models/document.model.js';
import { ApiError } from '../utils/ApiError.js';
import { deletePointsByChatId } from '../rag/qdrant.js';
import { deleteByPrefix } from '../storage/r2.js';

export class ChatService {
  async createChat(userId, title) {
    const chat = await Chat.create({
      userId,
      title: title || 'New chat',
      lastMessageAt: new Date(),
    });
    return { chat };
  }

  async listChats(userId, { cursor, limit = 20, q }) {
    const query = { userId };

    if (q) {
      query.title = { $regex: q, $options: 'i' };
    }

    if (cursor) {
      query.lastMessageAt = { $lt: new Date(cursor) };
    }

    const chats = await Chat.find(query)
      .sort({ lastMessageAt: -1 })
      .limit(limit + 1);

    const hasMore = chats.length > limit;
    const items = hasMore ? chats.slice(0, limit) : chats;
    const nextCursor = hasMore ? items[items.length - 1].lastMessageAt.toISOString() : null;

    return { items, nextCursor };
  }

  async getChat(userId, chatId) {
    const chat = await Chat.findOne({ _id: chatId, userId });
    if (!chat) {
      throw ApiError.notFound('Chat not found');
    }

    const documentCount = await Document.countDocuments({ chatId });
    return { chat, documentCount };
  }

  async updateChat(userId, chatId, data) {
    const chat = await Chat.findOne({ _id: chatId, userId });
    if (!chat) {
      throw ApiError.notFound('Chat not found');
    }

    if (data.title) {
      chat.title = data.title;
    }

    if (data.settings) {
      chat.settings = {
        ...chat.settings,
        ...data.settings,
      };
    }

    await chat.save();
    return { chat };
  }

  async deleteChat(userId, chatId) {
    const chat = await Chat.findOne({ _id: chatId, userId });
    if (!chat) {
      throw ApiError.notFound('Chat not found');
    }

    // 1. Delete Qdrant vector points
    await deletePointsByChatId(chatId);

    // 2. Delete R2 files under prefix
    const prefix = `users/${userId}/chats/${chatId}/`;
    await deleteByPrefix(prefix);

    // 3. Delete Mongo messages & documents & chat
    await Message.deleteMany({ chatId });
    await Document.deleteMany({ chatId });
    await Chat.deleteOne({ _id: chatId });
  }
}

export const chatService = new ChatService();

