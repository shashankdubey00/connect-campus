/**
 * Safely encode college data for URL usage
 * Handles special characters like commas, ampersands, quotes, etc.
 */

/**
 * Encode college name for URL - handles all special characters
 * @param {string} collegeName - The college name to encode
 * @returns {string} - URL-safe encoded string
 */
export const encodeCollegeName = (collegeName) => {
  if (!collegeName) return '';
  
  // Use encodeURIComponent for complete encoding
  // This handles: commas, ampersands, quotes, slashes, spaces, etc.
  return encodeURIComponent(collegeName.trim());
};

/**
 * Decode college name from URL
 * @param {string} encodedName - The encoded college name from URL
 * @returns {string} - Decoded college name
 */
export const decodeCollegeName = (encodedName) => {
  if (!encodedName) return '';
  
  try {
    return decodeURIComponent(encodedName);
  } catch (error) {
    console.error('Error decoding college name:', error);
    // Fallback: return the original string if decoding fails
    return encodedName;
  }
};

/**
 * Create a safe college ID from collegeId or name
 * This creates a URL-friendly slug while preserving uniqueness
 * @param {string} collegeId - Unique college identifier (e.g., aisheCode)
 * @param {string} collegeName - College name (fallback if no ID)
 * @returns {string} - URL-safe identifier
 */
export const createCollegeSlug = (collegeId, collegeName) => {
  // Prefer collegeId if available (more reliable)
  if (collegeId) {
    return encodeURIComponent(collegeId);
  }
  
  // Fallback to encoded name
  return encodeCollegeName(collegeName);
};

/**
 * Generate college detail URL
 * @param {Object} college - College object with id/aisheCode and name
 * @returns {string} - Complete URL path
 */
export const getCollegeDetailUrl = (college) => {
  const { aisheCode, _id, name } = college;
  
  // Strategy 1: Use aisheCode (unique identifier)
  if (aisheCode) {
    return `/college/${encodeURIComponent(aisheCode)}`;
  }
  
  // Strategy 2: Use MongoDB _id
  if (_id) {
    return `/college/${encodeURIComponent(_id)}`;
  }
  
  // Strategy 3: Use encoded name (least preferred)
  return `/college/${encodeCollegeName(name)}`;
};

/**
 * Parse college identifier from URL params
 * @param {string} param - URL parameter (could be ID or encoded name)
 * @returns {string} - Decoded identifier
 */
export const parseCollegeParam = (param) => {
  if (!param) return '';
  
  try {
    return decodeURIComponent(param);
  } catch (error) {
    console.error('Error parsing college param:', error);
    return param;
  }
};

/**
 * Validate if a string is URL-safe
 * @param {string} str - String to validate
 * @returns {boolean} - True if URL-safe
 */
export const isUrlSafe = (str) => {
  if (!str) return false;
  
  // Check if encoding changes the string
  return encodeURIComponent(str) === str;
};

/**
 * Create a human-readable slug from college name
 * Optional: Use this for SEO-friendly URLs
 * @param {string} collegeName - College name
 * @returns {string} - Slug (e.g., "sagar-institute-research-technology")
 */
export const createReadableSlug = (collegeName) => {
  if (!collegeName) return '';
  
  return collegeName
    .toLowerCase()
    .trim()
    // Remove special characters except spaces and hyphens
    .replace(/[^\w\s-]/g, '')
    // Replace spaces with hyphens
    .replace(/\s+/g, '-')
    // Remove consecutive hyphens
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '');
};

/**
 * Create a combined slug with ID and readable name
 * Example: "C-12345-sagar-institute-research-technology"
 * @param {string} collegeId - Unique identifier
 * @param {string} collegeName - College name
 * @returns {string} - Combined slug
 */
export const createCombinedSlug = (collegeId, collegeName) => {
  const idPart = collegeId ? `${collegeId}` : '';
  const namePart = createReadableSlug(collegeName);
  
  if (idPart && namePart) {
    return `${idPart}-${namePart}`;
  }
  
  return idPart || namePart;
};

/**
 * Extract college ID from combined slug
 * @param {string} slug - Combined slug
 * @returns {string} - Extracted ID
 */
export const extractIdFromSlug = (slug) => {
  if (!slug) return '';
  
  // If it's a combined slug like "C-12345-name-here"
  // Extract everything before the first readable part
  const parts = slug.split('-');
  
  // If first part looks like an ID (alphanumeric), return it
  if (parts[0] && /^[A-Z0-9]+$/i.test(parts[0])) {
    return parts[0];
  }
  
  // Otherwise, decode and return the whole thing
  return decodeURIComponent(slug);
};
