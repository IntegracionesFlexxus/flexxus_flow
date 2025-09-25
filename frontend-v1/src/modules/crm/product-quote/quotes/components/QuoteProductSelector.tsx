// QuoteProductSelector - Sprint 19 Frontend Implementation (placeholder)
import React from 'react';
import { CreateLineItemDto, QuoteSection } from '../../shared/types';

interface QuoteProductSelectorProps {
  onSelect: (item: CreateLineItemDto) => void;
  onCancel: () => void;
  sections: QuoteSection[];
}

export const QuoteProductSelector: React.FC<QuoteProductSelectorProps> = ({ onSelect, onCancel, sections }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Select Product</h3>
        <p className="text-gray-600 mb-4">Product selection modal will be implemented here.</p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};