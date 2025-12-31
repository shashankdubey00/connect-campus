import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { sendDirectMessage, getDirectMessages, getDirectMessageConversations, clearDirectMessages, deleteDirectMessage, deleteDirectMessageForAll, deleteAllDirectMessages } from '../controllers/directMessageController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Send direct message
router.post('/send', sendDirectMessage);

// Get all conversations (must be before /:otherUserId to avoid route conflict)
router.get('/', getDirectMessageConversations);

// Clear messages with a user
router.delete('/clear', clearDirectMessages);

// Delete all messages with a user and remove from chat list (must be before /message/:messageId)
router.delete('/delete-all', deleteAllDirectMessages);

// Delete a single direct message for all (must be before /message/:messageId)
router.delete('/message/:messageId/for-all', deleteDirectMessageForAll);

// Delete a single direct message (delete for me)
router.delete('/message/:messageId', deleteDirectMessage);

// Get direct messages between two users (must be last to avoid route conflicts)
router.get('/:otherUserId', getDirectMessages);

export default router;


