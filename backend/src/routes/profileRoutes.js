import express from 'express';
import multer from 'multer';
import path from 'path';
import { protect } from '../middleware/authMiddleware.js';
import { uploadCollegeId, getVerificationStatus, updateProfile, joinCollege, leaveCollege, uploadProfilePicture } from '../controllers/profileController.js';

const router = express.Router();

// Configure multer for college ID uploads
const collegeIdStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/college-ids/'); // Store in uploads/college-ids/
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `college-id-${req.user.userId}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// Configure multer for profile picture uploads
const profilePictureStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/profile-pictures/'); // Store in uploads/profile-pictures/
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `profile-${req.user.userId}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const collegeIdUpload = multer({
  storage: collegeIdStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter,
});

const profilePictureUpload = multer({
  storage: profilePictureStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter,
});

// All routes require authentication
router.use(protect);

// Upload college ID image
router.post('/upload-college-id', collegeIdUpload.single('collegeIdImage'), uploadCollegeId);

// Upload profile picture
router.post('/upload-profile-picture', profilePictureUpload.single('profilePicture'), uploadProfilePicture);

// Get verification status
router.get('/verification-status', getVerificationStatus);

// Update profile
router.put('/update', updateProfile);

// Join college
router.post('/join-college', joinCollege);

// Leave college
router.post('/leave-college', leaveCollege);

export default router;

