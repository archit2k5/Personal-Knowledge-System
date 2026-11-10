import mongoose from 'mongoose';
import { Chat } from '../models/chat.model.js';
import { ApiError } from '../utils/ApiError.js';

export async function checkChatOwnership(req, _res, next) {
  const { chatId } = req.params;

  if (!chatId || !mongoose.Types.ObjectId.isValid(chatId)) {
    return next(ApiError.notFound('Chat not found'));
  }

  if (!req.user) {
    return next(ApiError.unauthorized());
  }

  try {
    const chat = await Chat.findOne({
      _id: chatId,
      userId: req.user.id,
    });

    if (!chat) {
      // 404 instead of 403 prevents chat ID probing
      return next(ApiError.notFound('Chat not found'));
    }

    req.chat = chat;
    next();
  } catch (error) {
    next(error);
  }
}

