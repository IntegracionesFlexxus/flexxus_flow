// QuoteComparison - Sprint 19 Frontend Implementation (placeholder)
import React from 'react';
import { QuoteComparisonProps } from '../../shared/types';

export const QuoteComparison: React.FC<QuoteComparisonProps> = ({ quote1, quote2, onClose }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Quote Comparison</h3>
      <p className="text-gray-600">Quote comparison functionality will be implemented here.</p>
    </div>
  );
};