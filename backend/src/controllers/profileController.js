import UserProfile from '../models/UserProfile.js';
import Follow from '../models/Follow.js';
import User from '../models/User.js';
import Block from '../models/Block.js';
import DirectMessage from '../models/DirectMessage.js';
import mongoose from 'mongoose';
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
/**
 * Get user profile by userId
 */
export const getUserProfile = async (req, res) => {
  try {
    console.log('🔍 getUserProfile called with params:', req.params, 'URL:', req.originalUrl);
    
    // Decode userId from URL (in case it was encoded)
    let { userId } = req.params;
    userId = decodeURIComponent(userId);

    console.log('🔍 Decoded userId:', userId);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    // Convert userId to ObjectId if it's a valid MongoDB ObjectId string
    let userObjectId;
    try {
      userObjectId = mongoose.Types.ObjectId.isValid(userId) 
        ? new mongoose.Types.ObjectId(userId) 
        : userId;
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
      });
    }

    // Get user profile - userId field in UserProfile is an ObjectId reference
    const userProfile = await UserProfile.findOne({ userId: userObjectId }).lean();
    const user = await User.findById(userObjectId).select('email').lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        profile: userProfile || null,
      },
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * Get all colleges that a user has joined/followed
 */
export const getUserColleges = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    // Convert userId to ObjectId
    let userObjectId;
    try {
      userObjectId = mongoose.Types.ObjectId.isValid(userId) 
        ? new mongoose.Types.ObjectId(userId) 
        : userId;
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
      });
    }

    // Get all colleges where user has sent messages
    const Message = (await import('../models/Message.js')).default;
    const collegeIdsFromMessages = await Message.distinct('collegeId', {
      senderId: userObjectId
    });

    // Get all colleges the user follows
    const follows = await Follow.find({ userId: userObjectId }).lean();
    const collegeIdsFromFollows = follows.map(f => f.collegeId);

    // Combine both lists and get unique college IDs (normalize to strings)
    const allCollegeIds = [...new Set([...collegeIdsFromMessages.map(String), ...collegeIdsFromFollows.map(String)])];

    console.log(`🔍 getUserColleges for userId ${userId}:`, {
      collegeIdsFromMessages: collegeIdsFromMessages.length,
      collegeIdsFromFollows: collegeIdsFromFollows.length,
      allCollegeIds: allCollegeIds
    });

    // If no colleges found, return empty array
    if (allCollegeIds.length === 0) {
      return res.json({
        success: true,
        colleges: []
      });
    }

    // Fetch college details - match by both aisheCode and name
    const College = (await import('../../models/College.js')).default;
    const colleges = await College.find({
      $or: [
        { aisheCode: { $in: allCollegeIds } },
        { name: { $in: allCollegeIds } }
      ]
    }).select('aisheCode name logo state district _id').lean();

    console.log(`✅ Found ${colleges.length} colleges for userId ${userId}:`, colleges.map(c => ({ name: c.name, aisheCode: c.aisheCode })));

    res.json({
      success: true,
      colleges: colleges.map(college => ({
        id: college._id?.toString(),
        aisheCode: college.aisheCode,
        name: college.name,
        logo: college.logo,
        state: college.state,
        district: college.district,
        // Add a normalized identifier for comparison
        identifier: college.aisheCode || college.name,
      })),
    });
  } catch (error) {
    console.error('Error getting user colleges:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting user colleges',
      error: error.message,
    });
  }
};

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

/**
 * Block a user
 */
export const blockUser = async (req, res) => {
  try {
    const { blockedId } = req.body;
    const blockerId = req.user.userId;

    if (!blockedId) {
      return res.status(400).json({
        success: false,
        message: 'User ID to block is required',
      });
    }

    if (String(blockerId) === String(blockedId)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot block yourself',
      });
    }

    // Check if already blocked
    const existingBlock = await Block.findOne({ blockerId, blockedId });
    if (existingBlock) {
      return res.json({
        success: true,
        message: 'User is already blocked',
        blocked: true,
      });
    }

    // Create block
    const block = new Block({ blockerId, blockedId });
    await block.save();

    res.json({
      success: true,
      message: 'User blocked successfully',
      blocked: true,
    });
  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * Unblock a user
 */
