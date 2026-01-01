import mongoose from 'mongoose';

const groupMessageSchema = new mongoose.Schema(
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
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GroupMessage',
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
    attachments: [{
      type: {
        type: String,
        enum: ['image', 'file'],
      },
      url: String,
      filename: String,
      size: Number,
    }],
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
groupMessageSchema.index({ groupId: 1, timestamp: -1 });
groupMessageSchema.index({ senderId: 1 });

const GroupMessage = mongoose.models.GroupMessage || mongoose.model('GroupMessage', groupMessageSchema);

export default GroupMessage;


