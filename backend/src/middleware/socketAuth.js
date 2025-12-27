import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import UserProfile from '../models/UserProfile.js';

/**
 * Authenticate Socket.IO connection using JWT token from handshake
 */
export const authenticateSocket = async (socket, next) => {
  try {
    // Get token from handshake auth or cookies
    let token = socket.handshake.auth?.token;
    
    // If not in auth, try to get from cookies
    if (!token && socket.handshake.headers?.cookie) {
      const cookies = socket.handshake.headers.cookie.split(';');
      const tokenCookie = cookies.find(c => c.trim().startsWith('token='));
      if (tokenCookie) {
        token = tokenCookie.split('=')[1];
      }
    }

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user and profile
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    const userProfile = await UserProfile.findOne({ userId: user._id });

    // Attach user info to socket
    socket.user = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      profile: userProfile,
    };

    // Get college ID from user profile (optional - user might not have joined a college yet)
    if (userProfile?.college?.aisheCode) {
      socket.collegeId = userProfile.college.aisheCode;
    } else if (userProfile?.college?.name) {
      // Fallback: use college name if aisheCode not available
      socket.collegeId = userProfile.college.name;
    } else {
      // User doesn't belong to a college yet - allow connection but set collegeId to null
      // They can join a college room later when they select a college
      socket.collegeId = null;
    }

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new Error('Authentication error: Invalid or expired token'));
    }
    return next(new Error('Authentication error: ' + error.message));
  }
};

