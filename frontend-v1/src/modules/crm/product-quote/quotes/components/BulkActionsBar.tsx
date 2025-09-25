// BulkActionsBar - Sprint 19 Frontend Implementation (placeholder)
import React from 'react';
import { BulkAction } from '../../shared/types';

interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  actions: BulkAction[];
  selectedIds: number[];
  onClearSelection: () => void;
}

export const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedCount,
  totalCount,
  actions,
  selectedIds,
  onClearSelection
}) => {
  return (
    <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
      <div className="flex">
        <div className="ml-3">
          <p className="text-sm text-blue-700">
            {selectedCount} of {totalCount} quotes selected
          </p>
        </div>
        <div className="ml-auto flex space-x-2">
          {actions.map(action => (
            <button
              key={action.key}
              onClick={() => action.handler(selectedIds)}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
            >
              {action.icon}
              <span className="ml-2">{action.label}</span>
            </button>
          ))}
          <button
            onClick={onClearSelection}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Clear selection
          </button>
        </div>
      </div>
    </div>
  );
};