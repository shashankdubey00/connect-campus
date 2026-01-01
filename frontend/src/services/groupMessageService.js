import api from './api.js';

/**
 * Fetch group message history
 * @param {string} groupId - Group ID
 * @param {number} limit - Number of messages to fetch (default: 50)
 * @param {string} before - Fetch messages before this timestamp
 * @returns {Promise} API response
 */
export const fetchGroupMessages = async (groupId, limit = 50, before = null) => {
  let url = `/api/groups/${encodeURIComponent(groupId)}/messages?limit=${limit}`;
  if (before) {
    url += `&before=${before}`;
  }
  return await api(url, {
    method: 'GET',
  });
};

/**
 * Send a message to a group
 * @param {string} groupId - Group ID
 * @param {string} text - Message text
 * @param {string} replyTo - Optional message ID to reply to
 * @returns {Promise} API response
 */
export const sendGroupMessage = async (groupId, text, replyTo = null) => {
  return await api(`/api/groups/${encodeURIComponent(groupId)}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      replyTo,
    }),
  });
};

/**
 * Delete a group message (for me only)
 * @param {string} messageId - Message ID
 * @returns {Promise} API response
 */
export const deleteGroupMessage = async (messageId) => {
  return await api(`/api/groups/messages/${encodeURIComponent(messageId)}`, {
    method: 'DELETE',
  });
};

/**
 * Delete a group message for everyone
 * @param {string} messageId - Message ID
 * @returns {Promise} API response
 */
export const deleteGroupMessageForAll = async (messageId) => {
  return await api(`/api/groups/messages/${encodeURIComponent(messageId)}/for-all`, {
    method: 'DELETE',
  });
};

/**
 * Clear all group messages (for me only)
 * @param {string} groupId - Group ID
 * @returns {Promise} API response
 */
export const clearGroupMessages = async (groupId) => {
  return await api(`/api/groups/${encodeURIComponent(groupId)}/messages/clear`, {
    method: 'DELETE',
  });
};

