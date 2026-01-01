import Group from '../models/Group.js';
import GroupInvite from '../models/GroupInvite.js';
import GroupMessage from '../models/GroupMessage.js';
import User from '../models/User.js';
import UserProfile from '../models/UserProfile.js';
import DeletedMessage from '../models/DeletedMessage.js';
import { generateInviteUrl } from '../utils/getClientUrl.js';
import crypto from 'crypto';

/**
 * Generate a unique group invite code
 */
const generateGroupInviteCode = () => {
  const prefix = 'GRP';
  const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${randomPart}`;
};

/**
 * Generate a unique token for group invite links
 */
const generateGroupToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Create a new private group
 */
export const createGroup = async (req, res) => {
  try {
    const { name, description, avatar, memberIds, collegeId } = req.body;
    const userId = req.user.userId;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Group name is required',
      });
    }

    // Create group with creator as admin
    const group = new Group({
      name: name.trim(),
      description: description?.trim() || '',
      avatar: avatar || null,
      createdBy: userId,
      collegeId: collegeId || null,
      members: [{
        userId: userId,
        role: 'admin',
        joinedAt: new Date(),
      }],
    });

    // Add members if provided
    if (memberIds && Array.isArray(memberIds) && memberIds.length > 0) {
      // Remove duplicates and exclude creator
      const uniqueMemberIds = [...new Set(memberIds)]
        .filter(id => String(id) !== String(userId));
      
      for (const memberId of uniqueMemberIds) {
        // Verify user exists
        const user = await User.findById(memberId);
        if (user) {
          group.members.push({
            userId: memberId,
            role: 'member',
            joinedAt: new Date(),
            addedBy: userId,
          });
        }
      }
    }

    await group.save();
    await group.populate('members.userId', 'email profile');

    res.json({
      success: true,
      message: 'Group created successfully',
      group: {
        id: group._id,
        name: group.name,
        description: group.description,
        avatar: group.avatar,
        memberCount: group.members.length,
        createdBy: group.createdBy,
        members: group.members.map(m => ({
          userId: m.userId._id,
          name: m.userId.profile?.displayName || m.userId.email?.split('@')[0] || 'User',
          avatar: m.userId.profile?.profilePicture || null,
          role: m.role,
        })),
      },
    });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating group',
      error: error.message,
    });
  }
};

/**
 * Get all groups user is a member of
 */
export const getMyGroups = async (req, res) => {
  try {
    const userId = req.user.userId;

    const groups = await Group.find({
      'members.userId': userId,
    })
      .populate('members.userId', 'email profile')
      .populate('createdBy', 'email profile')
      .sort({ updatedAt: -1 })
      .lean();

    const formattedGroups = groups.map(group => ({
      id: group._id,
      name: group.name,
      description: group.description,
      avatar: group.avatar,
      memberCount: group.members.length,
      createdBy: {
        id: group.createdBy._id,
        name: group.createdBy.profile?.displayName || group.createdBy.email?.split('@')[0] || 'User',
      },
      members: group.members.map(m => ({
        userId: m.userId._id,
        name: m.userId.profile?.displayName || m.userId.email?.split('@')[0] || 'User',
        avatar: m.userId.profile?.profilePicture || null,
        role: m.role,
      })),
      isAdmin: group.members.find(m => String(m.userId._id) === String(userId))?.role === 'admin',
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    }));

    res.json({
      success: true,
      groups: formattedGroups,
    });
  } catch (error) {
    console.error('Error getting groups:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting groups',
      error: error.message,
    });
  }
};

/**
 * Get group details by ID
 */
export const getGroupDetails = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.userId;

    const group = await Group.findById(groupId)
      .populate('members.userId', 'email profile')
      .populate('createdBy', 'email profile')
      .lean();

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Check if user is a member
    const isMember = group.members.some(m => String(m.userId._id) === String(userId));
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group',
      });
    }

    res.json({
      success: true,
      group: {
        id: group._id,
        name: group.name,
        description: group.description,
        avatar: group.avatar,
        memberCount: group.members.length,
        createdBy: {
          id: group.createdBy._id,
          name: group.createdBy.profile?.displayName || group.createdBy.email?.split('@')[0] || 'User',
        },
        members: group.members.map(m => ({
          userId: m.userId._id,
          name: m.userId.profile?.displayName || m.userId.email?.split('@')[0] || 'User',
          avatar: m.userId.profile?.profilePicture || null,
          role: m.role,
          joinedAt: m.joinedAt,
        })),
        isAdmin: group.members.find(m => String(m.userId._id) === String(userId))?.role === 'admin',
        settings: group.settings,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error getting group details:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting group details',
      error: error.message,
    });
  }
};

/**
 * Add members to a group
 */
export const addMembers = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { memberIds } = req.body;
    const userId = req.user.userId;

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Member IDs are required',
      });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Check if user is admin or if members can add others
    const userMember = group.members.find(m => String(m.userId) === String(userId));
    if (!userMember) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group',
      });
    }

    if (group.settings.onlyAdminCanAdd && userMember.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can add members',
      });
    }

    // Add new members
    const addedMembers = [];
    for (const memberId of memberIds) {
      // Check if already a member
      const existingMember = group.members.find(m => String(m.userId) === String(memberId));
      if (existingMember) continue;

      // Verify user exists
      const user = await User.findById(memberId);
      if (user) {
        group.members.push({
          userId: memberId,
          role: 'member',
          joinedAt: new Date(),
          addedBy: userId,
        });
        addedMembers.push(memberId);
      }
    }

    if (addedMembers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No new members to add',
      });
    }

    await group.save();
    await group.populate('members.userId', 'email profile');

    res.json({
      success: true,
      message: `Added ${addedMembers.length} member(s) to the group`,
      group: {
        id: group._id,
        memberCount: group.members.length,
        members: group.members.map(m => ({
          userId: m.userId._id,
          name: m.userId.profile?.displayName || m.userId.email?.split('@')[0] || 'User',
          avatar: m.userId.profile?.profilePicture || null,
          role: m.role,
        })),
      },
    });
  } catch (error) {
    console.error('Error adding members:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding members',
      error: error.message,
    });
  }
};

/**
 * Remove member from group
 */
export const removeMember = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const userId = req.user.userId;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Check if user is admin
    const userMember = group.members.find(m => String(m.userId) === String(userId));
    if (!userMember || userMember.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can remove members',
      });
    }

    // Can't remove yourself if you're the only admin
    const admins = group.members.filter(m => m.role === 'admin');
    if (String(memberId) === String(userId) && admins.length === 1) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove the last admin. Assign another admin first.',
      });
    }

    // Remove member
    group.members = group.members.filter(m => String(m.userId) !== String(memberId));
    await group.save();

    res.json({
      success: true,
      message: 'Member removed successfully',
      group: {
        id: group._id,
        memberCount: group.members.length,
      },
    });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing member',
      error: error.message,
    });
  }
};

/**
 * Leave group
 */
export const leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.userId;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Check if user is a member
    const userMember = group.members.find(m => String(m.userId) === String(userId));
    if (!userMember) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group',
      });
    }

    // Can't leave if you're the only admin
    if (userMember.role === 'admin') {
      const admins = group.members.filter(m => m.role === 'admin');
      if (admins.length === 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot leave as the only admin. Assign another admin first or delete the group.',
        });
      }
    }

    // Remove member
    group.members = group.members.filter(m => String(m.userId) !== String(userId));
    await group.save();

    res.json({
      success: true,
      message: 'Left group successfully',
    });
  } catch (error) {
    console.error('Error leaving group:', error);
    res.status(500).json({
      success: false,
      message: 'Error leaving group',
      error: error.message,
    });
  }
};

/**
 * Update group details
 */
export const updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description, avatar, settings } = req.body;
    const userId = req.user.userId;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Check if user is admin
    const userMember = group.members.find(m => String(m.userId) === String(userId));
    if (!userMember || userMember.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can update group details',
      });
    }

    // Update fields
    if (name !== undefined) group.name = name.trim();
    if (description !== undefined) group.description = description?.trim() || '';
    if (avatar !== undefined) group.avatar = avatar;
    if (settings !== undefined) {
      group.settings = { ...group.settings, ...settings };
    }

    await group.save();
    await group.populate('members.userId', 'email profile');

    res.json({
      success: true,
      message: 'Group updated successfully',
      group: {
        id: group._id,
        name: group.name,
        description: group.description,
        avatar: group.avatar,
        settings: group.settings,
      },
    });
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating group',
      error: error.message,
    });
  }
};

/**
 * Delete group
 */
export const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.userId;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Only creator can delete
    if (String(group.createdBy) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Only group creator can delete the group',
      });
    }

    await Group.findByIdAndDelete(groupId);

    res.json({
      success: true,
      message: 'Group deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting group',
      error: error.message,
    });
  }
};

/**
 * Create group invite
 */
export const createGroupInvite = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { expiresAt, maxUses, customMessage } = req.body;
    const userId = req.user.userId;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Check if user is a member
    const userMember = group.members.find(m => String(m.userId) === String(userId));
    if (!userMember) {
      return res.status(403).json({
        success: false,
        message: 'You must be a member to create invites',
      });
    }

    // Check if members can invite (if not admin)
    if (userMember.role !== 'admin' && !group.settings.allowMemberInvites) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can create invites',
      });
    }

    // Generate unique invite code and token
    let inviteCode = generateGroupInviteCode();
    let token = generateGroupToken();
    
    // Ensure uniqueness
    while (await GroupInvite.findOne({ inviteCode })) {
      inviteCode = generateGroupInviteCode();
    }
    while (await GroupInvite.findOne({ token })) {
      token = generateGroupToken();
    }

    // Create invite
    const invite = new GroupInvite({
      groupId,
      createdBy: userId,
      inviteCode,
      token,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      maxUses: maxUses || null,
      customMessage: customMessage || null,
    });

    await invite.save();

    // Generate invite URL using utility function (consistent with college invites)
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const inviteUrl = `${baseUrl}/group-invite/${token}`;

    res.json({
      success: true,
      message: 'Group invite created successfully',
      invite: {
        id: invite._id,
        inviteCode: invite.inviteCode,
        token: invite.token,
        inviteUrl: inviteUrl,
        expiresAt: invite.expiresAt,
        maxUses: invite.maxUses,
        useCount: invite.useCount,
        customMessage: invite.customMessage,
      },
    });
  } catch (error) {
    console.error('Error creating group invite:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating group invite',
      error: error.message,
    });
  }
};

/**
 * Get group invite details
 */
export const getGroupInviteDetails = async (req, res) => {
  try {
    const { token, code } = req.query;

    if (!token && !code) {
      return res.status(400).json({
        success: false,
        message: 'Token or code is required',
      });
    }

    const query = token ? { token } : { inviteCode: code?.toUpperCase() };
    const invite = await GroupInvite.findOne(query)
      .populate('groupId')
      .populate('createdBy', 'email profile')
      .lean();

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: 'Invite not found',
      });
    }

    // Check if invite is valid
    const isValid = invite.isActive && 
                   (!invite.expiresAt || new Date() < invite.expiresAt) &&
                   (!invite.maxUses || invite.useCount < invite.maxUses);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invite is expired, inactive, or has reached its maximum uses',
      });
    }

    const group = await Group.findById(invite.groupId)
      .populate('members.userId', 'email profile')
      .lean();

    res.json({
      success: true,
      invite: {
        id: invite._id,
        group: group ? {
          id: group._id,
          name: group.name,
          description: group.description,
          avatar: group.avatar,
          memberCount: group.members.length,
        } : null,
        inviteCode: invite.inviteCode,
        isValid: isValid,
        expiresAt: invite.expiresAt,
        maxUses: invite.maxUses,
        useCount: invite.useCount,
        customMessage: invite.customMessage,
        createdBy: {
          id: invite.createdBy?._id,
          name: invite.createdBy?.profile?.displayName || 'Unknown',
        },
      },
    });
  } catch (error) {
    console.error('Error getting group invite details:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting group invite details',
      error: error.message,
    });
  }
};

/**
 * Join group via invite
 */
export const joinGroupViaInvite = async (req, res) => {
  try {
    const { token, code } = req.body;
    const userId = req.user.userId;

    if (!token && !code) {
      return res.status(400).json({
        success: false,
        message: 'Token or code is required',
      });
    }

    const query = token ? { token } : { inviteCode: code?.toUpperCase() };
    const invite = await GroupInvite.findOne(query);

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: 'Invite not found',
      });
    }

    // Check if invite is valid
    if (!invite.isActive || 
        (invite.expiresAt && new Date() > invite.expiresAt) ||
        (invite.maxUses && invite.useCount >= invite.maxUses)) {
      return res.status(400).json({
        success: false,
        message: 'This invite is no longer valid',
      });
    }

    const group = await Group.findById(invite.groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Check if already a member
    const existingMember = group.members.find(m => String(m.userId) === String(userId));
    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this group',
      });
    }

    // Add user to group
    group.members.push({
      userId: userId,
      role: 'member',
      joinedAt: new Date(),
      addedBy: invite.createdBy,
    });

    await group.save();

    // Record invite usage
    invite.useCount += 1;
    invite.usedBy.push({
      userId: userId,
      usedAt: new Date(),
    });
    await invite.save();

    res.json({
      success: true,
      message: 'Successfully joined group via invite',
      group: {
        id: group._id,
        name: group.name,
      },
    });
  } catch (error) {
    console.error('Error joining group via invite:', error);
    res.status(500).json({
      success: false,
      message: 'Error joining group via invite',
      error: error.message,
    });
  }
};

/**
 * Get group messages
 */
export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { limit = 50, before } = req.query;
    const userId = req.user.userId;

    // Verify user is a member of the group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    const isMember = group.members.some(m => String(m.userId) === String(userId));
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You must be a member to view messages',
      });
    }

    // Build query
    const query = { groupId: groupId };
    if (before) {
      query.timestamp = { $lt: new Date(before) };
    }

    // Fetch messages
    const limitValue = Math.min(parseInt(limit) || 50, 200);
    const allMessages = await GroupMessage.find(query)
      .sort({ timestamp: 1 })
      .limit(limitValue)
      .lean();

    // Get list of message IDs that are marked as deleted for this user
    const messageIds = allMessages.map(msg => msg._id);
    const deletedMessages = await DeletedMessage.find({
      userId: userId,
      messageId: { $in: messageIds },
      messageType: 'group'
    }).select('messageId').lean();

    const deletedMessageIds = new Set(deletedMessages.map(d => d.messageId.toString()));
    const visibleMessages = allMessages.filter(msg => !deletedMessageIds.has(msg._id.toString()));

    res.json({
      success: true,
      count: visibleMessages.length,
      messages: visibleMessages.map(msg => ({
        id: msg._id.toString(),
        senderId: msg.senderId.toString(),
        senderName: msg.senderName,
        groupId: msg.groupId.toString(),
        text: msg.text,
        timestamp: msg.timestamp,
        replyTo: msg.replyTo ? msg.replyTo.toString() : null,
        readBy: msg.readBy || [],
        deliveredTo: msg.deliveredTo || [],
      })),
    });
  } catch (error) {
    console.error('Error fetching group messages:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching group messages',
      error: error.message,
    });
  }
};

/**
 * Send group message
 */
export const sendGroupMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { text, replyTo } = req.body;
    const userId = req.user.userId;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message text is required',
      });
    }

    // Verify user is a member of the group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    const isMember = group.members.some(m => String(m.userId) === String(userId));
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You must be a member to send messages',
      });
    }

    // Get user profile for sender name
    const userProfile = await UserProfile.findOne({ userId });
    const senderName = userProfile?.displayName || userProfile?.firstName || 'User';

    // Create message
    const message = new GroupMessage({
      senderId: userId,
      senderName: senderName,
      groupId: groupId,
      text: text.trim(),
      replyTo: replyTo || null,
      timestamp: new Date(),
    });

    await message.save();

    // Mark as delivered to all group members (except sender)
    const memberIds = group.members
      .map(m => m.userId)
      .filter(id => String(id) !== String(userId));
    
    message.deliveredTo = memberIds.map(id => ({
      userId: id,
      deliveredAt: new Date(),
    }));

    await message.save();

    res.json({
      success: true,
      message: {
        id: message._id.toString(),
        senderId: message.senderId.toString(),
        senderName: message.senderName,
        groupId: message.groupId.toString(),
        text: message.text,
        timestamp: message.timestamp,
        replyTo: message.replyTo ? message.replyTo.toString() : null,
        readBy: message.readBy || [],
        deliveredTo: message.deliveredTo || [],
      },
    });
  } catch (error) {
    console.error('Error sending group message:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending group message',
      error: error.message,
    });
  }
};

/**
 * Delete group message (for me only)
 */
export const deleteGroupMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    const message = await GroupMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    // Mark as deleted for this user only
    const existingDeletion = await DeletedMessage.findOne({
      userId: userId,
      messageId: messageId,
      messageType: 'group'
    });

    if (!existingDeletion) {
      await DeletedMessage.create({
        userId: userId,
        messageId: messageId,
        messageType: 'group',
        groupId: message.groupId,
      });
    }

    res.json({
      success: true,
      message: 'Message deleted for you only',
    });
  } catch (error) {
    console.error('Error deleting group message:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting group message',
      error: error.message,
    });
  }
};

/**
 * Delete group message for everyone
 */
export const deleteGroupMessageForAll = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    const message = await GroupMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    // Only allow deleting own messages
    if (String(message.senderId) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own messages',
      });
    }

    // Delete the message from database
    await GroupMessage.findByIdAndDelete(messageId);

    // Remove all "delete for me" records
    await DeletedMessage.deleteMany({ messageId: messageId });

    res.json({
      success: true,
      message: 'Message deleted for everyone',
    });
  } catch (error) {
    console.error('Error deleting group message for all:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting group message',
      error: error.message,
    });
  }
};

/**
 * Clear all group messages (for me only)
 */
export const clearGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.userId;

    // Verify user is a member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    const isMember = group.members.some(m => String(m.userId) === String(userId));
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You must be a member to clear messages',
      });
    }

    // Get all messages in this group
    const allMessages = await GroupMessage.find({ groupId }).select('_id').lean();
    const messageIds = allMessages.map(msg => msg._id);
    
    // Get existing deletions
    const existingDeletions = await DeletedMessage.find({
      userId: userId,
      messageId: { $in: messageIds },
      messageType: 'group'
    }).select('messageId').lean();
    
    const existingIds = new Set(existingDeletions.map(d => d.messageId.toString()));
    const newMessageIds = messageIds.filter(id => !existingIds.has(id.toString()));

    // Mark all messages as deleted for this user
    if (newMessageIds.length > 0) {
      await DeletedMessage.insertMany(
        newMessageIds.map(messageId => ({
          userId: userId,
          messageId: messageId,
          messageType: 'group',
          groupId: groupId,
        }))
      );
    }

    res.json({
      success: true,
      message: 'Messages cleared successfully for you only',
      markedDeletedCount: newMessageIds.length,
    });
  } catch (error) {
    console.error('Error clearing group messages:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing group messages',
      error: error.message,
    });
  }
};

