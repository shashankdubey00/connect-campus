import mongoose from 'mongoose';

const blockSchema = new mongoose.Schema(
  {
    blockerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    blockedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index to prevent duplicate blocks
blockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });

const Block = mongoose.models.Block || mongoose.model('Block', blockSchema);

export default Block;


