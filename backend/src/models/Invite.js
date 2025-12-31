import mongoose from 'mongoose';

const inviteSchema = new mongoose.Schema(
  {
    // College or community being invited to
    collegeId: {
      type: String,
      required: true,
      index: true,
    },
    
    // User who created the invite
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    
    // Unique invite code (e.g., "JOIN-ABC123")
    inviteCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      uppercase: true,
    },
    
    // Unique token for invite link
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    
    // Type of invite: 'college' or 'community'
    inviteType: {
      type: String,
      enum: ['college', 'community'],
      default: 'college',
    },
    
    // Invite expiration date (optional)
    expiresAt: {
      type: Date,
      default: null, // null means never expires
    },
    
    // Maximum number of uses (optional)
    maxUses: {
      type: Number,
      default: null, // null means unlimited
    },
    
    // Current number of uses
    useCount: {
      type: Number,
      default: 0,
    },
    
    // Track who used this invite (for referral tracking)
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

// Index for efficient lookups
inviteSchema.index({ collegeId: 1, isActive: 1 });
inviteSchema.index({ token: 1 });
inviteSchema.index({ inviteCode: 1 });

// Method to check if invite is valid
inviteSchema.methods.isValid = function() {
  if (!this.isActive) return false;
  if (this.expiresAt && new Date() > this.expiresAt) return false;
  if (this.maxUses && this.useCount >= this.maxUses) return false;
  return true;
};

// Method to record usage
inviteSchema.methods.recordUsage = function(userId) {
  this.useCount += 1;
  this.usedBy.push({
    userId: userId,
    usedAt: new Date(),
  });
  return this.save();
};

const Invite = mongoose.model('Invite', inviteSchema);

export default Invite;

