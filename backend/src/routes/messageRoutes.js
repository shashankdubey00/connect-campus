import express from 'express';
import Message from '../models/Message.js';
import DeletedMessage from '../models/DeletedMessage.js';
import Follow from '../models/Follow.js';
import { protect } from '../middleware/authMiddleware.js';
import College from '../../models/College.js';

const router = express.Router();

// Clear all messages sent by current user in a college chat
// MUST be before the GET route to avoid route conflict
router.delete('/college/:collegeId/clear', protect, async (req, res) => {
  try {
    const { collegeId } = req.params;
    const userId = req.user.userId;
    const decodedCollegeId = decodeURIComponent(collegeId);

    // Delete all messages sent by this user in this college
    const result = await Message.deleteMany({
      collegeId: decodedCollegeId,
      senderId: userId
    });

    res.json({
      success: true,
      message: 'Messages cleared successfully',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error clearing messages:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing messages',
      error: error.message,
    });
  }
});

// Delete a single message (delete for me - only removes from user's view)
router.delete('/message/:messageId', protect, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    // Find the message
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    // Check if already deleted for this user
    const existingDeletion = await DeletedMessage.findOne({
      userId: userId,
      messageId: messageId,
    });

    if (existingDeletion) {
      return res.json({
        success: true,
        message: 'Message already deleted for you',
      });
    }

    // Store deletion record (message stays in database, just hidden from this user)
    await DeletedMessage.create({
      userId: userId,
      messageId: messageId,
      messageType: 'college',
      collegeId: message.collegeId,
    });

    res.json({
      success: true,
      message: 'Message deleted for you',
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting message',
      error: error.message,
    });
  }
});

// Delete a message for everyone (delete for all - removes from database)
router.delete('/message/:messageId/for-all', protect, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    // Find the message
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    // Only allow deleting own messages
    if (String(message.senderId) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own messages',
      });
    }

    // Delete the message from database (removes for everyone)
    await Message.findByIdAndDelete(messageId);

    // Also remove all "delete for me" records for this message since it's deleted for all
    await DeletedMessage.deleteMany({ messageId: messageId });

    // Note: Socket event to notify all users will be handled by socket server
    // when it detects the message deletion

    res.json({
      success: true,
      message: 'Message deleted for everyone',
    });
  } catch (error) {
    console.error('Error deleting message for all:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting message',
      error: error.message,
    });
  }
});

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
    const allMessages = await Message.find(query)
      .sort({ timestamp: 1 }) // Ascending order (oldest first)
      .limit(Math.min(parseInt(limit) || 50, 100)) // Max 100 messages
      .lean();

    // Get list of message IDs that this user has deleted "for me"
    const deletedMessageIds = await DeletedMessage.find({
      userId: req.user.userId,
      messageId: { $in: allMessages.map(m => m._id) },
      messageType: 'college',
    }).select('messageId').lean();

    const deletedIdsSet = new Set(deletedMessageIds.map(d => d.messageId.toString()));

    // Filter out messages deleted "for me" by this user
    const messages = allMessages.filter(msg => !deletedIdsSet.has(msg._id.toString()));

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

// Get all colleges where user has sent messages OR follows
// Students can join multiple colleges and chat in any college
// Show colleges where they've sent messages OR followed
router.get('/user/colleges', protect, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Find all distinct collegeIds where THIS USER has sent messages
    const collegeIdsFromMessages = await Message.distinct('collegeId', {
      senderId: userId
    });

    // Find all colleges the user follows
    const follows = await Follow.find({ userId }).lean();
    const collegeIdsFromFollows = follows.map(f => f.collegeId);

    // Combine both lists and get unique college IDs
    const allCollegeIds = [...new Set([...collegeIdsFromMessages, ...collegeIdsFromFollows])];

    // If no colleges found (user hasn't sent messages or followed any), return empty array
    if (allCollegeIds.length === 0) {
      return res.json({
        success: true,
        colleges: []
      });
    }

    // Fetch college details for each collegeId
    const colleges = await College.find({
      $or: [
        { aisheCode: { $in: allCollegeIds } },
        { name: { $in: allCollegeIds } }
      ]
    }).lean();

    // Get last message for each college (from all users since it's a group chat)
    const collegesWithMessages = await Promise.all(
      colleges.map(async (college) => {
        const collegeId = college.aisheCode || college.name;
        
        // Get last message for this college (from all users since it's a group chat)
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

