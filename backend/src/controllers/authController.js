/**
 * Authentication Controller
 * 
 * Handles all authentication-related operations including:
 * - User registration (signup)
 * - User login
 * - Password reset (OTP-based)
 * - Google OAuth authentication
 * - JWT token management
 * 
 * @module controllers/authController
 */

import User from '../models/User.js';
import UserProfile from '../models/UserProfile.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { sendOTPEmail } from '../utils/emailService.js';

/**
 * Validates password strength
 * 
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 * 
 * @param {string} password - Password to validate
 * @returns {boolean} - True if password meets requirements
 */
const isStrongPassword = (password) => {
  return (
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^a-zA-Z0-9]/.test(password)
  );
};

/**
 * Generates JWT token for user authentication
 * 
 * @param {string|ObjectId} userId - User ID
 * @param {string} role - User role (default: 'student')
 * @returns {string} - JWT token
 */
const generateToken = (userId, role = 'student') => {
  return jwt.sign(
    { userId: userId.toString(), role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

/**
 * Register a new user
 * 
 * Creates a new user account with email and password.
 * Also creates a default user profile.
 * 
 * @route POST /api/auth/signup
 * @access Public
 * @param {Object} req.body - Request body
 * @param {string} req.body.email - User email
 * @param {string} req.body.password - User password
 * @returns {Object} Response with user data and JWT token
 */
export const signup = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // Check password strength
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        message:
          'Password must be at least 8 characters and include uppercase, lowercase, number, and special character',
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    // Create user
    const user = new User({
      email,
      password,
    });

    await user.save();

    // Create user profile
    const userProfile = new UserProfile({
      userId: user._id,
      displayName: email.split('@')[0],
    });

    await userProfile.save();

    // Generate token
    const token = generateToken(user._id, user.role);

    // Determine if we're in production (check multiple indicators)
    const isProduction = process.env.NODE_ENV === 'production' || 
                         process.env.CLIENT_URL?.includes('vercel.app') ||
                         process.env.CLIENT_URL?.includes('onrender.com') ||
                         !process.env.NODE_ENV || process.env.NODE_ENV === 'production';
    
    // Set httpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProduction, // Must be true for sameSite: 'none'
      sameSite: isProduction ? 'none' : 'lax', // 'none' required for cross-domain in production
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    
    console.log('[Auth] Setting signup cookie:', {
      userId: user._id,
      email: user.email,
      NODE_ENV: process.env.NODE_ENV,
      CLIENT_URL: process.env.CLIENT_URL,
      isProduction: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      secure: isProduction
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during signup',
    });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check if account is locked
    if (user.isLocked()) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to too many failed login attempts',
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.incLoginAttempts();
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Reset failed login attempts
    await user.resetLoginAttempts();

    // Generate token
    const token = generateToken(user._id, user.role);

    // Determine if we're in production (check multiple indicators)
    const isProduction = process.env.NODE_ENV === 'production' || 
                         process.env.CLIENT_URL?.includes('vercel.app') ||
                         process.env.CLIENT_URL?.includes('onrender.com') ||
                         !process.env.NODE_ENV || process.env.NODE_ENV === 'production';
    
    // Set httpOnly cookie
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction, // Must be true for sameSite: 'none'
      sameSite: isProduction ? 'none' : 'lax', // 'none' required for cross-domain in production
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };
    
    console.log('[Auth] Setting login cookie:', {
      userId: user._id,
      email: user.email,
      options: cookieOptions,
      origin: req.headers.origin,
      NODE_ENV: process.env.NODE_ENV,
      CLIENT_URL: process.env.CLIENT_URL,
      isProduction: isProduction,
      cookieSameSite: cookieOptions.sameSite,
      cookieSecure: cookieOptions.secure
    });
    
    res.cookie('token', token, cookieOptions);

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
    });
  }
};

// Logout user
export const logout = async (req, res) => {
  // For production cross-domain, need same options as when setting cookie
  const isProduction = process.env.NODE_ENV === 'production' || 
                       process.env.CLIENT_URL?.includes('vercel.app') ||
                       process.env.CLIENT_URL?.includes('onrender.com');
  
  if (isProduction) {
    // Cross-domain: need same options as when setting cookie
    res.clearCookie('token', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
    });
  } else {
    // Localhost: simple clearCookie works
    res.clearCookie('token');
  }
  
  res.json({
    success: true,
    message: 'Logout successful',
  });
};

