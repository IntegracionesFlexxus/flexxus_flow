// components/shared/StatusBadge.tsx
import React from 'react';

interface StatusBadgeProps {
  status: string;
  variant?: 'conversation' | 'channel' | 'message' | 'priority';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant = 'conversation',
  className = ''
}) => {
  const getStatusConfig = () => {
    switch (variant) {
      case 'conversation':
        return {
          open: { color: 'bg-green-100 text-green-800', label: 'Open' },
          pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
          resolved: { color: 'bg-gray-100 text-gray-800', label: 'Resolved' },
          archived: { color: 'bg-gray-100 text-gray-600', label: 'Archived' }
        };
      case 'channel':
        return {
          healthy: { color: 'bg-green-100 text-green-800', label: 'Healthy' },
          degraded: { color: 'bg-yellow-100 text-yellow-800', label: 'Degraded' },
          down: { color: 'bg-red-100 text-red-800', label: 'Down' },
          unknown: { color: 'bg-gray-100 text-gray-800', label: 'Unknown' }
        };
      case 'message':
        return {
          pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
          sent: { color: 'bg-blue-100 text-blue-800', label: 'Sent' },
          delivered: { color: 'bg-green-100 text-green-800', label: 'Delivered' },
          read: { color: 'bg-green-100 text-green-800', label: 'Read' },
          failed: { color: 'bg-red-100 text-red-800', label: 'Failed' }
        };
      case 'priority':
        return {
          low: { color: 'bg-gray-100 text-gray-800', label: 'Low' },
          normal: { color: 'bg-blue-100 text-blue-800', label: 'Normal' },
          high: { color: 'bg-orange-100 text-orange-800', label: 'High' },
          urgent: { color: 'bg-red-100 text-red-800', label: 'Urgent' }
        };
      default:
        return {
          [status]: { color: 'bg-gray-100 text-gray-800', label: status }
        };
    }
  };

  const statusConfig = getStatusConfig();
  const config = statusConfig[status as keyof typeof statusConfig] || {
    color: 'bg-gray-100 text-gray-800',
    label: status
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color} ${className}`}
    >
      {config.label}
    </span>
  );
};