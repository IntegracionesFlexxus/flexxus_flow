/**
 * Channel Service
 * Servicio para gestionar canales de omnicanalidad
 */

import { api } from '@/shared/services/api';
import { Channel, ChannelType } from '../types/channel.types';

export interface ChannelCreateData {
  channel_type: ChannelType;
  name: string;
  description?: string;
  configuration: any;
  metadata?: Record<string, any>;
}

export interface ChannelUpdateData {
  name?: string;
  description?: string;
  is_active?: boolean;
  configuration?: any;
  metadata?: Record<string, any>;
}

export const channelService = {
  /**
   * Listar todos los canales
   */
  getChannels: async (companyId?: string): Promise<Channel[]> => {
    const startTime = Date.now();
    console.log('⏱️ [channelService.getChannels] Request starting at:', new Date().toISOString());
    console.log('🔍 [channelService.getChannels] CompanyId:', companyId);

    try {
      const params = companyId ? { companyId } : {};

      const apiStartTime = Date.now();
      const response = await api.get('/omni/channels', { params });
      const apiEndTime = Date.now();

      console.log('✅ [channelService.getChannels] API request took:', apiEndTime - apiStartTime, 'ms');
      console.log('📦 [channelService.getChannels] Response received:', {
        status: response.status,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : []
      });

      // Manejar diferentes formatos de respuesta
      const data = response.data?.data || response.data;

      // Asegurar que siempre devuelva array
      let result: Channel[] = [];
      if (Array.isArray(data)) {
        result = data;
      } else if (!data) {
        console.warn('⚠️ [channelService.getChannels] No data received');
        result = [];
      } else if (data.success === false) {
        console.warn('⚠️ [channelService.getChannels] Backend returned error:', data.message);
        result = [];
      } else {
        console.warn('⚠️ [channelService.getChannels] Unexpected response format:', data);
        result = [];
      }

      const totalTime = Date.now() - startTime;
      console.log('🏁 [channelService.getChannels] Total time:', totalTime, 'ms');
      console.log('📊 [channelService.getChannels] Channels returned:', result.length);

      return result;
    } catch (error: any) {
      const errorTime = Date.now() - startTime;
      console.error('❌ [channelService.getChannels] Error after', errorTime, 'ms:', error);
      console.error('❌ [channelService.getChannels] Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      return [];
    }
  },

  /**
   * Obtener un canal específico
   */
  getChannel: async (channelId: string): Promise<Channel> => {
    const response = await api.get(`/omni/channels/${channelId}`);
    return response.data.data || response.data;
  },

  /**
   * Crear un nuevo canal
   */
  createChannel: async (data: ChannelCreateData): Promise<Channel> => {
    console.log('🆕 [channelService] createChannel - Iniciando:', data);
    try {
      const response = await api.post('/omni/channels', data);
      console.log('✅ [channelService] createChannel - Respuesta:', response.data);
      return response.data.data || response.data;
    } catch (error: any) {
      console.error('❌ [channelService] createChannel - Error:', error);
      console.error('❌ [channelService] createChannel - Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  },

  /**
   * Actualizar un canal
   */
  updateChannel: async (channelId: string, data: ChannelUpdateData): Promise<Channel> => {
    const response = await api.put(`/omni/channels/${channelId}`, data);
    return response.data.data || response.data;
  },

  /**
   * Activar o desactivar un canal
   */
  toggleChannel: async (channelId: string, isActive: boolean): Promise<Channel> => {
    const response = await api.put(`/omni/channels/${channelId}`, {
      is_active: isActive
    });
    return response.data.data || response.data;
  },

  /**
   * Eliminar un canal
   */
  deleteChannel: async (channelId: string): Promise<void> => {
    await api.delete(`/omni/channels/${channelId}`);
  },

  /**
   * Verificar el estado de salud de un canal
   */
  checkHealth: async (channelId: string): Promise<{
    healthy: boolean;
    status: string;
    message?: string;
    lastCheck?: string;
  }> => {
    const response = await api.get(`/omni/channels/${channelId}/health`);
    return response.data.data || response.data;
  },

  /**
   * Validar credenciales de un canal antes de guardarlo
   */
  validateCredentials: async (
    channelType: ChannelType,
    configuration: any
  ): Promise<{
    valid: boolean;
    message?: string;
    errors?: string[];
    warnings?: string[];
    checks?: any[];
  }> => {
    try {
      console.log('🔍 [channelService] validateCredentials - Iniciando:', {
        channelType,
        configuration
      });

      const response = await api.post('/omni/channels/validate', {
        channel_type: channelType,
        configuration
      });

      console.log('✅ [channelService] validateCredentials - Respuesta:', response.data);
      return response.data.data || response.data;
    } catch (error: any) {
      console.error('❌ [channelService] validateCredentials - Error:', error);
      return {
        valid: false,
        message: error.response?.data?.message || 'Error al validar credenciales',
        errors: error.response?.data?.errors || []
      };
    }
  },

  /**
   * Probar conexión de un canal
   */
  testConnection: async (channelId: string): Promise<{
    success: boolean;
    message?: string;
    details?: any;
  }> => {
    try {
      console.log('🧪 [channelService] testConnection - Iniciando:', channelId);
      const response = await api.post(`/omni/channels/${channelId}/test`);
      console.log('✅ [channelService] testConnection - Respuesta:', response.data);
      return response.data.data || response.data;
    } catch (error: any) {
      console.error('❌ [channelService] testConnection - Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Error al probar conexión',
        details: error.response?.data?.details
      };
    }
  }
};