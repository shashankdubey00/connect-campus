import express from 'express';
import Message from '../models/Message.js';
import DeletedMessage from '../models/DeletedMessage.js';
import Follow from '../models/Follow.js';
import ChatHistory from '../models/ChatHistory.js';
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

    // Always track that user has interacted with this college chat (even if cleared)
    // This ensures the chat persists in the list after refresh
    // Use setOnInsert to only set clearedAt on insert, and $set to always update lastInteractionAt
    try {
      const historyResult = await ChatHistory.findOneAndUpdate(
        {
          userId: userId,
          collegeId: decodedCollegeId,
          chatType: 'college',
        },
        {
          $set: {
            lastInteractionAt: new Date(),
            clearedAt: new Date(),
          },
          $setOnInsert: {
            userId: userId,
            collegeId: decodedCollegeId,
            chatType: 'college',
          }
        },
        { upsert: true, new: true }
      );
      console.log(`✅ ChatHistory updated for college ${decodedCollegeId}, userId ${userId.toString()}`);
    } catch (error) {
      console.error('❌ Error tracking cleared college chat:', error);
      // Try to create it anyway if update failed
      try {
        await ChatHistory.create({
          userId: userId,
          collegeId: decodedCollegeId,
          chatType: 'college',
          lastInteractionAt: new Date(),
          clearedAt: new Date(),
        });
        console.log(`✅ ChatHistory created (fallback) for college ${decodedCollegeId}`);
      } catch (createError) {
        console.error('❌ Error creating ChatHistory (fallback):', createError);
      }
    }

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
    // Increased limit to ensure we get all recent messages
    const limitValue = Math.min(parseInt(limit) || 50, 200); // Increased limit to 200
    const allMessages = await Message.find(query)
      .sort({ timestamp: 1 }) // Ascending order (oldest first) for chronological display
      .limit(limitValue)
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
              replyTo: msg.replyTo ? msg.replyTo.toString() : null,
              readBy: msg.readBy || [],
              deliveredTo: msg.deliveredTo || [],
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

    // Find colleges where user has deleted messages (indicating previous interaction)
    const deletedMessages = await DeletedMessage.distinct('collegeId', {
      userId: userId,
      messageType: 'college',
      collegeId: { $exists: true, $ne: null }
    });

    // Find colleges from chat history (including cleared chats)
    const chatHistory = await ChatHistory.find({
      userId: userId,
      chatType: 'college',
      collegeId: { $exists: true, $ne: null }
    }).select('collegeId').lean();
    const collegeIdsFromHistory = chatHistory.map(ch => ch.collegeId).filter(id => id); // Filter out any null/undefined

    // Combine all lists and get unique college IDs
    const allCollegeIds = [...new Set([...collegeIdsFromMessages, ...collegeIdsFromFollows, ...deletedMessages, ...collegeIdsFromHistory])];

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

    // Optimize: Get all last messages in a single aggregation query instead of N queries
    const collegeIds = colleges.map(c => c.aisheCode || c.name);
    
    // Use aggregation to get the last message for each college in one query
    const lastMessagesByCollege = await Message.aggregate([
      { $match: { collegeId: { $in: collegeIds } } },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: '$collegeId',
          lastMessage: { $first: '$$ROOT' }
        }
      }
    ]);

    // Create a map for O(1) lookup
    const lastMessageMap = new Map();
    lastMessagesByCollege.forEach(item => {
      lastMessageMap.set(item._id, item.lastMessage);
    });

    // Combine colleges with their last messages
    const collegesWithMessages = colleges.map((college) => {
        const collegeId = college.aisheCode || college.name;
      const lastMessage = lastMessageMap.get(collegeId);

      // Check if last message was sent by current user
      // Handle both ObjectId and string comparisons
      let isLastMessageOwn = false;
      if (lastMessage && lastMessage.senderId) {
        // Convert both to strings for reliable comparison
        // Handle MongoDB ObjectId objects
        let senderIdStr;
        if (lastMessage.senderId && typeof lastMessage.senderId === 'object' && lastMessage.senderId.toString) {
          senderIdStr = lastMessage.senderId.toString();
        } else {
          senderIdStr = String(lastMessage.senderId);
        }
        
        let userIdStr;
        if (userId && typeof userId === 'object' && userId.toString) {
          userIdStr = userId.toString();
        } else {
          userIdStr = String(userId);
        }
        
        isLastMessageOwn = senderIdStr === userIdStr;
      }

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
          senderId: lastMessage.senderId.toString ? lastMessage.senderId.toString() : String(lastMessage.senderId),
          senderName: lastMessage.senderName,
          lastMessageIsOwn: isLastMessageOwn,
          lastMessageDeliveredTo: lastMessage.deliveredTo || [],
          lastMessageReadBy: lastMessage.readBy || [],
        } : null // null means no messages, but chat should still appear
        };
    });

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

