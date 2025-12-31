import DirectMessage from '../models/DirectMessage.js';
import Block from '../models/Block.js';
import UserProfile from '../models/UserProfile.js';
import User from '../models/User.js';
import DeletedMessage from '../models/DeletedMessage.js';
import ChatHistory from '../models/ChatHistory.js';
import mongoose from 'mongoose';

/**
 * Send a direct message
 */
export const sendDirectMessage = async (req, res) => {
  try {
    const { receiverId, text } = req.body;
    const senderId = req.user.userId;

    if (!receiverId || !text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Receiver ID and message text are required',
      });
    }

    if (String(senderId) === String(receiverId)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot send a message to yourself',
      });
    }

    // Check if sender is blocked by receiver
    const isBlocked = await Block.findOne({
      blockerId: receiverId,
      blockedId: senderId,
    });

    if (isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'You cannot send messages to this user',
      });
    }

    // Check if receiver is blocked by sender
    const hasBlocked = await Block.findOne({
      blockerId: senderId,
      blockedId: receiverId,
    });

    if (hasBlocked) {
      return res.status(403).json({
        success: false,
        message: 'You have blocked this user',
      });
    }

    // Get sender name
    const senderProfile = await UserProfile.findOne({ userId: senderId });
    const senderName = senderProfile?.displayName || 
                      `${senderProfile?.firstName || ''} ${senderProfile?.lastName || ''}`.trim() ||
                      req.user.email.split('@')[0];

    // Create message
    const message = new DirectMessage({
      senderId,
      receiverId,
      senderName,
      text: text.trim(),
    });

    await message.save();

    res.json({
      success: true,
      message: {
        id: message._id.toString(),
        senderId: message.senderId.toString(),
        receiverId: message.receiverId.toString(),
        senderName: message.senderName,
        text: message.text,
        timestamp: message.timestamp,
        deliveredTo: message.deliveredTo || [],
      },
    });
  } catch (error) {
    console.error('Error sending direct message:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * Get direct messages between two users
 */
export const getDirectMessages = async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const currentUserId = req.user.userId;

    console.log('📨 getDirectMessages called:', { otherUserId, currentUserId });

    if (!otherUserId) {
      return res.status(400).json({
        success: false,
        message: 'Other user ID is required',
      });
    }

    // Decode otherUserId in case it was URL encoded
    const decodedOtherUserId = decodeURIComponent(otherUserId);

    // Allow viewing messages even if blocked (users should see their chat history)
    // Blocking only prevents sending NEW messages, not viewing existing ones

    // Convert IDs to ObjectId for proper MongoDB query
    let currentUserObjectId, otherUserObjectId;
    
    try {
      currentUserObjectId = mongoose.Types.ObjectId.isValid(currentUserId) 
        ? new mongoose.Types.ObjectId(currentUserId) 
        : currentUserId;
      otherUserObjectId = mongoose.Types.ObjectId.isValid(decodedOtherUserId) 
        ? new mongoose.Types.ObjectId(decodedOtherUserId) 
        : decodedOtherUserId;
    } catch (error) {
      console.error('Error converting user IDs:', error);
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
      });
    }

    // Get messages where current user is sender or receiver
    // Get recent messages (last 200 to balance performance and completeness)
    const messages = await DirectMessage.find({
      $or: [
        { senderId: currentUserObjectId, receiverId: otherUserObjectId },
        { senderId: otherUserObjectId, receiverId: currentUserObjectId },
      ],
    })
      .sort({ timestamp: -1 }) // Get most recent first
      .limit(200)
      .lean();

    // Get all replyTo IDs from the messages
    const replyToIds = messages
      .filter(msg => msg.replyTo)
      .map(msg => msg.replyTo)
      .filter((id, index, self) => self.indexOf(id) === index); // Remove duplicates

    // Find any replied-to messages that might not be in the recent 200
    let additionalMessages = [];
    if (replyToIds.length > 0) {
      const messageIds = messages.map(msg => msg._id);
      const missingReplyToIds = replyToIds.filter(replyId => 
        !messageIds.some(msgId => msgId.toString() === replyId.toString())
      );
      
      if (missingReplyToIds.length > 0) {
        additionalMessages = await DirectMessage.find({
          _id: { $in: missingReplyToIds },
          $or: [
            { senderId: currentUserObjectId, receiverId: otherUserObjectId },
            { senderId: otherUserObjectId, receiverId: currentUserObjectId },
          ],
        }).lean();
      }
    }

    // Combine and sort all messages
    const allMessages = [...messages, ...additionalMessages]
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    console.log('📨 Found messages:', allMessages.length, 'for users:', currentUserId, 'and', decodedOtherUserId);

    res.json({
      success: true,
      messages: allMessages.map(msg => ({
        id: msg._id.toString(),
        senderId: msg.senderId.toString(),
        receiverId: msg.receiverId.toString(),
        senderName: msg.senderName,
        text: msg.text,
        timestamp: msg.timestamp,
        replyTo: msg.replyTo ? msg.replyTo.toString() : null,
        deliveredTo: msg.deliveredTo || [],
        readBy: msg.readBy || [],
      })),
    });
  } catch (error) {
    console.error('Error fetching direct messages:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * Get all direct message conversations for current user
 */
export const getDirectMessageConversations = async (req, res) => {
  try {
    const currentUserId = req.user.userId;

    // Get all unique users the current user has messaged with
    const sentMessages = await DirectMessage.find({ senderId: currentUserId })
      .select('receiverId')
      .lean();
    
    const receivedMessages = await DirectMessage.find({ receiverId: currentUserId })
      .select('senderId')
      .lean();

    // Get unique user IDs from messages
    const userIds = new Set();
    sentMessages.forEach(msg => userIds.add(msg.receiverId.toString()));
    receivedMessages.forEach(msg => userIds.add(msg.senderId.toString()));

    // Also include users where messages were deleted (indicating previous interaction)
    const deletedDirectMessages = await DeletedMessage.find({
      userId: currentUserId,
      messageType: 'direct',
      otherUserId: { $exists: true, $ne: null }
    })
      .select('otherUserId')
      .lean();
    
    deletedDirectMessages.forEach(deleted => {
      if (deleted.otherUserId) {
        userIds.add(deleted.otherUserId.toString());
      }
    });

    // Also include users from chat history (including cleared chats)
    const chatHistory = await ChatHistory.find({
      userId: currentUserId,
      chatType: 'direct',
      otherUserId: { $exists: true, $ne: null }
    })
      .select('otherUserId')
      .lean();
    
    chatHistory.forEach(history => {
      if (history.otherUserId) {
        userIds.add(history.otherUserId.toString());
      }
    });

    // Get last message for each conversation
    const conversations = await Promise.all(
      Array.from(userIds).map(async (userId) => {
        const lastMessage = await DirectMessage.findOne({
          $or: [
            { senderId: currentUserId, receiverId: userId },
            { senderId: userId, receiverId: currentUserId },
          ],
        })
          .sort({ timestamp: -1 })
          .lean();

        // Get user profile
        const userProfile = await UserProfile.findOne({ userId }).lean();
        const user = await User.findById(userId).select('email').lean();

        // Check if last message was sent by current user
        const isLastMessageOwn = lastMessage && String(lastMessage.senderId) === String(currentUserId);

        return {
          userId: userId,
          name: userProfile?.displayName || user?.email?.split('@')[0] || 'User',
          profilePicture: userProfile?.profilePicture || null,
          lastMessage: lastMessage?.text || '', // Empty string means no messages, but conversation should still appear
          lastMessageTime: lastMessage?.timestamp || null,
          lastMessageIsOwn: isLastMessageOwn || false,
          lastMessageDeliveredTo: lastMessage?.deliveredTo || [],
          lastMessageReadBy: lastMessage?.readBy || [],
        };
      })
    );

    // Sort by last message time
    conversations.sort((a, b) => {
      if (!a.lastMessageTime) return 1;
      if (!b.lastMessageTime) return -1;
      return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
    });

    res.json({
      success: true,
      conversations,
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * Clear all direct messages with a user
 */
export const clearDirectMessages = async (req, res) => {
  try {
    const { otherUserId } = req.body;
    const currentUserId = req.user.userId;

    if (!otherUserId) {
      return res.status(400).json({
        success: false,
        message: 'Other user ID is required',
      });
    }

    // Delete all messages between the two users
    await DirectMessage.deleteMany({
      $or: [
        { senderId: currentUserId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: currentUserId },
      ],
    });

    // Always track that user has interacted with this direct chat (even if cleared)
    // This ensures the chat persists in the list after refresh
    try {
      await ChatHistory.findOneAndUpdate(
        {
          userId: currentUserId,
          otherUserId: otherUserId,
          chatType: 'direct',
        },
        {
          userId: currentUserId,
          otherUserId: otherUserId,
          chatType: 'direct',
          lastInteractionAt: new Date(),
          clearedAt: new Date(),
        },
        { upsert: true }
      );
    } catch (error) {
      console.error('Error tracking cleared direct chat:', error);
    }

    res.json({
      success: true,
      message: 'Messages cleared successfully',
    });
  } catch (error) {
    console.error('Error clearing messages:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * Delete all direct messages with a user and remove from chat list
 */
export const deleteAllDirectMessages = async (req, res) => {
  try {
    const { otherUserId } = req.body;
    const currentUserId = req.user.userId;

    console.log('deleteAllDirectMessages called:', { otherUserId, currentUserId });

    if (!otherUserId) {
      return res.status(400).json({
        success: false,
        message: 'Other user ID is required',
      });
    }

    // Convert to ObjectId if needed
    const otherUserIdObj = mongoose.Types.ObjectId.isValid(otherUserId) 
      ? new mongoose.Types.ObjectId(otherUserId) 
      : otherUserId;
    const currentUserIdObj = mongoose.Types.ObjectId.isValid(currentUserId) 
      ? new mongoose.Types.ObjectId(currentUserId) 
      : currentUserId;

    // Delete all messages between the two users
    const deleteResult = await DirectMessage.deleteMany({
      $or: [
        { senderId: currentUserIdObj, receiverId: otherUserIdObj },
        { senderId: otherUserIdObj, receiverId: currentUserIdObj },
      ],
    });

    console.log('Deleted messages count:', deleteResult.deletedCount);

    // Remove ChatHistory to remove chat from list
    const historyResult = await ChatHistory.deleteMany({
      userId: currentUserIdObj,
      otherUserId: otherUserIdObj,
      chatType: 'direct',
    });

    console.log('Deleted chat history count:', historyResult.deletedCount);

    res.json({
      success: true,
      message: 'All messages deleted and chat removed',
      deletedCount: deleteResult.deletedCount,
      historyDeletedCount: historyResult.deletedCount
    });
  } catch (error) {
    console.error('Error deleting all direct messages:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting messages',
      error: error.message,
    });
  }
};

/**
 * Delete a single direct message (permanently delete from database)
 */
export const deleteDirectMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    if (!messageId) {
      return res.status(400).json({
        success: false,
        message: 'Message ID is required',
      });
    }

    // Find the message
    const message = await DirectMessage.findById(messageId);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    // Check if user is the sender or receiver
    const isSender = String(message.senderId) === String(userId);
    const isReceiver = String(message.receiverId) === String(userId);

    if (!isSender && !isReceiver) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this message',
      });
    }

    // Permanently delete the message from database
    await DirectMessage.findByIdAndDelete(messageId);

    // Also delete any DeletedMessage records for this message (cleanup)
    await DeletedMessage.deleteMany({ messageId: messageId });

    res.json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting direct message:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting message',
      error: error.message,
    });
  }
};

