// Template Gallery Component - Sprint 19 Frontend Implementation

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Grid,
  List,
  Eye,
  Edit,
  Copy,
  Trash2,
  Star,
  StarOff,
  Download,
  Upload,
  Plus,
  FileText,
  Image,
  Calendar,
  User,
  Globe,
  Tag,
  MoreVertical,
  Check,
  Clock,
  Zap
} from 'lucide-react';

interface TemplateGalleryProps {
  templates?: DocumentTemplate[];
  entityType?: 'quote' | 'opportunity' | 'account' | 'contract';
  onTemplateSelect?: (templateId: number) => void;
  onDuplicate?: (templateId: number) => void;
  onDelete?: (templateId: number) => void;
  onViewVariables?: (templateId: number) => void;
  selectedTemplateId?: number | null;
  showActions?: boolean;
}

interface DocumentTemplate {
  id: number;
  name: string;
  description: string;
  category: string;
  language: string;
  thumbnail?: string;
  tags: string[];
  isSystem: boolean;
  isFavorite: boolean;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
  rating: number;
  variables: TemplateVariable[];
  preview?: string;
}

interface TemplateVariable {
  name: string;
  type: string;
  label: string;
  required: boolean;
}

type ViewMode = 'grid' | 'list';
type FilterCategory = 'all' | 'quote' | 'invoice' | 'contract' | 'proposal' | 'custom';
type SortBy = 'name' | 'category' | 'created' | 'usage' | 'rating';

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({
  templates = [],
  entityType,
  onTemplateSelect,
  onDuplicate,
  onDelete,
  onViewVariables,
  selectedTemplateId,
  showActions = true
}) => {
  // State
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showSystemTemplates, setShowSystemTemplates] = useState(true);
  const [selectedTemplates, setSelectedTemplates] = useState<Set<number>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Sample templates data (in real app, this would come from props or API)
  const sampleTemplates: DocumentTemplate[] = [
    {
      id: 1,
      name: 'Standard Quote Template',
      description: 'Professional quote template with company branding',
      category: 'quote',
      language: 'en',
      thumbnail: '/templates/quote-standard.png',
      tags: ['quote', 'professional', 'standard'],
      isSystem: true,
      isFavorite: false,
      isActive: true,
      createdBy: 'System',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-02-20T14:30:00Z',
      usageCount: 150,
      rating: 4.8,
      variables: [
        { name: 'company_name', type: 'text', label: 'Company Name', required: true },
        { name: 'quote_date', type: 'date', label: 'Quote Date', required: true },
        { name: 'total_amount', type: 'currency', label: 'Total Amount', required: true }
      ]
    },
    {
      id: 2,
      name: 'Modern Invoice Template',
      description: 'Clean and modern invoice design',
      category: 'invoice',
      language: 'en',
      thumbnail: '/templates/invoice-modern.png',
      tags: ['invoice', 'modern', 'clean'],
      isSystem: true,
      isFavorite: true,
      isActive: true,
      createdBy: 'System',
      createdAt: '2024-01-20T09:00:00Z',
      updatedAt: '2024-02-15T11:15:00Z',
      usageCount: 89,
      rating: 4.6,
      variables: [
        { name: 'invoice_number', type: 'text', label: 'Invoice Number', required: true },
        { name: 'due_date', type: 'date', label: 'Due Date', required: true }
      ]
    },
    {
      id: 3,
      name: 'Service Contract',
      description: 'Comprehensive service agreement template',
      category: 'contract',
      language: 'en',
      thumbnail: '/templates/contract-service.png',
      tags: ['contract', 'service', 'legal'],
      isSystem: false,
      isFavorite: false,
      isActive: true,
      createdBy: 'John Doe',
      createdAt: '2024-02-01T13:45:00Z',
      updatedAt: '2024-02-25T16:20:00Z',
      usageCount: 23,
      rating: 4.2,
      variables: [
        { name: 'service_description', type: 'text', label: 'Service Description', required: true },
        { name: 'contract_duration', type: 'text', label: 'Duration', required: true }
      ]
    }
  ];

  const displayTemplates = templates.length > 0 ? templates : sampleTemplates;

  // Filter and sort templates
  const filteredTemplates = displayTemplates
    .filter(template => {
      // Search filter
      const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      // Category filter
      const matchesCategory = filterCategory === 'all' || template.category === filterCategory;

      // Entity type filter
      const matchesEntityType = !entityType || template.category === entityType;

      // Favorites filter
      const matchesFavorites = !showFavoritesOnly || template.isFavorite;

      // System templates filter
      const matchesSystemFilter = showSystemTemplates || !template.isSystem;

      // Active filter
      const isActive = template.isActive;

      return matchesSearch && matchesCategory && matchesEntityType && matchesFavorites && matchesSystemFilter && isActive;
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        case 'created':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'usage':
          comparison = a.usageCount - b.usageCount;
          break;
        case 'rating':
          comparison = a.rating - b.rating;
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

  // Handlers
  const handleTemplateSelect = (templateId: number) => {
    onTemplateSelect?.(templateId);
  };

  const handleToggleFavorite = (templateId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    // In real app, this would make an API call
    console.log('Toggle favorite for template:', templateId);
  };

  const handleBulkSelect = (templateId: number) => {
    const newSelected = new Set(selectedTemplates);
    if (newSelected.has(templateId)) {
      newSelected.delete(templateId);
    } else {
      newSelected.add(templateId);
    }
    setSelectedTemplates(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleSelectAll = () => {
    if (selectedTemplates.size === filteredTemplates.length) {
      setSelectedTemplates(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedTemplates(new Set(filteredTemplates.map(t => t.id)));
      setShowBulkActions(true);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'quote':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'invoice':
        return <FileText className="w-4 h-4 text-green-500" />;
      case 'contract':
        return <FileText className="w-4 h-4 text-purple-500" />;
      case 'proposal':
        return <FileText className="w-4 h-4 text-orange-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3 h-3 ${
              star <= rating
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-xs text-gray-500 ml-1">({rating})</span>
      </div>
    );
  };

  // Grid view template card
  const TemplateCard: React.FC<{ template: DocumentTemplate }> = ({ template }) => (
    <div
      onClick={() => handleTemplateSelect(template.id)}
      className={`
        relative group bg-white rounded-lg border transition-all duration-200 cursor-pointer
        ${selectedTemplateId === template.id
          ? 'border-blue-500 shadow-lg ring-2 ring-blue-200'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
        }
      `}
    >
      {/* Selection Checkbox */}
      <div className="absolute top-3 left-3 z-10">
        <input
          type="checkbox"
          checked={selectedTemplates.has(template.id)}
          onChange={(e) => {
            e.stopPropagation();
            handleBulkSelect(template.id);
          }}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      </div>

      {/* Favorite Button */}
      <button
        onClick={(e) => handleToggleFavorite(template.id, e)}
        className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {template.isFavorite ? (
          <Star className="w-4 h-4 text-yellow-400 fill-current" />
        ) : (
          <StarOff className="w-4 h-4 text-gray-400 hover:text-yellow-400" />
        )}
      </button>

      {/* Thumbnail */}
      <div className="aspect-video bg-gray-100 rounded-t-lg flex items-center justify-center">
        {template.thumbnail ? (
          <img
            src={template.thumbnail}
            alt={template.name}
            className="w-full h-full object-cover rounded-t-lg"
          />
        ) : (
          <div className="text-center">
            {getCategoryIcon(template.category)}
            <p className="text-xs text-gray-500 mt-2">{template.category}</p>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-medium text-gray-900 truncate flex-1">
            {template.name}
          </h3>
          {template.isSystem && (
            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              <Zap className="w-3 h-3 mr-1" />
              System
            </span>
          )}
        </div>

        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
          {template.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {template.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
            >
              {tag}
            </span>
          ))}
          {template.tags.length > 3 && (
            <span className="text-xs text-gray-500">+{template.tags.length - 3}</span>
          )}
        </div>

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>{template.createdBy}</span>
            </div>
            <div className="flex items-center gap-1">
              <Globe className="w-3 h-3" />
              <span>{template.language.toUpperCase()}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            <span>{template.usageCount}</span>
          </div>
        </div>

        {/* Rating */}
        <div className="mt-2">
          {renderStars(template.rating)}
        </div>

        {/* Actions */}
        {showActions && (
          <div className="mt-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewVariables?.(template.id);
              }}
              className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-700"
              title="View Variables"
            >
              <Tag className="w-3 h-3" />
              Variables
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate?.(template.id);
              }}
              className="flex items-center gap-1 px-2 py-1 text-xs text-green-600 hover:text-green-700"
              title="Duplicate"
            >
              <Copy className="w-3 h-3" />
              Duplicate
            </button>
            {!template.isSystem && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(template.id);
                }}
                className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:text-red-700"
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // List view template row
  const TemplateRow: React.FC<{ template: DocumentTemplate }> = ({ template }) => (
    <tr
      onClick={() => handleTemplateSelect(template.id)}
      className={`
        cursor-pointer transition-colors
        ${selectedTemplateId === template.id
          ? 'bg-blue-50'
          : 'hover:bg-gray-50'
        }
      `}
    >
      <td className="px-6 py-4">
        <input
          type="checkbox"
          checked={selectedTemplates.has(template.id)}
          onChange={(e) => {
            e.stopPropagation();
            handleBulkSelect(template.id);
          }}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {getCategoryIcon(template.category)}
          </div>
          <div className="ml-4">
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium text-gray-900">
                {template.name}
              </div>
              {template.isFavorite && (
                <Star className="w-3 h-3 text-yellow-400 fill-current" />
              )}
              {template.isSystem && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  System
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500">
              {template.description}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
          {template.category}
        </span>
      </td>
      <td className="px-6 py-4 text-sm text-gray-900">
        {template.language.toUpperCase()}
      </td>
      <td className="px-6 py-4 text-sm text-gray-900">
        {template.usageCount}
      </td>
      <td className="px-6 py-4">
        {renderStars(template.rating)}
      </td>
      <td className="px-6 py-4 text-sm text-gray-500">
        {new Date(template.updatedAt).toLocaleDateString()}
      </td>
      <td className="px-6 py-4">
        {showActions && (
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewVariables?.(template.id);
              }}
              className="text-blue-600 hover:text-blue-900"
              title="View Variables"
            >
              <Tag className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate?.(template.id);
              }}
              className="text-green-600 hover:text-green-900"
              title="Duplicate"
            >
              <Copy className="w-4 h-4" />
            </button>
            {!template.isSystem && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(template.id);
                }}
                className="text-red-600 hover:text-red-900"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Filters and Controls */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${
                viewMode === 'grid'
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${
                viewMode === 'list'
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Row */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as FilterCategory)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            <option value="quote">Quotes</option>
            <option value="invoice">Invoices</option>
            <option value="contract">Contracts</option>
            <option value="proposal">Proposals</option>
            <option value="custom">Custom</option>
          </select>

          {/* Sort */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field as SortBy);
              setSortOrder(order as 'asc' | 'desc');
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="category-asc">Category A-Z</option>
            <option value="usage-desc">Most Used</option>
            <option value="rating-desc">Highest Rated</option>
            <option value="created-desc">Newest First</option>
          </select>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showFavoritesOnly}
                onChange={(e) => setShowFavoritesOnly(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Favorites only</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showSystemTemplates}
                onChange={(e) => setShowSystemTemplates(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Include system templates</span>
            </label>
          </div>
        </div>

        {/* Bulk Actions */}
        {showBulkActions && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-700">
                {selectedTemplates.size} template(s) selected
              </span>
              <div className="flex items-center gap-2">
                <button className="text-sm text-blue-600 hover:text-blue-700">
                  Bulk Duplicate
                </button>
                <button className="text-sm text-red-600 hover:text-red-700">
                  Bulk Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Templates Display */}
      <div className="flex-1 overflow-auto p-4">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTemplates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedTemplates.size === filteredTemplates.length && filteredTemplates.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Template
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Language
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Updated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTemplates.map((template) => (
                  <TemplateRow key={template.id} template={template} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State */}
        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto w-12 h-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No templates found</h3>
            <p className="mt-2 text-sm text-gray-500">
              {searchQuery || filterCategory !== 'all'
                ? 'Try adjusting your search or filters'
                : 'No templates available for this entity type'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateGallery;