import mongoose from 'mongoose';

const deletedChatSchema = new mongoose.Schema(
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
    deletedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries (sparse to handle null values)
deletedChatSchema.index({ userId: 1, collegeId: 1, chatType: 1 }, { unique: true, sparse: true });
deletedChatSchema.index({ userId: 1, otherUserId: 1, chatType: 1 }, { unique: true, sparse: true });

const DeletedChat = mongoose.models.DeletedChat || mongoose.model('DeletedChat', deletedChatSchema);

export default DeletedChat;

