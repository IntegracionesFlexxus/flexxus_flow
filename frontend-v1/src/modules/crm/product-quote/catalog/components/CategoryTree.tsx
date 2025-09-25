// CategoryTree - Sprint 19 Frontend Implementation

import React, { useState, useCallback, useRef } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Plus,
  Edit,
  Trash2,
  Move,
  MoreVertical,
  GripVertical
} from 'lucide-react';

import { Category, CategoryTreeProps, DragDropResult } from '../../../shared/types';

interface TreeNodeProps {
  category: Category;
  level: number;
  isSelected: boolean;
  isExpanded: boolean;
  hasChildren: boolean;
  onSelect: (category: Category) => void;
  onToggle: (categoryId: number) => void;
  onEdit?: (category: Category) => void;
  onDelete?: (category: Category) => void;
  onMove?: (result: DragDropResult) => void;
  showProductCounts: boolean;
  isDragging?: boolean;
  dragOverPosition?: 'before' | 'after' | 'inside' | null;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  category,
  level,
  isSelected,
  isExpanded,
  hasChildren,
  onSelect,
  onToggle,
  onEdit,
  onDelete,
  onMove,
  showProductCounts,
  isDragging = false,
  dragOverPosition = null
}) => {
  const [showActions, setShowActions] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);

  // Handle click
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(category);
  }, [category, onSelect]);

  // Handle toggle
  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      onToggle(category.id);
    }
  }, [category.id, hasChildren, onToggle]);

  // Handle edit
  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(category);
    }
  }, [category, onEdit]);

  // Handle delete
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(category);
    }
  }, [category, onDelete]);

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', category.id.toString());
    e.dataTransfer.effectAllowed = 'move';
  }, [category.id]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const draggedId = e.dataTransfer.getData('text/plain');
    if (draggedId && onMove && draggedId !== category.id.toString()) {
      const result: DragDropResult = {
        sourceId: draggedId,
        destinationId: category.id.toString(),
        sourceIndex: 0, // Not used in tree context
        destinationIndex: 0 // Not used in tree context
      };
      onMove(result);
    }
  }, [category.id, onMove]);

  const indentLevel = level * 20;

  return (
    <div
      ref={nodeRef}
      className={`relative ${isDragging ? 'opacity-50' : ''} ${
        isDragOver ? 'bg-blue-50' : ''
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Drop indicators */}
      {dragOverPosition === 'before' && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500 z-10" />
      )}
      {dragOverPosition === 'after' && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 z-10" />
      )}
      {dragOverPosition === 'inside' && (
        <div className="absolute inset-0 border-2 border-blue-500 border-dashed rounded bg-blue-50 opacity-50 z-10" />
      )}

      <div
        className={`flex items-center py-2 px-3 hover:bg-gray-50 cursor-pointer rounded-md transition-colors ${
          isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
        }`}
        style={{ paddingLeft: `${12 + indentLevel}px` }}
        onClick={handleClick}
        draggable={onMove !== undefined}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag handle */}
        {onMove && (
          <div
            ref={dragRef}
            className="mr-2 cursor-move opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <GripVertical className="h-4 w-4 text-gray-400" />
          </div>
        )}

        {/* Expand/collapse button */}
        <button
          onClick={handleToggle}
          className={`mr-2 p-0.5 rounded hover:bg-gray-200 transition-colors ${
            hasChildren ? 'visible' : 'invisible'
          }`}
        >
          {hasChildren && isExpanded ? (
            <ChevronDown className="h-4 w-4 text-gray-600" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-600" />
          )}
        </button>

        {/* Category icon */}
        <div className="mr-2">
          {hasChildren ? (
            isExpanded ? (
              <FolderOpen className="h-4 w-4 text-blue-600" />
            ) : (
              <Folder className="h-4 w-4 text-blue-600" />
            )
          ) : (
            <Folder className="h-4 w-4 text-gray-400" />
          )}
        </div>

        {/* Category name */}
        <span
          className={`flex-1 text-sm ${
            isSelected ? 'font-medium text-blue-900' : 'text-gray-900'
          }`}
        >
          {category.name}
        </span>

        {/* Product count */}
        {showProductCounts && category.productCount > 0 && (
          <span className="mr-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {category.productCount}
          </span>
        )}

        {/* Status indicator */}
        {!category.isActive && (
          <span className="mr-2 text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
            Inactive
          </span>
        )}

        {/* Actions */}
        <div className={`flex items-center space-x-1 transition-opacity ${
          showActions || isSelected ? 'opacity-100' : 'opacity-0'
        }`}>
          {onEdit && (
            <button
              onClick={handleEdit}
              className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-200"
              title="Edit category"
            >
              <Edit className="h-3 w-3" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={handleDelete}
              className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-gray-200"
              title="Delete category"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const CategoryTree: React.FC<CategoryTreeProps> = ({
  categories,
  selectedCategoryId,
  expandedCategories = [],
  onSelectCategory,
  onToggleCategory,
  onMoveCategory,
  onEditCategory,
  onDeleteCategory,
  showProductCounts = true,
  loading = false
}) => {
  const [draggedCategory, setDraggedCategory] = useState<number | null>(null);

  // Build tree structure
  const buildTree = useCallback((parentId: number | null = null): Category[] => {
    return categories
      .filter(cat => cat.parentId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [categories]);

  // Check if category has children
  const hasChildren = useCallback((categoryId: number): boolean => {
    return categories.some(cat => cat.parentId === categoryId);
  }, [categories]);

  // Check if category is expanded
  const isExpanded = useCallback((categoryId: number): boolean => {
    return expandedCategories.includes(categoryId);
  }, [expandedCategories]);

  // Handle category selection
  const handleSelectCategory = useCallback((category: Category) => {
    onSelectCategory(category.id === selectedCategoryId ? null : category);
  }, [onSelectCategory, selectedCategoryId]);

  // Handle category toggle
  const handleToggleCategory = useCallback((categoryId: number) => {
    if (onToggleCategory) {
      onToggleCategory(categoryId);
    }
  }, [onToggleCategory]);

  // Render tree recursively
  const renderTree = useCallback((parentCategories: Category[], level: number = 0): React.ReactNode => {
    return parentCategories.map(category => {
      const children = buildTree(category.id);
      const hasChildCategories = hasChildren(category.id);
      const expanded = isExpanded(category.id);

      return (
        <div key={category.id} className="group">
          <TreeNode
            category={category}
            level={level}
            isSelected={category.id === selectedCategoryId}
            isExpanded={expanded}
            hasChildren={hasChildCategories}
            onSelect={handleSelectCategory}
            onToggle={handleToggleCategory}
            onEdit={onEditCategory}
            onDelete={onDeleteCategory}
            onMove={onMoveCategory}
            showProductCounts={showProductCounts}
            isDragging={draggedCategory === category.id}
          />
          {hasChildCategories && expanded && (
            <div className="ml-2">
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
    selectedCategoryId,
    handleSelectCategory,
    handleToggleCategory,
    onEditCategory,
    onDeleteCategory,
    onMoveCategory,
    showProductCounts,
    draggedCategory
  ]);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center py-2 px-3 animate-pulse">
            <div className="w-4 h-4 bg-gray-200 rounded mr-2" />
            <div className="w-4 h-4 bg-gray-200 rounded mr-2" />
            <div className="flex-1 h-4 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="text-center py-8">
        <Folder className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-sm font-medium text-gray-900 mb-1">No categories</h3>
        <p className="text-sm text-gray-500">
          Create your first category to organize products.
        </p>
      </div>
    );
  }

  const rootCategories = buildTree();

  return (
    <div className="space-y-1">
      {renderTree(rootCategories)}
    </div>
  );
};

export default CategoryTree;