// QuotePDFPreview - Sprint 19 Frontend Implementation (placeholder)
import React from 'react';

interface QuotePDFPreviewProps {
  quoteId: number;
  onClose: () => void;
}

export const QuotePDFPreview: React.FC<QuotePDFPreviewProps> = ({ quoteId, onClose }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 mx-auto border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Quote PDF Preview</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
            <p className="text-gray-600">PDF preview will be implemented here.</p>
          </div>
        </div>
      </div>
    </div>
  );
};