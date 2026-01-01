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
  getGroupMessages,
  sendGroupMessage,
  deleteGroupMessage,
  deleteGroupMessageForAll,
  clearGroupMessages,
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

// Group messages (must be before /:groupId route to avoid conflict)
router.get('/:groupId/messages', getGroupMessages);
router.post('/:groupId/messages', sendGroupMessage);
router.delete('/:groupId/messages/clear', clearGroupMessages);
router.delete('/messages/:messageId', deleteGroupMessage);
router.delete('/messages/:messageId/for-all', deleteGroupMessageForAll);

export default router;


