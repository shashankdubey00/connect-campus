import mongoose from 'mongoose';

const deletedMessageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      required: true,
    },
    // Track if it's a college message, direct message, or group message
    messageType: {
      type: String,
      enum: ['college', 'direct', 'group'],
      required: true,
    },
    // For college messages
    collegeId: {
      type: String,
    },
    // For direct messages
    otherUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // For group messages
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
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

// Compound index for efficient queries
deletedMessageSchema.index({ userId: 1, messageId: 1 }, { unique: true });
deletedMessageSchema.index({ userId: 1, collegeId: 1 });
deletedMessageSchema.index({ userId: 1, otherUserId: 1 });
deletedMessageSchema.index({ userId: 1, groupId: 1 });

const DeletedMessage = mongoose.models.DeletedMessage || mongoose.model('DeletedMessage', deletedMessageSchema);

export default DeletedMessage;


