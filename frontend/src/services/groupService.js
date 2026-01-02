const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Create a new group
 */
export const createGroup = async (groupData) => {
  try {
    const response = await fetch(`${API_URL}/api/groups/create`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(groupData),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating group:', error);
    return {
      success: false,
      message: 'Failed to create group',
      error: error.message,
    };
  }
};

/**
 * Get all groups user is a member of
 */
export const getMyGroups = async () => {
  try {
    const response = await fetch(`${API_URL}/api/groups/my-groups`, {
      method: 'GET',
      credentials: 'include',
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting groups:', error);
    return {
      success: false,
      message: 'Failed to get groups',
      error: error.message,
    };
  }
};

/**
 * Get group details by ID
 */
export const getGroupDetails = async (groupId) => {
  try {
    const response = await fetch(`${API_URL}/api/groups/${groupId}`, {
      method: 'GET',
      credentials: 'include',
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting group details:', error);
    return {
      success: false,
      message: 'Failed to get group details',
      error: error.message,
    };
  }
};

/**
 * Add members to a group
 */
export const addMembersToGroup = async (groupId, memberIds) => {
  try {
    const response = await fetch(`${API_URL}/api/groups/${groupId}/members`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ memberIds }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error adding members:', error);
    return {
      success: false,
      message: 'Failed to add members',
      error: error.message,
    };
  }
};

/**
 * Remove member from group
 */
export const removeMemberFromGroup = async (groupId, memberId) => {
  try {
    const response = await fetch(`${API_URL}/api/groups/${groupId}/members/${memberId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error removing member:', error);
    return {
      success: false,
      message: 'Failed to remove member',
      error: error.message,
    };
  }
};

/**
 * Leave group
 */
export const leaveGroup = async (groupId) => {
  try {
    const response = await fetch(`${API_URL}/api/groups/${groupId}/leave`, {
      method: 'POST',
      credentials: 'include',
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error leaving group:', error);
    return {
      success: false,
      message: 'Failed to leave group',
      error: error.message,
    };
  }
};

/**
 * Update group details
 */
export const updateGroup = async (groupId, updateData) => {
  try {
    const response = await fetch(`${API_URL}/api/groups/${groupId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error updating group:', error);
    return {
      success: false,
      message: 'Failed to update group',
      error: error.message,
    };
  }
};

/**
 * Delete group
 */
export const deleteGroup = async (groupId) => {
  try {
    const response = await fetch(`${API_URL}/api/groups/${groupId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error deleting group:', error);
    return {
      success: false,
      message: 'Failed to delete group',
      error: error.message,
    };
  }
};

/**
 * Create group invite
 */
export const createGroupInvite = async (groupId, options = {}) => {
  try {
    const body = { groupId };
    
    if (options.expiresAt) body.expiresAt = options.expiresAt;
    if (options.maxUses) body.maxUses = options.maxUses;
    if (options.customMessage) body.customMessage = options.customMessage;

    const response = await fetch(`${API_URL}/api/groups/${groupId}/invites/create`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating group invite:', error);
    return {
      success: false,
      message: 'Failed to create group invite',
      error: error.message,
    };
  }
};

/**
 * Get group invite details
 */
export const getGroupInviteDetails = async (token) => {
  try {
    const response = await fetch(`${API_URL}/api/groups/invites/details?token=${token}`, {
      method: 'GET',
      credentials: 'include',
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting group invite details:', error);
    return {
      success: false,
      message: 'Failed to get group invite details',
      error: error.message,
    };
  }
};

/**
 * Join group via invite
 */
export const joinGroupViaInvite = async (token) => {
  try {
    const response = await fetch(`${API_URL}/api/groups/invites/join`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error joining group via invite:', error);
    return {
      success: false,
      message: 'Failed to join group',
      error: error.message,
    };
  }
};

/**
 * Search users (for adding to groups)
 */
export const searchUsers = async (query) => {
  try {
    const response = await fetch(`${API_URL}/api/profile/search?query=${encodeURIComponent(query)}`, {
      method: 'GET',
      credentials: 'include',
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error searching users:', error);
    return {
      success: false,
      message: 'Failed to search users',
      error: error.message,
    };
  }
};


