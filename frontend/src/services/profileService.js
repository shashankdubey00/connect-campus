import api from './api.js';

/**
 * Upload college ID image
 * @param {File} file - College ID image file
 * @returns {Promise} API response
 */
export const uploadCollegeId = async (file) => {
  const formData = new FormData();
  formData.append('collegeIdImage', file);

  return await api('/api/profile/upload-college-id', {
    method: 'POST',
    body: formData,
    // Don't set Content-Type header, browser will set it with boundary
    headers: {},
  });
};

/**
 * Get verification status
 * @returns {Promise} API response with verification status
 */
export const getVerificationStatus = async () => {
  return await api('/api/profile/verification-status', {
    method: 'GET',
  });
};

/**
 * Upload profile picture
 * @param {File} file - Profile picture image file
 * @returns {Promise} API response
 */
export const uploadProfilePicture = async (file) => {
  const formData = new FormData();
  formData.append('profilePicture', file);

  return await api('/api/profile/upload-profile-picture', {
    method: 'POST',
    body: formData,
    headers: {},
  });
};

/**
 * Update profile
 * @param {Object} profileData - Profile data to update
 * @returns {Promise} API response
 */
export const updateProfile = async (profileData) => {
  return await api('/api/profile/update', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profileData),
  });
};

/**
 * Join a college
 * @param {Object} college - College object with aisheCode
 * @returns {Promise} API response
 */
export const joinCollege = async (college) => {
  return await api('/api/profile/join-college', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      aisheCode: college.aisheCode || college.name,
      name: college.name,
      state: college.state,
      district: college.district,
    }),
  });
};

/**
 * Leave a college
 * @param {Object} college - College object with aisheCode
 * @returns {Promise} API response
 */
export const leaveCollege = async (college) => {
  return await api('/api/profile/leave-college', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      aisheCode: college.aisheCode || college.name,
    }),
  });
};

/**
 * Follow a college
 * @param {Object} college - College object with aisheCode
 * @returns {Promise} API response
 */
export const followCollege = async (college) => {
  return await api('/api/profile/follow-college', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      aisheCode: college.aisheCode || college.name,
      name: college.name,
    }),
  });
};

/**
 * Unfollow a college
 * @param {Object} college - College object with aisheCode
 * @returns {Promise} API response
 */
export const unfollowCollege = async (college) => {
  return await api('/api/profile/unfollow-college', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      aisheCode: college.aisheCode || college.name,
      name: college.name,
    }),
  });
};

/**
 * Check if user follows a college
 * @param {Object} college - College object with aisheCode
 * @returns {Promise} API response with isFollowing boolean
 */
export const checkFollowStatus = async (college) => {
  const params = new URLSearchParams({
    aisheCode: college.aisheCode || college.name,
    name: college.name,
  });
  return await api(`/api/profile/check-follow-status?${params}`, {
    method: 'GET',
  });
};

/**
 * Get followers count for a college
 * @param {Object} college - College object with aisheCode
 * @returns {Promise} API response with count
 */
export const getCollegeFollowersCount = async (college) => {
  const params = new URLSearchParams({
    aisheCode: college.aisheCode || college.name,
    name: college.name,
  });
  return await api(`/api/profile/college-followers-count?${params}`, {
    method: 'GET',
  });
};

/**
 * Get all followers of a college with user details
 * @param {Object} college - College object with aisheCode
 * @returns {Promise} API response with members array
 */
export const getCollegeFollowers = async (college) => {
  const params = new URLSearchParams({
    aisheCode: college.aisheCode || college.name,
    name: college.name,
  });
  return await api(`/api/profile/college-followers?${params}`, {
    method: 'GET',
  });
};

/**
 * Get user profile by userId
 * @param {String} userId - User ID
 * @returns {Promise} API response with user profile
 */
export const getUserProfile = async (userId) => {
  // Encode userId to handle special characters and dots
  const encodedUserId = encodeURIComponent(userId)
  return await api(`/api/profile/user/${encodedUserId}`, {
    method: 'GET',
  });
};

/**
 * Block a user
 * @param {String} blockedId - User ID to block
 * @returns {Promise} API response
 */
export const blockUser = async (blockedId) => {
  return await api('/api/profile/block-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ blockedId }),
  });
};

/**
 * Unblock a user
 * @param {String} blockedId - User ID to unblock
 * @returns {Promise} API response
 */
export const unblockUser = async (blockedId) => {
  return await api('/api/profile/unblock-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ blockedId }),
  });
};

/**
 * Check block status between two users
 * @param {String} userId - Other user ID
 * @returns {Promise} API response with block status
 */
export const checkBlockStatus = async (userId) => {
  const params = new URLSearchParams({ userId });
  return await api(`/api/profile/check-block-status?${params}`, {
    method: 'GET',
  });
};

/**
 * Get all colleges that a user has joined/followed
 * @param {String} userId - User ID
 * @returns {Promise} API response with colleges array
 */
export const getUserColleges = async (userId) => {
  return await api(`/api/profile/user/${encodeURIComponent(userId)}/colleges`, {
    method: 'GET',
  });
};

