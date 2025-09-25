// useProductFilters Hook - Sprint 19 Frontend Implementation

import { useState, useCallback, useMemo, useEffect } from 'react';
import { ProductFilters, Category, ProductFacet } from '../../../shared/types';

interface FilterOption {
  value: string | number;
  label: string;
  count?: number;
  selected: boolean;
}

interface FilterGroup {
  key: keyof ProductFilters;
  label: string;
  type: 'checkbox' | 'radio' | 'range' | 'search';
  options: FilterOption[];
  expanded: boolean;
}

interface UseProductFiltersOptions {
  initialFilters?: Partial<ProductFilters>;
  categories?: Category[];
  facets?: ProductFacet[];
  enableUrlSync?: boolean;
  storageKey?: string;
}

interface UseProductFiltersReturn {
  // Current filters
  filters: ProductFilters;

  // Filter groups for UI
  filterGroups: FilterGroup[];

  // Active filter count
  activeFilterCount: number;
  hasActiveFilters: boolean;

  // Actions
  setFilter: (key: keyof ProductFilters, value: any) => void;
  toggleFilter: (key: keyof ProductFilters, value: string | number) => void;
  setPriceRange: (min: number, max: number) => void;
  setSearchFilter: (query: string) => void;
  clearFilter: (key: keyof ProductFilters) => void;
  clearAllFilters: () => void;
  resetToDefaults: () => void;

  // Group management
  toggleGroup: (groupKey: keyof ProductFilters) => void;
  expandGroup: (groupKey: keyof ProductFilters) => void;
  collapseGroup: (groupKey: keyof ProductFilters) => void;

  // Utilities
  getFilterValue: (key: keyof ProductFilters) => any;
  isFilterActive: (key: keyof ProductFilters, value?: any) => boolean;
  getFilterSummary: () => string[];

  // Persistence
  saveToStorage: () => void;
  loadFromStorage: () => void;
  getUrlParams: () => URLSearchParams;
  loadFromUrl: (searchParams: URLSearchParams) => void;
}

const defaultFilters: ProductFilters = {
  categories: [],
  status: [],
  type: [],
  tags: [],
  priceRange: [0, 10000],
  inStock: false,
  hasImages: false,
  search: ''
};

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'discontinued', label: 'Discontinued' }
];

const typeOptions = [
  { value: 'simple', label: 'Simple Product' },
  { value: 'variable', label: 'Variable Product' },
  { value: 'grouped', label: 'Grouped Product' },
  { value: 'external', label: 'External Product' }
];

export const useProductFilters = (options: UseProductFiltersOptions = {}): UseProductFiltersReturn => {
  const {
    initialFilters = {},
    categories = [],
    facets = [],
    enableUrlSync = false,
    storageKey = 'product-filters'
  } = options;

  // State
  const [filters, setFilters] = useState<ProductFilters>({
    ...defaultFilters,
    ...initialFilters
  });

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    categories: true,
    status: true,
    type: false,
    tags: false,
    priceRange: false,
    other: false
  });

  // Load filters from localStorage on mount
  useEffect(() => {
    if (!enableUrlSync) {
      loadFromStorage();
    }
  }, []);

  // Load filters from URL on mount
  useEffect(() => {
    if (enableUrlSync && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      loadFromUrl(urlParams);
    }
  }, [enableUrlSync]);

  // Save to localStorage when filters change
  useEffect(() => {
    if (!enableUrlSync) {
      saveToStorage();
    }
  }, [filters, enableUrlSync]);

  // Update URL when filters change
  useEffect(() => {
    if (enableUrlSync && typeof window !== 'undefined') {
      const urlParams = getUrlParams();
      const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [filters, enableUrlSync]);

  // Build category options from categories
  const categoryOptions = useMemo((): FilterOption[] => {
    return categories.map(category => ({
      value: category.id,
      label: category.name,
      count: category.productCount,
      selected: filters.categories.includes(category.id)
    }));
  }, [categories, filters.categories]);

  // Build tag options from facets
  const tagOptions = useMemo((): FilterOption[] => {
    const tagFacet = facets.find(f => f.name === 'tags');
    if (!tagFacet) return [];

    return tagFacet.values.map(value => ({
      value: value.value,
      label: value.value,
      count: value.count,
      selected: filters.tags.includes(value.value)
    }));
  }, [facets, filters.tags]);

  // Build filter groups for UI
  const filterGroups = useMemo((): FilterGroup[] => {
    return [
      {
        key: 'categories',
        label: 'Categories',
        type: 'checkbox',
        options: categoryOptions,
        expanded: expandedGroups.categories
      },
      {
        key: 'status',
        label: 'Status',
        type: 'checkbox',
        options: statusOptions.map(opt => ({
          ...opt,
          selected: filters.status.includes(opt.value)
        })),
        expanded: expandedGroups.status
      },
      {
        key: 'type',
        label: 'Product Type',
        type: 'checkbox',
        options: typeOptions.map(opt => ({
          ...opt,
          selected: filters.type.includes(opt.value)
        })),
        expanded: expandedGroups.type
      },
      {
        key: 'tags',
        label: 'Tags',
        type: 'checkbox',
        options: tagOptions,
        expanded: expandedGroups.tags
      },
      {
        key: 'priceRange',
        label: 'Price Range',
        type: 'range',
        options: [],
        expanded: expandedGroups.priceRange
      }
    ];
  }, [categoryOptions, tagOptions, filters, expandedGroups]);

  // Calculate active filter count
  const activeFilterCount = useMemo((): number => {
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
  }, [filters]);

  const hasActiveFilters = activeFilterCount > 0;

  // Filter actions
  const setFilter = useCallback((key: keyof ProductFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleFilter = useCallback((key: keyof ProductFilters, value: string | number) => {
    setFilters(prev => {
      const currentValue = prev[key];

      if (Array.isArray(currentValue)) {
        const exists = currentValue.includes(value);
        if (exists) {
          return { ...prev, [key]: currentValue.filter(v => v !== value) };
        } else {
          return { ...prev, [key]: [...currentValue, value] };
        }
      } else if (typeof currentValue === 'boolean') {
        return { ...prev, [key]: !currentValue };
      }

      return prev;
    });
  }, []);

  const setPriceRange = useCallback((min: number, max: number) => {
    setFilters(prev => ({ ...prev, priceRange: [min, max] }));
  }, []);

  const setSearchFilter = useCallback((query: string) => {
    setFilters(prev => ({ ...prev, search: query }));
  }, []);

  const clearFilter = useCallback((key: keyof ProductFilters) => {
    setFilters(prev => {
      const defaultValue = defaultFilters[key];
      return { ...prev, [key]: defaultValue };
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  const resetToDefaults = useCallback(() => {
    setFilters({ ...defaultFilters, ...initialFilters });
  }, [initialFilters]);

  // Group management
  const toggleGroup = useCallback((groupKey: keyof ProductFilters) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  }, []);

  const expandGroup = useCallback((groupKey: keyof ProductFilters) => {
    setExpandedGroups(prev => ({ ...prev, [groupKey]: true }));
  }, []);

  const collapseGroup = useCallback((groupKey: keyof ProductFilters) => {
    setExpandedGroups(prev => ({ ...prev, [groupKey]: false }));
  }, []);

  // Utilities
  const getFilterValue = useCallback((key: keyof ProductFilters) => {
    return filters[key];
  }, [filters]);

  const isFilterActive = useCallback((key: keyof ProductFilters, value?: any) => {
    const filterValue = filters[key];

    if (value === undefined) {
      // Check if filter has any active values
      if (Array.isArray(filterValue)) {
        return filterValue.length > 0;
      } else if (typeof filterValue === 'boolean') {
        return filterValue;
      } else if (key === 'priceRange') {
        const [min, max] = filterValue as [number, number];
        return min > 0 || max < 10000;
      } else if (typeof filterValue === 'string') {
        return filterValue.trim() !== '';
      }
    } else {
      // Check if specific value is active
      if (Array.isArray(filterValue)) {
        return filterValue.includes(value);
      } else {
        return filterValue === value;
      }
    }

    return false;
  }, [filters]);

  const getFilterSummary = useCallback((): string[] => {
    const summary: string[] = [];

    if (filters.categories.length > 0) {
      const categoryNames = filters.categories
        .map(id => categories.find(c => c.id === id)?.name)
        .filter(Boolean);
      summary.push(`Categories: ${categoryNames.join(', ')}`);
    }

    if (filters.status.length > 0) {
      summary.push(`Status: ${filters.status.join(', ')}`);
    }

    if (filters.type.length > 0) {
      summary.push(`Type: ${filters.type.join(', ')}`);
    }

    if (filters.tags.length > 0) {
      summary.push(`Tags: ${filters.tags.join(', ')}`);
    }

    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 10000) {
      summary.push(`Price: $${filters.priceRange[0]} - $${filters.priceRange[1]}`);
    }

    if (filters.inStock) {
      summary.push('In Stock Only');
    }

    if (filters.hasImages) {
      summary.push('With Images Only');
    }

    if (filters.search.trim()) {
      summary.push(`Search: "${filters.search}"`);
    }

    return summary;
  }, [filters, categories]);

  // Persistence functions
  const saveToStorage = useCallback(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(filters));
    } catch (error) {
      console.warn('Failed to save filters to localStorage:', error);
    }
  }, [filters, storageKey]);

  const loadFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsedFilters = JSON.parse(stored);
        setFilters({ ...defaultFilters, ...parsedFilters });
      }
    } catch (error) {
      console.warn('Failed to load filters from localStorage:', error);
    }
  }, [storageKey]);

  const getUrlParams = useCallback((): URLSearchParams => {
    const params = new URLSearchParams();

    if (filters.categories.length > 0) {
      params.set('categories', filters.categories.join(','));
    }
    if (filters.status.length > 0) {
      params.set('status', filters.status.join(','));
    }
    if (filters.type.length > 0) {
      params.set('type', filters.type.join(','));
    }
    if (filters.tags.length > 0) {
      params.set('tags', filters.tags.join(','));
    }
    if (filters.priceRange[0] > 0) {
      params.set('minPrice', filters.priceRange[0].toString());
    }
    if (filters.priceRange[1] < 10000) {
      params.set('maxPrice', filters.priceRange[1].toString());
    }
    if (filters.inStock) {
      params.set('inStock', 'true');
    }
    if (filters.hasImages) {
      params.set('hasImages', 'true');
    }
    if (filters.search.trim()) {
      params.set('search', filters.search);
    }

    return params;
  }, [filters]);

  const loadFromUrl = useCallback((searchParams: URLSearchParams) => {
    const newFilters: Partial<ProductFilters> = {};

    const categories = searchParams.get('categories');
    if (categories) {
      newFilters.categories = categories.split(',').map(Number).filter(Boolean);
    }

    const status = searchParams.get('status');
    if (status) {
      newFilters.status = status.split(',');
    }

    const type = searchParams.get('type');
    if (type) {
      newFilters.type = type.split(',');
    }

    const tags = searchParams.get('tags');
    if (tags) {
      newFilters.tags = tags.split(',');
    }

    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    if (minPrice || maxPrice) {
      newFilters.priceRange = [
        minPrice ? parseInt(minPrice) : 0,
        maxPrice ? parseInt(maxPrice) : 10000
      ];
    }

    newFilters.inStock = searchParams.get('inStock') === 'true';
    newFilters.hasImages = searchParams.get('hasImages') === 'true';

    const search = searchParams.get('search');
    if (search) {
      newFilters.search = search;
    }

    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  return {
    // Current filters
    filters,

    // Filter groups for UI
    filterGroups,

    // Active filter count
    activeFilterCount,
    hasActiveFilters,

    // Actions
    setFilter,
    toggleFilter,
    setPriceRange,
    setSearchFilter,
    clearFilter,
    clearAllFilters,
    resetToDefaults,

    // Group management
    toggleGroup,
    expandGroup,
    collapseGroup,

    // Utilities
    getFilterValue,
    isFilterActive,
    getFilterSummary,

    // Persistence
    saveToStorage,
    loadFromStorage,
    getUrlParams,
    loadFromUrl
  };
};

export default useProductFilters;