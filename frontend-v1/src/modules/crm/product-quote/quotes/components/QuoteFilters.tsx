// QuoteFilters - Sprint 19 Frontend Implementation (placeholder)
import React from 'react';
import { QuoteFilters as QuoteFiltersType } from '../../shared/types';

interface QuoteFiltersProps {
  filters: QuoteFiltersType;
  onFiltersChange: (filters: QuoteFiltersType) => void;
  onReset: () => void;
}

export const QuoteFilters: React.FC<QuoteFiltersProps> = ({ filters, onFiltersChange, onReset }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-medium text-gray-900 mb-4">Advanced Filters</h3>
      <p className="text-gray-600">Quote filtering UI will be implemented here.</p>
    </div>
  );
};