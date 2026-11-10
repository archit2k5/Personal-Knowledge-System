import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    sources: [
      {
        documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
        filename: { type: String, required: true },
        page: { type: Number },
        chunkId: { type: String },
        score: { type: Number },
        snippet: { type: String, required: true },
      },
    ],
    model: {
      type: String,
    },
    usage: {
      promptTokens: { type: Number },
      completionTokens: { type: Number },
    },
    status: {
      type: String,
      enum: ['complete', 'error', 'stopped'],
      default: 'complete',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

messageSchema.index({ chatId: 1, createdAt: 1 });

export const Message = mongoose.model('Message', messageSchema);

