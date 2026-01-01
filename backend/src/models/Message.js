import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    collegeId: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    readBy: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      readAt: {
        type: Date,
        default: Date.now,
      },
    }],
    deliveredTo: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      deliveredAt: {
        type: Date,
        default: Date.now,
      },
    }],
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient college message queries
// Supports both ascending and descending timestamp queries
messageSchema.index({ collegeId: 1, timestamp: 1 }); // Ascending for chronological display
messageSchema.index({ collegeId: 1, timestamp: -1 }); // Descending for reverse chronological (if needed)

const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);

export default Message;

