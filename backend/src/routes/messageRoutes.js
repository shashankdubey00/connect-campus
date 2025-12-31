import express from 'express';
import Message from '../models/Message.js';
import DeletedMessage from '../models/DeletedMessage.js';
import Follow from '../models/Follow.js';
import ChatHistory from '../models/ChatHistory.js';
import DeletedChat from '../models/DeletedChat.js';
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

    // IMPORTANT: Don't permanently delete messages - mark them as deleted for this user only
    // This way other users can still see all messages (both their own and yours)
    
    // Get all messages in this college
    const allMessages = await Message.find({
      collegeId: decodedCollegeId
    }).select('_id').lean();

    const messageIds = allMessages.map(msg => msg._id);
    
    // Get existing deletions to avoid duplicates
    const existingDeletions = await DeletedMessage.find({
      userId: userId,
      messageId: { $in: messageIds },
      messageType: 'college'
    }).select('messageId').lean();
    
    const existingIds = new Set(existingDeletions.map(d => d.messageId.toString()));
    const newMessageIds = messageIds.filter(id => !existingIds.has(id.toString()));

    // Mark ALL messages (both sent and received) as deleted for this user only
    // This way other users can still see all messages
    let markedDeletedCount = 0;
    if (newMessageIds.length > 0) {
      await DeletedMessage.insertMany(
        newMessageIds.map(messageId => ({
          userId: userId,
          messageId: messageId,
          messageType: 'college',
          collegeId: decodedCollegeId,
        }))
      );
      markedDeletedCount = newMessageIds.length;
    }

    console.log('Marked all messages as deleted for user count:', markedDeletedCount);

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
      message: 'Messages cleared successfully for you only',
      markedDeletedCount: markedDeletedCount
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

// Delete all messages in a college chat for the user (delete sent messages and mark received as deleted)
router.delete('/college/:collegeId/delete-all', protect, async (req, res) => {
  try {
    const { collegeId } = req.params;
    const userId = req.user.userId;
    const decodedCollegeId = decodeURIComponent(collegeId);

    console.log('deleteAllCollegeMessages called:', { collegeId: decodedCollegeId, userId });

    // Delete all messages sent by this user in this college
    const deleteResult = await Message.deleteMany({
      collegeId: decodedCollegeId,
      senderId: userId
    });

    console.log('Deleted sent messages count:', deleteResult.deletedCount);

    // Mark all received messages as deleted for this user
    const allMessages = await Message.find({
      collegeId: decodedCollegeId
    }).select('_id').lean();

    const messageIds = allMessages.map(msg => msg._id);
    
    // Get existing deletions to avoid duplicates
    const existingDeletions = await DeletedMessage.find({
      userId: userId,
      messageId: { $in: messageIds },
      messageType: 'college'
    }).select('messageId').lean();
    
    const existingIds = new Set(existingDeletions.map(d => d.messageId.toString()));
    const newMessageIds = messageIds.filter(id => !existingIds.has(id.toString()));

    // Create deletion records for all messages not already deleted
    let markedDeletedCount = 0;
    if (newMessageIds.length > 0) {
      await DeletedMessage.insertMany(
        newMessageIds.map(messageId => ({
          userId: userId,
          messageId: messageId,
          messageType: 'college',
          collegeId: decodedCollegeId,
        }))
      );
      markedDeletedCount = newMessageIds.length;
    }

    console.log('Marked as deleted count:', markedDeletedCount);

    // Remove ChatHistory to remove chat from list
    const historyResult = await ChatHistory.deleteMany({
      userId: userId,
      collegeId: decodedCollegeId,
      chatType: 'college',
    });

    console.log('Deleted chat history count:', historyResult.deletedCount);

    // Get college details to store both aisheCode and name in DeletedChat
    const college = await College.findOne({
      $or: [
        { aisheCode: decodedCollegeId },
        { name: decodedCollegeId }
      ]
    }).lean();

    // Mark this chat as deleted so it doesn't reappear even if user follows the college
    // Store both aisheCode and name to ensure proper filtering
    try {
      const collegeAisheCode = college?.aisheCode || decodedCollegeId;
      const collegeName = college?.name || decodedCollegeId;
      
      // Store DeletedChat records for both aisheCode and name to cover all cases
      const deletedChatPromises = [];
      
      if (collegeAisheCode) {
        deletedChatPromises.push(
          DeletedChat.findOneAndUpdate(
            {
              userId: userId,
              collegeId: collegeAisheCode,
              chatType: 'college',
            },
            {
              userId: userId,
              collegeId: collegeAisheCode,
              chatType: 'college',
              deletedAt: new Date(),
            },
            { upsert: true, new: true }
          )
        );
      }
      
      if (collegeName && collegeName !== collegeAisheCode) {
        deletedChatPromises.push(
          DeletedChat.findOneAndUpdate(
            {
              userId: userId,
              collegeId: collegeName,
              chatType: 'college',
            },
            {
              userId: userId,
              collegeId: collegeName,
              chatType: 'college',
              deletedAt: new Date(),
            },
            { upsert: true, new: true }
          )
        );
      }
      
      await Promise.all(deletedChatPromises);
      
      console.log('Marked chat as deleted in DeletedChat:', {
        userId: userId.toString(),
        collegeId: decodedCollegeId,
        aisheCode: collegeAisheCode,
        name: collegeName,
        result: 'created/updated'
      });
    } catch (deletedChatError) {
      console.error('Error marking chat as deleted:', deletedChatError);
      console.error('Error details:', {
        userId: userId.toString(),
        collegeId: decodedCollegeId,
        error: deletedChatError.message,
        stack: deletedChatError.stack
      });
      // Don't fail the entire operation if this fails
    }

    res.json({
      success: true,
      message: 'All messages deleted and chat removed',
      deletedSentCount: deleteResult.deletedCount,
      markedDeletedCount: markedDeletedCount,
      historyDeletedCount: historyResult.deletedCount
    });
  } catch (error) {
    console.error('Error deleting all college messages:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error deleting messages',
      error: error.message,
    });
  }
});

