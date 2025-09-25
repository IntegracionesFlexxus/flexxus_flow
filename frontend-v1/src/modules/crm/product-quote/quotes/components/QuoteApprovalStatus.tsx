// QuoteApprovalStatus - Sprint 19 Frontend Implementation (placeholder)
import React from 'react';

interface QuoteApprovalStatusProps {
  status: 'not_required' | 'pending' | 'approved' | 'rejected';
  processId?: number;
}

export const QuoteApprovalStatus: React.FC<QuoteApprovalStatusProps> = ({ status, processId }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor()}`}>
      {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
    </span>
  );
};