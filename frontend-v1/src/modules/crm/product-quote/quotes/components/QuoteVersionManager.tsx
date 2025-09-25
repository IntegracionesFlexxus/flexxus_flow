// QuoteVersionManager - Sprint 19 Frontend Implementation
// Manage quote versions (placeholder)

import React from 'react';
import { Quote, QuoteVersionManagerProps } from '../../shared/types';

export const QuoteVersionManager: React.FC<QuoteVersionManagerProps> = ({
  quote,
  versions,
  onCreateVersion,
  onRestoreVersion,
  onCompareVersions
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Version Management</h3>
      <p className="text-gray-600">Version management functionality will be implemented here.</p>
      <div className="mt-4 space-y-2">
        {versions.map(version => (
          <div key={version.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
            <div>
              <span className="font-medium">Version {version.version}</span>
              <span className="ml-2 text-sm text-gray-500">
                {new Date(version.updatedAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => onRestoreVersion(version.id)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Restore
              </button>
              <button
                onClick={() => onCompareVersions(quote.id, version.id)}
                className="text-gray-600 hover:text-gray-800 text-sm"
              >
                Compare
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};