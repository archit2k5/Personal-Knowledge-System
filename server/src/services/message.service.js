import mongoose from 'mongoose';
import { Message } from '../models/message.model.js';
import { Chat } from '../models/chat.model.js';
import { retrieveRelevantChunks } from '../rag/retriever.js';
import { buildSystemPrompt } from '../rag/prompt.js';
import { streamChatCompletion, rewriteQueryIfFollowUp } from '../rag/llm.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { ApiError } from '../utils/ApiError.js';

export class MessageService {
  async listMessages(chatId, { cursor, limit = 50 }) {
    const query = { chatId };
    if (cursor) {
      query.createdAt = { $gt: new Date(cursor) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: 1 })
      .limit(limit + 1);

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;

    return { items, nextCursor };
  }

  async streamMessage({ userId, chatId, content, documentIds }, sseWriter) {
    const chat = await Chat.findOne({ _id: chatId, userId });
    if (!chat) {
      sseWriter.sendError({ code: 'NOT_FOUND', message: 'Chat not found' });
      sseWriter.close();
      return;
    }

    // 1. Save user message
    const userMessage = await Message.create({
      chatId,
      userId,
      role: 'user',
      content,
      status: 'complete',
    });

    // Auto-title chat on first message
    if (chat.title === 'New chat') {
      const generatedTitle = content.slice(0, 40).trim() + (content.length > 40 ? '...' : '');
      chat.title = generatedTitle;
      chat.lastMessageAt = new Date();
      await chat.save();
    } else {
      chat.lastMessageAt = new Date();
      await chat.save();
    }

    const assistantMessageId = new mongoose.Types.ObjectId();

    // 2. Emit meta event
    sseWriter.sendMeta({
      userMessageId: userMessage._id.toString(),
      assistantMessageId: assistantMessageId.toString(),
    });

    try {
      // 3. Load last N messages from this chat
      const historyWindow = env.HISTORY_WINDOW;
      const recentHistory = await Message.find({ chatId })
        .sort({ createdAt: -1 })
        .limit(historyWindow)
        .lean();

      recentHistory.reverse();

      // 4. Query rewriting for follow-ups
      const searchQuery = await rewriteQueryIfFollowUp(
        content,
        recentHistory.slice(0, -1) // Exclude current message from prior context
      );

      // 5. Retrieve relevant chunks
      const topK = chat.settings?.topK || env.RAG_TOP_K;
      const chunks = await retrieveRelevantChunks({
        userId,
        chatId,
        query: searchQuery,
        topK,
        documentIds,
      });

      // 6. Emit sources event
      sseWriter.sendSources(chunks);

      const messagesForLlm = [
        { role: 'system', content: buildSystemPrompt(chunks) },
        ...recentHistory.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      ];

      // 7. Stream tokens from LLM
      let accumulatedResponse = '';
      const stream = streamChatCompletion(messagesForLlm, {
        model: chat.settings?.model,
        temperature: chat.settings?.temperature,
      });

      for await (const token of stream) {
        accumulatedResponse += token;
        sseWriter.sendToken(token);
      }

      // 8. Save assistant message
      const sourcesForModel = chunks.map((c) => ({
        documentId: c.documentId ? new mongoose.Types.ObjectId(c.documentId) : undefined,
        filename: c.filename,
        page: c.page,
        score: c.score,
        snippet: c.text.slice(0, 300),
      }));

      await Message.create({
        _id: assistantMessageId,
        chatId,
        userId,
        role: 'assistant',
        content: accumulatedResponse,
        sources: sourcesForModel,
        status: 'complete',
      });

      // 9. Emit done event
      sseWriter.sendDone({
        messageId: assistantMessageId.toString(),
      });
    } catch (error) {
      logger.error('Error generating chat response stream', {
        error: String(error),
        chatId,
      });

      await Message.create({
        _id: assistantMessageId,
        chatId,
        userId,
        role: 'assistant',
        content: 'An error occurred while generating the answer.',
        status: 'error',
      });

      sseWriter.sendError({
        code: 'UPSTREAM_ERROR',
        message: 'Failed to generate message response',
      });
    } finally {
      sseWriter.close();
    }
  }

  async regenerateMessage({ userId, chatId, messageId }, sseWriter) {
    const chat = await Chat.findOne({ _id: chatId, userId });
    if (!chat) {
      sseWriter.sendError({ code: 'NOT_FOUND', message: 'Chat not found' });
      sseWriter.close();
      return;
    }

    const assistantMsg = await Message.findOne({ _id: messageId, chatId });
    if (!assistantMsg || assistantMsg.role !== 'assistant') {
      sseWriter.sendError({ code: 'BAD_REQUEST', message: 'Can only regenerate an assistant message' });
      sseWriter.close();
      return;
    }

    // Find the preceding user message
    const userMsg = await Message.findOne({
      chatId,
      createdAt: { $lt: assistantMsg.createdAt },
      role: 'user',
    }).sort({ createdAt: -1 });

    if (!userMsg) {
      sseWriter.sendError({ code: 'BAD_REQUEST', message: 'No user prompt found to regenerate' });
      sseWriter.close();
      return;
    }

    sseWriter.sendMeta({
      userMessageId: userMsg._id.toString(),
      assistantMessageId: assistantMsg._id.toString(),
    });

    try {
      const historyWindow = env.HISTORY_WINDOW;
      const recentHistory = await Message.find({
        chatId,
        createdAt: { $lt: assistantMsg.createdAt },
      })
        .sort({ createdAt: -1 })
        .limit(historyWindow)
        .lean();

      recentHistory.reverse();

      const searchQuery = await rewriteQueryIfFollowUp(
        userMsg.content,
        recentHistory.slice(0, -1)
      );

      const topK = chat.settings?.topK || env.RAG_TOP_K;
      const chunks = await retrieveRelevantChunks({
        userId,
        chatId,
        query: searchQuery,
        topK,
      });

      sseWriter.sendSources(chunks);

      const messagesForLlm = [
        { role: 'system', content: buildSystemPrompt(chunks) },
        ...recentHistory.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      ];

      let accumulatedResponse = '';
      const stream = streamChatCompletion(messagesForLlm, {
        model: chat.settings?.model,
        temperature: chat.settings?.temperature,
      });

      for await (const token of stream) {
        accumulatedResponse += token;
        sseWriter.sendToken(token);
      }

      const sourcesForModel = chunks.map((c) => ({
        documentId: c.documentId ? new mongoose.Types.ObjectId(c.documentId) : undefined,
        filename: c.filename,
        page: c.page,
        score: c.score,
        snippet: c.text.slice(0, 300),
      }));

      assistantMsg.content = accumulatedResponse;
      assistantMsg.sources = sourcesForModel;
      assistantMsg.status = 'complete';
      await assistantMsg.save();

      sseWriter.sendDone({
        messageId: assistantMsg._id.toString(),
      });
    } catch (error) {
      logger.error('Error during message regeneration', { error: String(error) });
      sseWriter.sendError({
        code: 'UPSTREAM_ERROR',
        message: 'Failed to regenerate response',
      });
    } finally {
      sseWriter.close();
    }
  }

  async clearMessages(chatId) {
    await Message.deleteMany({ chatId });
  }
}

export const messageService = new MessageService();
