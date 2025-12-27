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
      index: true, // Index for faster queries by college
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true, // Index for sorting by time
    },
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

