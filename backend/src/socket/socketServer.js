import { Server } from 'socket.io';
import mongoose from 'mongoose';
import { authenticateSocket } from '../middleware/socketAuth.js';
import Message from '../models/Message.js';
import DirectMessage from '../models/DirectMessage.js';
import UserProfile from '../models/UserProfile.js';
import Block from '../models/Block.js';
import ChatHistory from '../models/ChatHistory.js';
import DeletedChat from '../models/DeletedChat.js';

let io;

/**
 * Initialize Socket.IO server
 */
export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware
  io.use(authenticateSocket);

  // Store online users
  const onlineUsers = new Map(); // userId -> { socketId, email, lastSeen }

  // Helper function to calculate and broadcast active count for a college
  const updateCollegeActiveCount = async (collegeId) => {
    if (!collegeId) return;
    
    try {
      // Calculate 24 hours ago
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      // Count users who:
      // 1. Belong to this college (by aisheCode or name)
      // 2. Have been active in the last 24 hours (lastSeen >= 24 hours ago)
      const activeCount = await UserProfile.countDocuments({
        $or: [
          { 'college.aisheCode': collegeId },
          { 'college.name': collegeId },
        ],
        lastSeen: { $gte: twentyFourHoursAgo },
      });

      // Broadcast to all users in the college room
      const roomName = `college:${collegeId}`;
      io.to(roomName).emit('collegeActiveCountUpdate', {
        collegeId,
        activeCount,
      });
    } catch (error) {
      console.error('Error updating college active count:', error);
    }
  };

  // Connection handler
  io.on('connection', async (socket) => {
    const userId = socket.user.userId.toString();
    const userEmail = socket.user.email;
    
    // Update last seen time in database
    try {
      await UserProfile.findOneAndUpdate(
        { userId: socket.user.userId },
        { lastSeen: new Date() },
        { upsert: false }
      );
    } catch (error) {
      console.error('Error updating last seen:', error);
    }
    
    // Mark user as online
    onlineUsers.set(userId, {
      socketId: socket.id,
      email: userEmail,
      lastSeen: new Date(),
      isOnline: true,
    });
    
    // Broadcast user online status to all connected clients
    io.emit('userOnline', { userId, isOnline: true });
    
    // Log connection (only show college if user has one)
    if (socket.collegeId) {
      console.log(`✅ User connected: ${userEmail} (College: ${socket.collegeId})`);
    } else {
      console.log(`✅ User connected: ${userEmail}`);
    }

    // Join user to their personal room for direct messages
    socket.join(`user:${userId}`);

    // Auto-join user to their college room if they belong to one
    if (socket.collegeId) {
      const roomName = `college:${socket.collegeId}`;
      socket.join(roomName);
      console.log(`📥 User ${userEmail} joined room: ${roomName}`);

      // Emit confirmation to client
      socket.emit('joinedCollegeRoom', {
        success: true,
        collegeId: socket.collegeId,
        roomName: roomName,
      });

      // Update active count for this college in real-time
      await updateCollegeActiveCount(socket.collegeId);
    } else {
      // User doesn't belong to a college yet - this is normal for new users
      // Only log in debug mode to reduce console noise
      // Users can join a college room later via the 'joinCollegeRoom' event
      if (process.env.NODE_ENV === 'development') {
        console.log(`ℹ️ User ${userEmail} connected (no college assigned yet - they can join one later)`);
      }
    }

    // Handle joinCollegeRoom event - allow joining any college room
    socket.on('joinCollegeRoom', async (data) => {
      const { collegeId } = data;
      
      if (!collegeId) {
        socket.emit('error', {
          message: 'College ID is required',
        });
        return;
      }

      const room = `college:${collegeId}`;
      socket.join(room);
      console.log(`📥 User ${socket.user.email} joined room: ${room}`);
      
      socket.emit('joinedCollegeRoom', {
        success: true,
        collegeId: collegeId,
        roomName: room,
      });

      // Update active count for this college in real-time
      await updateCollegeActiveCount(collegeId);
    });

    // Handle sendMessage event - allow sending to any college room
    socket.on('sendMessage', async (data) => {
      try {
        const { text, collegeId, replyToId } = data;

        // Validate message
        if (!text || !text.trim()) {
          socket.emit('error', {
            message: 'Message text is required',
          });
          return;
        }

        // Validate collegeId
        if (!collegeId) {
          socket.emit('error', {
            message: 'College ID is required',
          });
          return;
        }

        // Check if sender has blocked anyone (prevent sending if blocked)
        const blockedUsers = await Block.find({ blockerId: socket.user.userId }).lean();
        if (blockedUsers.length > 0) {
          socket.emit('messageBlocked', {
            message: 'You cannot send messages because you have blocked users in this chat',
            blockedCount: blockedUsers.length,
          });
          return;
        }

        // Use provided collegeId (allow sending to any college)
        const messageCollegeId = collegeId;

        // Get sender name from profile
        const senderName = socket.user.profile?.displayName || 
                          `${socket.user.profile?.firstName || ''} ${socket.user.profile?.lastName || ''}`.trim() ||
                          socket.user.email.split('@')[0];

        // Validate replyToId if provided
        let validReplyToId = null;
        if (replyToId) {
          // Check if replyToId is a valid ObjectId format
          if (mongoose.Types.ObjectId.isValid(replyToId)) {
            validReplyToId = replyToId;
          } else {
            console.warn('Invalid replyToId format:', replyToId);
            // Don't fail, just ignore invalid replyToId
          }
        }

        // Create message object
        const messageData = {
          senderId: socket.user.userId,
          senderName: senderName,
          collegeId: messageCollegeId,
          text: text.trim(),
          timestamp: new Date(),
          replyTo: validReplyToId || null,
        };

        // Save message to database
        let savedMessage = null;
        try {
          const message = new Message(messageData);
          savedMessage = await message.save();
          
          console.log(`💾 Message saved to DB: ${savedMessage._id} for college: ${messageCollegeId}`, {
            text: savedMessage.text.substring(0, 50),
            senderId: savedMessage.senderId.toString(),
            timestamp: savedMessage.timestamp
          });
        } catch (dbError) {
          console.error('❌ Database error saving message:', dbError);
          console.error('Error details:', {
            message: dbError.message,
            stack: dbError.stack,
            name: dbError.name,
            errors: dbError.errors
          });
          socket.emit('error', {
            message: 'Failed to save message to database',
            details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
          });
          return;
        }

        // Track chat history to ensure chat persists even if all messages are cleared
        try {
          await ChatHistory.findOneAndUpdate(
            {
              userId: socket.user.userId,
              collegeId: messageCollegeId,
              chatType: 'college',
            },
            {
              userId: socket.user.userId,
              collegeId: messageCollegeId,
              chatType: 'college',
              lastInteractionAt: new Date(),
            },
            { upsert: true }
          );
        } catch (error) {
          // Non-critical, log but don't fail
          console.error('Error tracking chat history:', error);
        }

        // Mark message as delivered to sender immediately
        try {
          savedMessage.deliveredTo.push({
            userId: socket.user.userId,
            deliveredAt: new Date(),
          });
          await savedMessage.save();
        } catch (updateError) {
          // Non-critical, log but continue
          console.error('Error updating deliveredTo:', updateError);
        }

        // Prepare message for broadcast
        // Safely map arrays to handle any potential data issues
        const messageToSend = {
          id: savedMessage._id.toString(),
          senderId: savedMessage.senderId.toString(),
          senderName: savedMessage.senderName,
          collegeId: savedMessage.collegeId,
          text: savedMessage.text,
          timestamp: savedMessage.timestamp,
          replyTo: savedMessage.replyTo ? savedMessage.replyTo.toString() : null,
          deliveredTo: (savedMessage.deliveredTo || []).map(d => {
            try {
              return {
                userId: d.userId ? d.userId.toString() : String(d.userId),
                deliveredAt: d.deliveredAt || new Date(),
              };
            } catch (e) {
              console.warn('Error mapping deliveredTo entry:', e);
              return null;
            }
          }).filter(Boolean), // Remove any null entries
          readBy: (savedMessage.readBy || []).map(r => {
            try {
              return {
                userId: r.userId ? r.userId.toString() : String(r.userId),
                readAt: r.readAt || new Date(),
              };
            } catch (e) {
              console.warn('Error mapping readBy entry:', e);
              return null;
            }
          }).filter(Boolean), // Remove any null entries
        };

        // Broadcast to all users in the college room
        try {
          const roomName = `college:${messageCollegeId}`;
          io.to(roomName).emit('receiveMessage', messageToSend);
          
          // Also emit confirmation to sender
          socket.emit('messageSent', {
            messageId: savedMessage._id.toString(),
            collegeId: messageCollegeId,
            replyTo: savedMessage.replyTo ? savedMessage.replyTo.toString() : null,
            text: savedMessage.text // Include text for better matching
          });

          // Broadcast chat list update to ALL connected users (not just room members)
          // This ensures chat list updates in real-time across all systems
          io.emit('chatListUpdate', {
            type: 'college',
            collegeId: messageCollegeId,
            messageText: savedMessage.text,
            messageTimestamp: savedMessage.timestamp,
            senderId: savedMessage.senderId.toString(),
            senderName: savedMessage.senderName,
            isOwnMessage: false, // Each client will determine if it's their own message
            deliveredTo: messageToSend.deliveredTo || [],
            readBy: messageToSend.readBy || []
          });

          console.log(`💬 Message sent in ${roomName} by ${socket.user.email}`, {
            messageId: savedMessage._id.toString(),
            text: savedMessage.text.substring(0, 50)
          });
        } catch (broadcastError) {
          // Message is saved, but broadcasting failed - log but don't emit error to user
          // The message will be loaded on refresh
          console.error('Error broadcasting message (message is saved):', broadcastError);
          // Still emit confirmation to sender since message was saved
          socket.emit('messageSent', {
            messageId: savedMessage._id.toString(),
            collegeId: messageCollegeId,
            replyTo: savedMessage.replyTo ? savedMessage.replyTo.toString() : null,
            text: savedMessage.text
          });
        }
      } catch (error) {
        // This should only catch unexpected errors
        // If message was saved, don't emit error - it will be loaded on refresh
        if (savedMessage) {
          console.error('❌ Error after message was saved (message is in DB):', error);
          console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
          });
          // Don't emit error to user - message is saved and will be loaded on refresh
          // Still emit confirmation so frontend knows message was saved
          try {
            socket.emit('messageSent', {
              messageId: savedMessage._id.toString(),
              collegeId: messageCollegeId,
              replyTo: savedMessage.replyTo ? savedMessage.replyTo.toString() : null,
              text: savedMessage.text
            });
          } catch (emitError) {
            console.error('Error emitting messageSent confirmation:', emitError);
          }
        } else {
          // Message was not saved - this is a real error
          console.error('❌ Unexpected error sending message (message NOT saved):', error);
          console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
          });
          socket.emit('error', {
            message: 'Failed to send message',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
          });
        }
      }
    });

    // Handle typing indicator
    socket.on('typing', (data) => {
      const { collegeId, isTyping } = data;
      if (collegeId) {
        const roomName = `college:${collegeId}`;
        // Broadcast to others in the room (not to sender)
        socket.to(roomName).emit('userTyping', {
          userId: socket.user.userId.toString(),
          userName: socket.user.profile?.displayName || socket.user.email.split('@')[0],
          collegeId: collegeId,
          isTyping: isTyping,
        });
      }
    });

    // Handle typing indicator for direct messages
    socket.on('typingDirect', (data) => {
      const { receiverId, isTyping } = data;
      if (receiverId) {
        // Send to specific user
        io.to(`user:${receiverId}`).emit('userTypingDirect', {
          userId: socket.user.userId.toString(),
          userName: socket.user.profile?.displayName || socket.user.email.split('@')[0],
          isTyping: isTyping,
        });
      }
    });

    // Handle message read receipt
    socket.on('markMessageRead', async (data) => {
      try {
        const { messageId, collegeId } = data;
        if (!messageId || !collegeId) return;

        const message = await Message.findById(messageId);
        if (!message) return;

        const userId = socket.user.userId.toString();
        
        // Check if already read
        const alreadyRead = message.readBy.some(
          read => read.userId.toString() === userId
        );

        if (!alreadyRead) {
          message.readBy.push({
            userId: socket.user.userId,
            readAt: new Date(),
          });
          await message.save();

          // Reload message to get latest readBy array
          const updatedMessage = await Message.findById(messageId);

          // Broadcast read receipt to others in the room
          const roomName = `college:${collegeId}`;
          socket.to(roomName).emit('messageRead', {
            messageId: messageId,
            userId: userId,
            readAt: new Date(),
          });

          // Broadcast chat list update to ALL connected users (for real-time updates)
          io.emit('chatListUpdate', {
            type: 'college',
            collegeId: collegeId,
            messageText: updatedMessage.text,
            messageTimestamp: updatedMessage.timestamp,
            senderId: updatedMessage.senderId.toString(),
            senderName: updatedMessage.senderName,
            isOwnMessage: false, // Each client will determine if it's their own message
            deliveredTo: (updatedMessage.deliveredTo || []).map(d => ({
              userId: d.userId.toString(),
              deliveredAt: d.deliveredAt
            })),
            readBy: (updatedMessage.readBy || []).map(r => ({
              userId: r.userId.toString(),
              readAt: r.readAt
            }))
          });
        }
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    });

    // Handle message delivered receipt (for college messages)
    socket.on('markMessageDelivered', async (data) => {
      try {
        const { messageId, collegeId } = data;
        if (!messageId || !collegeId) return;

        const message = await Message.findById(messageId);
        if (!message) return;

        const userId = socket.user.userId.toString();
        
        // Check if already delivered
        const alreadyDelivered = message.deliveredTo.some(
          delivered => delivered.userId.toString() === userId
        );

        if (!alreadyDelivered) {
          message.deliveredTo.push({
            userId: socket.user.userId,
            deliveredAt: new Date(),
          });
          await message.save();

          // Reload message to get latest deliveredTo array
          const updatedMessage = await Message.findById(messageId);

          // Broadcast chat list update to ALL connected users (for real-time updates)
          io.emit('chatListUpdate', {
            type: 'college',
            collegeId: collegeId,
            messageText: updatedMessage.text,
            messageTimestamp: updatedMessage.timestamp,
            senderId: updatedMessage.senderId.toString(),
            senderName: updatedMessage.senderName,
            isOwnMessage: false, // Each client will determine if it's their own message
            deliveredTo: (updatedMessage.deliveredTo || []).map(d => ({
              userId: d.userId.toString(),
              deliveredAt: d.deliveredAt
            })),
            readBy: (updatedMessage.readBy || []).map(r => ({
              userId: r.userId.toString(),
              readAt: r.readAt
            }))
          });
        }
      } catch (error) {
        console.error('Error marking message as delivered:', error);
      }
    });

    // Handle sending direct message via Socket.IO
    socket.on('sendDirectMessage', async (data) => {
      try {
        const { receiverId, text, replyToId } = data;
        const senderId = socket.user.userId.toString();

        if (!receiverId || !text || !text.trim()) {
          socket.emit('error', { message: 'Receiver ID and message text are required' });
          return;
        }

        if (String(senderId) === String(receiverId)) {
          socket.emit('error', { message: 'You cannot send a message to yourself' });
          return;
        }

        // Check if sender is blocked by receiver
        const isBlocked = await Block.findOne({
          blockerId: receiverId,
          blockedId: senderId,
        });

        if (isBlocked) {
          socket.emit('error', { message: 'You cannot send messages to this user' });
          return;
        }

        // Check if receiver is blocked by sender
        const hasBlocked = await Block.findOne({
          blockerId: senderId,
          blockedId: receiverId,
        });

        if (hasBlocked) {
          socket.emit('error', { message: 'You have blocked this user' });
          return;
        }

        // Validate replyToId if provided
        let validReplyToId = null;
        if (replyToId) {
          // Check if replyToId is a valid ObjectId format
          if (mongoose.Types.ObjectId.isValid(replyToId)) {
            validReplyToId = replyToId;
          } else {
            console.warn('Invalid replyToId format for direct message:', replyToId);
            // Don't fail, just ignore invalid replyToId
          }
        }

        // Get sender name
        const senderProfile = await UserProfile.findOne({ userId: senderId });
        const senderName = senderProfile?.displayName || 
                          `${senderProfile?.firstName || ''} ${senderProfile?.lastName || ''}`.trim() ||
                          socket.user.email.split('@')[0];

        // Create message
        const message = new DirectMessage({
          senderId,
          receiverId,
          senderName,
          text: text.trim(),
          replyTo: validReplyToId || null,
        });

        await message.save();

        // Remove DeletedChat record if it exists (so chat reappears in list)
        // This needs to be done for both sender and receiver
        try {
          // Remove for sender
          await DeletedChat.deleteMany({
            userId: socket.user.userId,
            otherUserId: receiverId,
            chatType: 'direct',
          });
          
          // Remove for receiver (so they see the chat too)
          const receiverObjectId = mongoose.Types.ObjectId.isValid(receiverId) 
            ? new mongoose.Types.ObjectId(receiverId) 
            : receiverId;
          const senderObjectId = mongoose.Types.ObjectId.isValid(senderId) 
            ? new mongoose.Types.ObjectId(senderId) 
            : senderId;
          
          await DeletedChat.deleteMany({
            userId: receiverObjectId,
            otherUserId: senderObjectId,
            chatType: 'direct',
          });
          
          console.log('Removed DeletedChat records for new message between', senderId, 'and', receiverId);
        } catch (error) {
          console.error('Error removing DeletedChat record:', error);
          // Don't fail the message send if this fails
        }

        // Track chat history to ensure chat persists even if all messages are cleared
        try {
          await ChatHistory.findOneAndUpdate(
            {
              userId: socket.user.userId,
              otherUserId: receiverId,
              chatType: 'direct',
            },
            {
              userId: socket.user.userId,
              otherUserId: receiverId,
              chatType: 'direct',
              lastInteractionAt: new Date(),
            },
            { upsert: true }
          );
        } catch (error) {
          // Non-critical, log but don't fail
          console.error('Error tracking chat history:', error);
        }

        // Format message for sending
        const messageToSend = {
          id: message._id.toString(),
          senderId: message.senderId.toString(),
          receiverId: message.receiverId.toString(),
          senderName: message.senderName,
          text: message.text,
          timestamp: message.timestamp,
          replyTo: message.replyTo ? message.replyTo.toString() : null,
          deliveredTo: [],
          readBy: [],
        };

        // Send to receiver
        io.to(`user:${receiverId}`).emit('newDirectMessage', messageToSend);

        // Send confirmation to sender
        socket.emit('directMessageSent', messageToSend);

        // Broadcast chat list update to BOTH sender and receiver
        // This ensures chat list updates in real-time for both users
        io.to(`user:${senderId}`).emit('directChatListUpdate', {
          type: 'direct',
          otherUserId: receiverId,
          messageText: message.text,
          messageTimestamp: message.timestamp,
          senderId: senderId,
          senderName: message.senderName,
          isOwnMessage: true, // For sender, it's their own message
          deliveredTo: [],
          readBy: []
        });

        io.to(`user:${receiverId}`).emit('directChatListUpdate', {
          type: 'direct',
          otherUserId: senderId,
          messageText: message.text,
          messageTimestamp: message.timestamp,
          senderId: senderId,
          senderName: message.senderName,
          isOwnMessage: false, // For receiver, it's not their own message
          deliveredTo: [],
          readBy: []
        });

        console.log(`💬 Direct message sent from ${senderId} to ${receiverId}`);
      } catch (error) {
        console.error('Error sending direct message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle message:delivered event (receiver confirms delivery)
    socket.on('message:delivered', async (data) => {
      try {
        const { messageId } = data;
        if (!messageId) return;

        const message = await DirectMessage.findById(messageId);
        if (!message) return;

        const userId = socket.user.userId.toString();
        
        // Only mark as delivered if current user is the receiver
        if (String(message.receiverId) !== userId) {
          return; // Not the receiver, ignore
        }

        // Check if already delivered
        const alreadyDelivered = message.deliveredTo.some(
          delivered => String(delivered.userId) === userId
        );

        if (!alreadyDelivered) {
          message.deliveredTo.push({
            userId: socket.user.userId,
            deliveredAt: new Date(),
          });
          await message.save();

          // Reload message to get latest deliveredTo and readBy arrays
          const updatedMessage = await DirectMessage.findById(messageId);
          const senderId = updatedMessage.senderId.toString();
          const receiverId = updatedMessage.receiverId.toString();

          // Notify sender that message was delivered
          io.to(`user:${senderId}`).emit('message:update', {
            messageId: messageId,
            status: 'delivered',
            receiverId: userId,
          });

          // Broadcast chat list update to BOTH sender and receiver (for real-time updates)
          io.to(`user:${senderId}`).emit('directChatListUpdate', {
            type: 'direct',
            otherUserId: receiverId,
            messageText: updatedMessage.text,
            messageTimestamp: updatedMessage.timestamp,
            senderId: senderId,
            senderName: updatedMessage.senderName,
            isOwnMessage: true, // For sender, it's their own message
            deliveredTo: (updatedMessage.deliveredTo || []).map(d => ({
              userId: d.userId.toString(),
              deliveredAt: d.deliveredAt
            })),
            readBy: (updatedMessage.readBy || []).map(r => ({
              userId: r.userId.toString(),
              readAt: r.readAt
            }))
          });

          io.to(`user:${receiverId}`).emit('directChatListUpdate', {
            type: 'direct',
            otherUserId: senderId,
            messageText: updatedMessage.text,
            messageTimestamp: updatedMessage.timestamp,
            senderId: senderId,
            senderName: updatedMessage.senderName,
            isOwnMessage: false, // For receiver, it's not their own message
            deliveredTo: (updatedMessage.deliveredTo || []).map(d => ({
              userId: d.userId.toString(),
              deliveredAt: d.deliveredAt
            })),
            readBy: (updatedMessage.readBy || []).map(r => ({
              userId: r.userId.toString(),
              readAt: r.readAt
            }))
          });

          console.log(`✅ Message ${messageId} marked as delivered. Notified sender: ${senderId}`);
        }
      } catch (error) {
        console.error('Error marking message as delivered:', error);
      }
    });

    // Handle message:read event (receiver marks as read)
    socket.on('message:read', async (data) => {
      try {
        const { messageId } = data;
        if (!messageId) return;

        const message = await DirectMessage.findById(messageId);
        if (!message) return;

        const userId = socket.user.userId.toString();
        
        // Only mark as read if current user is the receiver
        if (String(message.receiverId) !== userId) {
          return; // Not the receiver, ignore
        }

        // Check if already read
        const alreadyRead = message.readBy.some(
          read => String(read.userId) === userId
        );

        if (!alreadyRead) {
          message.readBy.push({
            userId: socket.user.userId,
            readAt: new Date(),
          });
          await message.save();

          // Reload message to get latest deliveredTo and readBy arrays
          const updatedMessage = await DirectMessage.findById(messageId);
          const senderId = updatedMessage.senderId.toString();
          const receiverId = updatedMessage.receiverId.toString();

          // Notify sender that message was read
          io.to(`user:${senderId}`).emit('message:update', {
            messageId: messageId,
            status: 'read',
            receiverId: userId,
          });

          // Broadcast chat list update to BOTH sender and receiver (for real-time updates)
          io.to(`user:${senderId}`).emit('directChatListUpdate', {
            type: 'direct',
            otherUserId: receiverId,
            messageText: updatedMessage.text,
            messageTimestamp: updatedMessage.timestamp,
            senderId: senderId,
            senderName: updatedMessage.senderName,
            isOwnMessage: true, // For sender, it's their own message
            deliveredTo: (updatedMessage.deliveredTo || []).map(d => ({
              userId: d.userId.toString(),
              deliveredAt: d.deliveredAt
            })),
            readBy: (updatedMessage.readBy || []).map(r => ({
              userId: r.userId.toString(),
              readAt: r.readAt
            }))
          });

          io.to(`user:${receiverId}`).emit('directChatListUpdate', {
            type: 'direct',
            otherUserId: senderId,
            messageText: updatedMessage.text,
            messageTimestamp: updatedMessage.timestamp,
            senderId: senderId,
            senderName: updatedMessage.senderName,
            isOwnMessage: false, // For receiver, it's not their own message
            deliveredTo: (updatedMessage.deliveredTo || []).map(d => ({
              userId: d.userId.toString(),
              deliveredAt: d.deliveredAt
            })),
            readBy: (updatedMessage.readBy || []).map(r => ({
              userId: r.userId.toString(),
              readAt: r.readAt
            }))
          });

          console.log(`✅ Message ${messageId} marked as read. Notified sender: ${senderId}`);
        }
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      const userId = socket.user.userId.toString();
      
      // Update last seen time in database before disconnecting
      try {
        await UserProfile.findOneAndUpdate(
          { userId: socket.user.userId },
          { lastSeen: new Date() },
          { upsert: false }
        );
      } catch (error) {
        console.error('Error updating last seen on disconnect:', error);
      }
      
      // Get user's college ID before removing from online users
      const userProfile = await UserProfile.findOne({ userId: socket.user.userId }).lean();
      const userCollegeId = userProfile?.college?.aisheCode || userProfile?.college?.name || socket.collegeId;
      
      // Mark user as offline
      onlineUsers.delete(userId);
      
      // Broadcast user offline status
      io.emit('userOffline', { userId, isOnline: false });
      
      // Update active count for user's college in real-time
      if (userCollegeId) {
        await updateCollegeActiveCount(userCollegeId);
      }
      
      console.log(`❌ User disconnected: ${socket.user.email}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  return io;
};

/**
 * Get Socket.IO instance
 */
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeSocket first.');
  }
  return io;
};

/**
 * Get online users (for API endpoints)
 */
export const getOnlineUsers = () => {
  return Array.from(onlineUsers.entries()).map(([userId, data]) => ({
    userId,
    ...data,
  }));
};

/**
 * Check if user is online
 */
export const isUserOnline = (userId) => {
  return onlineUsers.has(userId.toString());
};