export const unblockUser = async (req, res) => {
  try {
    const { blockedId } = req.body;
    const blockerId = req.user.userId;

    if (!blockedId) {
      return res.status(400).json({
        success: false,
        message: 'User ID to unblock is required',
      });
    }

    const block = await Block.findOneAndDelete({ blockerId, blockedId });

    if (!block) {
      return res.status(404).json({
        success: false,
        message: 'User is not blocked',
      });
    }

    res.json({
      success: true,
      message: 'User unblocked successfully',
      blocked: false,
    });
  } catch (error) {
    console.error('Error unblocking user:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * Check if a user is blocked
 */
export const checkBlockStatus = async (req, res) => {
  try {
    const { userId } = req.query;
    const blockerId = req.user.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    // Check if current user blocked the other user
    const blockedByMe = await Block.findOne({ blockerId, blockedId: userId });
    
    // Check if current user is blocked by the other user
    const blockedByThem = await Block.findOne({ blockerId: userId, blockedId: blockerId });

    res.json({
      success: true,
      blockedByMe: !!blockedByMe,
      blockedByThem: !!blockedByThem,
      canMessage: !blockedByMe && !blockedByThem,
    });
  } catch (error) {
    console.error('Error checking block status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * Get count of active students for a college (active in last 24 hours)
 * Used for college group chat status display
 */
export const getCollegeActiveStudentsCount = async (req, res) => {
  try {
    const { collegeId } = req.query;

    if (!collegeId) {
      return res.status(400).json({
        success: false,
        message: 'College ID is required',
      });
    }

    // Calculate 24 hours ago
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // Count users who:
    // 1. Belong to this college (by aisheCode or name)
    // 2. Have been active in the last 24 hours (lastSeen >= 24 hours ago)
    const activeCount = await UserProfile.countDocuments({
      $or: [
        { 'college.aisheCode': collegeId },
        { 'college.name': collegeId },
      ],
      lastSeen: { $gte: twentyFourHoursAgo },
    });

    res.json({
      success: true,
      activeCount,
      collegeId,
    });
  } catch (error) {
    console.error('Error getting active students count:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * Get all blocked users for the current user
 */
export const getBlockedUsers = async (req, res) => {
  try {
    const blockerId = req.user.userId;

    // Get all blocks by this user
    const blocks = await Block.find({ blockerId }).lean();

    // Get user profiles for blocked users
    const blockedUserIds = blocks.map(b => {
      // Handle both ObjectId and string formats
      if (mongoose.Types.ObjectId.isValid(b.blockedId)) {
        return new mongoose.Types.ObjectId(b.blockedId);
      }
      return b.blockedId;
    });
    const userProfiles = await UserProfile.find({ userId: { $in: blockedUserIds } }).lean();
    const users = await User.find({ _id: { $in: blockedUserIds } }).select('email').lean();

    // Create maps for quick lookup
    const profileMap = new Map();
    userProfiles.forEach(profile => {
      profileMap.set(profile.userId.toString(), profile);
    });
    const userMap = new Map();
    users.forEach(user => {
      userMap.set(user._id.toString(), user);
    });

    // Format blocked users with details
    const blockedUsers = blocks
      .map(block => {
        const userId = block.blockedId.toString();
        const profile = profileMap.get(userId);
        const user = userMap.get(userId);

        if (!user) return null;

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
          email: user.email,
          avatar: avatar,
          blockedAt: block.createdAt,
        };
      })
      .filter(u => u !== null);

    res.json({
      success: true,
      blockedUsers,
      count: blockedUsers.length,
    });
  } catch (error) {
    console.error('Error getting blocked users:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting blocked users',
      error: error.message,
    });
  }
};

