// Document History Page - Sprint 19 Frontend Implementation

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Download,
  Eye,
  Share2,
  RotateCcw,
  Trash2,
  Calendar,
  User,
  FileText,
  ExternalLink,
  MoreVertical,
  Clock,
  CheckCircle,
  AlertCircle,
  Archive,
  Tag,
  Building,
  Users
} from 'lucide-react';

// Local imports
import { DocumentViewer } from '../components/DocumentViewer';
import { GeneratedDocumentsList } from '../components/GeneratedDocumentsList';
import { useDocumentHistory } from '../hooks/useDocumentHistory';
import { useDocumentGeneration } from '../hooks/useDocumentGeneration';

interface DocumentHistoryPageProps {
  entityType?: 'quote' | 'opportunity' | 'account' | 'contract';
  entityId?: number;
}

type ViewMode = 'list' | 'viewer';
type FilterStatus = 'all' | 'generated' | 'sent' | 'viewed' | 'downloaded' | 'archived';
type SortBy = 'date' | 'name' | 'type' | 'size' | 'status';

interface GeneratedDocument {
  id: number;
  templateId: number;
  templateName: string;
  entityType: string;
  entityId: number;
  entityName: string;
  fileName: string;
  originalFileName: string;
  url: string;
  format: 'pdf' | 'word' | 'excel' | 'html';
  size: number;
  status: 'generated' | 'sent' | 'viewed' | 'downloaded' | 'archived';
  generatedAt: string;
  generatedBy: number;
  generatedByName: string;
  variables: Record<string, any>;
  downloadCount: number;
  viewCount: number;
  lastAccessed?: string;
  sentAt?: string;
  sentTo?: string[];
  tags: string[];
  version: number;
  parentDocumentId?: number;
}

