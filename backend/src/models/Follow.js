import mongoose from 'mongoose';

const followSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    collegeId: {
      type: String,
      required: true,
    },
    collegeAisheCode: {
      type: String,
    },
    // Invite tracking
    joinedViaInvite: {
      type: Boolean,
      default: false,
    },
    inviteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invite',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure a user can only follow a college once
followSchema.index({ userId: 1, collegeId: 1 }, { unique: true });
followSchema.index({ collegeAisheCode: 1 });

const Follow = mongoose.models.Follow || mongoose.model('Follow', followSchema);

export default Follow;





