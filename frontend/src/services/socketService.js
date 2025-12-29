import { io } from 'socket.io-client';

let socket = null;

/**
 * Initialize Socket.IO connection
 * @param {string} token - JWT token for authentication (optional, will try to get from cookies)
 * @returns {Socket} Socket instance
 */
export const connectSocket = (token = null) => {
  if (socket?.connected) {
    return socket; // Already connected
  }

  // If socket exists but not connected, disconnect it first
  if (socket && !socket.connected) {
    socket.disconnect();
    socket = null;
  }

  const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  // Socket.IO will automatically send cookies with withCredentials: true
  // The backend will read the token from cookies (httpOnly cookie)
  // If token is provided explicitly, use it; otherwise rely on cookies
  const socketConfig = {
    transports: ['websocket', 'polling'],
    withCredentials: true, // This sends cookies automatically
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  };

  // Only add auth token if explicitly provided (for cases where token is passed directly)
  if (token) {
    socketConfig.auth = { token };
  }

  socket = io(API_BASE_URL, socketConfig);

  socket.on('connect', () => {
    console.log('✅ Socket.IO connected:', socket.id);
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket.IO disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket.IO connection error:', error.message || error);
    // Don't return null on error - let reconnection handle it
  });

  return socket;
};

/**
 * Disconnect Socket.IO
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('🔌 Socket.IO disconnected');
  }
};

/**
 * Get current socket instance
 * @returns {Socket|null} Socket instance or null
 */
export const getSocket = () => {
  return socket;
};

/**
 * Join college room
 * @param {string} collegeId - College ID (aisheCode)
 */
export const joinCollegeRoom = (collegeId) => {
  if (socket?.connected) {
    socket.emit('joinCollegeRoom', { collegeId });
  }
};

/**
 * Send message
 * @param {string} text - Message text
 * @param {string} collegeId - College ID
 */
export const sendMessage = (text, collegeId) => {
  if (socket?.connected) {
    socket.emit('sendMessage', { text, collegeId });
    return true;
  } else {
    console.error('Socket not connected, attempting to reconnect...');
    // Try to reconnect
    const newSocket = connectSocket();
    if (newSocket) {
      newSocket.once('connect', () => {
        newSocket.emit('sendMessage', { text, collegeId });
        console.log('✅ Message sent after reconnection');
      });
      return true;
    }
    return false;
  }
};

/**
 * Listen for joined room confirmation
 * @param {Function} callback - Callback function
 */
export const onJoinedRoom = (callback) => {
  if (socket) {
    socket.on('joinedCollegeRoom', callback);
  }
};

/**
 * Listen for received messages
 * @param {Function} callback - Callback function
 */
export const onReceiveMessage = (callback) => {
  if (socket) {
    socket.on('receiveMessage', callback);
  }
};

/**
 * Listen for errors
 * @param {Function} callback - Callback function
 */
export const onSocketError = (callback) => {
  if (socket) {
    socket.on('error', callback);
  }
};

/**
 * Remove all listeners
 */
export const removeAllListeners = () => {
  if (socket) {
    socket.removeAllListeners('joinedCollegeRoom');
    socket.removeAllListeners('receiveMessage');
    socket.removeAllListeners('error');
    socket.removeAllListeners('userTyping');
    socket.removeAllListeners('userTypingDirect');
    socket.removeAllListeners('userOnline');
    socket.removeAllListeners('userOffline');
    socket.removeAllListeners('messageRead');
  }
};

/**
 * Emit typing indicator
 * @param {string} collegeId - College ID
 * @param {boolean} isTyping - Whether user is typing
 */
export const emitTyping = (collegeId, isTyping) => {
  if (socket?.connected && collegeId) {
    socket.emit('typing', { collegeId, isTyping });
  }
};

/**
 * Emit typing indicator for direct messages
 * @param {string} receiverId - Receiver user ID
 * @param {boolean} isTyping - Whether user is typing
 */
export const emitTypingDirect = (receiverId, isTyping) => {
  if (socket?.connected && receiverId) {
    socket.emit('typingDirect', { receiverId, isTyping });
  }
};

/**
 * Mark message as read
 * @param {string} messageId - Message ID
 * @param {string} collegeId - College ID
 */
export const markMessageRead = (messageId, collegeId) => {
  if (socket?.connected && messageId && collegeId) {
    socket.emit('markMessageRead', { messageId, collegeId });
  }
};

/**
 * Mark message as delivered
 * @param {string} messageId - Message ID
 * @param {string} collegeId - College ID
 */
export const markMessageDelivered = (messageId, collegeId) => {
  if (socket?.connected && messageId && collegeId) {
    socket.emit('markMessageDelivered', { messageId, collegeId });
  }
};

/**
 * Listen for typing indicators
 * @param {Function} callback - Callback function
 */
export const onUserTyping = (callback) => {
  if (socket) {
    socket.on('userTyping', callback);
  }
};

/**
 * Listen for typing indicators in direct messages
 * @param {Function} callback - Callback function
 */
export const onUserTypingDirect = (callback) => {
  if (socket) {
    socket.on('userTypingDirect', callback);
  }
};

/**
 * Listen for user online status
 * @param {Function} callback - Callback function
 */
export const onUserOnline = (callback) => {
  if (socket) {
    socket.on('userOnline', callback);
  }
};

/**
 * Listen for user offline status
 * @param {Function} callback - Callback function
 */
export const onUserOffline = (callback) => {
  if (socket) {
    socket.on('userOffline', callback);
  }
};

/**
 * Listen for message read receipts
 * @param {Function} callback - Callback function
 */
export const onMessageRead = (callback) => {
  if (socket) {
    socket.on('messageRead', callback);
  }
};