export const DocumentHistoryPage: React.FC<DocumentHistoryPageProps> = ({
  entityType: propEntityType,
  entityId: propEntityId
}) => {
  const { entityType: urlEntityType, entityId: urlEntityId } = useParams();
  const navigate = useNavigate();

  // Use props or URL params
  const entityType = propEntityType || urlEntityType as ('quote' | 'opportunity' | 'account' | 'contract');
  const entityId = propEntityId || parseInt(urlEntityId || '0');

  // State
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedDocument, setSelectedDocument] = useState<GeneratedDocument | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showDeleteDialog, setShowDeleteDialog] = useState<number | null>(null);
  const [showArchiveDialog, setShowArchiveDialog] = useState<number | null>(null);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<number>>(new Set());

  // Hooks
  const {
    documents,
    isLoading,
    error,
    stats,
    deleteDocument,
    archiveDocument,
    bulkDelete,
    bulkArchive,
    refetch
  } = useDocumentHistory(entityType, entityId);

  const {
    regenerateDocument,
    isGenerating
  } = useDocumentGeneration();

  // Effects
  useEffect(() => {
    refetch();
  }, [entityType, entityId, refetch]);

  // Handlers
  const handleViewDocument = (document: GeneratedDocument) => {
    setSelectedDocument(document);
    setViewMode('viewer');
  };

  const handleDownloadDocument = async (document: GeneratedDocument) => {
    try {
      const response = await fetch(document.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = document.originalFileName || document.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Update download count
      refetch();
    } catch (error) {
      console.error('Failed to download document:', error);
    }
  };

  const handleRegenerateDocument = async (document: GeneratedDocument) => {
    try {
      await regenerateDocument({
        templateId: document.templateId,
        entityType: document.entityType,
        entityId: document.entityId,
        variables: document.variables,
        format: document.format
      });
      refetch();
    } catch (error) {
      console.error('Failed to regenerate document:', error);
    }
  };

  const handleDeleteDocument = async (documentId: number) => {
    try {
      await deleteDocument(documentId);
      setShowDeleteDialog(null);
      refetch();
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  const handleArchiveDocument = async (documentId: number) => {
    try {
      await archiveDocument(documentId);
      setShowArchiveDialog(null);
      refetch();
    } catch (error) {
      console.error('Failed to archive document:', error);
    }
  };

  const handleBulkAction = async (action: 'delete' | 'archive') => {
    try {
      if (action === 'delete') {
        await bulkDelete(Array.from(selectedDocuments));
      } else {
        await bulkArchive(Array.from(selectedDocuments));
      }
      setSelectedDocuments(new Set());
      refetch();
    } catch (error) {
      console.error(`Failed to ${action} documents:`, error);
    }
  };

  const handleSelectDocument = (documentId: number) => {
    const newSelected = new Set(selectedDocuments);
    if (newSelected.has(documentId)) {
      newSelected.delete(documentId);
    } else {
      newSelected.add(documentId);
    }
    setSelectedDocuments(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedDocuments.size === filteredDocuments.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(filteredDocuments.map(doc => doc.id)));
    }
  };

  // Filter and sort documents
  const filteredDocuments = documents?.filter(doc => {
    const matchesSearch = doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.templateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.entityName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || doc.status === filterStatus;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'date':
        comparison = new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime();
        break;
      case 'name':
        comparison = a.fileName.localeCompare(b.fileName);
        break;
      case 'type':
        comparison = a.format.localeCompare(b.format);
        break;
      case 'size':
        comparison = a.size - b.size;
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
    }

    return sortOrder === 'desc' ? -comparison : comparison;
  }) || [];

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'generated':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'sent':
        return <Share2 className="w-4 h-4 text-blue-500" />;
      case 'viewed':
        return <Eye className="w-4 h-4 text-purple-500" />;
      case 'downloaded':
        return <Download className="w-4 h-4 text-orange-500" />;
      case 'archived':
        return <Archive className="w-4 h-4 text-gray-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  // Get format icon
  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-500" />;
      case 'word':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'excel':
        return <FileText className="w-5 h-5 text-green-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  if (viewMode === 'viewer' && selectedDocument) {
    return (
      <DocumentViewer
        document={selectedDocument}
        onBack={() => setViewMode('list')}
        onDownload={() => handleDownloadDocument(selectedDocument)}
        onRegenerate={() => handleRegenerateDocument(selectedDocument)}
        onDelete={() => setShowDeleteDialog(selectedDocument.id)}
      />
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Document History</h1>
            <p className="text-sm text-gray-500">
              {entityType && entityId
                ? `Documents for ${entityType} #${entityId}`
                : 'All generated documents'
              }
            </p>
          </div>

          {/* Stats */}
          {stats && (
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-sm text-gray-500">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.thisMonth}</div>
                <div className="text-sm text-gray-500">This Month</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.downloads}</div>
                <div className="text-sm text-gray-500">Downloads</div>
              </div>
            </div>
          )}
        </div>

        {/* Search and Filters */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
              />
            </div>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="generated">Generated</option>
              <option value="sent">Sent</option>
              <option value="viewed">Viewed</option>
              <option value="downloaded">Downloaded</option>
              <option value="archived">Archived</option>
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
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="size-desc">Largest First</option>
              <option value="size-asc">Smallest First</option>
            </select>
          </div>

          {/* Bulk Actions */}
          {selectedDocuments.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {selectedDocuments.size} selected
              </span>
              <button
                onClick={() => handleBulkAction('archive')}
                className="flex items-center gap-1 px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Archive className="w-4 h-4" />
                Archive
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="flex items-center gap-1 px-3 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedDocuments.size === filteredDocuments.length && filteredDocuments.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Generated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDocuments.map((document) => (
                  <tr
                    key={document.id}
                    className={`hover:bg-gray-50 ${selectedDocuments.has(document.id) ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedDocuments.has(document.id)}
                        onChange={() => handleSelectDocument(document.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          {getFormatIcon(document.format)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {document.fileName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {document.templateName} • {document.entityName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 uppercase">
                        {document.format}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(document.status)}
                        <span className="text-sm text-gray-900 capitalize">
                          {document.status.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatFileSize(document.size)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {new Date(document.generatedAt).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        by {document.generatedByName}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewDocument(document)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Document"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadDocument(document)}
                          className="text-green-600 hover:text-green-900"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRegenerateDocument(document)}
                          className="text-purple-600 hover:text-purple-900"
                          title="Regenerate"
                          disabled={isGenerating}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowDeleteDialog(document.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
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

          {filteredDocuments.length === 0 && (
            <div className="text-center py-12">
              <FileText className="mx-auto w-12 h-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No documents found</h3>
              <p className="mt-2 text-sm text-gray-500">
                {searchQuery || filterStatus !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'No documents have been generated yet'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Delete Document
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this document? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteDialog(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteDocument(showDeleteDialog)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentHistoryPage;