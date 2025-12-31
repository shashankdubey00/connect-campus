/**
 * Message Handlers Utility
 * Separated logic for handling message operations
 */

/**
 * Format a message for display
 */
export const formatMessage = (msg, currentUserId) => {
  const isOwn = String(msg.senderId) === String(currentUserId);
  
  return {
    id: msg.id || msg._id?.toString(),
    text: msg.text,
    sender: msg.senderName || msg.sender,
    senderId: msg.senderId?.toString() || msg.senderId,
    time: new Date(msg.timestamp).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    }),
    date: formatDate(new Date(msg.timestamp)),
    isOwn: isOwn,
    timestamp: new Date(msg.timestamp),
    replyTo: msg.replyTo || null,
    replyToData: msg.replyToData || null,
    readBy: msg.readBy ? msg.readBy.map(r => ({ 
      userId: String(r.userId || r.userId), 
      readAt: r.readAt 
    })) : [],
    deliveredTo: msg.deliveredTo ? msg.deliveredTo.map(d => ({ 
      userId: String(d.userId || d.userId), 
      deliveredAt: d.deliveredAt 
    })) : []
  };
};

/**
 * Format date for display
 */
export const formatDate = (date) => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  }
};

/**
 * Populate reply data for messages
 */
export const populateReplyData = (messages) => {
  return messages.map(msg => {
    if (msg.replyTo && !msg.replyToData) {
      const repliedMsg = messages.find(m => m.id === msg.replyTo);
      if (repliedMsg) {
        msg.replyToData = {
          id: repliedMsg.id,
          text: repliedMsg.text,
          sender: repliedMsg.sender,
          senderId: repliedMsg.senderId,
          isOwn: repliedMsg.isOwn
        };
      }
    }
    return msg;
  });
};

/**
 * Create optimistic message
 */
export const createOptimisticMessage = (text, user, replyingTo = null) => {
  return {
    id: `temp-${Date.now()}`,
    text: text,
    sender: user?.profile?.displayName || user?.email?.split('@')[0] || 'You',
    senderId: user?.id || user?._id || '',
    time: new Date().toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    }),
    date: formatDate(new Date()),
    isOwn: true,
    timestamp: new Date(),
    replyTo: replyingTo ? replyingTo.id : null,
    replyToData: replyingTo ? replyingTo : null,
    isOptimistic: true
  };
};

