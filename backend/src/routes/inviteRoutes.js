import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  createInvite,
  getMyInvites,
  getInviteDetails,
  joinViaInvite,
  deactivateInvite,
  getReferralStats,
} from '../controllers/inviteController.js';

const router = express.Router();

// Get invite details by token or code (public endpoint - no auth required for viewing)
router.get('/details', getInviteDetails);

// All other routes require authentication
router.use(protect);

// Create a new invite
router.post('/create', createInvite);

// Get all invites created by current user
router.get('/my-invites', getMyInvites);

// Join college via invite
router.post('/join', joinViaInvite);

// Deactivate an invite
router.delete('/:inviteId', deactivateInvite);

// Get referral statistics
router.get('/stats', getReferralStats);

export default router;

