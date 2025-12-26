import express from 'express';
import passport from '../config/passport.js';
import {
  signup,
  login,
  logout,
  verifyAuth,
  googleCallback,
  forgotPassword,
  verifyOTP,
  resetPassword,
  setPassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public routes
router.post('/signup', authLimiter, signup);
router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.get('/verify', verifyAuth);

// Password reset routes
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/verify-otp', authLimiter, verifyOTP);
router.post('/reset-password', authLimiter, resetPassword);

// Set password for Google users (protected)
router.post('/set-password', protect, authLimiter, setPassword);

// Google OAuth routes
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL}/login?error=google_auth_failed`,
  }),
  googleCallback
);

// Protected route example
router.get('/me', protect, async (req, res) => {
  try {
    const User = (await import('../models/User.js')).default;
    const UserProfile = (await import('../models/UserProfile.js')).default;

    const user = await User.findById(req.user.userId).select('-password');
    const userProfile = await UserProfile.findOne({ userId: user._id });

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        profile: userProfile,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

export default router;


