import express from 'express';
import Message from '../models/Message.js';
import { protect } from '../middleware/authMiddleware.js';
import UserProfile from '../models/UserProfile.js';
import College from '../../models/College.js';

const router = express.Router();

// Get messages for a college (protected route)
router.get('/college/:collegeId', protect, async (req, res) => {
  try {
    const { collegeId } = req.params;
    const { limit = 50, before } = req.query;

    // Decode collegeId from URL
    const decodedCollegeId = decodeURIComponent(collegeId);

    // Allow users to view messages from any college
    // Use the requested college ID for query
    const queryCollegeId = decodedCollegeId;

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

// Get all colleges where user has sent or received messages
router.get('/user/colleges', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // Find all distinct collegeIds where messages exist
    // Since users can see all college chats, get all colleges with messages
    const collegeIds = await Message.distinct('collegeId');

    // If no messages found, return empty array
    if (collegeIds.length === 0) {
      return res.json({
        success: true,
        colleges: []
      });
    }

    // Fetch college details for each collegeId
    const colleges = await College.find({
      $or: [
        { aisheCode: { $in: collegeIds } },
        { name: { $in: collegeIds } }
      ]
    }).lean();

    // Get last message for each college
    const collegesWithMessages = await Promise.all(
      colleges.map(async (college) => {
        const collegeId = college.aisheCode || college.name;
        
        // Get last message for this college
        const lastMessage = await Message.findOne({ collegeId })
          .sort({ timestamp: -1 })
          .lean();

        return {
          id: college._id.toString(),
          aisheCode: college.aisheCode,
          name: college.name,
          state: college.state,
          district: college.district,
          logo: college.logo,
          lastMessage: lastMessage ? {
            text: lastMessage.text,
            timestamp: lastMessage.timestamp,
            senderId: lastMessage.senderId.toString(),
            senderName: lastMessage.senderName
          } : null
        };
      })
    );

    res.json({
      success: true,
      colleges: collegesWithMessages
    });
  } catch (error) {
    console.error('Error fetching user colleges:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching colleges with messages',
      error: error.message,
    });
  }
});

export default router;

