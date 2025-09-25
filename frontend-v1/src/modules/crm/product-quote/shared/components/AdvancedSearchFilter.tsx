// Advanced Search Filter Component - Sprint 19 Frontend Implementation

import React, { useState, useCallback, useEffect } from 'react';
import {
  Search,
  Filter,
  X,
  Calendar,
  DollarSign,
  Tag,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { FilterConfig, MenuOption } from '../../types';

export interface AdvancedSearchFilterProps {
  placeholder?: string;
  filters: FilterConfig[];
  availableFilters: Array<{
    key: string;
    label: string;
    type: 'text' | 'select' | 'multiselect' | 'date' | 'daterange' | 'number' | 'numberrange';
    options?: MenuOption[];
  }>;
  onSearch: (query: string, filters: FilterConfig[]) => void;
  onFiltersChange: (filters: FilterConfig[]) => void;
  loading?: boolean;
  showSuggestions?: boolean;
  suggestions?: string[];
  className?: string;
}

const AdvancedSearchFilter: React.FC<AdvancedSearchFilterProps> = ({
  placeholder = "Search...",
  filters,
  availableFilters,
  onSearch,
  onFiltersChange,
  loading = false,
  showSuggestions = false,
  suggestions = [],
  className = ""
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSuggestionsList, setShowSuggestionsList] = useState(false);

  // Filter states
  const [localFilters, setLocalFilters] = useState<FilterConfig[]>(filters);
  const [selectedFilterType, setSelectedFilterType] = useState<string>('');

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleSearch = useCallback((query: string = searchQuery) => {
    onSearch(query, localFilters);
    setShowSuggestionsList(false);
  }, [searchQuery, localFilters, onSearch]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  const addFilter = useCallback((filterType: string) => {
    const availableFilter = availableFilters.find(f => f.key === filterType);
    if (!availableFilter) return;

    const newFilter: FilterConfig = {
      field: filterType,
      operator: 'equals',
      value: availableFilter.type === 'multiselect' ? [] : ''
    };

    const updatedFilters = [...localFilters, newFilter];
    setLocalFilters(updatedFilters);
    onFiltersChange(updatedFilters);
    setSelectedFilterType('');
  }, [localFilters, availableFilters, onFiltersChange]);

  const updateFilter = useCallback((index: number, updates: Partial<FilterConfig>) => {
    const updatedFilters = localFilters.map((filter, i) =>
      i === index ? { ...filter, ...updates } : filter
    );
    setLocalFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  }, [localFilters, onFiltersChange]);

  const removeFilter = useCallback((index: number) => {
    const updatedFilters = localFilters.filter((_, i) => i !== index);
    setLocalFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  }, [localFilters, onFiltersChange]);

  const clearAllFilters = useCallback(() => {
    setLocalFilters([]);
    onFiltersChange([]);
    setSearchQuery('');
    handleSearch('');
  }, [onFiltersChange, handleSearch]);

  const getFilterIcon = (type: string) => {
    switch (type) {
      case 'date':
      case 'daterange':
        return <Calendar className="h-4 w-4" />;
      case 'number':
      case 'numberrange':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <Tag className="h-4 w-4" />;
    }
  };

  const getOperatorOptions = (type: string) => {
    switch (type) {
      case 'text':
        return [
          { value: 'equals', label: 'equals' },
          { value: 'contains', label: 'contains' },
          { value: 'starts_with', label: 'starts with' },
          { value: 'ends_with', label: 'ends with' }
        ];
      case 'number':
      case 'date':
        return [
          { value: 'equals', label: 'equals' },
          { value: 'greater_than', label: 'greater than' },
          { value: 'less_than', label: 'less than' },
          { value: 'greater_equal', label: 'greater or equal' },
          { value: 'less_equal', label: 'less or equal' }
        ];
      case 'select':
      case 'multiselect':
        return [
          { value: 'equals', label: 'equals' },
          { value: 'in', label: 'is one of' },
          { value: 'not_in', label: 'is not one of' }
        ];
      default:
        return [
          { value: 'equals', label: 'equals' },
          { value: 'not_equals', label: 'not equals' }
        ];
    }
  };

  const renderFilterValue = (filter: FilterConfig, index: number) => {
    const availableFilter = availableFilters.find(f => f.key === filter.field);
    if (!availableFilter) return null;

    const commonProps = {
      value: filter.value,
      onChange: (value: any) => updateFilter(index, { value }),
      className: "px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
    };

    switch (availableFilter.type) {
      case 'text':
        return (
          <input
            type="text"
            placeholder="Enter value..."
            {...commonProps}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            placeholder="Enter number..."
            {...commonProps}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            {...commonProps}
          />
        );

      case 'select':
        return (
          <select {...commonProps}>
            <option value="">Select option...</option>
            {availableFilter.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'multiselect':
        return (
          <select
            multiple
            {...commonProps}
            className={`${commonProps.className} h-20`}
            value={Array.isArray(filter.value) ? filter.value : []}
            onChange={(e) => {
              const values = Array.from(e.target.selectedOptions, option => option.value);
              updateFilter(index, { value: values });
            }}
          >
            {availableFilter.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      default:
        return (
          <input
            type="text"
            placeholder="Enter value..."
            {...commonProps}
          />
        );
    }
  };

  const hasActiveFilters = localFilters.length > 0 || searchQuery.trim() !== '';

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Search Bar */}
      <div className="relative">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder={placeholder}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (showSuggestions && e.target.value.length > 0) {
                  setShowSuggestionsList(true);
                } else {
                  setShowSuggestionsList(false);
                }
              }}
              onKeyPress={handleKeyPress}
              onFocus={() => {
                if (showSuggestions && searchQuery.length > 0) {
                  setShowSuggestionsList(true);
                }
              }}
              onBlur={() => {
                // Delay to allow clicks on suggestions
                setTimeout(() => setShowSuggestionsList(false), 150);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />

            {/* Search Suggestions */}
            {showSuggestionsList && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {suggestions
                  .filter(suggestion =>
                    suggestion.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .slice(0, 10)
                  .map((suggestion, index) => (
                    <button
                      key={index}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                      onClick={() => {
                        setSearchQuery(suggestion);
                        setShowSuggestionsList(false);
                        handleSearch(suggestion);
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
              </div>
            )}
          </div>

          <button
            onClick={() => handleSearch()}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
            title="Advanced Filters"
          >
            <Filter className="h-5 w-5" />
            {hasActiveFilters && (
              <span className="absolute -mt-1 -mr-1 px-1 py-0.5 text-xs bg-blue-600 text-white rounded-full min-w-[1rem] text-center">
                {localFilters.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {isExpanded && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">Advanced Filters</h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
          </div>

          {/* Active Filters */}
          {localFilters.length > 0 && (
            <div className="space-y-2">
              {localFilters.map((filter, index) => {
                const availableFilter = availableFilters.find(f => f.key === filter.field);
                if (!availableFilter) return null;

                return (
                  <div key={index} className="flex items-center space-x-2 bg-white p-2 rounded border">
                    {getFilterIcon(availableFilter.type)}

                    <select
                      value={filter.field}
                      onChange={(e) => updateFilter(index, { field: e.target.value })}
                      className="text-sm border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {availableFilters.map(af => (
                        <option key={af.key} value={af.key}>{af.label}</option>
                      ))}
                    </select>

                    <select
                      value={filter.operator}
                      onChange={(e) => updateFilter(index, { operator: e.target.value as any })}
                      className="text-sm border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {getOperatorOptions(availableFilter.type).map(op => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </select>

                    {renderFilterValue(filter, index)}

                    <button
                      onClick={() => removeFilter(index)}
                      className="p-1 text-red-500 hover:text-red-700"
                      title="Remove filter"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add New Filter */}
          <div className="flex items-center space-x-2">
            <select
              value={selectedFilterType}
              onChange={(e) => setSelectedFilterType(e.target.value)}
              className="text-sm border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Add filter...</option>
              {availableFilters
                .filter(af => !localFilters.some(f => f.field === af.key))
                .map(af => (
                  <option key={af.key} value={af.key}>{af.label}</option>
                ))}
            </select>

            <button
              onClick={() => addFilter(selectedFilterType)}
              disabled={!selectedFilterType}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="px-3 py-1 text-sm text-red-600 hover:text-red-800"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      )}

      {/* Active Filter Tags (Compact View) */}
      {!isExpanded && localFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {localFilters.map((filter, index) => {
            const availableFilter = availableFilters.find(f => f.key === filter.field);
            if (!availableFilter) return null;

            return (
              <div key={index} className="flex items-center space-x-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                <span>{availableFilter.label}</span>
                <span className="text-blue-600">{filter.operator}</span>
                <span className="font-medium">
                  {Array.isArray(filter.value) ? filter.value.join(', ') : filter.value}
                </span>
                <button
                  onClick={() => removeFilter(index)}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdvancedSearchFilter;