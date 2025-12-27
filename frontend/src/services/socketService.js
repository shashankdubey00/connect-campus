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

  // Get token from parameter or cookies
  let authToken = token;
  if (!authToken) {
    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
      return null;
    };
    authToken = getCookie('token');
  }

  if (!authToken) {
    console.log('No token available for Socket.IO connection - will retry after login');
    return null;
  }

  const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  socket = io(API_BASE_URL, {
    auth: {
      token: authToken,
    },
    transports: ['websocket', 'polling'],
    withCredentials: true,
  });

  socket.on('connect', () => {
    console.log('✅ Socket.IO connected:', socket.id);
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket.IO disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket.IO connection error:', error);
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
  } else {
    console.error('Socket not connected');
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
  }
};

