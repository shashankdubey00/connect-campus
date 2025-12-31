import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  createGroup,
  getMyGroups,
  getGroupDetails,
  addMembers,
  removeMember,
  leaveGroup,
  updateGroup,
  deleteGroup,
  createGroupInvite,
  getGroupInviteDetails,
  joinGroupViaInvite,
} from '../controllers/groupController.js';

const router = express.Router();

// Get group invite details by token or code (public endpoint)
router.get('/invites/details', getGroupInviteDetails);

// All other routes require authentication
router.use(protect);

// Group CRUD operations
router.post('/create', createGroup);
router.get('/my-groups', getMyGroups);
router.get('/:groupId', getGroupDetails);
router.put('/:groupId', updateGroup);
router.delete('/:groupId', deleteGroup);

// Member management
router.post('/:groupId/members', addMembers);
router.delete('/:groupId/members/:memberId', removeMember);
router.post('/:groupId/leave', leaveGroup);

// Group invites
router.post('/:groupId/invites/create', createGroupInvite);
router.post('/invites/join', joinGroupViaInvite);

export default router;

