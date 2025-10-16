/**
 * Message Service
 * Servicio para gestionar mensajes de omnicanalidad
 */

import { api } from '@/shared/services/api';
import {
  Message,
  MessageCreate,
  MessageSend,
  MessageUpdate,
  MessageFilters,
  MessageStatus
} from '../types/message.types';

export const messageService = {
  /**
   * Obtener mensajes de una conversación
   */
  getConversationMessages: async (conversationId: string): Promise<Message[]> => {
    try {
      console.log('💬 [messageService] getConversationMessages - ConversationID:', conversationId);

      const response = await api.get(`/omni/conversations/${conversationId}/messages`);

      console.log('✅ [messageService] getConversationMessages - Respuesta:', response.data);

      const data = response.data?.data || response.data;
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      console.error('❌ [messageService] getConversationMessages - Error:', error);
      return [];
    }
  },

  /**
   * Buscar mensajes con filtros
   */
  searchMessages: async (filters: MessageFilters): Promise<Message[]> => {
    try {
      console.log('🔍 [messageService] searchMessages - Filtros:', filters);

      const params: any = {};

      if (filters.conversationId) params.conversationId = filters.conversationId;
      if (filters.channelId) params.channelId = filters.channelId;
      if (filters.customerId) params.customerId = filters.customerId;
      if (filters.senderType) params.senderType = filters.senderType;
      if (filters.status) params.status = filters.status;
      if (filters.contentType) params.contentType = filters.contentType;
      if (filters.search) params.search = filters.search;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom.toISOString();
      if (filters.dateTo) params.dateTo = filters.dateTo.toISOString();

      const response = await api.get('/omni/messages/search', { params });

      console.log('✅ [messageService] searchMessages - Respuesta:', response.data);

      const data = response.data?.data || response.data;
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      console.error('❌ [messageService] searchMessages - Error:', error);
      return [];
    }
  },

  /**
   * Enviar un mensaje
   */
  sendMessage: async (messageData: MessageSend): Promise<Message | null> => {
    try {
      console.log('📤 [messageService] sendMessage - Data:', messageData);

      const response = await api.post('/omni/messages', messageData);

      console.log('✅ [messageService] sendMessage - Respuesta:', response.data);

      return response.data?.data || response.data;
    } catch (error: any) {
      console.error('❌ [messageService] sendMessage - Error:', error);
      throw error;
    }
  },

  /**
   * Crear un mensaje (guardarlo sin enviarlo inmediatamente)
   */
  createMessage: async (messageData: MessageCreate): Promise<Message | null> => {
    try {
      console.log('🆕 [messageService] createMessage - Data:', messageData);

      const response = await api.post('/omni/messages', messageData);

      console.log('✅ [messageService] createMessage - Respuesta:', response.data);

      return response.data?.data || response.data;
    } catch (error: any) {
      console.error('❌ [messageService] createMessage - Error:', error);
      throw error;
    }
  },

  /**
   * Actualizar estado de un mensaje
   */
  updateMessageStatus: async (
    messageId: string,
    status: MessageStatus
  ): Promise<Message | null> => {
    try {
      console.log('✏️ [messageService] updateMessageStatus - ID:', messageId, 'Status:', status);

      const response = await api.put(`/omni/messages/${messageId}/status`, { status });

      console.log('✅ [messageService] updateMessageStatus - Respuesta:', response.data);

      return response.data?.data || response.data;
    } catch (error: any) {
      console.error('❌ [messageService] updateMessageStatus - Error:', error);
      throw error;
    }
  },

  /**
   * Reintentar envío de un mensaje fallido
   */
  retryMessage: async (messageId: string): Promise<Message | null> => {
    try {
      console.log('🔄 [messageService] retryMessage - ID:', messageId);

      const response = await api.post(`/omni/messages/${messageId}/retry`);

      console.log('✅ [messageService] retryMessage - Respuesta:', response.data);

      return response.data?.data || response.data;
    } catch (error: any) {
      console.error('❌ [messageService] retryMessage - Error:', error);
      throw error;
    }
  },

  /**
   * Marcar mensajes como leídos
   */
  markMessagesAsRead: async (messageIds: string[]): Promise<void> => {
    try {
      console.log('👁️ [messageService] markMessagesAsRead - IDs:', messageIds);

      await api.post('/omni/messages/mark-read', { messageIds });

      console.log('✅ [messageService] markMessagesAsRead - Completado');
    } catch (error: any) {
      console.error('❌ [messageService] markMessagesAsRead - Error:', error);
    }
  },

  /**
   * Obtener mensajes no leídos de una conversación
   */
  getUnreadMessages: async (conversationId: string): Promise<Message[]> => {
    try {
      const allMessages = await messageService.getConversationMessages(conversationId);
      return allMessages.filter(msg => !msg.read_at && msg.direction === 'inbound');
    } catch (error: any) {
      console.error('❌ [messageService] getUnreadMessages - Error:', error);
      return [];
    }
  },

  /**
   * Enviar mensaje con archivo adjunto
   */
  sendMessageWithMedia: async (
    conversationId: string,
    content: string,
    file: File
  ): Promise<Message | null> => {
    try {
      console.log('📎 [messageService] sendMessageWithMedia - File:', file.name);

      // Primero subir el archivo
      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversationId', conversationId);

      const uploadResponse = await api.post('/omni/media/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const mediaUrl = uploadResponse.data?.data?.url || uploadResponse.data?.url;

      // Determinar el tipo de contenido basado en el archivo
      let contentType = 'document';
      if (file.type.startsWith('image/')) contentType = 'image';
      else if (file.type.startsWith('video/')) contentType = 'video';
      else if (file.type.startsWith('audio/')) contentType = 'audio';

      // Luego enviar el mensaje con la URL del archivo
      return await messageService.sendMessage({
        conversation_id: conversationId,
        content,
        content_type: contentType as any,
        sender_type: 'agent' as any,
        direction: 'outbound' as any,
        media_url: mediaUrl,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type
        },
        recipient: ''  // Será inferido del conversation
      });
    } catch (error: any) {
      console.error('❌ [messageService] sendMessageWithMedia - Error:', error);
      throw error;
    }
  }
};
