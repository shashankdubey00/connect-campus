import express from 'express';
import Message from '../models/Message.js';
import { protect } from '../middleware/authMiddleware.js';
import UserProfile from '../models/UserProfile.js';

const router = express.Router();

// Get messages for a college (protected route)
router.get('/college/:collegeId', protect, async (req, res) => {
  try {
    const { collegeId } = req.params;
    const { limit = 50, before } = req.query;

    // Decode collegeId from URL
    const decodedCollegeId = decodeURIComponent(collegeId);

    // Verify user belongs to this college
    const userProfile = await UserProfile.findOne({ userId: req.user.userId });
    const userCollegeId = userProfile?.college?.aisheCode || userProfile?.college?.name;

    if (!userCollegeId) {
      return res.status(403).json({
        success: false,
        message: 'You must belong to a college to view messages',
      });
    }

    // Compare college IDs (handle both encoded and decoded)
    if (decodedCollegeId !== userCollegeId && collegeId !== userCollegeId) {
      return res.status(403).json({
        success: false,
        message: 'You can only view messages from your own college',
      });
    }

    // Use the user's college ID for query (most reliable)
    const queryCollegeId = userCollegeId;

    // Build query
    const query = { collegeId: queryCollegeId };
    if (before) {
      query.timestamp = { $lt: new Date(before) };
    }

    // Fetch messages - sort by timestamp ascending (oldest first) for chronological display
    const messages = await Message.find(query)
      .sort({ timestamp: 1 }) // Ascending order (oldest first)
      .limit(Math.min(parseInt(limit) || 50, 100)) // Max 100 messages
      .lean();

    res.json({
      success: true,
      count: messages.length,
      messages: messages.map(msg => ({
        id: msg._id.toString(),
        senderId: msg.senderId.toString(),
        senderName: msg.senderName,
        collegeId: msg.collegeId,
        text: msg.text,
        timestamp: msg.timestamp,
      })),
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching messages',
      error: error.message,
    });
  }
});

export default router;

