// QuoteTimeline - Sprint 19 Frontend Implementation (placeholder)
import React from 'react';

interface QuoteTimelineProps {
  quoteId: number;
}

export const QuoteTimeline: React.FC<QuoteTimelineProps> = ({ quoteId }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Activity Timeline</h3>
      <p className="text-gray-600">Quote activity timeline will be implemented here.</p>
    </div>
  );
};