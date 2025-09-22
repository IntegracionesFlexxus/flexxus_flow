// hooks/useConversations.ts
import { useEffect, useCallback } from 'react';
import { useConversationsStore } from '../store/conversationsStore';
import {
  ConversationFilters,
  CreateConversationRequest,
  ConversationStatus
} from '../types';

export const useConversations = () => {
  const {
    conversations,
    activeConversation,
    filters,
    loading,
    error,
    stats,
    typingUsers,
    fetchConversations,
    fetchConversation,
    createConversation,
    assignConversation,
    updateConversationStatus,
    resolveConversation,
    reopenConversation,
    fetchConversationStats,
    setActiveConversation,
    setFilters,
    resetUnread,
    clearError
  } = useConversationsStore();

  // Cargar conversaciones al inicializar
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleCreateConversation = useCallback(async (data: CreateConversationRequest) => {
    try {
      await createConversation(data);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, [createConversation]);

  const handleAssignConversation = useCallback(async (id: string, userId: string) => {
    try {
      await assignConversation(id, userId);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, [assignConversation]);

  const handleUpdateStatus = useCallback(async (id: string, status: ConversationStatus) => {
    try {
      await updateConversationStatus(id, status);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, [updateConversationStatus]);

  const handleResolveConversation = useCallback(async (id: string) => {
    try {
      await resolveConversation(id);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, [resolveConversation]);

  const handleReopenConversation = useCallback(async (id: string) => {
    try {
      await reopenConversation(id);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, [reopenConversation]);

  const selectConversation = useCallback(async (conversation: any) => {
    setActiveConversation(conversation);

    // Marcar como leído si tiene mensajes no leídos
    if (conversation.unreadCount > 0) {
      resetUnread(conversation.id);
    }

    // Cargar detalles completos de la conversación si es necesario
    if (!conversation.customer || !conversation.channel) {
      fetchConversation(conversation.id);
    }
  }, [setActiveConversation, resetUnread, fetchConversation]);

  const applyFilters = useCallback((newFilters: ConversationFilters) => {
    setFilters(newFilters);
    fetchConversations(newFilters);
  }, [setFilters, fetchConversations]);

  const refreshConversations = useCallback((customFilters?: ConversationFilters) => {
    const filtersToUse = customFilters || filters;
    fetchConversations(filtersToUse);
  }, [fetchConversations, filters]);

  const refreshStats = useCallback(() => {
    fetchConversationStats();
  }, [fetchConversationStats]);

  const clearConversationError = useCallback(() => {
    clearError();
  }, [clearError]);

  // Utilidades
  const getConversationsByStatus = useCallback((status: ConversationStatus) => {
    return conversations?.filter((conv: any) => conv.status === status) || [];
  }, [conversations]);

  const getUnreadConversations = useCallback(() => {
    return conversations?.filter((conv: any) => (conv.unreadCount || 0) > 0) || [];
  }, [conversations]);

  const getAssignedConversations = useCallback((userId: string) => {
    return conversations?.filter((conv: any) => conv.assignedTo === userId) || [];
  }, [conversations]);

  const getTypingUsersForConversation = useCallback((conversationId: string) => {
    return typingUsers?.get(conversationId) || [];
  }, [typingUsers]);

  const getTotalUnreadCount = useCallback(() => {
    return conversations?.reduce((total: number, conv: any) => {
      return total + (conv.unreadCount || 0);
    }, 0) || 0;
  }, [conversations]);

  return {
    // State
    conversations: conversations || [],
    activeConversation,
    filters: filters || {},
    loading: loading || false,
    error,
    stats,

    // Actions
    createConversation: handleCreateConversation,
    assignConversation: handleAssignConversation,
    updateStatus: handleUpdateStatus,
    resolveConversation: handleResolveConversation,
    reopenConversation: handleReopenConversation,
    selectConversation,
    applyFilters,
    refreshConversations,
    refreshStats,
    clearError: clearConversationError,

    // Utilities
    getConversationsByStatus,
    getUnreadConversations,
    getAssignedConversations,
    getTypingUsersForConversation,
    getTotalUnreadCount
  };
};