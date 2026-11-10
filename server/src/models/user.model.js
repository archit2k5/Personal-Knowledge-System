import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerifiedAt: {
      type: Date,
    },
    emailVerificationTokenHash: {
      type: String,
      sparse: true,
      index: true,
    },
    emailVerificationExpiresAt: {
      type: Date,
    },
    emailVerificationSentAt: {
      type: Date,
    },
    passwordResetTokenHash: {
      type: String,
      sparse: true,
      index: true,
    },
    passwordResetExpiresAt: {
      type: Date,
    },
    passwordResetRequestedAt: {
      type: Date,
    },
    passwordChangedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        delete ret.emailVerificationTokenHash;
        delete ret.passwordResetTokenHash;
        return ret;
      },
    },
  }
);

export const User = mongoose.model('User', userSchema);

