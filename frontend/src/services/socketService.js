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
 * @param {string|null} replyToId - Optional message ID to reply to
 * @returns {Promise<boolean>} Promise that resolves to true if sent, rejects on error
 */
export const sendMessage = (text, collegeId, replyToId = null) => {
  return new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error('Socket not initialized'));
      return;
    }

    if (socket.connected) {
      // Set up error listener for this specific message
      // Only reject on connection errors, not on server errors (message might still be saved)
      const errorHandler = (error) => {
        socket.off('error', errorHandler);
        // Only reject if it's a connection error, not a server error
        // Server errors might mean the message was still saved
        if (error.message?.includes('connection') || error.message?.includes('disconnect')) {
          reject(new Error(error.message || 'Connection error'));
        } else {
          // Log the error but don't reject - message might still be saved
          console.warn('⚠️ Socket error (message might still be saved):', error);
          // Resolve anyway - the receiveMessage event will confirm if message was saved
          resolve(true);
        }
      };
      
      socket.once('error', errorHandler);
      
      // Set timeout to reject if no response (only for connection issues)
      const timeout = setTimeout(() => {
        socket.off('error', errorHandler);
        // Don't reject on timeout - message might still be saved
        // The receiveMessage event will confirm
        console.warn('⚠️ Message send timeout (message might still be saved)');
        resolve(true);
      }, 10000);
      
      // Listen for successful send (message will be received via receiveMessage)
      socket.emit('sendMessage', { text, collegeId, replyToId });
      
      // Clear timeout and resolve after a short delay to allow server processing
      setTimeout(() => {
        clearTimeout(timeout);
        socket.off('error', errorHandler);
        resolve(true);
      }, 100);
    } else {
      console.error('Socket not connected, attempting to reconnect...');
      // Try to reconnect
      const newSocket = connectSocket();
      if (newSocket) {
        newSocket.once('connect', () => {
          const errorHandler = (error) => {
            newSocket.off('error', errorHandler);
            reject(new Error(error.message || 'Failed to send message'));
          };
          
          newSocket.once('error', errorHandler);
          newSocket.emit('sendMessage', { text, collegeId, replyToId });
          
          setTimeout(() => {
            newSocket.off('error', errorHandler);
            resolve(true);
          }, 100);
        });
        
        newSocket.once('connect_error', (error) => {
          reject(new Error('Failed to reconnect socket'));
        });
      } else {
        reject(new Error('Failed to create socket instance'));
      }
    }
  });
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

/**
 * Send direct message via Socket.IO
 * @param {string} receiverId - Receiver user ID
 * @param {string} text - Message text
 */
export const sendDirectMessageSocket = (receiverId, text, replyToId = null) => {
  if (socket?.connected && receiverId && text) {
    socket.emit('sendDirectMessage', { receiverId, text, replyToId });
    return true;
  }
  return false;
};

/**
 * Mark direct message as delivered
 * @param {string} messageId - Message ID
 */
export const markDirectMessageDelivered = (messageId) => {
  if (socket?.connected && messageId) {
    socket.emit('message:delivered', { messageId });
  }
};

/**
 * Mark direct message as read
 * @param {string} messageId - Message ID
 */
export const markDirectMessageRead = (messageId) => {
  if (socket?.connected && messageId) {
    socket.emit('message:read', { messageId });
  }
};

/**
 * Listen for new direct messages
 * @param {Function} callback - Callback function
 */
export const onNewDirectMessage = (callback) => {
  if (socket) {
    socket.on('newDirectMessage', callback);
  }
};

/**
 * Listen for direct message sent confirmation
 * @param {Function} callback - Callback function
 */
export const onDirectMessageSent = (callback) => {
  if (socket) {
    socket.on('directMessageSent', callback);
  }
};

/**
 * Listen for message status updates (delivered/read)
 * @param {Function} callback - Callback function
 */
export const onMessageUpdate = (callback) => {
  if (socket) {
    socket.on('message:update', callback);
  }
};

/**
 * Listen for college active count updates
 * @param {Function} callback - Callback function(data) where data = { collegeId, activeCount }
 */
export const onCollegeActiveCountUpdate = (callback) => {
  if (socket) {
    socket.on('collegeActiveCountUpdate', callback);
  }
};

/**
 * Join group room
 * @param {string} groupId - Group ID
 */
export const joinGroupRoom = (groupId) => {
  if (socket?.connected && groupId) {
    const groupIdStr = String(groupId);
    console.log('Joining group room:', groupIdStr);
    socket.emit('joinGroupRoom', { groupId: groupIdStr });
  } else {
    console.warn('Cannot join group room - socket not connected or groupId missing', { 
      connected: socket?.connected, 
      groupId 
    });
  }
};

/**
 * Leave group room
 * @param {string} groupId - Group ID
 */
export const leaveGroupRoom = (groupId) => {
  if (socket?.connected && groupId) {
    socket.emit('leaveGroupRoom', { groupId });
  }
};

/**
 * Emit typing indicator for group messages
 * @param {string} groupId - Group ID
 * @param {boolean} isTyping - Whether user is typing
 */
export const emitTypingGroup = (groupId, isTyping) => {
  if (socket?.connected && groupId) {
    socket.emit('typingGroup', { groupId, isTyping });
  }
};

/**
 * Listen for typing indicators in group messages
 * @param {Function} callback - Callback function
 */
export const onUserTypingGroup = (callback) => {
  if (socket) {
    socket.on('userTypingGroup', callback);
  }
};

/**
 * Listen for group messages
 * @param {Function} callback - Callback function
 */
export const onGroupMessage = (callback) => {
  if (socket) {
    socket.on('groupMessage', callback);
  }
};

/**
 * Mark group message as read
 * @param {string} messageId - Message ID
 * @param {string} groupId - Group ID
 */
export const markGroupMessageRead = (messageId, groupId) => {
  if (socket?.connected && messageId && groupId) {
    socket.emit('markGroupMessageRead', { messageId, groupId });
  }
};

/**
 * Mark group message as delivered
 * @param {string} messageId - Message ID
 * @param {string} groupId - Group ID
 */
export const markGroupMessageDelivered = (messageId, groupId) => {
  if (socket?.connected && messageId && groupId) {
    socket.emit('markGroupMessageDelivered', { messageId, groupId });
  }
};

/**
 * Send group message via Socket.IO
 * @param {string} groupId - Group ID
 * @param {string} text - Message text
 * @param {string|null} replyToId - Optional message ID to reply to
 */
export const sendGroupMessageSocket = (groupId, text, replyToId = null) => {
  if (socket?.connected && groupId && text) {
    socket.emit('sendGroupMessage', { groupId, text, replyToId });
    return true;
  }
  return false;
};

