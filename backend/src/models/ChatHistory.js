import mongoose from 'mongoose';

const chatHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // For college chats
    collegeId: {
      type: String,
    },
    // For direct messages
    otherUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    chatType: {
      type: String,
      enum: ['college', 'direct'],
      required: true,
    },
    lastInteractionAt: {
      type: Date,
      default: Date.now,
    },
    clearedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
chatHistorySchema.index({ userId: 1, collegeId: 1, chatType: 1 }, { unique: true });
chatHistorySchema.index({ userId: 1, otherUserId: 1, chatType: 1 }, { unique: true });

const ChatHistory = mongoose.models.ChatHistory || mongoose.model('ChatHistory', chatHistorySchema);

export default ChatHistory;







