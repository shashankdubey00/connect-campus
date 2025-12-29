import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { sendDirectMessage, getDirectMessages, getDirectMessageConversations, clearDirectMessages } from '../controllers/directMessageController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Send direct message
router.post('/send', sendDirectMessage);

// Get direct messages between two users
router.get('/:otherUserId', getDirectMessages);

// Get all conversations
router.get('/', getDirectMessageConversations);

// Clear messages with a user
router.delete('/clear', clearDirectMessages);

export default router;


