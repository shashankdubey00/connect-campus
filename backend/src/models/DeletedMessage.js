import mongoose from 'mongoose';

const deletedMessageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      required: true,
      index: true,
    },
    // Track if it's a college message or direct message
    messageType: {
      type: String,
      enum: ['college', 'direct'],
      required: true,
    },
    // For college messages
    collegeId: {
      type: String,
      index: true,
    },
    // For direct messages
    otherUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
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

const DeletedMessage = mongoose.models.DeletedMessage || mongoose.model('DeletedMessage', deletedMessageSchema);

export default DeletedMessage;


