import mongoose from 'mongoose';

const userProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    firstName: {
      type: String,
      trim: true,
      default: '',
    },
    lastName: {
      type: String,
      trim: true,
      default: '',
    },
    displayName: {
      type: String,
      trim: true,
    },
    profilePicture: {
      type: String,
      default: '',
    },
    college: {
      aisheCode: String,
      name: String,
      district: String,
      state: String,
    },
    bio: {
      type: String,
      maxlength: 500,
      default: '',
    },
    interests: [String],
    year: {
      type: String,
      enum: ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduate', 'Other'],
    },
    course: {
      type: String,
      trim: true,
      default: '',
    },
    verification: {
      status: {
        type: String,
        enum: ['pending', 'verified', 'rejected', 'not_submitted'],
        default: 'not_submitted',
      },
      collegeIdImage: {
        url: String,
        uploadedAt: Date,
      },
      verifiedAt: Date,
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      rejectionReason: String,
    },
    // Track last seen time for online status
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const UserProfile = mongoose.models.UserProfile || mongoose.model('UserProfile', userProfileSchema);

export default UserProfile;



