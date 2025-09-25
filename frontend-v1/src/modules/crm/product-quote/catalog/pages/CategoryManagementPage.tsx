// CategoryManagementPage - Sprint 19 Frontend Implementation

import React, { useState, useCallback } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Move,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Settings,
  Upload,
  Download,
  MoreVertical
} from 'lucide-react';

import { useCategories } from '../hooks/useCategories';
import { Category, DragDropResult } from '../../../shared/types';

// Components (will be implemented next)
import CategoryTree from '../components/CategoryTree';

interface CategoryFormData {
  name: string;
  description: string;
  parentId: number | null;
  sortOrder: number;
  isActive: boolean;
}

const CategoryManagementPage: React.FC = () => {
  // Local state
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    parentId: null,
    sortOrder: 0,
    isActive: true
  });

  // Categories hook
  const {
    categories,
    categoryTree,
    selectedCategory,
    expandedCategories,
    loading,
    error,
    selectCategory,
    expandCategory,
    collapseCategory,
    toggleCategory,
    expandAll,
    collapseAll,
    createCategory,
    updateCategory,
    deleteCategory,
    moveCategory,
    findCategory,
    getChildCategories,
    getCategoryPath,
    refreshCategories
  } = useCategories({
    enableDragDrop: true,
    showProductCounts: true
  });

  // Filter categories based on search
  const filteredCategories = searchQuery
    ? categories.filter(cat =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cat.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : categoryTree;

  // Handlers
  const handleCreateCategory = useCallback(async () => {
    try {
      await createCategory({
        companyId: 1, // This should come from context
        name: formData.name,
        slug: formData.name.toLowerCase().replace(/\s+/g, '-'),
        description: formData.description,
        parentId: formData.parentId,
        level: formData.parentId ? (findCategory(formData.parentId)?.level || 0) + 1 : 0,
        lft: 0, // This will be calculated by the backend
        rgt: 0, // This will be calculated by the backend
        productCount: 0,
        isActive: formData.isActive,
        sortOrder: formData.sortOrder
      });

      // Reset form
      setFormData({
        name: '',
        description: '',
        parentId: null,
        sortOrder: 0,
        isActive: true
      });
      setShowForm(false);
    } catch (error) {
      console.error('Failed to create category:', error);
    }
  }, [formData, createCategory, findCategory]);

  const handleUpdateCategory = useCallback(async () => {
    if (!editingCategory) return;

    try {
      await updateCategory(editingCategory.id, formData);
      setEditingCategory(null);
      setShowForm(false);
    } catch (error) {
      console.error('Failed to update category:', error);
    }
  }, [editingCategory, formData, updateCategory]);

  const handleDeleteCategory = useCallback(async (category: Category) => {
    const childCategories = getChildCategories(category.id);
    const hasChildren = childCategories.length > 0;
    const hasProducts = category.productCount > 0;

    let confirmMessage = `Are you sure you want to delete "${category.name}"?`;
    if (hasChildren) {
      confirmMessage += ` This will also delete ${childCategories.length} subcategories.`;
    }
    if (hasProducts) {
      confirmMessage += ` This category contains ${category.productCount} products.`;
    }
    confirmMessage += ' This action cannot be undone.';

    const confirmed = window.confirm(confirmMessage);
    if (confirmed) {
      try {
        await deleteCategory(category.id);
      } catch (error) {
        console.error('Failed to delete category:', error);
      }
    }
  }, [deleteCategory, getChildCategories]);

  const handleEditCategory = useCallback((category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      parentId: category.parentId,
      sortOrder: category.sortOrder,
      isActive: category.isActive
    });
    setShowForm(true);
  }, []);

  const handleMoveCategory = useCallback(async (result: DragDropResult) => {
    try {
      await moveCategory(result);
    } catch (error) {
      console.error('Failed to move category:', error);
    }
  }, [moveCategory]);

  const handleFormSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (editingCategory) {
      handleUpdateCategory();
    } else {
      handleCreateCategory();
    }
  }, [editingCategory, handleUpdateCategory, handleCreateCategory]);

  const handleCancelEdit = useCallback(() => {
    setEditingCategory(null);
    setShowForm(false);
    setFormData({
      name: '',
      description: '',
      parentId: null,
      sortOrder: 0,
      isActive: true
    });
  }, []);

  // Get parent options (exclude current category and its children when editing)
  const parentOptions = categories.filter(cat => {
    if (!editingCategory) return true;

    // Exclude self
    if (cat.id === editingCategory.id) return false;

    // Exclude children
    const path = getCategoryPath(cat.id);
    return !path.some(p => p.id === editingCategory.id);
  });

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Category Management</h1>
            <p className="text-sm text-gray-600 mt-1">
              Organize your products with hierarchical categories
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={expandAll}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="text-sm text-gray-600 hover:text-gray-500"
            >
              Collapse All
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Search categories..."
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Category Tree */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            {error ? (
              <div className="text-center py-12">
                <div className="text-red-600 mb-2">Error loading categories</div>
                <div className="text-gray-500 text-sm mb-4">{error}</div>
                <button
                  onClick={refreshCategories}
                  className="text-blue-600 hover:text-blue-500"
                >
                  Try again
                </button>
              </div>
            ) : (
              <CategoryTree
                categories={filteredCategories}
                selectedCategoryId={selectedCategory?.id}
                expandedCategories={expandedCategories}
                onSelectCategory={selectCategory}
                onToggleCategory={toggleCategory}
                onMoveCategory={handleMoveCategory}
                onEditCategory={handleEditCategory}
                onDeleteCategory={handleDeleteCategory}
                showProductCounts={true}
                loading={loading}
              />
            )}
          </div>
        </div>

        {/* Form Sidebar */}
        {showForm && (
          <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-gray-900">
                  {editingCategory ? 'Edit Category' : 'Create Category'}
                </h2>
                <button
                  onClick={handleCancelEdit}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Name *
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="Category name"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <div className="mt-1">
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="Category description"
                    />
                  </div>
                </div>

                {/* Parent Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Parent Category
                  </label>
                  <div className="mt-1">
                    <select
                      value={formData.parentId || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        parentId: e.target.value ? parseInt(e.target.value) : null
                      }))}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    >
                      <option value="">None (Root Category)</option>
                      {parentOptions.map(category => (
                        <option key={category.id} value={category.id}>
                          {'  '.repeat(category.level)}{category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Sort Order */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Sort Order
                  </label>
                  <div className="mt-1">
                    <input
                      type="number"
                      value={formData.sortOrder}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        sortOrder: parseInt(e.target.value) || 0
                      }))}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="0"
                    />
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Lower numbers appear first
                  </p>
                </div>

                {/* Active Status */}
                <div className="flex items-center">
                  <input
                    id="isActive"
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                    Active
                  </label>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-6">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    {editingCategory ? 'Update' : 'Create'} Category
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 px-6 py-3">
        <div className="text-sm text-gray-500">
          {categories.length} categories total
          {selectedCategory && (
            <span className="ml-4">
              Selected: {getCategoryPath(selectedCategory.id).map(c => c.name).join(' > ')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryManagementPage;