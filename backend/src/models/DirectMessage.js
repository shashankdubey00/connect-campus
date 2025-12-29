import mongoose from 'mongoose';

const directMessageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
directMessageSchema.index({ senderId: 1, receiverId: 1, timestamp: 1 });
directMessageSchema.index({ receiverId: 1, senderId: 1, timestamp: 1 });

const DirectMessage = mongoose.models.DirectMessage || mongoose.model('DirectMessage', directMessageSchema);

export default DirectMessage;

