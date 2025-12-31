import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      maxlength: 500,
      default: '',
    },
    avatar: {
      type: String,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Group members (users who are part of the group)
    members: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      role: {
        type: String,
        enum: ['admin', 'member'],
        default: 'member',
      },
      joinedAt: {
        type: Date,
        default: Date.now,
      },
      addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    }],
    // Privacy settings
    isPrivate: {
      type: Boolean,
      default: true, // Groups are private by default
    },
    // Group settings
    settings: {
      allowMemberInvites: {
        type: Boolean,
        default: true, // Members can invite others
      },
      onlyAdminCanAdd: {
        type: Boolean,
        default: false, // Only admins can add members
      },
    },
    // Optional: Link to college (if group is college-specific)
    collegeId: {
      type: String,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
groupSchema.index({ createdBy: 1 });
groupSchema.index({ 'members.userId': 1 });
groupSchema.index({ collegeId: 1 });
groupSchema.index({ isPrivate: 1 });

// Method to check if user is a member
groupSchema.methods.isMember = function(userId) {
  return this.members.some(m => String(m.userId) === String(userId));
};

// Method to check if user is an admin
groupSchema.methods.isAdmin = function(userId) {
  const member = this.members.find(m => String(m.userId) === String(userId));
  return member && member.role === 'admin';
};

// Method to get member count
groupSchema.virtual('memberCount').get(function() {
  return this.members.length;
});

const Group = mongoose.models.Group || mongoose.model('Group', groupSchema);

export default Group;

