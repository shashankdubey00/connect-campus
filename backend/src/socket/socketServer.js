import { Server } from 'socket.io';
import { authenticateSocket } from '../middleware/socketAuth.js';
import Message from '../models/Message.js';
import UserProfile from '../models/UserProfile.js';
import Block from '../models/Block.js';

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

  // Connection handler
  io.on('connection', (socket) => {
    const userId = socket.user.userId.toString();
    const userEmail = socket.user.email;
    
    // Mark user as online
    onlineUsers.set(userId, {
      socketId: socket.id,
      email: userEmail,
      lastSeen: new Date(),
      isOnline: true,
    });
    
    // Broadcast user online status to all connected clients
    io.emit('userOnline', { userId, isOnline: true });
    
    console.log(`✅ User connected: ${userEmail} (College: ${socket.collegeId || 'None'})`);

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
    } else {
      // User doesn't belong to a college yet
      console.log(`⚠️ User ${userEmail} connected but doesn't belong to a college yet`);
    }

    // Handle joinCollegeRoom event - allow joining any college room
    socket.on('joinCollegeRoom', (data) => {
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
    });

    // Handle sendMessage event - allow sending to any college room
    socket.on('sendMessage', async (data) => {
      try {
        const { text, collegeId } = data;

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

        // Create message object
        const messageData = {
          senderId: socket.user.userId,
          senderName: senderName,
          collegeId: messageCollegeId,
          text: text.trim(),
          timestamp: new Date(),
        };

        // Save message to database
        const message = new Message(messageData);
        const savedMessage = await message.save();
        
        console.log(`💾 Message saved to DB: ${savedMessage._id} for college: ${messageCollegeId}`);

        // Mark message as delivered to sender immediately
        savedMessage.deliveredTo.push({
          userId: socket.user.userId,
          deliveredAt: new Date(),
        });
        await savedMessage.save();

        // Prepare message for broadcast
        const messageToSend = {
          id: savedMessage._id.toString(),
          senderId: savedMessage.senderId.toString(),
          senderName: savedMessage.senderName,
          collegeId: savedMessage.collegeId,
          text: savedMessage.text,
          timestamp: savedMessage.timestamp,
          deliveredTo: savedMessage.deliveredTo.map(d => ({
            userId: d.userId.toString(),
            deliveredAt: d.deliveredAt,
          })),
          readBy: savedMessage.readBy.map(r => ({
            userId: r.userId.toString(),
            readAt: r.readAt,
          })),
        };

        // Broadcast to all users in the college room
        const roomName = `college:${messageCollegeId}`;
        io.to(roomName).emit('receiveMessage', messageToSend);

        console.log(`💬 Message sent in ${roomName} by ${socket.user.email}`);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', {
          message: 'Failed to send message',
        });
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

          // Broadcast read receipt to others in the room
          const roomName = `college:${collegeId}`;
          socket.to(roomName).emit('messageRead', {
            messageId: messageId,
            userId: userId,
            readAt: new Date(),
          });
        }
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    });

    // Handle message delivered receipt
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
        }
      } catch (error) {
        console.error('Error marking message as delivered:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      const userId = socket.user.userId.toString();
      
      // Mark user as offline
      onlineUsers.delete(userId);
      
      // Broadcast user offline status
      io.emit('userOffline', { userId, isOnline: false });
      
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

