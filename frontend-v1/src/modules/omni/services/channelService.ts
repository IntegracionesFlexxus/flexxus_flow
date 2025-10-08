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
    try {
      const params = companyId ? { companyId } : {};
      const response = await api.get('/omni/channels', { params });

      // Manejar diferentes formatos de respuesta
      const data = response.data?.data || response.data;

      // Asegurar que siempre devuelva array
      if (Array.isArray(data)) {
        return data;
      } else if (!data) {
        return [];
      } else if (data.success === false) {
        // Si el backend devuelve un error, devolver array vacío
        console.warn('Backend returned error, returning empty array:', data.message);
        return [];
      } else {
        console.warn('Unexpected response format:', data);
        return [];
      }
    } catch (error: any) {
      console.error('Error fetching channels:', error);
      // En caso de error de red o similar, devolver array vacío
      // para no bloquear la UI
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
    const response = await api.post('/omni/channels', data);
    return response.data.data || response.data;
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
      const response = await api.post('/omni/channels/validate', {
        channel_type: channelType,
        configuration
      });
      return response.data.data || response.data;
    } catch (error: any) {
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
      const response = await api.post(`/omni/channels/${channelId}/test`);
      return response.data.data || response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Error al probar conexión'
      };
    }
  }
};