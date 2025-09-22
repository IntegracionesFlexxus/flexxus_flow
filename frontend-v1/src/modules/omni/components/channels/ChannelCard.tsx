// components/channels/ChannelCard.tsx
import React from 'react';
import { Channel, ChannelType, HealthStatus } from '../../types';
import { StatusBadge } from '../shared';

interface ChannelCardProps {
  channel: Channel;
  onConfigure: (channel: Channel) => void;
  onHealthCheck: (channel: Channel) => void;
  onToggle: (channel: Channel) => void;
}

const channelIcons: Record<ChannelType, string> = {
  [ChannelType.WHATSAPP]: '💬',
  [ChannelType.INSTAGRAM]: '📷',
  [ChannelType.EMAIL]: '📧',
  [ChannelType.SMS]: '📱'
};

const channelNames: Record<ChannelType, string> = {
  [ChannelType.WHATSAPP]: 'WhatsApp',
  [ChannelType.INSTAGRAM]: 'Instagram',
  [ChannelType.EMAIL]: 'Email',
  [ChannelType.SMS]: 'SMS'
};

export const ChannelCard: React.FC<ChannelCardProps> = ({
  channel,
  onConfigure,
  onHealthCheck,
  onToggle
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <div className="text-2xl mr-3">
            {channelIcons[channel.channelType]}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {channel.name}
            </h3>
            <p className="text-sm text-gray-500">
              {channelNames[channel.channelType]}
            </p>
          </div>
        </div>
        <StatusBadge
          status={channel.healthStatus}
          variant="channel"
        />
      </div>

      {channel.description && (
        <p className="text-sm text-gray-600 mb-4">
          {channel.description}
        </p>
      )}

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Status:</span>
          <StatusBadge
            status={channel.isActive ? 'active' : 'inactive'}
            variant="conversation"
          />
        </div>
        {channel.lastHealthCheck && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Last Check:</span>
            <span className="text-gray-700">
              {new Date(channel.lastHealthCheck).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      <div className="flex space-x-2">
        <button
          onClick={() => onConfigure(channel)}
          className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors"
        >
          Configure
        </button>
        <button
          onClick={() => onHealthCheck(channel)}
          className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          Check Health
        </button>
        <button
          onClick={() => onToggle(channel)}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            channel.isActive
              ? 'text-red-600 border border-red-600 hover:bg-red-50'
              : 'text-green-600 border border-green-600 hover:bg-green-50'
          }`}
        >
          {channel.isActive ? 'Deactivate' : 'Activate'}
        </button>
      </div>
    </div>
  );
};