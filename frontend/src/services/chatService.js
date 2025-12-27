import { fetchMessages } from './messageService.js';

/**
 * Get user's college chat info with last message
 * @param {string} collegeId - College ID (aisheCode)
 * @returns {Promise} API response with chat info and last message
 */
export const getCollegeChatInfo = async (collegeId) => {
  try {
    // Fetch last message to get preview
    const response = await fetchMessages(collegeId, 1);
    if (response.success && response.messages.length > 0) {
      const lastMessage = response.messages[response.messages.length - 1];
      return {
        success: true,
        lastMessage: lastMessage.text,
        lastMessageTime: lastMessage.timestamp,
        messageCount: response.count,
      };
    }
    return {
      success: true,
      lastMessage: null,
      lastMessageTime: null,
      messageCount: 0,
    };
  } catch (error) {
    console.error('Error fetching chat info:', error);
    return {
      success: false,
      lastMessage: null,
      lastMessageTime: null,
      messageCount: 0,
    };
  }
};

