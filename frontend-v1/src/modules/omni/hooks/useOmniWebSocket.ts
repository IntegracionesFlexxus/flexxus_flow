/**
 * useOmniWebSocket Hook
 * Hook de React para gestionar conexión WebSocket del módulo Omni
 */

import { useEffect, useCallback, useRef } from 'react';
import { getOmniWebSocketClient, ConnectionStatus } from '../services/websocket/OmniWebSocketClient';
import type { IMessage, IConversation } from '../types';

export interface UseOmniWebSocketOptions {
  autoConnect?: boolean;
  token?: string | null;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: Error) => void;
  onNewMessage?: (message: IMessage) => void;
  onConversationUpdate?: (conversation: IConversation) => void;
  onNewConversation?: (conversation: IConversation) => void;
  onTypingStart?: (data: { userId: string; userName: string; conversationId: string }) => void;
  onTypingStop?: (data: { userId: string; conversationId: string }) => void;
  onAgentStatus?: (data: { userId: string; status: string }) => void;
}

export function useOmniWebSocket(options: UseOmniWebSocketOptions = {}) {
  const {
    autoConnect = true,
    token,
    onConnect,
    onDisconnect,
    onError,
    onNewMessage,
    onConversationUpdate,
    onNewConversation,
    onTypingStart,
    onTypingStop,
    onAgentStatus
  } = options;

  const clientRef = useRef(getOmniWebSocketClient());
  const callbacksRef = useRef({
    onConnect,
    onDisconnect,
    onError,
    onNewMessage,
    onConversationUpdate,
    onNewConversation,
    onTypingStart,
    onTypingStop,
    onAgentStatus
  });

  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = {
      onConnect,
      onDisconnect,
      onError,
      onNewMessage,
      onConversationUpdate,
      onNewConversation,
      onTypingStart,
      onTypingStop,
      onAgentStatus
    };
  }, [
    onConnect,
    onDisconnect,
    onError,
    onNewMessage,
    onConversationUpdate,
    onNewConversation,
    onTypingStart,
    onTypingStop,
    onAgentStatus
  ]);

  // Connect and setup listeners
  useEffect(() => {
    const client = clientRef.current;

    if (!token || !autoConnect) {
      return;
    }

    // Connect if not already connected
    if (!client.isConnected()) {
      client.connect(token);
    }

    // Setup event listeners
    const handleConnect = () => {
      callbacksRef.current.onConnect?.();
    };

    const handleDisconnect = (reason: string) => {
      callbacksRef.current.onDisconnect?.(reason);
    };

    const handleError = (error: Error) => {
      callbacksRef.current.onError?.(error);
    };

    const handleNewMessage = (message: IMessage) => {
      callbacksRef.current.onNewMessage?.(message);
    };

    const handleConversationUpdate = (conversation: IConversation) => {
      callbacksRef.current.onConversationUpdate?.(conversation);
    };

    const handleNewConversation = (conversation: IConversation) => {
      callbacksRef.current.onNewConversation?.(conversation);
    };

    const handleTypingStart = (data: any) => {
      callbacksRef.current.onTypingStart?.(data);
    };

    const handleTypingStop = (data: any) => {
      callbacksRef.current.onTypingStop?.(data);
    };

    const handleAgentStatus = (data: any) => {
      callbacksRef.current.onAgentStatus?.(data);
    };

    // Register listeners
    client.on('connect', handleConnect);
    client.on('disconnect', handleDisconnect);
    client.on('error', handleError);
    client.on('newMessage', handleNewMessage);
    client.on('conversationUpdate', handleConversationUpdate);
    client.on('newConversation', handleNewConversation);
    client.on('typingStart', handleTypingStart);
    client.on('typingStop', handleTypingStop);
    client.on('agentStatus', handleAgentStatus);

    // Cleanup
    return () => {
      client.off('connect', handleConnect);
      client.off('disconnect', handleDisconnect);
      client.off('error', handleError);
      client.off('newMessage', handleNewMessage);
      client.off('conversationUpdate', handleConversationUpdate);
      client.off('newConversation', handleNewConversation);
      client.off('typingStart', handleTypingStart);
      client.off('typingStop', handleTypingStop);
      client.off('agentStatus', handleAgentStatus);
    };
  }, [token, autoConnect]);

  // Join conversation
  const joinConversation = useCallback((conversationId: string) => {
    clientRef.current.joinConversation(conversationId);
  }, []);

  // Leave conversation
  const leaveConversation = useCallback((conversationId: string) => {
    clientRef.current.leaveConversation(conversationId);
  }, []);

  // Start typing
  const startTyping = useCallback((conversationId: string, userName: string) => {
    clientRef.current.startTyping(conversationId, userName);
  }, []);

  // Stop typing
  const stopTyping = useCallback((conversationId: string) => {
    clientRef.current.stopTyping(conversationId);
  }, []);

  // Update agent status
  const updateAgentStatus = useCallback((status: 'online' | 'away' | 'busy' | 'offline') => {
    clientRef.current.updateAgentStatus(status);
  }, []);

  // Reconnect
  const reconnect = useCallback(() => {
    if (token) {
      clientRef.current.disconnect();
      setTimeout(() => {
        clientRef.current.connect(token);
      }, 100);
    }
  }, [token]);

  // Get status
  const getStatus = useCallback(() => {
    return clientRef.current.getStatus();
  }, []);

  // Check if connected
  const isConnected = useCallback(() => {
    return clientRef.current.isConnected();
  }, []);

  return {
    joinConversation,
    leaveConversation,
    startTyping,
    stopTyping,
    updateAgentStatus,
    reconnect,
    getStatus,
    isConnected,
    client: clientRef.current
  };
}

// Hook for managing typing indicator with auto-stop
export function useTypingIndicator(
  conversationId: string | undefined,
  userName: string,
  enabled: boolean = true
) {
  const { startTyping, stopTyping } = useOmniWebSocket({ autoConnect: false });
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const handleTyping = useCallback(() => {
    if (!conversationId || !enabled) return;

    // Start typing if not already
    if (!isTypingRef.current) {
      startTyping(conversationId, userName);
      isTypingRef.current = true;
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (conversationId) {
        stopTyping(conversationId);
        isTypingRef.current = false;
      }
    }, 3000);
  }, [conversationId, userName, enabled, startTyping, stopTyping]);

  const handleStopTyping = useCallback(() => {
    if (!conversationId) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    if (isTypingRef.current) {
      stopTyping(conversationId);
      isTypingRef.current = false;
    }
  }, [conversationId, stopTyping]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTypingRef.current && conversationId) {
        stopTyping(conversationId);
      }
    };
  }, [conversationId, stopTyping]);

  return {
    handleTyping,
    handleStopTyping
  };
}
