import UserProfile from '../models/UserProfile.js';
import Follow from '../models/Follow.js';
import User from '../models/User.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Upload college ID image
 */
export const uploadCollegeId = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const userId = req.user.userId;
    const fileUrl = `/uploads/college-ids/${req.file.filename}`;

    // Find or create user profile
    let userProfile = await UserProfile.findOne({ userId });

    if (!userProfile) {
      userProfile = new UserProfile({
        userId,
        verification: {
          status: 'pending',
          collegeIdImage: {
            url: fileUrl,
            uploadedAt: new Date(),
          },
        },
      });
    } else {
      // Delete old image if exists
      if (userProfile.verification?.collegeIdImage?.url) {
        const oldFilePath = path.join(__dirname, '../../', userProfile.verification.collegeIdImage.url);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      // Update verification status
      userProfile.verification = {
        status: 'pending',
        collegeIdImage: {
          url: fileUrl,
          uploadedAt: new Date(),
        },
      };
    }

    await userProfile.save();

    res.json({
      success: true,
      message: 'College ID uploaded successfully. Verification is pending.',
      verification: {
        status: userProfile.verification.status,
        collegeIdImage: userProfile.verification.collegeIdImage,
      },
    });
  } catch (error) {
    console.error('Error uploading college ID:', error);
    
    // Delete uploaded file if there was an error
    if (req.file) {
      const filePath = path.join(__dirname, '../../', req.file.path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Error uploading college ID',
      error: error.message,
    });
  }
};

/**
 * Get verification status
 */
export const getVerificationStatus = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userProfile = await UserProfile.findOne({ userId });

    if (!userProfile) {
      return res.json({
        success: true,
        verification: {
          status: 'not_submitted',
        },
      });
    }

    res.json({
      success: true,
      verification: {
        status: userProfile.verification?.status || 'not_submitted',
        collegeIdImage: userProfile.verification?.collegeIdImage || null,
        verifiedAt: userProfile.verification?.verifiedAt || null,
        rejectionReason: userProfile.verification?.rejectionReason || null,
      },
    });
  } catch (error) {
    console.error('Error fetching verification status:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching verification status',
      error: error.message,
    });
  }
};

/**
 * Update profile
 */
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { displayName, bio, firstName, lastName, year, course } = req.body;

    // Validate required fields
    if (!displayName || !displayName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Display name is required',
      });
    }

    let userProfile = await UserProfile.findOne({ userId });

    if (!userProfile) {
      userProfile = new UserProfile({ userId });
    }

    // Update fields (displayName is required, others are optional)
    userProfile.displayName = displayName.trim();
    if (bio !== undefined) userProfile.bio = bio.trim() || '';
    if (firstName !== undefined) userProfile.firstName = firstName.trim() || '';
    if (lastName !== undefined) userProfile.lastName = lastName.trim() || '';
    if (year !== undefined) userProfile.year = year || '';
    if (course !== undefined) userProfile.course = course.trim() || '';

    await userProfile.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: userProfile,
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message,
    });
  }
};

/**
 * Join a college
 */
export const joinCollege = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { aisheCode, name, district, state } = req.body;

    if (!aisheCode || !name) {
      return res.status(400).json({
        success: false,
        message: 'College aisheCode and name are required',
      });
    }

    let userProfile = await UserProfile.findOne({ userId });

    if (!userProfile) {
      userProfile = new UserProfile({ userId });
    }

    // Update college information
    userProfile.college = {
      aisheCode,
      name,
      district: district || '',
      state: state || '',
    };

    await userProfile.save();

    res.json({
      success: true,
      message: 'Successfully joined college',
      profile: userProfile,
    });
  } catch (error) {
    console.error('Error joining college:', error);
    res.status(500).json({
      success: false,
      message: 'Error joining college',
      error: error.message,
    });
  }
};

/**
 * Leave a college
 */
export const leaveCollege = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { aisheCode } = req.body;

    const userProfile = await UserProfile.findOne({ userId });

    if (!userProfile) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found',
      });
    }

    // Check if user is a member of this college
    if (userProfile.college?.aisheCode !== aisheCode) {
      return res.status(400).json({
        success: false,
        message: 'You are not a member of this college',
      });
    }

    // Clear college information
    userProfile.college = undefined;

    await userProfile.save();

    res.json({
      success: true,
      message: 'Successfully left college',
      profile: userProfile,
    });
  } catch (error) {
    console.error('Error leaving college:', error);
    res.status(500).json({
      success: false,
      message: 'Error leaving college',
      error: error.message,
    });
  }
};

/**
 * Follow a college
 */
export const followCollege = async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }
    
    const userId = req.user.userId;
    const { aisheCode, name } = req.body;

    if (!aisheCode && !name) {
      return res.status(400).json({
        success: false,
        message: 'College aisheCode or name is required',
      });
    }

    const collegeId = aisheCode || name;

    // Check if already following
    const existingFollow = await Follow.findOne({
      userId,
      collegeId,
    });

    if (existingFollow) {
      return res.json({
        success: true,
        message: 'Already following this college',
        follow: existingFollow,
      });
    }

    // Create new follow
    const follow = new Follow({
      userId,
      collegeId,
      collegeAisheCode: aisheCode,
    });

    await follow.save();

    res.json({
      success: true,
      message: 'Successfully followed college',
      follow,
    });
  } catch (error) {
    console.error('Error following college:', error);
    res.status(500).json({
      success: false,
      message: 'Error following college',
      error: error.message,
    });
  }
};

