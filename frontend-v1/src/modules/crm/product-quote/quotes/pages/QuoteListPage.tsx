// QuoteListPage - Sprint 19 Frontend Implementation
// List all quotes with filtering and search

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  PlusIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  DocumentDuplicateIcon,
  ArrowDownTrayIcon,
  EllipsisVerticalIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

// Internal imports
import { useQuotes } from '../hooks/useQuotes';
import { useNotification } from '../../../../../shared/hooks/useNotification';
import { QuoteDataTable } from '../components/QuoteDataTable';
import { QuoteFilters } from '../components/QuoteFilters';
import { BulkActionsBar } from '../components/BulkActionsBar';
import {
  Quote,
  QuoteFilters as QuoteFiltersType,
  SelectionState,
  BulkAction,
  ViewMode
} from '../../shared/types';

// Default filters
const DEFAULT_FILTERS: QuoteFiltersType = {
  status: [],
  type: [],
  customer: '',
  assignedTo: [],
  dateRange: {
    start: '',
    end: ''
  },
  amountRange: [0, 1000000],
  tags: [],
  search: ''
};

// View mode options
const VIEW_MODES: ViewMode[] = [
  { type: 'table', itemsPerPage: 25, showFilters: true, showSearch: true },
  { type: 'grid', itemsPerPage: 20, showFilters: true, showSearch: true },
  { type: 'list', itemsPerPage: 50, showFilters: false, showSearch: true }
];

