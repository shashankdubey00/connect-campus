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

