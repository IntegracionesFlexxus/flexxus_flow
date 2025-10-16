/**
 * WebSocket Context
 * Proveedor de contexto para el estado global de WebSocket
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useOmniWebSocket } from '../hooks/useOmniWebSocket';
import { ConnectionStatus } from '../services/websocket/OmniWebSocketClient';
import type { IMessage, IConversation } from '../types';

interface WebSocketContextValue {
  status: ConnectionStatus;
  isConnected: boolean;
  error: Error | null;
  lastMessage: IMessage | null;
  lastConversation: IConversation | null;
  typingUsers: Map<string, { userId: string; userName: string; timestamp: Date }>;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  startTyping: (conversationId: string, userName: string) => void;
  stopTyping: (conversationId: string) => void;
  updateAgentStatus: (status: 'online' | 'away' | 'busy' | 'offline') => void;
  reconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextValue | undefined>(undefined);

interface WebSocketProviderProps {
  children: ReactNode;
  token: string | null;
  enabled?: boolean;
}

export function WebSocketProvider({ children, token, enabled = true }: WebSocketProviderProps) {
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastMessage, setLastMessage] = useState<IMessage | null>(null);
  const [lastConversation, setLastConversation] = useState<IConversation | null>(null);
  const [typingUsers, setTypingUsers] = useState<Map<string, { userId: string; userName: string; timestamp: Date }>>(new Map());

  // Handle new message
  const handleNewMessage = useCallback((message: IMessage) => {
    setLastMessage(message);
    console.log('[WebSocketContext] New message received:', message);
  }, []);

  // Handle conversation update
  const handleConversationUpdate = useCallback((conversation: IConversation) => {
    setLastConversation(conversation);
    console.log('[WebSocketContext] Conversation updated:', conversation);
  }, []);

  // Handle new conversation
  const handleNewConversation = useCallback((conversation: IConversation) => {
    setLastConversation(conversation);
    console.log('[WebSocketContext] New conversation:', conversation);
  }, []);

  // Handle typing start
  const handleTypingStart = useCallback((data: { userId: string; userName: string; conversationId: string; timestamp: Date }) => {
    setTypingUsers(prev => {
      const next = new Map(prev);
      const key = `${data.conversationId}:${data.userId}`;
      next.set(key, {
        userId: data.userId,
        userName: data.userName,
        timestamp: new Date(data.timestamp)
      });
      return next;
    });

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setTypingUsers(prev => {
        const next = new Map(prev);
        const key = `${data.conversationId}:${data.userId}`;
        next.delete(key);
        return next;
      });
    }, 5000);
  }, []);

  // Handle typing stop
  const handleTypingStop = useCallback((data: { userId: string; conversationId: string }) => {
    setTypingUsers(prev => {
      const next = new Map(prev);
      const key = `${data.conversationId}:${data.userId}`;
      next.delete(key);
      return next;
    });
  }, []);

  // Initialize WebSocket hook
  const wsHook = useOmniWebSocket({
    autoConnect: enabled && !!token,
    token,
    onConnect: () => {
      console.log('[WebSocketContext] Connected');
      setStatus(ConnectionStatus.CONNECTED);
      setIsConnected(true);
      setError(null);
    },
    onDisconnect: (reason) => {
      console.log('[WebSocketContext] Disconnected:', reason);
      setStatus(ConnectionStatus.DISCONNECTED);
      setIsConnected(false);
    },
    onError: (err) => {
      console.error('[WebSocketContext] Error:', err);
      setStatus(ConnectionStatus.ERROR);
      setError(err);
      setIsConnected(false);
    },
    onNewMessage: handleNewMessage,
    onConversationUpdate: handleConversationUpdate,
    onNewConversation: handleNewConversation,
    onTypingStart: handleTypingStart,
    onTypingStop: handleTypingStop
  });

  // Update status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const currentStatus = wsHook.getStatus();
      const currentlyConnected = wsHook.isConnected();

      setStatus(currentStatus);
      setIsConnected(currentlyConnected);
    }, 1000);

    return () => clearInterval(interval);
  }, [wsHook]);

  const value: WebSocketContextValue = {
    status,
    isConnected,
    error,
    lastMessage,
    lastConversation,
    typingUsers,
    joinConversation: wsHook.joinConversation,
    leaveConversation: wsHook.leaveConversation,
    startTyping: wsHook.startTyping,
    stopTyping: wsHook.stopTyping,
    updateAgentStatus: wsHook.updateAgentStatus,
    reconnect: wsHook.reconnect
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

/**
 * Hook to use WebSocket context
 */
export function useWebSocketContext(): WebSocketContextValue {
  const context = useContext(WebSocketContext);

  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider');
  }

  return context;
}

/**
 * Hook to get typing users for a specific conversation
 */
export function useTypingUsers(conversationId: string | undefined): Array<{ userId: string; userName: string }> {
  const { typingUsers } = useWebSocketContext();

  if (!conversationId) return [];

  return Array.from(typingUsers.entries())
    .filter(([key]) => key.startsWith(`${conversationId}:`))
    .map(([_, value]) => value);
}
