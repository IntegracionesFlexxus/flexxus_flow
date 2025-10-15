/**
 * Conversation Service
 * Servicio para gestionar conversaciones de omnicanalidad
 */

import { api } from '@/shared/services/api';
import {
  Conversation,
  ConversationCreate,
  ConversationUpdate,
  ConversationAssign,
  ConversationFilters,
  ConversationStats,
  ConversationWithDetails
} from '../types/conversation.types';

export const conversationService = {
  /**
   * Listar conversaciones con filtros opcionales
   */
  getConversations: async (filters?: ConversationFilters): Promise<Conversation[]> => {
    try {
      console.log('🔍 [conversationService] getConversations - Filtros:', filters);

      const params: any = {};

      if (filters) {
        if (filters.status) params.status = filters.status;
        if (filters.priority) params.priority = filters.priority;
        if (filters.channelType) params.channelType = filters.channelType;
        if (filters.assignedTo) params.assignedTo = filters.assignedTo;
        if (filters.customerId) params.customerId = filters.customerId;
        if (filters.slaStatus) params.slaStatus = filters.slaStatus;
        if (filters.hasUnread !== undefined) params.hasUnread = filters.hasUnread;
        if (filters.search) params.search = filters.search;
        if (filters.dateFrom) params.dateFrom = filters.dateFrom.toISOString();
        if (filters.dateTo) params.dateTo = filters.dateTo.toISOString();
        if (filters.tags && filters.tags.length > 0) params.tags = filters.tags.join(',');
      }

      const response = await api.get('/omni/conversations', { params });

      console.log('✅ [conversationService] getConversations - Respuesta:', response.data);

      const data = response.data?.data || response.data;
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      console.error('❌ [conversationService] getConversations - Error:', error);
      return [];
    }
  },

  /**
   * Obtener una conversación específica por ID
   */
  getConversation: async (conversationId: string): Promise<ConversationWithDetails | null> => {
    try {
      console.log('🔍 [conversationService] getConversation - ID:', conversationId);

      const response = await api.get(`/omni/conversations/${conversationId}`);

      console.log('✅ [conversationService] getConversation - Respuesta:', response.data);

      return response.data?.data || response.data;
    } catch (error: any) {
      console.error('❌ [conversationService] getConversation - Error:', error);
      return null;
    }
  },

  /**
   * Crear una nueva conversación
   */
  createConversation: async (data: ConversationCreate): Promise<Conversation | null> => {
    try {
      console.log('🆕 [conversationService] createConversation - Data:', data);

      const response = await api.post('/omni/conversations', data);

      console.log('✅ [conversationService] createConversation - Respuesta:', response.data);

      return response.data?.data || response.data;
    } catch (error: any) {
      console.error('❌ [conversationService] createConversation - Error:', error);
      throw error;
    }
  },

  /**
   * Actualizar una conversación
   */
  updateConversation: async (
    conversationId: string,
    data: ConversationUpdate
  ): Promise<Conversation | null> => {
    try {
      console.log('✏️ [conversationService] updateConversation - ID:', conversationId, 'Data:', data);

      const response = await api.put(`/omni/conversations/${conversationId}`, data);

      console.log('✅ [conversationService] updateConversation - Respuesta:', response.data);

      return response.data?.data || response.data;
    } catch (error: any) {
      console.error('❌ [conversationService] updateConversation - Error:', error);
      throw error;
    }
  },

  /**
   * Asignar conversación a un agente
   */
  assignConversation: async (
    conversationId: string,
    assignment: ConversationAssign
  ): Promise<Conversation | null> => {
    try {
      console.log('👤 [conversationService] assignConversation - ID:', conversationId, 'Assignment:', assignment);

      const response = await api.post(`/omni/conversations/${conversationId}/assign`, assignment);

      console.log('✅ [conversationService] assignConversation - Respuesta:', response.data);

      return response.data?.data || response.data;
    } catch (error: any) {
      console.error('❌ [conversationService] assignConversation - Error:', error);
      throw error;
    }
  },

  /**
   * Resolver una conversación
   */
  resolveConversation: async (conversationId: string): Promise<Conversation | null> => {
    try {
      console.log('✅ [conversationService] resolveConversation - ID:', conversationId);

      const response = await api.post(`/omni/conversations/${conversationId}/resolve`);

      console.log('✅ [conversationService] resolveConversation - Respuesta:', response.data);

      return response.data?.data || response.data;
    } catch (error: any) {
      console.error('❌ [conversationService] resolveConversation - Error:', error);
      throw error;
    }
  },

  /**
   * Reabrir una conversación
   */
  reopenConversation: async (conversationId: string): Promise<Conversation | null> => {
    try {
      console.log('🔄 [conversationService] reopenConversation - ID:', conversationId);

      const response = await api.post(`/omni/conversations/${conversationId}/reopen`);

      console.log('✅ [conversationService] reopenConversation - Respuesta:', response.data);

      return response.data?.data || response.data;
    } catch (error: any) {
      console.error('❌ [conversationService] reopenConversation - Error:', error);
      throw error;
    }
  },

  /**
   * Marcar conversación como leída
   */
  markAsRead: async (conversationId: string): Promise<void> => {
    try {
      console.log('👁️ [conversationService] markAsRead - ID:', conversationId);

      await api.post(`/omni/conversations/${conversationId}/read`);

      console.log('✅ [conversationService] markAsRead - Completado');
    } catch (error: any) {
      console.error('❌ [conversationService] markAsRead - Error:', error);
    }
  },

  /**
   * Obtener estadísticas de conversaciones
   */
  getStats: async (): Promise<ConversationStats | null> => {
    try {
      console.log('📊 [conversationService] getStats');

      const response = await api.get('/omni/conversations/stats');

      console.log('✅ [conversationService] getStats - Respuesta:', response.data);

      return response.data?.data || response.data;
    } catch (error: any) {
      console.error('❌ [conversationService] getStats - Error:', error);
      return null;
    }
  },

  /**
   * Obtener conversaciones abiertas (sin resolver)
   */
  getOpenConversations: async (): Promise<Conversation[]> => {
    return conversationService.getConversations({
      status: undefined // Will get open and pending from backend
    });
  },

  /**
   * Obtener conversaciones no asignadas
   */
  getUnassignedConversations: async (): Promise<Conversation[]> => {
    try {
      const response = await api.get('/omni/conversations', {
        params: { unassigned: true }
      });

      const data = response.data?.data || response.data;
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      console.error('❌ [conversationService] getUnassignedConversations - Error:', error);
      return [];
    }
  },

  /**
   * Obtener conversaciones asignadas a un agente específico
   */
  getConversationsByAgent: async (agentId: string): Promise<Conversation[]> => {
    return conversationService.getConversations({
      assignedTo: agentId
    });
  }
};
