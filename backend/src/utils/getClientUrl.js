/**
 * Get the client URL from environment variables
 * This ensures invite links work correctly in both development and production
 * 
 * @returns {string} The client URL (e.g., https://yourdomain.com or http://localhost:5173)
 */
export const getClientUrl = () => {
  // CLIENT_URL is required and validated in env.js
  // In production, this should be set to your actual domain
  // Example: CLIENT_URL=https://connectcampus.com
  return process.env.CLIENT_URL || 'http://localhost:5173';
};

/**
 * Generate an invite URL with the given token
 * 
 * @param {string} token - The invite token
 * @returns {string} The full invite URL
 */
export const generateInviteUrl = (token) => {
  const baseUrl = getClientUrl();
  return `${baseUrl}/invite/${token}`;
};


