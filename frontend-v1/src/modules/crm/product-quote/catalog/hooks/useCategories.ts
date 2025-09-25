// useCategories Hook - Sprint 19 Frontend Implementation

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Category, DragDropResult } from '../../../shared/types';
import { categoryService } from '../services/categoryService';

interface UseCategoriesOptions {
  enableDragDrop?: boolean;
  autoExpand?: boolean;
  showProductCounts?: boolean;
}

interface UseCategoriesReturn {
  // Data
  categories: Category[];
  categoryTree: Category[];
  flatCategories: Category[];
  selectedCategory: Category | null;
  expandedCategories: number[];

  // State
  loading: boolean;
  error: string | null;
  dragDropEnabled: boolean;

  // Actions
  selectCategory: (category: Category | null) => void;
  expandCategory: (categoryId: number) => void;
  collapseCategory: (categoryId: number) => void;
  toggleCategory: (categoryId: number) => void;
  expandAll: () => void;
  collapseAll: () => void;

  // CRUD Operations
  createCategory: (data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Category>;
  updateCategory: (id: number, data: Partial<Category>) => Promise<Category>;
  deleteCategory: (id: number) => Promise<void>;
  moveCategory: (result: DragDropResult) => Promise<void>;

  // Tree operations
  getParentCategories: (categoryId: number) => Category[];
  getChildCategories: (categoryId: number) => Category[];
  getCategoryPath: (categoryId: number) => Category[];
  isCategoryExpanded: (categoryId: number) => boolean;
  hasChildren: (categoryId: number) => boolean;

  // Utilities
  refreshCategories: () => void;
  findCategory: (id: number) => Category | undefined;
  getCategoryLevel: (categoryId: number) => number;
}

export const useCategories = (options: UseCategoriesOptions = {}): UseCategoriesReturn => {
  const queryClient = useQueryClient();

  const {
    enableDragDrop = true,
    autoExpand = false,
    showProductCounts = true
  } = options;

  // State
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<number[]>([]);

  // Query for categories
  const {
    data: categories = [],
    isLoading: loading,
    error: queryError,
    refetch
  } = useQuery({
    queryKey: ['categories', { showProductCounts }],
    queryFn: () => categoryService.getCategories({ includeProductCounts: showProductCounts }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: (data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) =>
      categoryService.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    }
  });

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Category> }) =>
      categoryService.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    }
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => categoryService.deleteCategory(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      // Clear selection if deleted category was selected
      if (selectedCategory?.id === deletedId) {
        setSelectedCategory(null);
      }
      // Remove from expanded categories
      setExpandedCategories(prev => prev.filter(id => id !== deletedId));
    }
  });

  // Move category mutation (drag & drop)
  const moveCategoryMutation = useMutation({
    mutationFn: ({ categoryId, newParentId }: { categoryId: number; newParentId: number | null }) =>
      categoryService.moveCategory(categoryId, newParentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    }
  });

  // Build category tree from flat list
  const categoryTree = useMemo((): Category[] => {
    const buildTree = (parentId: number | null = null): Category[] => {
      return categories
        .filter(cat => cat.parentId === parentId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(category => ({
          ...category,
          children: buildTree(category.id)
        }));
    };

    return buildTree();
  }, [categories]);

  // Flat categories for easy searching
  const flatCategories = useMemo(() => categories, [categories]);

  // Error handling
  const error = queryError?.message || null;

  // Auto-expand root categories
  useState(() => {
    if (autoExpand && categories.length > 0) {
      const rootCategories = categories
        .filter(cat => !cat.parentId)
        .map(cat => cat.id);
      setExpandedCategories(rootCategories);
    }
  });

  // Selection actions
  const selectCategory = useCallback((category: Category | null) => {
    setSelectedCategory(category);
  }, []);

  // Expansion actions
  const expandCategory = useCallback((categoryId: number) => {
    setExpandedCategories(prev => {
      if (!prev.includes(categoryId)) {
        return [...prev, categoryId];
      }
      return prev;
    });
  }, []);

  const collapseCategory = useCallback((categoryId: number) => {
    setExpandedCategories(prev => prev.filter(id => id !== categoryId));
  }, []);

  const toggleCategory = useCallback((categoryId: number) => {
    setExpandedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  }, []);

  const expandAll = useCallback(() => {
    const allCategoryIds = categories.map(cat => cat.id);
    setExpandedCategories(allCategoryIds);
  }, [categories]);

  const collapseAll = useCallback(() => {
    setExpandedCategories([]);
  }, []);

  // CRUD operations
  const createCategory = useCallback(async (data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> => {
    return createCategoryMutation.mutateAsync(data);
  }, [createCategoryMutation]);

  const updateCategory = useCallback(async (id: number, data: Partial<Category>): Promise<Category> => {
    return updateCategoryMutation.mutateAsync({ id, data });
  }, [updateCategoryMutation]);

  const deleteCategory = useCallback(async (id: number): Promise<void> => {
    return deleteCategoryMutation.mutateAsync(id);
  }, [deleteCategoryMutation]);

  const moveCategory = useCallback(async (result: DragDropResult): Promise<void> => {
    if (!enableDragDrop) return;

    const categoryId = parseInt(result.sourceId);
    const newParentId = result.destinationId ? parseInt(result.destinationId) : null;

    return moveCategoryMutation.mutateAsync({ categoryId, newParentId });
  }, [enableDragDrop, moveCategoryMutation]);

  // Tree utility functions
  const findCategory = useCallback((id: number): Category | undefined => {
    return categories.find(cat => cat.id === id);
  }, [categories]);

  const getParentCategories = useCallback((categoryId: number): Category[] => {
    const category = findCategory(categoryId);
    if (!category || !category.parentId) return [];

    const parent = findCategory(category.parentId);
    if (!parent) return [];

    return [parent, ...getParentCategories(parent.id)];
  }, [findCategory]);

  const getChildCategories = useCallback((categoryId: number): Category[] => {
    return categories.filter(cat => cat.parentId === categoryId);
  }, [categories]);

  const getCategoryPath = useCallback((categoryId: number): Category[] => {
    const category = findCategory(categoryId);
    if (!category) return [];

    const parents = getParentCategories(categoryId).reverse();
    return [...parents, category];
  }, [findCategory, getParentCategories]);

  const isCategoryExpanded = useCallback((categoryId: number): boolean => {
    return expandedCategories.includes(categoryId);
  }, [expandedCategories]);

  const hasChildren = useCallback((categoryId: number): boolean => {
    return categories.some(cat => cat.parentId === categoryId);
  }, [categories]);

  const getCategoryLevel = useCallback((categoryId: number): number => {
    const category = findCategory(categoryId);
    return category?.level || 0;
  }, [findCategory]);

  const refreshCategories = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    // Data
    categories: flatCategories,
    categoryTree,
    flatCategories,
    selectedCategory,
    expandedCategories,

    // State
    loading,
    error,
    dragDropEnabled: enableDragDrop,

    // Actions
    selectCategory,
    expandCategory,
    collapseCategory,
    toggleCategory,
    expandAll,
    collapseAll,

    // CRUD Operations
    createCategory,
    updateCategory,
    deleteCategory,
    moveCategory,

    // Tree operations
    getParentCategories,
    getChildCategories,
    getCategoryPath,
    isCategoryExpanded,
    hasChildren,

    // Utilities
    refreshCategories,
    findCategory,
    getCategoryLevel
  };
};

export default useCategories;