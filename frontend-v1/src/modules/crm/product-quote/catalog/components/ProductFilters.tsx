// ProductFilters - Sprint 19 Frontend Implementation

import React, { useState, useCallback } from 'react';
import {
  ChevronDown,
  ChevronUp,
  X,
  Filter,
  Search,
  DollarSign,
  Package,
  Tag,
  RotateCcw
} from 'lucide-react';

import { ProductFiltersProps, ProductFilters as IProductFilters } from '../../../shared/types';

interface FilterSectionProps {
  title: string;
  icon: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  count?: number;
}

const FilterSection: React.FC<FilterSectionProps> = ({
  title,
  icon,
  isExpanded,
  onToggle,
  children,
  count
}) => (
  <div className="border-b border-gray-200 last:border-b-0">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
    >
      <div className="flex items-center space-x-2">
        {icon}
        <span className="font-medium text-gray-900">{title}</span>
        {count !== undefined && (
          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
            {count}
          </span>
        )}
      </div>
      {isExpanded ? (
        <ChevronUp className="h-4 w-4 text-gray-500" />
      ) : (
        <ChevronDown className="h-4 w-4 text-gray-500" />
      )}
    </button>
    {isExpanded && (
      <div className="px-3 pb-3">
        {children}
      </div>
    )}
  </div>
);

interface PriceRangeSliderProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  step?: number;
}

const PriceRangeSlider: React.FC<PriceRangeSliderProps> = ({
  min,
  max,
  value,
  onChange,
  step = 1
}) => {
  const [localValue, setLocalValue] = useState(value);

  const handleMinChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newMin = Math.min(parseInt(e.target.value), localValue[1] - step);
    const newValue: [number, number] = [newMin, localValue[1]];
    setLocalValue(newValue);
    onChange(newValue);
  }, [localValue, onChange, step]);

  const handleMaxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = Math.max(parseInt(e.target.value), localValue[0] + step);
    const newValue: [number, number] = [localValue[0], newMax];
    setLocalValue(newValue);
    onChange(newValue);
  }, [localValue, onChange, step]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>{formatPrice(localValue[0])}</span>
        <span>{formatPrice(localValue[1])}</span>
      </div>

      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          value={localValue[0]}
          onChange={handleMinChange}
          className="absolute w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
          style={{ zIndex: 1 }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={localValue[1]}
          onChange={handleMaxChange}
          className="absolute w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
          style={{ zIndex: 2 }}
        />
        <div className="relative h-2 bg-gray-200 rounded-lg">
          <div
            className="absolute h-full bg-blue-500 rounded-lg"
            style={{
              left: `${((localValue[0] - min) / (max - min)) * 100}%`,
              right: `${100 - ((localValue[1] - min) / (max - min)) * 100}%`
            }}
          />
        </div>
      </div>

      <div className="flex space-x-2">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Min</label>
          <input
            type="number"
            value={localValue[0]}
            onChange={(e) => {
              const newValue: [number, number] = [parseInt(e.target.value) || 0, localValue[1]];
              setLocalValue(newValue);
              onChange(newValue);
            }}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Max</label>
          <input
            type="number"
            value={localValue[1]}
            onChange={(e) => {
              const newValue: [number, number] = [localValue[0], parseInt(e.target.value) || 0];
              setLocalValue(newValue);
              onChange(newValue);
            }}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );
};

