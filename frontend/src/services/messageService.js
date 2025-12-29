import api from './api.js';

/**
 * Fetch message history for a college
 * @param {string} collegeId - College ID (aisheCode)
 * @param {number} limit - Number of messages to fetch (default: 50)
 * @param {string} before - Fetch messages before this timestamp
 * @returns {Promise} API response
 */
export const fetchMessages = async (collegeId, limit = 50, before = null) => {
  let url = `/api/messages/college/${encodeURIComponent(collegeId)}?limit=${limit}`;
  if (before) {
    url += `&before=${before}`;
  }
  return await api(url, {
    method: 'GET',
  });
};

/**
 * Fetch all colleges where user has sent or received messages
 * @returns {Promise} API response with colleges array
 */
export const fetchUserCollegesWithMessages = async () => {
  return await api('/api/messages/user/colleges', {
    method: 'GET',
  });
};

/**
 * Clear all messages sent by current user in a college chat
 * @param {string} collegeId - College ID (aisheCode)
 * @returns {Promise} API response
 */
export const clearCollegeMessages = async (collegeId) => {
  return await api(`/api/messages/college/${encodeURIComponent(collegeId)}/clear`, {
    method: 'DELETE',
  });
};

/**
 * Delete a single message (delete for me)
 * @param {string} messageId - Message ID
 * @returns {Promise} API response
 */
export const deleteMessage = async (messageId) => {
  return await api(`/api/messages/message/${encodeURIComponent(messageId)}`, {
    method: 'DELETE',
  });
};

/**
 * Delete a message for everyone (delete for all)
 * @param {string} messageId - Message ID
 * @returns {Promise} API response
 */
export const deleteMessageForAll = async (messageId) => {
  return await api(`/api/messages/message/${encodeURIComponent(messageId)}/for-all`, {
    method: 'DELETE',
  });
};



