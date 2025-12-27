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

