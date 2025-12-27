import express from 'express';
import multer from 'multer';
import path from 'path';
import { protect } from '../middleware/authMiddleware.js';
import { uploadCollegeId, getVerificationStatus, updateProfile } from '../controllers/profileController.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/college-ids/'); // Store in uploads/college-ids/
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `college-id-${req.user.userId}-${uniqueSuffix}${path.extname(file.originalname)}`);
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

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter,
});

// All routes require authentication
router.use(protect);

// Upload college ID image
router.post('/upload-college-id', upload.single('collegeIdImage'), uploadCollegeId);

// Get verification status
router.get('/verification-status', getVerificationStatus);

// Update profile
router.put('/update', updateProfile);

export default router;

