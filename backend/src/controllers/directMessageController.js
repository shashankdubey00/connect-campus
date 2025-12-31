import DirectMessage from '../models/DirectMessage.js';
import Block from '../models/Block.js';
import UserProfile from '../models/UserProfile.js';
import User from '../models/User.js';
import DeletedMessage from '../models/DeletedMessage.js';
import ChatHistory from '../models/ChatHistory.js';
import DeletedChat from '../models/DeletedChat.js';
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

    // Get list of message IDs that are marked as deleted for this user
    const messageIds = allMessages.map(msg => msg._id);
    const deletedMessages = await DeletedMessage.find({
      userId: currentUserObjectId,
      messageId: { $in: messageIds },
      messageType: 'direct'
    }).select('messageId').lean();
    
    const deletedMessageIds = new Set(deletedMessages.map(d => d.messageId.toString()));

    // Filter out messages that are marked as deleted for this user
    const visibleMessages = allMessages.filter(msg => 
      !deletedMessageIds.has(msg._id.toString())
    );

    console.log('📨 Found messages:', allMessages.length, 'Visible messages:', visibleMessages.length, 'for users:', currentUserId, 'and', decodedOtherUserId);

    res.json({
      success: true,
      messages: visibleMessages.map(msg => ({
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

    // Get list of deleted chats FIRST to filter out early
    const deletedChats = await DeletedChat.find({
      userId: currentUserId,
      chatType: 'direct',
      otherUserId: { $exists: true, $ne: null }
    })
      .select('otherUserId')
      .lean();
    
    const deletedUserIds = new Set();
    deletedChats.forEach(deleted => {
      if (deleted.otherUserId) {
        // Store both string and ObjectId formats to ensure matching
        const deletedIdStr = deleted.otherUserId.toString();
        deletedUserIds.add(deletedIdStr);
        // Also add the ObjectId if it's valid
        if (mongoose.Types.ObjectId.isValid(deletedIdStr)) {
          deletedUserIds.add(new mongoose.Types.ObjectId(deletedIdStr).toString());
        }
      }
    });

    console.log('Deleted direct chat user IDs:', Array.from(deletedUserIds));

    // Get all unique users the current user has messaged with
    const sentMessages = await DirectMessage.find({ senderId: currentUserId })
      .select('receiverId')
      .lean();
    
    const receivedMessages = await DirectMessage.find({ receiverId: currentUserId })
      .select('senderId')
      .lean();

    // Get unique user IDs from messages (filter out deleted chats)
    const userIds = new Set();
    sentMessages.forEach(msg => {
      const receiverIdStr = msg.receiverId.toString();
      if (!deletedUserIds.has(receiverIdStr)) {
        userIds.add(receiverIdStr);
      }
    });
    receivedMessages.forEach(msg => {
      const senderIdStr = msg.senderId.toString();
      if (!deletedUserIds.has(senderIdStr)) {
        userIds.add(senderIdStr);
      }
    });

    // Also include users where messages were deleted (indicating previous interaction)
    // BUT filter out deleted chats
    const deletedDirectMessages = await DeletedMessage.find({
      userId: currentUserId,
      messageType: 'direct',
      otherUserId: { $exists: true, $ne: null }
    })
      .select('otherUserId')
      .lean();
    
    deletedDirectMessages.forEach(deleted => {
      if (deleted.otherUserId) {
        const otherUserIdStr = deleted.otherUserId.toString();
        // Only add if not in deleted chats
        if (!deletedUserIds.has(otherUserIdStr)) {
          userIds.add(otherUserIdStr);
        }
      }
    });

    // Also include users from chat history (including cleared chats)
    // BUT filter out deleted chats
    const chatHistory = await ChatHistory.find({
      userId: currentUserId,
      chatType: 'direct',
      otherUserId: { $exists: true, $ne: null }
    })
      .select('otherUserId')
      .lean();
    
    chatHistory.forEach(history => {
      if (history.otherUserId) {
        const otherUserIdStr = history.otherUserId.toString();
        // Only add if not in deleted chats
        if (!deletedUserIds.has(otherUserIdStr)) {
          userIds.add(otherUserIdStr);
        }
      }
    });

    console.log('All user IDs after filtering:', Array.from(userIds));

    // Convert to array for processing
    const activeUserIds = Array.from(userIds);

    // Get last message for each conversation (excluding deleted messages)
    const conversations = await Promise.all(
      activeUserIds.map(async (userId) => {
        // Get all messages between users
        const allMessages = await DirectMessage.find({
          $or: [
            { senderId: currentUserId, receiverId: userId },
            { senderId: userId, receiverId: currentUserId },
          ],
        })
          .sort({ timestamp: -1 })
          .lean();

        // Get list of message IDs that are marked as deleted for this user
        const messageIds = allMessages.map(msg => msg._id);
        const deletedMessages = await DeletedMessage.find({
          userId: currentUserId,
          messageId: { $in: messageIds },
          messageType: 'direct'
        }).select('messageId').lean();
        
        const deletedMessageIds = new Set(deletedMessages.map(d => d.messageId.toString()));

        // Filter out deleted messages and get the most recent visible message
        const visibleMessages = allMessages.filter(msg => 
          !deletedMessageIds.has(msg._id.toString())
        );
        
        const lastMessage = visibleMessages.length > 0 ? visibleMessages[0] : null;

        // Get user profile
        const userProfile = await UserProfile.findOne({ userId }).lean();
        const user = await User.findById(userId).select('email').lean();

        // Check if last message was sent by current user
        const isLastMessageOwn = lastMessage && String(lastMessage.senderId) === String(currentUserId);

        // Calculate unread count: count messages where current user is receiver and not in readBy array
        let unreadCount = 0;
        for (const msg of visibleMessages) {
          // Only count messages where current user is the receiver
          if (String(msg.receiverId) === String(currentUserId)) {
            const readBy = msg.readBy || [];
            const isRead = readBy.some(r => {
              const readUserId = r.userId ? (typeof r.userId === 'object' ? r.userId.toString() : String(r.userId)) : String(r.userId);
              return readUserId === String(currentUserId);
            });
            if (!isRead) {
              unreadCount++;
            }
          }
        }

        return {
          userId: userId,
          name: userProfile?.displayName || user?.email?.split('@')[0] || 'User',
          profilePicture: userProfile?.profilePicture || null,
          unreadCount: unreadCount, // Add unread count
          lastMessage: lastMessage?.text || 'No messages yet', // Show "No messages yet" if all messages are deleted
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
 * Clear all direct messages with a user (only for current user)
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

    // Convert to ObjectId if needed
    const otherUserIdObj = mongoose.Types.ObjectId.isValid(otherUserId) 
      ? new mongoose.Types.ObjectId(otherUserId) 
      : otherUserId;
    const currentUserIdObj = mongoose.Types.ObjectId.isValid(currentUserId) 
      ? new mongoose.Types.ObjectId(currentUserId) 
      : currentUserId;

    // IMPORTANT: Don't permanently delete messages - mark them as deleted for this user only
    // This way the other user can still see all messages (both their own and yours)
    
    // Get all messages between the two users
    const allMessages = await DirectMessage.find({
      $or: [
        { senderId: currentUserIdObj, receiverId: otherUserIdObj },
        { senderId: otherUserIdObj, receiverId: currentUserIdObj },
      ],
    }).select('_id').lean();

    const messageIds = allMessages.map(msg => msg._id);
    
    // Get existing deletions to avoid duplicates
    const existingDeletions = await DeletedMessage.find({
      userId: currentUserIdObj,
      messageId: { $in: messageIds },
      messageType: 'direct'
    }).select('messageId').lean();
    
    const existingIds = new Set(existingDeletions.map(d => d.messageId.toString()));
    const newMessageIds = messageIds.filter(id => !existingIds.has(id.toString()));

    // Mark ALL messages (both sent and received) as deleted for this user only
    // This way the other user can still see all messages
    let markedDeletedCount = 0;
    if (newMessageIds.length > 0) {
      await DeletedMessage.insertMany(
        newMessageIds.map(messageId => ({
          userId: currentUserIdObj,
          messageId: messageId,
          messageType: 'direct',
          otherUserId: otherUserIdObj,
        }))
      );
      markedDeletedCount = newMessageIds.length;
    }

    console.log('Marked all messages as deleted for user count:', markedDeletedCount);

    // Always track that user has interacted with this direct chat (even if cleared)
    // This ensures the chat persists in the list after refresh
    try {
      await ChatHistory.findOneAndUpdate(
        {
          userId: currentUserIdObj,
          otherUserId: otherUserIdObj,
          chatType: 'direct',
        },
        {
          userId: currentUserIdObj,
          otherUserId: otherUserIdObj,
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
      message: 'Messages cleared successfully for you only',
      markedDeletedCount: markedDeletedCount,
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

    // IMPORTANT: Only delete messages sent by the current user
    // Do NOT delete messages sent by the other user - they should still see their messages
    const deleteResult = await DirectMessage.deleteMany({
      senderId: currentUserIdObj,
      receiverId: otherUserIdObj,
    });

    console.log('Deleted sent messages count:', deleteResult.deletedCount);

    // Mark all received messages (from other user) as deleted for this user only
    // This way the other user can still see their messages
    const receivedMessages = await DirectMessage.find({
      senderId: otherUserIdObj,
      receiverId: currentUserIdObj,
    }).select('_id').lean();

    const receivedMessageIds = receivedMessages.map(msg => msg._id);
    
    // Get existing deletions to avoid duplicates
    const existingDeletions = await DeletedMessage.find({
      userId: currentUserIdObj,
      messageId: { $in: receivedMessageIds },
      messageType: 'direct'
    }).select('messageId').lean();
    
    const existingIds = new Set(existingDeletions.map(d => d.messageId.toString()));
    const newMessageIds = receivedMessageIds.filter(id => !existingIds.has(id.toString()));

    // Create deletion records for all received messages not already deleted
    let markedDeletedCount = 0;
    if (newMessageIds.length > 0) {
      await DeletedMessage.insertMany(
        newMessageIds.map(messageId => ({
          userId: currentUserIdObj,
          messageId: messageId,
          messageType: 'direct',
          otherUserId: otherUserIdObj,
        }))
      );
      markedDeletedCount = newMessageIds.length;
    }

    console.log('Marked received messages as deleted count:', markedDeletedCount);

    // Remove ChatHistory ONLY for the current user
    const historyResult = await ChatHistory.deleteMany({
      userId: currentUserIdObj,
      otherUserId: otherUserIdObj,
      chatType: 'direct',
    });

    console.log('Deleted chat history count:', historyResult.deletedCount);

    // Mark this chat as deleted so it doesn't reappear
    try {
      await DeletedChat.findOneAndUpdate(
        {
          userId: currentUserIdObj,
          otherUserId: otherUserIdObj,
          chatType: 'direct',
        },
        {
          userId: currentUserIdObj,
          otherUserId: otherUserIdObj,
          chatType: 'direct',
          deletedAt: new Date(),
        },
        { upsert: true, new: true }
      );
      console.log('Marked direct chat as deleted in DeletedChat');
    } catch (deletedChatError) {
      console.error('Error marking direct chat as deleted:', deletedChatError);
      // Don't fail the entire operation if this fails
    }

    res.json({
      success: true,
      message: 'Messages deleted and chat removed for you only',
      deletedSentCount: deleteResult.deletedCount,
      markedReceivedAsDeletedCount: markedDeletedCount,
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
 * Delete a single direct message (mark as deleted for this user only - delete for me)
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

    // Mark the message as deleted for this user only (don't permanently delete)
    const otherUserId = isSender ? message.receiverId : message.senderId;
    
    const existingDeletion = await DeletedMessage.findOne({
      userId: userId,
      messageId: messageId,
      messageType: 'direct'
    });

    if (!existingDeletion) {
      await DeletedMessage.create({
        userId: userId,
        messageId: messageId,
        messageType: 'direct',
        otherUserId: otherUserId,
      });
      console.log('Marked direct message as deleted for user:', userId);
    }

    res.json({
      success: true,
      message: 'Message deleted for you only',
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

/**
 * Delete a direct message for everyone (permanently delete from database - delete for all)
 */
export const deleteDirectMessageForAll = async (req, res) => {
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

    // Only allow deleting own messages
    if (String(message.senderId) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own messages',
      });
    }

    // Permanently delete the message from database (removes for everyone)
    await DirectMessage.findByIdAndDelete(messageId);

    // Also remove all "delete for me" records for this message since it's deleted for all
    await DeletedMessage.deleteMany({ messageId: messageId });

    res.json({
      success: true,
      message: 'Message deleted for everyone',
    });
  } catch (error) {
    console.error('Error deleting direct message for all:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting message',
      error: error.message,
    });
  }
};

