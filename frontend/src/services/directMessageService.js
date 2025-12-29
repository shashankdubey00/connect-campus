import api from './api.js';

/**
 * Send a direct message
 * @param {String} receiverId - Receiver user ID
 * @param {String} text - Message text
 * @returns {Promise} API response
 */
export const sendDirectMessage = async (receiverId, text) => {
  return await api('/api/direct-messages/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ receiverId, text }),
  });
};

/**
 * Get direct messages between two users
 * @param {String} otherUserId - Other user ID
 * @returns {Promise} API response with messages
 */
export const getDirectMessages = async (otherUserId) => {
  if (!otherUserId) {
    throw new Error('User ID is required');
  }
  return await api(`/api/direct-messages/${encodeURIComponent(otherUserId)}`, {
    method: 'GET',
  });
};

/**
 * Get all direct message conversations
 * @returns {Promise} API response with conversations
 */
export const getDirectMessageConversations = async () => {
  return await api('/api/direct-messages', {
    method: 'GET',
  });
};

/**
 * Clear all messages with a user
 * @param {String} otherUserId - Other user ID
 * @returns {Promise} API response
 */
export const clearDirectMessages = async (otherUserId) => {
  return await api('/api/direct-messages/clear', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ otherUserId }),
  });
};

