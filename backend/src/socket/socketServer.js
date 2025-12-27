import { Server } from 'socket.io';
import { authenticateSocket } from '../middleware/socketAuth.js';
import Message from '../models/Message.js';
import UserProfile from '../models/UserProfile.js';

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
    console.log(`✅ User connected: ${socket.user.email} (College: ${socket.collegeId})`);

    // Auto-join user to their college room
    const roomName = `college:${socket.collegeId}`;
    socket.join(roomName);
    console.log(`📥 User ${socket.user.email} joined room: ${roomName}`);

    // Emit confirmation to client
    socket.emit('joinedCollegeRoom', {
      success: true,
      collegeId: socket.collegeId,
      roomName: roomName,
    });

    // Handle joinCollegeRoom event (redundant but for explicit joining)
    socket.on('joinCollegeRoom', (data) => {
      const { collegeId } = data;
      const room = `college:${collegeId || socket.collegeId}`;
      
      // Verify user belongs to this college
      if (collegeId && collegeId !== socket.collegeId) {
        socket.emit('error', {
          message: 'You can only join your own college room',
        });
        return;
      }

      socket.join(room);
      socket.emit('joinedCollegeRoom', {
        success: true,
        collegeId: collegeId || socket.collegeId,
        roomName: room,
      });
    });

    // Handle sendMessage event
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

        // Use socket's collegeId or provided collegeId
        const messageCollegeId = collegeId || socket.collegeId;

        // Verify user belongs to this college
        if (collegeId && collegeId !== socket.collegeId) {
          socket.emit('error', {
            message: 'You can only send messages to your own college room',
          });
          return;
        }

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

