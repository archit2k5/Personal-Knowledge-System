import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
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
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    sizeBytes: {
      type: Number,
      required: true,
    },
    storageKey: {
      type: String,
      required: true,
    },
    bucket: {
      type: String,
      required: true,
    },
    etag: {
      type: String,
    },
    status: {
      type: String,
      enum: ['uploaded', 'processing', 'ready', 'failed'],
      default: 'uploaded',
      index: true,
    },
    error: {
      type: String,
    },
    pageCount: {
      type: Number,
      default: 0,
    },
    chunkCount: {
      type: Number,
      default: 0,
    },
    embeddingModel: {
      type: String,
    },
    contentHash: {
      type: String,
    },
  },
  {
    timestamps: true,
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

documentSchema.index({ chatId: 1, createdAt: -1 });
documentSchema.index(
  { chatId: 1, contentHash: 1 },
  { unique: true, partialFilterExpression: { contentHash: { $exists: true, $type: 'string' } } }
);

export const Document = mongoose.model('Document', documentSchema);

