const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

/**
 * Create a new invite for a college
 */
export const createInvite = async (collegeId, options = {}) => {
  try {
    const body = { collegeId };
    
    // Only include optional fields if they are provided
    if (options.expiresAt) body.expiresAt = options.expiresAt;
    if (options.maxUses) body.maxUses = options.maxUses;
    if (options.customMessage) body.customMessage = options.customMessage;

    const response = await fetch(`${API_URL}/api/invites/create`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // Check if response is ok
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Server error' }));
      return {
        success: false,
        message: errorData.message || `Server error: ${response.status}`,
        error: errorData.error || `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating invite:', error);
    return {
      success: false,
      message: error.message || 'Failed to create invite. Please check your connection.',
      error: error.message,
    };
  }
};

/**
 * Get all invites created by the current user
 */
export const getMyInvites = async (collegeId = null) => {
  try {
    const url = collegeId
      ? `${API_URL}/api/invites/my-invites?collegeId=${encodeURIComponent(collegeId)}`
      : `${API_URL}/api/invites/my-invites`;

    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting invites:', error);
    return {
      success: false,
      message: 'Failed to get invites',
      error: error.message,
    };
  }
};

/**
 * Get invite details by token or code
 */
export const getInviteDetails = async (token = null, code = null) => {
  try {
    const params = new URLSearchParams();
    if (token) params.append('token', token);
    if (code) params.append('code', code);

    const response = await fetch(`${API_URL}/api/invites/details?${params}`, {
      method: 'GET',
      credentials: 'include',
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting invite details:', error);
    return {
      success: false,
      message: 'Failed to get invite details',
      error: error.message,
    };
  }
};

/**
 * Join a college via invite code or token
 */
export const joinViaInvite = async (token = null, code = null) => {
  try {
    const response = await fetch(`${API_URL}/api/invites/join`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: token || null,
        code: code || null,
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error joining via invite:', error);
    return {
      success: false,
      message: 'Failed to join via invite',
      error: error.message,
    };
  }
};

/**
 * Deactivate an invite
 */
export const deactivateInvite = async (inviteId) => {
  try {
    const response = await fetch(`${API_URL}/api/invites/${inviteId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error deactivating invite:', error);
    return {
      success: false,
      message: 'Failed to deactivate invite',
      error: error.message,
    };
  }
};

/**
 * Get referral statistics
 */
export const getReferralStats = async () => {
  try {
    const response = await fetch(`${API_URL}/api/invites/stats`, {
      method: 'GET',
      credentials: 'include',
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting referral stats:', error);
    return {
      success: false,
      message: 'Failed to get referral stats',
      error: error.message,
    };
  }
};

