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

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.user.email} (College: ${socket.collegeId || 'None'})`);

    // Auto-join user to their college room if they belong to one
    if (socket.collegeId) {
      const roomName = `college:${socket.collegeId}`;
      socket.join(roomName);
      console.log(`📥 User ${socket.user.email} joined room: ${roomName}`);

      // Emit confirmation to client
      socket.emit('joinedCollegeRoom', {
        success: true,
        collegeId: socket.collegeId,
        roomName: roomName,
      });
    } else {
      // User doesn't belong to a college yet
      console.log(`⚠️ User ${socket.user.email} connected but doesn't belong to a college yet`);
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

        // Prepare message for broadcast
        const messageToSend = {
          id: message._id.toString(),
          senderId: message.senderId.toString(),
          senderName: message.senderName,
          collegeId: message.collegeId,
          text: message.text,
          timestamp: message.timestamp,
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

    // Handle disconnect
    socket.on('disconnect', () => {
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

