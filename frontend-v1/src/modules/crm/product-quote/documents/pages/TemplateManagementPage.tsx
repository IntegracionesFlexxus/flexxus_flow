// Template Management Page - Sprint 19 Frontend Implementation

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Copy,
  Trash2,
  Eye,
  Download,
  Upload,
  FileText,
  Image,
  Layout,
  Settings,
  MoreVertical,
  Tag,
  Calendar,
  Users,
  Globe
} from 'lucide-react';

// Local imports
import { TemplateEditor } from '../components/TemplateEditor';
import { TemplateGallery } from '../components/TemplateGallery';
import { TemplateVariablesManager } from '../components/TemplateVariablesManager';
import { useTemplates } from '../hooks/useTemplates';
import { useTemplateEditor } from '../hooks/useTemplateEditor';

interface TemplateManagementPageProps {}

type ViewMode = 'gallery' | 'editor' | 'variables' | 'list';
type FilterType = 'all' | 'quote' | 'invoice' | 'contract' | 'proposal' | 'custom';

export const TemplateManagementPage: React.FC<TemplateManagementPageProps> = () => {
  const navigate = useNavigate();
  const { templateId } = useParams();

  // State
  const [viewMode, setViewMode] = useState<ViewMode>('gallery');
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(
    templateId ? parseInt(templateId) : null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [showDeleteDialog, setShowDeleteDialog] = useState<number | null>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState<number | null>(null);

  // Hooks
  const {
    templates,
    categories,
    isLoading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    refetch
  } = useTemplates();

  const {
    currentTemplate,
    isEditing,
    hasUnsavedChanges,
    openTemplate,
    saveTemplate,
    createNewTemplate,
    discardChanges
  } = useTemplateEditor();

  // Effects
  useEffect(() => {
    if (templateId && !selectedTemplate) {
      setSelectedTemplate(parseInt(templateId));
      setViewMode('editor');
    }
  }, [templateId, selectedTemplate]);

  useEffect(() => {
    if (selectedTemplate && viewMode === 'editor') {
      openTemplate(selectedTemplate);
    }
  }, [selectedTemplate, viewMode, openTemplate]);

  // Handlers
  const handleCreateNew = () => {
    createNewTemplate();
    setSelectedTemplate(null);
    setViewMode('editor');
  };

  const handleEditTemplate = (templateId: number) => {
    setSelectedTemplate(templateId);
    setViewMode('editor');
    navigate(`/crm/documents/templates/${templateId}`);
  };

  const handleViewVariables = (templateId: number) => {
    setSelectedTemplate(templateId);
    setViewMode('variables');
  };

  const handleDuplicateTemplate = async (templateId: number, newName: string) => {
    try {
      const duplicated = await duplicateTemplate(templateId, newName);
      if (duplicated) {
        setShowDuplicateDialog(null);
        refetch();
      }
    } catch (error) {
      console.error('Failed to duplicate template:', error);
    }
  };

  const handleDeleteTemplate = async (templateId: number) => {
    try {
      await deleteTemplate(templateId);
      setShowDeleteDialog(null);
      if (selectedTemplate === templateId) {
        setSelectedTemplate(null);
        setViewMode('gallery');
      }
      refetch();
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const handleSaveTemplate = async (data: any) => {
    try {
      if (selectedTemplate) {
        await updateTemplate(selectedTemplate, data);
      } else {
        const newTemplate = await createTemplate(data);
        if (newTemplate) {
          setSelectedTemplate(newTemplate.id);
          navigate(`/crm/documents/templates/${newTemplate.id}`);
        }
      }
      refetch();
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  };

  const handleBackToGallery = () => {
    if (hasUnsavedChanges) {
      const confirm = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirm) return;
    }
    setViewMode('gallery');
    setSelectedTemplate(null);
    navigate('/crm/documents/templates');
  };

  // Filter templates
  const filteredTemplates = templates?.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || template.category === filterType;
    return matchesSearch && matchesFilter;
  }) || [];

  // View mode components
  const renderViewModeSelector = () => (
    <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => setViewMode('gallery')}
        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          viewMode === 'gallery'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <Layout className="w-4 h-4" />
        Gallery
      </button>
      <button
        onClick={() => setViewMode('list')}
        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          viewMode === 'list'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <FileText className="w-4 h-4" />
        List
      </button>
    </div>
  );

  const renderFilterBar = () => (
    <div className="flex items-center gap-4">
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

      {/* Filter */}
      <select
        value={filterType}
        onChange={(e) => setFilterType(e.target.value as FilterType)}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="all">All Categories</option>
        <option value="quote">Quotes</option>
        <option value="invoice">Invoices</option>
        <option value="contract">Contracts</option>
        <option value="proposal">Proposals</option>
        <option value="custom">Custom</option>
      </select>
    </div>
  );

  const renderTemplateList = () => (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
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
                Modified
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTemplates.map((template) => (
              <tr key={template.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {template.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {template.description}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {template.category}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div className="flex items-center gap-1">
                    <Globe className="w-4 h-4 text-gray-400" />
                    {template.language || 'EN'}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(template.updatedAt).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditTemplate(template.id)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Edit Template"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowDuplicateDialog(template.id)}
                      className="text-green-600 hover:text-green-900"
                      title="Duplicate Template"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleViewVariables(template.id)}
                      className="text-purple-600 hover:text-purple-900"
                      title="Manage Variables"
                    >
                      <Tag className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowDeleteDialog(template.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete Template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {(viewMode === 'editor' || viewMode === 'variables') && (
              <button
                onClick={handleBackToGallery}
                className="text-gray-500 hover:text-gray-700"
              >
                ←
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {viewMode === 'editor'
                  ? (selectedTemplate ? 'Edit Template' : 'Create Template')
                  : viewMode === 'variables'
                  ? 'Template Variables'
                  : 'Template Management'
                }
              </h1>
              <p className="text-sm text-gray-500">
                {viewMode === 'editor'
                  ? 'Design and customize document templates'
                  : viewMode === 'variables'
                  ? 'Manage template variables and placeholders'
                  : 'Create and manage document templates'
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {viewMode === 'gallery' || viewMode === 'list' ? (
              <>
                {renderViewModeSelector()}
                <button
                  onClick={handleCreateNew}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  New Template
                </button>
              </>
            ) : viewMode === 'editor' ? (
              <div className="flex items-center gap-2">
                {hasUnsavedChanges && (
                  <span className="text-sm text-amber-600">Unsaved changes</span>
                )}
                <button
                  onClick={() => saveTemplate(currentTemplate)}
                  disabled={!hasUnsavedChanges}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  Save Template
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {(viewMode === 'gallery' || viewMode === 'list') && (
          <div className="mt-4">
            {renderFilterBar()}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {(viewMode === 'gallery' || viewMode === 'list') && (
          <div className="p-6">
            {viewMode === 'gallery' ? (
              <TemplateGallery
                templates={filteredTemplates}
                onTemplateSelect={handleEditTemplate}
                onDuplicate={(id) => setShowDuplicateDialog(id)}
                onDelete={(id) => setShowDeleteDialog(id)}
                onViewVariables={handleViewVariables}
              />
            ) : (
              renderTemplateList()
            )}
          </div>
        )}

        {viewMode === 'editor' && (
          <TemplateEditor
            templateId={selectedTemplate}
            onSave={handleSaveTemplate}
            onCancel={handleBackToGallery}
          />
        )}

        {viewMode === 'variables' && selectedTemplate && (
          <TemplateVariablesManager
            templateId={selectedTemplate}
            onBack={handleBackToGallery}
          />
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Delete Template
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this template? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteDialog(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteTemplate(showDeleteDialog)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Template Dialog */}
      {showDuplicateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Duplicate Template
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Template Name
              </label>
              <input
                type="text"
                placeholder="Enter template name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const input = e.target as HTMLInputElement;
                    if (input.value.trim()) {
                      handleDuplicateTemplate(showDuplicateDialog, input.value.trim());
                    }
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDuplicateDialog(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const input = document.querySelector('input[placeholder="Enter template name..."]') as HTMLInputElement;
                  if (input?.value.trim()) {
                    handleDuplicateTemplate(showDuplicateDialog, input.value.trim());
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Duplicate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateManagementPage;