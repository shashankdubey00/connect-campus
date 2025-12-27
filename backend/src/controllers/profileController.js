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

    let userProfile = await UserProfile.findOne({ userId });

    if (!userProfile) {
      userProfile = new UserProfile({ userId });
    }

    // Update fields
    if (displayName !== undefined) userProfile.displayName = displayName;
    if (bio !== undefined) userProfile.bio = bio;
    if (firstName !== undefined) userProfile.firstName = firstName;
    if (lastName !== undefined) userProfile.lastName = lastName;
    if (year !== undefined) userProfile.year = year;
    if (course !== undefined) userProfile.course = course;

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