// Verify authentication
export const verifyAuth = async (req, res) => {
  try {
    const token = req.cookies?.token;
    
    console.log('[Auth] verifyAuth called:', {
      hasToken: !!token,
      tokenLength: token?.length,
      origin: req.headers.origin,
      cookies: Object.keys(req.cookies || {}),
      cookieHeader: req.headers.cookie ? 'Present' : 'Missing'
    });

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Get user with password field to check if it exists, but don't send it to client
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    const userProfile = await UserProfile.findOne({ userId: user._id });

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        googleId: user.googleId || null, // Explicitly return null if not set
        hasPassword: !!user.password, // Return boolean indicating if password exists
        profile: userProfile,
        verification: {
          status: userProfile?.verification?.status || 'not_submitted',
          isVerified: userProfile?.verification?.status === 'verified',
        },
      },
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// Google OAuth callback (handled by passport)
export const googleCallback = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.redirect(`${process.env.CLIENT_URL}/login?error=google_auth_failed`);
    }

    // Generate token
    const token = generateToken(user._id, user.role);

    // Determine if we're in production (check multiple indicators)
    const isProduction = process.env.NODE_ENV === 'production' || 
                         process.env.CLIENT_URL?.includes('vercel.app') ||
                         process.env.CLIENT_URL?.includes('onrender.com') ||
                         !process.env.NODE_ENV || process.env.NODE_ENV === 'production';
    
    // Set httpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProduction, // Must be true for sameSite: 'none'
      sameSite: isProduction ? 'none' : 'lax', // 'none' required for cross-domain in production
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    
    console.log('[Auth] Setting Google OAuth cookie:', {
      userId: user._id,
      email: user.email,
      NODE_ENV: process.env.NODE_ENV,
      CLIENT_URL: process.env.CLIENT_URL,
      isProduction: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      secure: isProduction
    });

    // Redirect to frontend with success
    res.redirect(`${process.env.CLIENT_URL}/auth/success`);
  } catch (error) {
    console.error('Google callback error:', error);
    res.redirect(`${process.env.CLIENT_URL}/login?error=google_auth_failed`);
  }
};

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Forgot password - send OTP
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    // Find user
    const user = await User.findOne({ email });
    
    // Don't reveal if user exists or not (security best practice)
    if (!user) {
      // Still return success to prevent email enumeration
      return res.json({
        success: true,
        message: 'If an account exists with this email, an OTP has been sent.',
      });
    }

    // Check if user has password (not Google-only user)
    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: 'This account uses Google authentication. Please login with Google.',
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Save OTP to user
    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    // Send OTP email
    const emailResult = await sendOTPEmail(email, otp);
    
    if (!emailResult.success) {
      // Clear OTP if email failed
      user.otp = undefined;
      user.otpExpires = undefined;
      await user.save();
      
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email. Please try again later.',
      });
    }

    res.json({
      success: true,
      message: 'OTP has been sent to your email',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// Verify OTP
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required',
      });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if OTP exists and is valid
    if (!user.otp || !user.otpExpires) {
      return res.status(400).json({
        success: false,
        message: 'No OTP found. Please request a new one.',
      });
    }

    // Check if OTP is expired
    if (Date.now() > user.otpExpires) {
      user.otp = undefined;
      user.otpExpires = undefined;
      await user.save();
      
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.',
      });
    }

    // Verify OTP
    if (user.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP',
      });
    }

    // OTP is valid - generate reset token (for additional security)
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
    // Clear OTP after successful verification
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'OTP verified successfully',
      resetToken, // Send token for password reset
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// Reset password
export const resetPassword = async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, reset token, and new password are required',
      });
    }

    // Check password strength
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message:
          'Password must be at least 8 characters and include uppercase, lowercase, number, and special character',
      });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Verify reset token
    if (
      !user.resetPasswordToken ||
      user.resetPasswordToken !== resetToken ||
      !user.resetPasswordExpires ||
      Date.now() > user.resetPasswordExpires
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token',
      });
    }

    // Check if new password is same as current password
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from the current password',
      });
    }

    // Check password history (prevent reusing last 3 passwords)
    if (user.passwordHistory && user.passwordHistory.length > 0) {
      const recentPasswords = user.passwordHistory.slice(-3);
      for (const oldPasswordData of recentPasswords) {
        const isMatch = await bcrypt.compare(newPassword, oldPasswordData.password);
        if (isMatch) {
          return res.status(400).json({
            success: false,
            message: 'You cannot reuse a recently used password',
          });
        }
      }
    }

    // Save old password to history BEFORE updating
    if (!user.passwordHistory) {
      user.passwordHistory = [];
    }
    user.passwordHistory.push({
      password: user.password, // Current hashed password
      changedAt: new Date(),
    });

    // Keep only last 5 passwords in history
    if (user.passwordHistory.length > 5) {
      user.passwordHistory = user.passwordHistory.slice(-5);
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// Set password for Google users (who don't have a password yet)
export const setPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const userId = req.user.userId;

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password is required',
      });
    }

    // Check password strength
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message:
          'Password must be at least 8 characters and include uppercase, lowercase, number, and special character',
      });
    }

    // Find user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if user already has a password
    if (user.password) {
      return res.status(400).json({
        success: false,
        message: 'Password already set. Use change password instead.',
      });
    }

    // Set the password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password set successfully',
    });
  } catch (error) {
    console.error('Set password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};