export const QuoteListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showNotification } = useNotification();

  // State management
  const [filters, setFilters] = useState<QuoteFiltersType>(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState<ViewMode>(VIEW_MODES[0]);
  const [showFilters, setShowFilters] = useState(false);
  const [selection, setSelection] = useState<SelectionState>({
    selectedItems: [],
    selectAll: false,
    indeterminate: false
  });

  // Custom hooks
  const {
    quotes,
    pagination,
    isLoading,
    error,
    loadQuotes,
    deleteQuote,
    duplicateQuote,
    exportQuotes,
    bulkUpdateQuotes
  } = useQuotes();

  // Initialize filters from URL params
  useEffect(() => {
    const urlFilters: Partial<QuoteFiltersType> = {};

    const status = searchParams.get('status');
    const customer = searchParams.get('customer');
    const search = searchParams.get('search');
    const assignedTo = searchParams.get('assignedTo');

    if (status) urlFilters.status = status.split(',');
    if (customer) urlFilters.customer = customer;
    if (search) urlFilters.search = search;
    if (assignedTo) urlFilters.assignedTo = assignedTo.split(',').map(Number);

    if (Object.keys(urlFilters).length > 0) {
      setFilters(prevFilters => ({ ...prevFilters, ...urlFilters }));
    }
  }, [searchParams]);

  // Load quotes when filters or pagination change
  useEffect(() => {
    loadQuotes({
      page: 1,
      limit: viewMode.itemsPerPage,
      ...filters
    });
  }, [filters, viewMode.itemsPerPage]);

  // Update URL params when filters change
  const updateUrlParams = useCallback((newFilters: QuoteFiltersType) => {
    const params = new URLSearchParams();

    if (newFilters.status.length > 0) {
      params.set('status', newFilters.status.join(','));
    }
    if (newFilters.customer) {
      params.set('customer', newFilters.customer);
    }
    if (newFilters.search) {
      params.set('search', newFilters.search);
    }
    if (newFilters.assignedTo.length > 0) {
      params.set('assignedTo', newFilters.assignedTo.join(','));
    }

    setSearchParams(params);
  }, [setSearchParams]);

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: QuoteFiltersType) => {
    setFilters(newFilters);
    updateUrlParams(newFilters);
    // Reset selection when filters change
    setSelection({
      selectedItems: [],
      selectAll: false,
      indeterminate: false
    });
  }, [updateUrlParams]);

  // Reset filters
  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  // Handle quote actions
  const handleCreateQuote = useCallback(() => {
    navigate('/crm/quotes/builder');
  }, [navigate]);

  const handleEditQuote = useCallback((quote: Quote) => {
    navigate(`/crm/quotes/builder/${quote.id}`);
  }, [navigate]);

  const handleViewQuote = useCallback((quote: Quote) => {
    navigate(`/crm/quotes/${quote.id}`);
  }, [navigate]);

  const handleDuplicateQuote = useCallback(async (quote: Quote) => {
    try {
      const duplicatedQuote = await duplicateQuote(quote.id);
      showNotification({
        type: 'success',
        title: 'Quote Duplicated',
        message: `Quote "${quote.title}" has been duplicated successfully.`
      });
      navigate(`/crm/quotes/builder/${duplicatedQuote.id}`);
    } catch (error) {
      console.error('Failed to duplicate quote:', error);
      showNotification({
        type: 'error',
        title: 'Duplication Failed',
        message: 'Failed to duplicate quote. Please try again.'
      });
    }
  }, [duplicateQuote, showNotification, navigate]);

  const handleDeleteQuote = useCallback(async (quoteId: number) => {
    if (window.confirm('Are you sure you want to delete this quote? This action cannot be undone.')) {
      try {
        await deleteQuote(quoteId);
        showNotification({
          type: 'success',
          title: 'Quote Deleted',
          message: 'Quote has been deleted successfully.'
        });
      } catch (error) {
        console.error('Failed to delete quote:', error);
        showNotification({
          type: 'error',
          title: 'Deletion Failed',
          message: 'Failed to delete quote. Please try again.'
        });
      }
    }
  }, [deleteQuote, showNotification]);

  const handleConvertQuote = useCallback((quote: Quote) => {
    // Navigate to order creation with quote data
    navigate(`/crm/orders/create?fromQuote=${quote.id}`);
  }, [navigate]);

  const handleCompareQuotes = useCallback(() => {
    if (selection.selectedItems.length === 2) {
      navigate(`/crm/quotes/compare?quotes=${selection.selectedItems.join(',')}`);
    } else {
      showNotification({
        type: 'warning',
        title: 'Selection Required',
        message: 'Please select exactly 2 quotes to compare.'
      });
    }
  }, [selection.selectedItems, navigate, showNotification]);

  // Handle export
  const handleExportQuotes = useCallback(async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      const quoteIds = selection.selectedItems.length > 0
        ? selection.selectedItems
        : undefined;

      await exportQuotes({
        format,
        quoteIds,
        filters: Object.keys(filters).length > 0 ? filters : undefined
      });

      showNotification({
        type: 'success',
        title: 'Export Started',
        message: `Export has been started. You'll receive a notification when it's ready.`
      });
    } catch (error) {
      console.error('Failed to export quotes:', error);
      showNotification({
        type: 'error',
        title: 'Export Failed',
        message: 'Failed to export quotes. Please try again.'
      });
    }
  }, [selection.selectedItems, filters, exportQuotes, showNotification]);

  // Selection handlers
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      const allIds = quotes.map(quote => quote.id);
      setSelection({
        selectedItems: allIds,
        selectAll: true,
        indeterminate: false
      });
    } else {
      setSelection({
        selectedItems: [],
        selectAll: false,
        indeterminate: false
      });
    }
  }, [quotes]);

  const handleSelectItem = useCallback((quoteId: number, checked: boolean) => {
    setSelection(prev => {
      const newSelected = checked
        ? [...prev.selectedItems, quoteId]
        : prev.selectedItems.filter(id => id !== quoteId);

      const selectAll = newSelected.length === quotes.length;
      const indeterminate = newSelected.length > 0 && newSelected.length < quotes.length;

      return {
        selectedItems: newSelected,
        selectAll,
        indeterminate
      };
    });
  }, [quotes.length]);

  // Bulk actions
  const bulkActions: BulkAction[] = useMemo(() => [
    {
      key: 'duplicate',
      label: 'Duplicate Selected',
      icon: <DocumentDuplicateIcon className="w-4 h-4" />,
      handler: async (selectedIds: number[]) => {
        // Implement bulk duplicate
        for (const id of selectedIds) {
          await duplicateQuote(id);
        }
        showNotification({
          type: 'success',
          title: 'Quotes Duplicated',
          message: `${selectedIds.length} quotes have been duplicated.`
        });
      }
    },
    {
      key: 'delete',
      label: 'Delete Selected',
      icon: <XMarkIcon className="w-4 h-4" />,
      handler: async (selectedIds: number[]) => {
        if (window.confirm(`Are you sure you want to delete ${selectedIds.length} quotes? This action cannot be undone.`)) {
          for (const id of selectedIds) {
            await deleteQuote(id);
          }
          showNotification({
            type: 'success',
            title: 'Quotes Deleted',
            message: `${selectedIds.length} quotes have been deleted.`
          });
        }
      },
      confirmation: {
        title: 'Delete Quotes',
        message: 'Are you sure you want to delete the selected quotes? This action cannot be undone.'
      }
    }
  ], [duplicateQuote, deleteQuote, showNotification]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.status.length > 0) count++;
    if (filters.type.length > 0) count++;
    if (filters.customer) count++;
    if (filters.assignedTo.length > 0) count++;
    if (filters.search) count++;
    if (filters.tags.length > 0) count++;
    return count;
  }, [filters]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Quotes</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage and track your sales quotes
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {/* Export Dropdown */}
              <div className="relative inline-block text-left">
                <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                  Export
                </button>
              </div>

              {/* Create Quote Button */}
              <button
                onClick={handleCreateQuote}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                New Quote
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search quotes..."
                  value={filters.search}
                  onChange={(e) => handleFiltersChange({ ...filters, search: e.target.value })}
                  className="block w-80 pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              {/* Filters Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`
                  inline-flex items-center px-3 py-2 border text-sm leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                  ${showFilters || activeFiltersCount > 0
                    ? 'border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100'
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                  }
                `}
              >
                <FunnelIcon className="w-4 h-4 mr-2" />
                Filters
                {activeFiltersCount > 0 && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* Clear Filters */}
              {activeFiltersCount > 0 && (
                <button
                  onClick={handleResetFilters}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear all filters
                </button>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center space-x-2">
              {VIEW_MODES.map((mode) => (
                <button
                  key={mode.type}
                  onClick={() => setViewMode(mode)}
                  className={`
                    px-3 py-2 text-sm font-medium rounded-md
                    ${viewMode.type === mode.type
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                    }
                  `}
                >
                  {mode.type.charAt(0).toUpperCase() + mode.type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="border-t pt-4">
              <QuoteFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
                onReset={handleResetFilters}
              />
            </div>
          )}
        </div>
      </div>

      {/* Bulk Actions */}
      {selection.selectedItems.length > 0 && (
        <BulkActionsBar
          selectedCount={selection.selectedItems.length}
          totalCount={quotes.length}
          actions={bulkActions}
          selectedIds={selection.selectedItems}
          onClearSelection={() => setSelection({
            selectedItems: [],
            selectAll: false,
            indeterminate: false
          })}
        />
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error ? (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <XMarkIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading quotes</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow-sm rounded-lg">
            <QuoteDataTable
              quotes={quotes}
              loading={isLoading}
              pagination={pagination}
              selection={selection}
              onSelectAll={handleSelectAll}
              onSelectItem={handleSelectItem}
              onEdit={handleEditQuote}
              onView={handleViewQuote}
              onDelete={handleDeleteQuote}
              onDuplicate={handleDuplicateQuote}
              onConvert={handleConvertQuote}
              onExport={(quoteIds) => handleExportQuotes('csv')}
              viewMode={viewMode}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default QuoteListPage;