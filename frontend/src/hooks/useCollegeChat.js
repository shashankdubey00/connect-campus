/**
 * useCollegeChat Hook
 * Separated logic for college chat operations
 */

import { useState, useEffect, useRef } from 'react';
import { fetchMessages } from '../services/messageService';
import { getSocket, connectSocket, joinCollegeRoom, sendMessage, onReceiveMessage, onSocketError } from '../services/socketService';
import { formatMessage, populateReplyData, createOptimisticMessage } from '../utils/messageHandlers';

/**
 * Custom hook for college chat functionality
 */
export const useCollegeChat = (collegeId, user, onMessageSent) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Map());
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);

  /**
   * Load messages from backend
   */
  const loadMessages = async () => {
    if (!collegeId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetchMessages(collegeId);
      
      if (response.success && response.messages) {
        const currentUserId = String(user?.id || user?._id || '');
        
        // Format messages
        const formattedMessages = response.messages.map(msg => {
          const formatted = formatMessage(msg, currentUserId);
          
          // Populate reply data if available
          if (msg.replyTo) {
            const repliedMsg = response.messages.find(m => m.id === msg.replyTo);
            if (repliedMsg) {
              formatted.replyToData = {
                id: repliedMsg.id,
                text: repliedMsg.text,
                sender: repliedMsg.senderName,
                senderId: repliedMsg.senderId,
                isOwn: String(repliedMsg.senderId) === String(currentUserId)
              };
            }
          }
          
          return formatted;
        });
        
        // Populate any remaining reply data
        const messagesWithReplies = populateReplyData(formattedMessages);
        
        setMessages(messagesWithReplies);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Send message via socket
   */
  const sendCollegeMessage = async (messageText, replyingTo = null) => {
    if (!messageText || !collegeId) {
      throw new Error('Message text and college ID are required');
    }

    // Create optimistic message
    const optimisticMessage = createOptimisticMessage(messageText, user, replyingTo);
    setMessages(prev => [...prev, optimisticMessage]);

    // Ensure socket is connected
    let socketInstance = getSocket();
    if (!socketInstance || !socketInstance.connected) {
      socketInstance = connectSocket();
      if (socketInstance) {
        await new Promise((resolve, reject) => {
          if (socketInstance.connected) {
            resolve();
          } else {
            const timeout = setTimeout(() => {
              reject(new Error('Socket connection timeout'));
            }, 5000);
            
            socketInstance.once('connect', () => {
              clearTimeout(timeout);
              resolve();
            });
            
            socketInstance.once('connect_error', (error) => {
              clearTimeout(timeout);
              reject(error);
            });
          }
        });
        
        // Join room after connection
        joinCollegeRoom(collegeId);
        await new Promise(resolve => setTimeout(resolve, 300));
      } else {
        throw new Error('Failed to create socket instance');
      }
    }

    // Send message
    try {
      const replyToId = replyingTo ? replyingTo.id : null;
      const sent = sendMessage(messageText, collegeId, replyToId);
      
      if (!sent) {
        throw new Error('Failed to send message - socket not connected');
      }

      // Update chat list
      if (onMessageSent && collegeId) {
        onMessageSent(collegeId, messageText, new Date(), true, [], []);
      }

      return optimisticMessage;
    } catch (error) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      throw error;
    }
  };

  /**
   * Handle received message
   */
  const handleReceiveMessage = (message) => {
    const currentUserId = String(user?.id || user?._id || '');
    const formatted = formatMessage(message, currentUserId);
    
    setMessages(prev => {
      // Check for duplicates
      if (prev.some(m => m.id === message.id)) {
        return prev;
      }
      
      // Check if this replaces an optimistic message
      const optimisticIndex = prev.findIndex(m => 
        m.isOptimistic && 
        m.text === message.text && 
        String(m.senderId) === String(message.senderId) &&
        Math.abs(new Date(m.timestamp) - new Date(message.timestamp)) < 5000
      );
      
      if (optimisticIndex !== -1) {
        // Replace optimistic message with real one
        const newMessages = [...prev];
        newMessages[optimisticIndex] = {
          ...formatted,
          replyToData: prev[optimisticIndex].replyToData || formatted.replyToData
        };
        return newMessages;
      }
      
      // Add new message
      return [...prev, formatted].sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      );
    });
  };

  /**
   * Setup socket listeners
   */
  useEffect(() => {
    if (!collegeId) return;

    // Ensure socket is connected
    const setupSocket = async () => {
      let socketInstance = getSocket();
      if (!socketInstance || !socketInstance.connected) {
        socketInstance = connectSocket();
        if (socketInstance) {
          await new Promise((resolve) => {
            if (socketInstance.connected) {
              resolve();
            } else {
              socketInstance.once('connect', resolve);
            }
          });
        }
      }

      if (socketInstance) {
        // Join college room
        joinCollegeRoom(collegeId);
        
        // Set up message listener
        const unsubscribe = onReceiveMessage(handleReceiveMessage);
        
        // Set up error listener
        const unsubscribeError = onSocketError((error) => {
          console.error('Socket error in college chat:', error);
          // Don't remove optimistic messages on socket errors
          // The server will handle retries
        });

        return () => {
          unsubscribe();
          unsubscribeError();
        };
      }
    };

    setupSocket();
  }, [collegeId]);

  /**
   * Load messages on mount
   */
  useEffect(() => {
    loadMessages();
  }, [collegeId, user?.id]);

  /**
   * Auto-scroll to bottom
   */
  useEffect(() => {
    if (!loading && messages.length > 0 && messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 100);
    }
  }, [messages, loading]);

  return {
    messages,
    setMessages,
    loading,
    isTyping,
    setIsTyping,
    typingUsers,
    setTypingUsers,
    typingTimeoutRef,
    messagesEndRef,
    sendCollegeMessage,
    loadMessages
  };
};