const ProductFilters: React.FC<ProductFiltersProps> = ({
  filters,
  categories,
  availableTags,
  onFiltersChange,
  onClearFilters,
  loading = false
}) => {
  const [expandedSections, setExpandedSections] = useState({
    categories: true,
    status: true,
    type: false,
    price: false,
    stock: false,
    other: false
  });

  // Toggle section expansion
  const toggleSection = useCallback((section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  // Handle filter changes
  const handleFilterChange = useCallback((key: keyof IProductFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    onFiltersChange(newFilters);
  }, [filters, onFiltersChange]);

  // Handle array filter toggle (for checkboxes)
  const handleArrayFilterToggle = useCallback((key: keyof IProductFilters, value: string | number) => {
    const currentArray = filters[key] as any[];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];

    handleFilterChange(key, newArray);
  }, [filters, handleFilterChange]);

  // Count active filters
  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.categories.length > 0) count++;
    if (filters.status.length > 0) count++;
    if (filters.type.length > 0) count++;
    if (filters.tags.length > 0) count++;
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 10000) count++;
    if (filters.inStock) count++;
    if (filters.hasImages) count++;
    if (filters.search.trim()) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  const statusOptions = [
    { value: 'active', label: 'Active', count: 0 },
    { value: 'inactive', label: 'Inactive', count: 0 },
    { value: 'discontinued', label: 'Discontinued', count: 0 }
  ];

  const typeOptions = [
    { value: 'simple', label: 'Simple Product', count: 0 },
    { value: 'variable', label: 'Variable Product', count: 0 },
    { value: 'grouped', label: 'Grouped Product', count: 0 },
    { value: 'external', label: 'External Product', count: 0 }
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded" />
              <div className="h-3 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-600" />
            <h3 className="font-medium text-gray-900">Filters</h3>
            {activeFilterCount > 0 && (
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={onClearFilters}
              className="text-sm text-blue-600 hover:text-blue-500 flex items-center space-x-1"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Clear all</span>
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
            placeholder="Search products..."
          />
        </div>
      </div>

      {/* Filter Sections */}
      <div>
        {/* Categories */}
        <FilterSection
          title="Categories"
          icon={<Tag className="h-4 w-4 text-gray-600" />}
          isExpanded={expandedSections.categories}
          onToggle={() => toggleSection('categories')}
          count={filters.categories.length}
        >
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {categories.map(category => (
              <label key={category.id} className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.categories.includes(category.id)}
                  onChange={() => handleArrayFilterToggle('categories', category.id)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700 flex-1">
                  {category.name}
                </span>
                {category.productCount > 0 && (
                  <span className="text-xs text-gray-500">
                    ({category.productCount})
                  </span>
                )}
              </label>
            ))}
          </div>
        </FilterSection>

        {/* Status */}
        <FilterSection
          title="Status"
          icon={<Package className="h-4 w-4 text-gray-600" />}
          isExpanded={expandedSections.status}
          onToggle={() => toggleSection('status')}
          count={filters.status.length}
        >
          <div className="space-y-2">
            {statusOptions.map(option => (
              <label key={option.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.status.includes(option.value)}
                  onChange={() => handleArrayFilterToggle('status', option.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700 capitalize">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </FilterSection>

        {/* Product Type */}
        <FilterSection
          title="Product Type"
          icon={<Package className="h-4 w-4 text-gray-600" />}
          isExpanded={expandedSections.type}
          onToggle={() => toggleSection('type')}
          count={filters.type.length}
        >
          <div className="space-y-2">
            {typeOptions.map(option => (
              <label key={option.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.type.includes(option.value)}
                  onChange={() => handleArrayFilterToggle('type', option.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </FilterSection>

        {/* Price Range */}
        <FilterSection
          title="Price Range"
          icon={<DollarSign className="h-4 w-4 text-gray-600" />}
          isExpanded={expandedSections.price}
          onToggle={() => toggleSection('price')}
        >
          <PriceRangeSlider
            min={0}
            max={10000}
            value={filters.priceRange}
            onChange={(value) => handleFilterChange('priceRange', value)}
            step={10}
          />
        </FilterSection>

        {/* Stock & Availability */}
        <FilterSection
          title="Stock & Availability"
          icon={<Package className="h-4 w-4 text-gray-600" />}
          isExpanded={expandedSections.stock}
          onToggle={() => toggleSection('stock')}
        >
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.inStock}
                onChange={(e) => handleFilterChange('inStock', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                In stock only
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.hasImages}
                onChange={(e) => handleFilterChange('hasImages', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                Has images
              </span>
            </label>
          </div>
        </FilterSection>

        {/* Tags */}
        {availableTags.length > 0 && (
          <FilterSection
            title="Tags"
            icon={<Tag className="h-4 w-4 text-gray-600" />}
            isExpanded={expandedSections.other}
            onToggle={() => toggleSection('other')}
            count={filters.tags.length}
          >
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {availableTags.map(tag => (
                <label key={tag} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.tags.includes(tag)}
                    onChange={() => handleArrayFilterToggle('tags', tag)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {tag}
                  </span>
                </label>
              ))}
            </div>
          </FilterSection>
        )}
      </div>

      {/* Footer */}
      {activeFilterCount > 0 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} applied
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductFilters;