import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      default: 'New chat',
      trim: true,
    },
    settings: {
      topK: { type: Number, default: 6 },
      model: { type: String },
      temperature: { type: Number, default: 0.7 },
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
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

chatSchema.index({ userId: 1, lastMessageAt: -1 });

export const Chat = mongoose.model('Chat', chatSchema);

