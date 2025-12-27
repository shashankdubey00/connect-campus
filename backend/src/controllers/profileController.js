import UserProfile from '../models/UserProfile.js';
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

