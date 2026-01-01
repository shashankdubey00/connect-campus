import mongoose from 'mongoose';

const groupInviteSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Unique invite code
    inviteCode: {
      type: String,
      required: true,
      uppercase: true,
    },
    // Unique token for invite link
    token: {
      type: String,
      required: true,
    },
    // Invite expiration date (optional)
    expiresAt: {
      type: Date,
      default: null,
    },
    // Maximum number of uses (optional)
    maxUses: {
      type: Number,
      default: null,
    },
    // Current number of uses
    useCount: {
      type: Number,
      default: 0,
    },
    // Track who used this invite
    usedBy: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      usedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    // Whether invite is still active
    isActive: {
      type: Boolean,
      default: true,
    },
    // Custom message for the invite
    customMessage: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
groupInviteSchema.index({ groupId: 1, isActive: 1 });
groupInviteSchema.index({ token: 1 }, { unique: true });
groupInviteSchema.index({ inviteCode: 1 }, { unique: true });
groupInviteSchema.index({ createdBy: 1 });

const GroupInvite = mongoose.models.GroupInvite || mongoose.model('GroupInvite', groupInviteSchema);

export default GroupInvite;


