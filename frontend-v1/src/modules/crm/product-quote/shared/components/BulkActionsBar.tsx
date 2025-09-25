// Bulk Actions Bar Component - Sprint 19 Frontend Implementation

import React, { useState } from 'react';
import {
  CheckSquare,
  Square,
  MoreHorizontal,
  Trash2,
  Edit3,
  Download,
  Upload,
  Copy,
  Archive,
  Eye,
  X,
  AlertTriangle
} from 'lucide-react';
import { BulkAction, ActionItem } from '../../types';

export interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  selectedItems: number[];
  onSelectAll: () => void;
  onClearSelection: () => void;
  bulkActions: BulkAction[];
  className?: string;
  position?: 'top' | 'bottom' | 'fixed';
}

const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedCount,
  totalCount,
  selectedItems,
  onSelectAll,
  onClearSelection,
  bulkActions,
  className = "",
  position = 'top'
}) => {
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState<BulkAction | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const isAllSelected = selectedCount === totalCount && totalCount > 0;
  const isIndeterminate = selectedCount > 0 && selectedCount < totalCount;

  const handleSelectAll = () => {
    if (isAllSelected) {
      onClearSelection();
    } else {
      onSelectAll();
    }
  };

  const executeBulkAction = async (action: BulkAction) => {
    if (action.confirmation) {
      setShowConfirmDialog(action);
      return;
    }

    await executeAction(action);
  };

  const executeAction = async (action: BulkAction) => {
    setIsExecuting(true);
    setShowConfirmDialog(null);

    try {
      await action.handler(selectedItems);
      onClearSelection(); // Clear selection after successful action
    } catch (error) {
      console.error(`Bulk action "${action.label}" failed:`, error);
      // Handle error (show notification, etc.)
    } finally {
      setIsExecuting(false);
    }
  };

  const getActionIcon = (key: string) => {
    switch (key) {
      case 'delete':
        return <Trash2 className="h-4 w-4" />;
      case 'edit':
        return <Edit3 className="h-4 w-4" />;
      case 'export':
        return <Download className="h-4 w-4" />;
      case 'import':
        return <Upload className="h-4 w-4" />;
      case 'duplicate':
        return <Copy className="h-4 w-4" />;
      case 'archive':
        return <Archive className="h-4 w-4" />;
      case 'view':
        return <Eye className="h-4 w-4" />;
      default:
        return action.icon || <MoreHorizontal className="h-4 w-4" />;
    }
  };

  const getActionStyle = (action: BulkAction) => {
    const baseStyle = "flex items-center space-x-1 px-3 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed";

    if (action.key === 'delete' || action.key.includes('delete')) {
      return `${baseStyle} bg-red-50 text-red-700 hover:bg-red-100 border border-red-200`;
    }

    return `${baseStyle} bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200`;
  };

  // Don't render if no items selected
  if (selectedCount === 0) {
    return null;
  }

  const positionClasses = {
    top: "relative",
    bottom: "relative",
    fixed: "fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 shadow-lg"
  };

  const primaryActions = bulkActions.slice(0, 3);
  const secondaryActions = bulkActions.slice(3);

  return (
    <>
      <div className={`
        ${positionClasses[position]}
        bg-white border border-gray-200 rounded-lg p-4 space-y-3
        ${position === 'fixed' ? 'max-w-4xl w-full mx-4' : ''}
        ${className}
      `}>
        {/* Selection Summary */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSelectAll}
              className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800"
              title={isAllSelected ? "Deselect all" : "Select all"}
            >
              {isAllSelected ? (
                <CheckSquare className="h-5 w-5 text-blue-600" />
              ) : isIndeterminate ? (
                <div className="h-5 w-5 border-2 border-blue-600 rounded flex items-center justify-center">
                  <div className="h-2 w-2 bg-blue-600 rounded-sm" />
                </div>
              ) : (
                <Square className="h-5 w-5" />
              )}
              <span>
                {selectedCount} of {totalCount} selected
              </span>
            </button>

            {selectedCount < totalCount && (
              <span className="text-xs text-gray-500">
                • <button
                  onClick={onSelectAll}
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Select all {totalCount}
                </button>
              </span>
            )}
          </div>

          <button
            onClick={onClearSelection}
            className="text-gray-400 hover:text-gray-600"
            title="Clear selection"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Primary Actions */}
          {primaryActions.map((action) => (
            <button
              key={action.key}
              onClick={() => executeBulkAction(action)}
              disabled={action.disabled || isExecuting}
              className={getActionStyle(action)}
              title={action.label}
            >
              {getActionIcon(action.key)}
              <span>{action.label}</span>
            </button>
          ))}

          {/* More Actions Dropdown */}
          {secondaryActions.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowMoreActions(!showMoreActions)}
                className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <MoreHorizontal className="h-4 w-4" />
                <span>More</span>
              </button>

              {showMoreActions && (
                <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  {secondaryActions.map((action) => (
                    <button
                      key={action.key}
                      onClick={() => {
                        setShowMoreActions(false);
                        executeBulkAction(action);
                      }}
                      disabled={action.disabled || isExecuting}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {getActionIcon(action.key)}
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Loading Indicator */}
          {isExecuting && (
            <div className="flex items-center space-x-2 text-sm text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>Processing...</span>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close more actions */}
      {showMoreActions && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowMoreActions(false)}
        />
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {showConfirmDialog.confirmation?.title || 'Confirm Action'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {showConfirmDialog.confirmation?.message ||
                    `Are you sure you want to ${showConfirmDialog.label.toLowerCase()} ${selectedCount} item(s)?`}
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmDialog(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                disabled={isExecuting}
              >
                Cancel
              </button>
              <button
                onClick={() => executeAction(showConfirmDialog)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isExecuting}
              >
                {isExecuting ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BulkActionsBar;