/**
 * Unfollow a college
 */
export const unfollowCollege = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { aisheCode, name } = req.body;

    if (!aisheCode && !name) {
      return res.status(400).json({
        success: false,
        message: 'College aisheCode or name is required',
      });
    }

    const collegeId = aisheCode || name;

    // Find and delete follow
    const follow = await Follow.findOneAndDelete({
      userId,
      collegeId,
    });

    if (!follow) {
      return res.status(404).json({
        success: false,
        message: 'You are not following this college',
      });
    }

    res.json({
      success: true,
      message: 'Successfully unfollowed college',
    });
  } catch (error) {
    console.error('Error unfollowing college:', error);
    res.status(500).json({
      success: false,
      message: 'Error unfollowing college',
      error: error.message,
    });
  }
};

/**
 * Check if user follows a college
 */
export const checkFollowStatus = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { aisheCode, name } = req.query;

    if (!aisheCode && !name) {
      return res.status(400).json({
        success: false,
        message: 'College aisheCode or name is required',
      });
    }

    const collegeId = aisheCode || name;

    const follow = await Follow.findOne({
      userId,
      collegeId,
    });

    res.json({
      success: true,
      isFollowing: !!follow,
    });
  } catch (error) {
    console.error('Error checking follow status:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking follow status',
      error: error.message,
    });
  }
};

/**
 * Get count of followers for a college
 */
export const getCollegeFollowersCount = async (req, res) => {
  try {
    const { aisheCode, name } = req.query;

    if (!aisheCode && !name) {
      return res.status(400).json({
        success: false,
        message: 'College aisheCode or name is required',
      });
    }

    const collegeId = aisheCode || name;

    const count = await Follow.countDocuments({ collegeId });

    res.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error('Error getting followers count:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting followers count',
      error: error.message,
    });
  }
};

/**
 * Get all followers of a college with user details
 */
export const getCollegeFollowers = async (req, res) => {
  try {
    const { aisheCode, name } = req.query;

    if (!aisheCode && !name) {
      return res.status(400).json({
        success: false,
        message: 'College aisheCode or name is required',
      });
    }

    const collegeId = aisheCode || name;

    // Get all follows for this college
    const follows = await Follow.find({ collegeId }).lean();

    // Get user IDs
    const userIds = follows.map(f => f.userId);

    // Get user profiles
    const userProfiles = await UserProfile.find({ userId: { $in: userIds } }).lean();
    const users = await User.find({ _id: { $in: userIds } }).select('email').lean();

    // Create a map of userId to profile and user
    const profileMap = new Map();
    userProfiles.forEach(profile => {
      profileMap.set(profile.userId.toString(), profile);
    });
    const userMap = new Map();
    users.forEach(user => {
      userMap.set(user._id.toString(), user);
    });

    // Format followers with user details
    const followers = follows
      .map(f => {
        const userId = f.userId.toString();
        const profile = profileMap.get(userId);
        const user = userMap.get(userId);

        if (!user) return null; // Skip if user not found

        const displayName = profile?.displayName || 
          (profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : '') || 
          user.email?.split('@')[0] || 
          'User';
        
        let avatar = '';
        if (profile?.profilePicture) {
          if (profile.profilePicture.startsWith('/uploads/')) {
            avatar = profile.profilePicture;
          } else {
            avatar = profile.profilePicture;
          }
        } else {
          const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
          avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=50&background=00a8ff&color=fff`;
        }

        return {
          id: userId,
          name: displayName,
          avatar: avatar,
        };
      })
      .filter(f => f !== null); // Remove null entries

    res.json({
      success: true,
      members: followers,
      count: followers.length,
    });
  } catch (error) {
    console.error('Error getting college followers:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting college followers',
      error: error.message,
    });
  }
};

/**
 * Upload profile picture
 */
export const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const userId = req.user.userId;
    const fileUrl = `/uploads/profile-pictures/${req.file.filename}`;

    // Find or create user profile
    let userProfile = await UserProfile.findOne({ userId });

    if (!userProfile) {
      userProfile = new UserProfile({
        userId,
        profilePicture: fileUrl,
      });
    } else {
      // Delete old profile picture if exists
      if (userProfile.profilePicture && userProfile.profilePicture.startsWith('/uploads/profile-pictures/')) {
        const oldFilePath = path.join(__dirname, '../../', userProfile.profilePicture);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      // Update profile picture
      userProfile.profilePicture = fileUrl;
    }

    await userProfile.save();

    res.json({
      success: true,
      message: 'Profile picture uploaded successfully',
      profilePicture: userProfile.profilePicture,
    });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    
    // Delete uploaded file if there was an error
    if (req.file) {
      const filePath = path.join(__dirname, '../../', req.file.path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Error uploading profile picture',
      error: error.message,
    });
  }
};

