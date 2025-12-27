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

