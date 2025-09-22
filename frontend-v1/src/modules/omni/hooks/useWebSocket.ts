// hooks/useWebSocket.ts
import { useEffect, useCallback } from 'react';
import { websocketService } from '../services';
import { useConversationsStore } from '../store/conversationsStore';
import { useChannelsStore } from '../store/channelsStore';

export const useWebSocket = () => {
  const {
    activeConversation,
    addConversation,
    updateConversation,
    incrementUnread,
    addTypingUser,
    removeTypingUser
  } = useConversationsStore();

  const { updateChannelHealth } = useChannelsStore();

  // TODO: Get authentication status from auth store
  // For now, assume authenticated if we have a token
  const isAuthenticated = localStorage.getItem('flexxus_token') !== null;

  useEffect(() => {
    if (isAuthenticated) {
      websocketService.connect();

      // Setup event listeners
      websocketService.on('conversation:new', (data) => {
        addConversation(data.conversation);
      });

      websocketService.on('conversation:assigned', (data) => {
        updateConversation({
          id: data.conversationId,
          assignedTo: data.assignedTo,
          assignedAt: data.assignedAt
        });
      });

      websocketService.on('conversation:resolved', (data) => {
        updateConversation({
          id: data.conversationId,
          status: 'resolved',
          resolvedAt: data.resolvedAt
        });
      });

      websocketService.on('message:received', (data) => {
        // Si no es la conversación activa, incrementar unread
        if (!activeConversation || activeConversation.id !== data.conversationId) {
          incrementUnread(data.conversationId);
        }

        // Actualizar última actividad de la conversación
        updateConversation({
          id: data.conversationId,
          lastMessageAt: data.timestamp
        });
      });

      websocketService.on('typing:started', (data) => {
        addTypingUser(data.conversationId, data.userId);
      });

      websocketService.on('typing:stopped', (data) => {
        removeTypingUser(data.conversationId, data.userId);
      });

      websocketService.on('channel:status:changed', (data) => {
        updateChannelHealth(data.channelId, data.status);
      });

      return () => {
        websocketService.disconnect();
      };
    }
  }, [isAuthenticated, activeConversation, addConversation, updateConversation, incrementUnread, addTypingUser, removeTypingUser, updateChannelHealth]);

  const joinConversation = useCallback((conversationId: string) => {
    websocketService.joinConversation(conversationId);
  }, []);

  const leaveConversation = useCallback((conversationId: string) => {
    websocketService.leaveConversation(conversationId);
  }, []);

  const sendMessage = useCallback((data: any) => {
    websocketService.sendMessage(data);
  }, []);

  const startTyping = useCallback((conversationId: string) => {
    websocketService.startTyping(conversationId);
  }, []);

  const stopTyping = useCallback((conversationId: string) => {
    websocketService.stopTyping(conversationId);
  }, []);

  const markMessageDelivered = useCallback((messageId: string, conversationId: string) => {
    websocketService.markMessageDelivered(messageId, conversationId);
  }, []);

  const markMessageRead = useCallback((messageId: string, conversationId: string) => {
    websocketService.markMessageRead(messageId, conversationId);
  }, []);

  return {
    isConnected: websocketService.isConnected(),
    connectionId: websocketService.getConnectionId(),
    joinConversation,
    leaveConversation,
    sendMessage,
    startTyping,
    stopTyping,
    markMessageDelivered,
    markMessageRead
  };
};