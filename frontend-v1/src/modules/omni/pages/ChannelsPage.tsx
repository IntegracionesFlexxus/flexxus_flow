// pages/ChannelsPage.tsx
import React, { useState } from 'react';
import { useChannels } from '../hooks';
import { ChannelCard, LoadingSpinner, EmptyState } from '../components';
import { Channel, CreateChannelRequest } from '../types';

const ChannelsPage: React.FC = () => {
  const {
    channels,
    loading,
    error,
    createChannel,
    updateChannel,
    toggleStatus,
    checkHealth,
    clearError
  } = useChannels();

  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleConfigure = (channel: Channel) => {
    // Abrir modal de configuración
    console.log('Configure channel:', channel);
  };

  const handleHealthCheck = async (channel: Channel) => {
    try {
      await checkHealth(channel.id);
      // Mostrar notificación de éxito
    } catch (error) {
      console.error('Health check failed:', error);
    }
  };

  const handleToggle = async (channel: Channel) => {
    try {
      await toggleStatus(channel.id);
      // Mostrar notificación de éxito
    } catch (error) {
      console.error('Toggle failed:', error);
    }
  };

  const handleCreateChannel = () => {
    setShowCreateModal(true);
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading channels..." />;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading channels
              </h3>
              <div className="mt-2 text-sm text-red-700">
                {error}
              </div>
              <div className="mt-4">
                <button
                  onClick={clearError}
                  className="text-sm font-medium text-red-800 underline hover:text-red-600"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Channels</h1>
          <p className="text-gray-600">
            Manage your communication channels
          </p>
        </div>
        <button
          onClick={handleCreateChannel}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Add Channel
        </button>
      </div>

      {channels.length === 0 ? (
        <EmptyState
          title="No channels configured"
          description="Get started by adding your first communication channel"
          icon="📢"
          action={{
            label: "Add Channel",
            onClick: handleCreateChannel
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {channels.map(channel => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              onConfigure={handleConfigure}
              onHealthCheck={handleHealthCheck}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ChannelsPage;