// hooks/useChannels.ts
import { useEffect, useCallback } from 'react';
import { useChannelsStore } from '../store/channelsStore';
import { ChannelType, CreateChannelRequest, UpdateChannelRequest } from '../types';

export const useChannels = () => {
  const {
    channels,
    activeChannel,
    loading,
    error,
    stats,
    fetchChannels,
    createChannel,
    updateChannel,
    deleteChannel,
    toggleChannelStatus,
    checkChannelHealth,
    fetchChannelStats,
    setActiveChannel,
    clearError
  } = useChannelsStore();

  // Cargar canales al inicializar
  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const handleCreateChannel = useCallback(async (data: CreateChannelRequest) => {
    try {
      await createChannel(data);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, [createChannel]);

  const handleUpdateChannel = useCallback(async (id: string, data: UpdateChannelRequest) => {
    try {
      await updateChannel(id, data);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, [updateChannel]);

  const handleDeleteChannel = useCallback(async (id: string) => {
    try {
      await deleteChannel(id);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, [deleteChannel]);

  const handleToggleStatus = useCallback(async (id: string) => {
    try {
      await toggleChannelStatus(id);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, [toggleChannelStatus]);

  const handleCheckHealth = useCallback(async (id: string) => {
    try {
      await checkChannelHealth(id);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, [checkChannelHealth]);

  const refreshChannels = useCallback((type?: ChannelType) => {
    fetchChannels(type);
  }, [fetchChannels]);

  const refreshStats = useCallback(() => {
    fetchChannelStats();
  }, [fetchChannelStats]);

  const selectChannel = useCallback((channel: any) => {
    setActiveChannel(channel);
  }, [setActiveChannel]);

  const clearChannelError = useCallback(() => {
    clearError();
  }, [clearError]);

  // Filtros y utilidades
  const getChannelsByType = useCallback((type: ChannelType) => {
    return channels?.filter((channel: any) => channel.channelType === type) || [];
  }, [channels]);

  const getActiveChannels = useCallback(() => {
    return channels?.filter((channel: any) => channel.isActive) || [];
  }, [channels]);

  const getHealthyChannels = useCallback(() => {
    return channels?.filter((channel: any) => channel.healthStatus === 'healthy') || [];
  }, [channels]);

  return {
    // State
    channels: channels || [],
    activeChannel,
    loading: loading || false,
    error,
    stats,

    // Actions
    createChannel: handleCreateChannel,
    updateChannel: handleUpdateChannel,
    deleteChannel: handleDeleteChannel,
    toggleStatus: handleToggleStatus,
    checkHealth: handleCheckHealth,
    refreshChannels,
    refreshStats,
    selectChannel,
    clearError: clearChannelError,

    // Utilities
    getChannelsByType,
    getActiveChannels,
    getHealthyChannels
  };
};