// Delete a single message (mark as deleted for this user only - delete for me)
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

    // Check if user is the sender or receiver (for group chats, anyone can delete for themselves)
    const isSender = String(message.senderId) === String(userId);
    
    // For group chats, any user can mark any message as deleted for themselves
    // Mark the message as deleted for this user only (don't permanently delete)
    const existingDeletion = await DeletedMessage.findOne({
      userId: userId,
      messageId: messageId,
      messageType: 'college'
    });

    if (!existingDeletion) {
      await DeletedMessage.create({
        userId: userId,
        messageId: messageId,
        messageType: 'college',
        collegeId: message.collegeId,
      });
      console.log('Marked message as deleted for user:', userId);
    }

    res.json({
      success: true,
      message: 'Message deleted for you only',
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

    // Get list of message IDs that are marked as deleted for this user
    const userId = req.user.userId;
    const messageIds = allMessages.map(msg => msg._id);
    const deletedMessages = await DeletedMessage.find({
      userId: userId,
      messageId: { $in: messageIds },
      messageType: 'college'
    }).select('messageId').lean();
    
    const deletedMessageIds = new Set(deletedMessages.map(d => d.messageId.toString()));

    // Filter out messages that are marked as deleted for this user
    const visibleMessages = allMessages.filter(msg => 
      !deletedMessageIds.has(msg._id.toString())
    );

    res.json({
      success: true,
      count: visibleMessages.length,
      messages: visibleMessages.map(msg => ({
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
    // Get both collegeId and collegeAisheCode from follows (some might use one or the other)
    // But we need to filter out any that are in deleted chats
    const allFollowCollegeIds = follows.map(f => [f.collegeId, f.collegeAisheCode]).flat().filter(id => id);
    
    // Find colleges that have been explicitly deleted by the user (do this early)
    const deletedChats = await DeletedChat.find({
      userId: userId,
      chatType: 'college',
      collegeId: { $exists: true, $ne: null }
    }).select('collegeId').lean();
    const deletedCollegeIds = new Set(deletedChats.map(dc => dc.collegeId).filter(id => id));
    
    console.log('Deleted college chats:', Array.from(deletedCollegeIds));
    
    // Filter out deleted chats from follows - even if user follows, if they deleted the chat, exclude it
    const collegeIdsFromFollows = allFollowCollegeIds.filter(id => !deletedCollegeIds.has(id));

    // Find colleges where user has deleted messages (indicating previous interaction)
    const deletedCollegeIdsFromMessages = await DeletedMessage.distinct('collegeId', {
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
    
    console.log('College IDs from follows (before filtering):', allFollowCollegeIds);
    console.log('College IDs from follows (after filtering):', collegeIdsFromFollows);
    console.log('All college IDs before filtering:', [...new Set([...collegeIdsFromMessages, ...collegeIdsFromFollows, ...deletedCollegeIdsFromMessages, ...collegeIdsFromHistory])]);

    // Combine all lists and get unique college IDs, but exclude deleted chats
    const allCollegeIds = [...new Set([...collegeIdsFromMessages, ...collegeIdsFromFollows, ...deletedCollegeIdsFromMessages, ...collegeIdsFromHistory])]
      .filter(id => !deletedCollegeIds.has(id)); // Exclude explicitly deleted chats
    
    console.log('All college IDs after filtering:', allCollegeIds);

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

    // Filter out colleges that match any deleted chat (check both aisheCode and name)
    // This ensures that even if user follows a college, if they deleted the chat, it won't appear
    const filteredColleges = colleges.filter(college => {
      const collegeAisheCode = college.aisheCode;
      const collegeName = college.name;
      
      // Check if this college's aisheCode or name is in the deleted chats list
      const isDeleted = deletedCollegeIds.has(collegeAisheCode) || deletedCollegeIds.has(collegeName);
      
      if (isDeleted) {
        console.log('Filtering out deleted college:', {
          id: college._id,
          aisheCode: collegeAisheCode,
          name: collegeName,
          deletedIds: Array.from(deletedCollegeIds)
        });
      }
      
      // Exclude if either aisheCode or name matches a deleted chat
      return !isDeleted;
    });
    
    console.log('Colleges before filtering:', colleges.length);
    console.log('Colleges after filtering:', filteredColleges.length);

    // Optimize: Get all last messages in a single query, then filter out deleted ones
    const collegeIds = filteredColleges.map(c => c.aisheCode || c.name);
    
    // Get all messages for these colleges first
    const allMessages = await Message.find({
      collegeId: { $in: collegeIds }
    })
      .sort({ timestamp: -1 })
      .lean();

    // Get list of message IDs that are marked as deleted for this user
    const messageIds = allMessages.map(msg => msg._id);
    const deletedMessages = await DeletedMessage.find({
      userId: userId,
      messageId: { $in: messageIds },
      messageType: 'college'
    }).select('messageId').lean();
    
    const deletedMessageIds = new Set(deletedMessages.map(d => d.messageId.toString()));

    // Filter out deleted messages
    const visibleMessages = allMessages.filter(msg => 
      !deletedMessageIds.has(msg._id.toString())
    );

    // Group by collegeId and get the most recent visible message for each
    const lastMessageMap = new Map();
    visibleMessages.forEach(msg => {
      const collegeId = msg.collegeId;
      if (!lastMessageMap.has(collegeId)) {
        lastMessageMap.set(collegeId, msg);
      }
    });

    // Combine colleges with their last messages
    const collegesWithMessages = filteredColleges.map((college) => {
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
          } : { 
            text: 'No messages yet', 
            timestamp: null, 
            senderId: null, 
            senderName: null, 
            lastMessageIsOwn: false, 
            lastMessageDeliveredTo: [], 
            lastMessageReadBy: [] 
          } // Show "No messages yet" if all messages are deleted
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

