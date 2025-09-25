// CategorySidebar - Sprint 19 Frontend Implementation

import React, { useState, useCallback } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Search,
  Filter,
  RotateCcw,
  Plus
} from 'lucide-react';

import { Category } from '../../../shared/types';

interface CategorySidebarProps {
  categories: Category[];
  selectedCategory?: Category | null;
  onSelectCategory: (category: Category | null) => void;
  onCreateCategory?: () => void;
  loading?: boolean;
  compact?: boolean;
}

interface CategoryItemProps {
  category: Category;
  level: number;
  isSelected: boolean;
  isExpanded: boolean;
  hasChildren: boolean;
  onSelect: (category: Category) => void;
  onToggle: (categoryId: number) => void;
  compact: boolean;
}

const CategoryItem: React.FC<CategoryItemProps> = ({
  category,
  level,
  isSelected,
  isExpanded,
  hasChildren,
  onSelect,
  onToggle,
  compact
}) => {
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(category);
  }, [category, onSelect]);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      onToggle(category.id);
    }
  }, [category.id, hasChildren, onToggle]);

  const indentLevel = level * (compact ? 12 : 16);

  return (
    <div
      className={`flex items-center py-2 px-3 cursor-pointer rounded-md transition-colors hover:bg-gray-50 ${
        isSelected ? 'bg-blue-50 border-r-2 border-blue-500 text-blue-700' : 'text-gray-700'
      }`}
      style={{ paddingLeft: `${12 + indentLevel}px` }}
      onClick={handleClick}
    >
      {/* Expand/collapse button */}
      <button
        onClick={handleToggle}
        className={`mr-2 p-0.5 rounded hover:bg-gray-200 transition-colors ${
          hasChildren ? 'visible' : 'invisible'
        }`}
      >
        {hasChildren && isExpanded ? (
          <ChevronDown className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} text-gray-600`} />
        ) : (
          <ChevronRight className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} text-gray-600`} />
        )}
      </button>

      {/* Category icon */}
      <div className="mr-2">
        {hasChildren ? (
          isExpanded ? (
            <FolderOpen className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} text-blue-600`} />
          ) : (
            <Folder className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} text-blue-600`} />
          )
        ) : (
          <Folder className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} text-gray-400`} />
        )}
      </div>

      {/* Category name */}
      <span className={`flex-1 ${compact ? 'text-xs' : 'text-sm'} truncate ${
        isSelected ? 'font-medium' : ''
      }`}>
        {category.name}
      </span>

      {/* Product count */}
      {!compact && category.productCount > 0 && (
        <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full ml-2">
          {category.productCount}
        </span>
      )}

      {/* Status indicator */}
      {!category.isActive && (
        <div className={`${compact ? 'w-1.5 h-1.5' : 'w-2 h-2'} bg-red-400 rounded-full ml-2`} />
      )}
    </div>
  );
};

const CategorySidebar: React.FC<CategorySidebarProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  onCreateCategory,
  loading = false,
  compact = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<number[]>([]);

  // Filter categories based on search
  const filteredCategories = searchQuery
    ? categories.filter(cat =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : categories;

  // Build tree structure
  const buildTree = useCallback((parentId: number | null = null): Category[] => {
    return filteredCategories
      .filter(cat => cat.parentId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [filteredCategories]);

  // Check if category has children
  const hasChildren = useCallback((categoryId: number): boolean => {
    return filteredCategories.some(cat => cat.parentId === categoryId);
  }, [filteredCategories]);

  // Check if category is expanded
  const isExpanded = useCallback((categoryId: number): boolean => {
    return expandedCategories.includes(categoryId);
  }, [expandedCategories]);

  // Handle category selection
  const handleSelectCategory = useCallback((category: Category) => {
    const isCurrentlySelected = selectedCategory?.id === category.id;
    onSelectCategory(isCurrentlySelected ? null : category);
  }, [onSelectCategory, selectedCategory]);

  // Handle category toggle
  const handleToggleCategory = useCallback((categoryId: number) => {
    setExpandedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  }, []);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    // Expand all categories when searching
    if (query) {
      const allCategoryIds = categories.map(cat => cat.id);
      setExpandedCategories(allCategoryIds);
    }
  }, [categories]);

  // Handle clear selection
  const handleClearSelection = useCallback(() => {
    onSelectCategory(null);
  }, [onSelectCategory]);

  // Expand all categories
  const expandAll = useCallback(() => {
    const allCategoryIds = categories.map(cat => cat.id);
    setExpandedCategories(allCategoryIds);
  }, [categories]);

  // Collapse all categories
  const collapseAll = useCallback(() => {
    setExpandedCategories([]);
  }, []);

  // Render tree recursively
  const renderTree = useCallback((parentCategories: Category[], level: number = 0): React.ReactNode => {
    return parentCategories.map(category => {
      const children = buildTree(category.id);
      const hasChildCategories = hasChildren(category.id);
      const expanded = isExpanded(category.id);

      return (
        <div key={category.id}>
          <CategoryItem
            category={category}
            level={level}
            isSelected={selectedCategory?.id === category.id}
            isExpanded={expanded}
            hasChildren={hasChildCategories}
            onSelect={handleSelectCategory}
            onToggle={handleToggleCategory}
            compact={compact}
          />
          {hasChildCategories && expanded && (
            <div>
              {renderTree(children, level + 1)}
            </div>
          )}
        </div>
      );
    });
  }, [
    buildTree,
    hasChildren,
    isExpanded,
    selectedCategory,
    handleSelectCategory,
    handleToggleCategory,
    compact
  ]);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center py-2 px-3 animate-pulse">
            <div className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} bg-gray-200 rounded mr-2`} />
            <div className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} bg-gray-200 rounded mr-2`} />
            <div className="flex-1 h-4 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const rootCategories = buildTree();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className={`font-medium text-gray-900 ${compact ? 'text-sm' : 'text-base'}`}>
          Categories
        </h3>
        {onCreateCategory && (
          <button
            onClick={onCreateCategory}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            title="Add category"
          >
            <Plus className={`${compact ? 'h-3 w-3' : 'h-4 w-4'}`} />
          </button>
        )}
      </div>

      {/* Search */}
      {!compact && (
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
            placeholder="Search categories..."
          />
        </div>
      )}

      {/* Actions */}
      {!compact && (
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-2">
            <button
              onClick={expandAll}
              className="hover:text-gray-700"
            >
              Expand all
            </button>
            <span>•</span>
            <button
              onClick={collapseAll}
              className="hover:text-gray-700"
            >
              Collapse all
            </button>
          </div>
          {selectedCategory && (
            <button
              onClick={handleClearSelection}
              className="flex items-center space-x-1 hover:text-gray-700"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Clear</span>
            </button>
          )}
        </div>
      )}

      {/* Selected category info */}
      {selectedCategory && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-blue-600" />
            <span className={`font-medium text-blue-900 ${compact ? 'text-xs' : 'text-sm'}`}>
              Filtered by category
            </span>
          </div>
          <div className={`mt-1 ${compact ? 'text-xs' : 'text-sm'} text-blue-700`}>
            {selectedCategory.name}
            {selectedCategory.productCount > 0 && (
              <span className="text-blue-600">
                {' '}({selectedCategory.productCount} products)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Category tree */}
      <div className="space-y-1 max-h-96 overflow-y-auto">
        {rootCategories.length > 0 ? (
          renderTree(rootCategories)
        ) : searchQuery ? (
          <div className="text-center py-4">
            <div className={`text-gray-500 ${compact ? 'text-xs' : 'text-sm'}`}>
              No categories found for "{searchQuery}"
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <Folder className={`${compact ? 'h-8 w-8' : 'h-12 w-12'} text-gray-400 mx-auto mb-2`} />
            <div className={`text-gray-500 ${compact ? 'text-xs' : 'text-sm'}`}>
              No categories
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {!compact && categories.length > 0 && (
        <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
          {categories.length} categories total
          {selectedCategory && ` • ${selectedCategory.productCount} products in selection`}
        </div>
      )}
    </div>
  );
};

export default CategorySidebar;