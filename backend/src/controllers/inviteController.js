import Invite from '../models/Invite.js';
import Follow from '../models/Follow.js';
import UserProfile from '../models/UserProfile.js';
import { generateInviteUrl } from '../utils/getClientUrl.js';
import crypto from 'crypto';

/**
 * Generate a unique invite code
 */
const generateInviteCode = () => {
  const prefix = 'JOIN';
  const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${randomPart}`;
};

/**
 * Generate a unique token for invite links
 */
const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Create a new invite for a college
 */
export const createInvite = async (req, res) => {
  try {
    const { collegeId, expiresAt, maxUses, customMessage } = req.body;
    const userId = req.user.userId;

    if (!collegeId) {
      return res.status(400).json({
        success: false,
        message: 'College ID is required',
      });
    }

    // Check if user follows the college (optional - can be removed if you want anyone to create invites)
    const follow = await Follow.findOne({
      userId: userId,
      collegeId: collegeId,
    });

    if (!follow) {
      return res.status(403).json({
        success: false,
        message: 'You must follow this college to create invites',
      });
    }

    // Generate unique invite code and token
    let inviteCode = generateInviteCode();
    let token = generateToken();
    
    // Ensure uniqueness
    while (await Invite.findOne({ inviteCode })) {
      inviteCode = generateInviteCode();
    }
    while (await Invite.findOne({ token })) {
      token = generateToken();
    }

    // Create invite
    const invite = new Invite({
      collegeId,
      createdBy: userId,
      inviteCode,
      token,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      maxUses: maxUses || null,
      customMessage: customMessage || null,
    });

    await invite.save();

    // Generate invite URL using environment variable (works in production)
    const inviteUrl = generateInviteUrl(token);

    res.json({
      success: true,
      message: 'Invite created successfully',
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
    console.error('Error creating invite:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating invite',
      error: error.message,
    });
  }
};

/**
 * Get all invites created by the current user
 */
export const getMyInvites = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { collegeId } = req.query;

    const query = { createdBy: userId };
    if (collegeId) {
      query.collegeId = collegeId;
    }

    const invites = await Invite.find(query)
      .sort({ createdAt: -1 })
      .populate('usedBy.userId', 'email profile')
      .lean();
    
    const formattedInvites = invites.map(invite => ({
      id: invite._id,
      collegeId: invite.collegeId,
      inviteCode: invite.inviteCode,
      token: invite.token,
      inviteUrl: generateInviteUrl(invite.token),
      expiresAt: invite.expiresAt,
      maxUses: invite.maxUses,
      useCount: invite.useCount,
      isActive: invite.isActive,
      isValid: invite.isActive && 
               (!invite.expiresAt || new Date() < invite.expiresAt) &&
               (!invite.maxUses || invite.useCount < invite.maxUses),
      customMessage: invite.customMessage,
      usedBy: invite.usedBy.map(u => ({
        userId: u.userId?._id || u.userId,
        email: u.userId?.email || 'Unknown',
        displayName: u.userId?.profile?.displayName || 'Unknown',
        usedAt: u.usedAt,
      })),
      createdAt: invite.createdAt,
    }));

    res.json({
      success: true,
      invites: formattedInvites,
    });
  } catch (error) {
    console.error('Error getting invites:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting invites',
      error: error.message,
    });
  }
};

/**
 * Get invite details by token or code
 */
export const getInviteDetails = async (req, res) => {
  try {
    const { token, code } = req.query;

    if (!token && !code) {
      return res.status(400).json({
        success: false,
        message: 'Token or code is required',
      });
    }

    const query = token ? { token } : { inviteCode: code?.toUpperCase() };
    const invite = await Invite.findOne(query)
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

    // Get college details
    const College = (await import('../../models/College.js')).default;
    const college = await College.findOne({
      $or: [
        { aisheCode: invite.collegeId },
        { name: invite.collegeId },
      ],
    }).lean();

    res.json({
      success: true,
      invite: {
        id: invite._id,
        collegeId: invite.collegeId,
        college: college ? {
          name: college.name,
          aisheCode: college.aisheCode,
          logo: college.logo,
          state: college.state,
          district: college.district,
        } : null,
        inviteCode: invite.inviteCode,
        inviteType: invite.inviteType,
        isValid: isValid,
        expiresAt: invite.expiresAt,
        maxUses: invite.maxUses,
        useCount: invite.useCount,
        customMessage: invite.customMessage,
        createdBy: {
          id: invite.createdBy?._id,
          email: invite.createdBy?.email,
          displayName: invite.createdBy?.profile?.displayName || 'Unknown',
        },
      },
    });
  } catch (error) {
    console.error('Error getting invite details:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting invite details',
      error: error.message,
    });
  }
};

/**
 * Join college using invite code or token
 */
export const joinViaInvite = async (req, res) => {
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
    const invite = await Invite.findOne(query);

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: 'Invite not found',
      });
    }

    // Check if invite is valid
    if (!invite.isValid()) {
      return res.status(400).json({
        success: false,
        message: 'This invite is no longer valid',
      });
    }

    // Check if user already follows the college
    const existingFollow = await Follow.findOne({
      userId: userId,
      collegeId: invite.collegeId,
    });

    if (existingFollow) {
      return res.status(400).json({
        success: false,
        message: 'You are already following this college',
      });
    }

    // Create follow relationship
    const follow = new Follow({
      userId: userId,
      collegeId: invite.collegeId,
      joinedViaInvite: true,
      inviteId: invite._id,
    });

    await follow.save();

    // Record invite usage
    await invite.recordUsage(userId);

    // Update user profile to include this college
    await UserProfile.findOneAndUpdate(
      { userId: userId },
      {
        $addToSet: {
          colleges: invite.collegeId,
        },
      },
      { upsert: true }
    );

    res.json({
      success: true,
      message: 'Successfully joined college via invite',
      collegeId: invite.collegeId,
      inviteCode: invite.inviteCode,
    });
  } catch (error) {
    console.error('Error joining via invite:', error);
    res.status(500).json({
      success: false,
      message: 'Error joining via invite',
      error: error.message,
    });
  }
};

/**
 * Deactivate an invite
 */
export const deactivateInvite = async (req, res) => {
  try {
    const { inviteId } = req.params;
    const userId = req.user.userId;

    const invite = await Invite.findById(inviteId);

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: 'Invite not found',
      });
    }

    // Check if user owns this invite
    if (String(invite.createdBy) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You can only deactivate your own invites',
      });
    }

    invite.isActive = false;
    await invite.save();

    res.json({
      success: true,
      message: 'Invite deactivated successfully',
    });
  } catch (error) {
    console.error('Error deactivating invite:', error);
    res.status(500).json({
      success: false,
      message: 'Error deactivating invite',
      error: error.message,
    });
  }
};

/**
 * Get referral stats for a user
 */
export const getReferralStats = async (req, res) => {
  try {
    const userId = req.user.userId;

    const invites = await Invite.find({ createdBy: userId }).lean();

    const stats = {
      totalInvites: invites.length,
      activeInvites: invites.filter(i => i.isActive && 
        (!i.expiresAt || new Date() < i.expiresAt) &&
        (!i.maxUses || i.useCount < i.maxUses)).length,
      totalUses: invites.reduce((sum, i) => sum + i.useCount, 0),
      totalReferrals: invites.reduce((sum, i) => sum + (i.usedBy?.length || 0), 0),
      invitesByCollege: {},
    };

    // Group by college
    invites.forEach(invite => {
      if (!stats.invitesByCollege[invite.collegeId]) {
        stats.invitesByCollege[invite.collegeId] = {
          totalInvites: 0,
          totalUses: 0,
          totalReferrals: 0,
        };
      }
      stats.invitesByCollege[invite.collegeId].totalInvites += 1;
      stats.invitesByCollege[invite.collegeId].totalUses += invite.useCount;
      stats.invitesByCollege[invite.collegeId].totalReferrals += invite.usedBy?.length || 0;
    });

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Error getting referral stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting referral stats',
      error: error.message,
    });
  }
};

