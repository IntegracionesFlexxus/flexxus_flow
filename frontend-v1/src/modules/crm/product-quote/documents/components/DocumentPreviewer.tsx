// Document Previewer Component - Sprint 19 Frontend Implementation

import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  Send,
  Edit,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize,
  Minimize,
  FileText,
  Eye,
  Share2,
  Printer,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Search,
  Settings,
  RefreshCw
} from 'lucide-react';

// Local imports
import { DocumentSender } from './DocumentSender';

interface DocumentPreviewerProps {
  document: GeneratedDocument;
  onDownload?: () => void;
  onSend?: () => void;
  onEdit?: () => void;
  onBack?: () => void;
}

interface GeneratedDocument {
  id: number;
  templateId: number;
  templateName: string;
  fileName: string;
  url: string;
  format: 'pdf' | 'word' | 'excel' | 'html';
  size: number;
  generatedAt: string;
  variables: Record<string, any>;
  content?: string; // For HTML preview
  pages?: number;
}

type ViewMode = 'fit' | 'width' | 'height' | 'actual';

export const DocumentPreviewer: React.FC<DocumentPreviewerProps> = ({
  document,
  onDownload,
  onSend,
  onEdit,
  onBack
}) => {
  // State
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [viewMode, setViewMode] = useState<ViewMode>('fit');
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSender, setShowSender] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Refs
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const documentViewerRef = useRef<HTMLIFrameElement>(null);

  // Effects
  useEffect(() => {
    loadDocument();
  }, [document]);

  useEffect(() => {
    if (viewMode !== 'actual') {
      adjustZoomToFit();
    }
  }, [viewMode]);

  // Handlers
  const loadDocument = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate loading time
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsLoading(false);
    } catch (err) {
      setError('Failed to load document preview');
      setIsLoading(false);
    }
  };

  const adjustZoomToFit = () => {
    if (!previewContainerRef.current) return;

    const container = previewContainerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Calculate zoom based on view mode
    let newZoom = 100;

    switch (viewMode) {
      case 'fit':
        // Fit both width and height
        const widthZoom = (containerWidth / 210) * 100; // A4 width approximation
        const heightZoom = (containerHeight / 297) * 100; // A4 height approximation
        newZoom = Math.min(widthZoom, heightZoom);
        break;
      case 'width':
        newZoom = (containerWidth / 210) * 100;
        break;
      case 'height':
        newZoom = (containerHeight / 297) * 100;
        break;
    }

    setZoom(Math.max(25, Math.min(200, newZoom)));
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(200, prev + 25));
    setViewMode('actual');
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(25, prev - 25));
    setViewMode('actual');
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleFullscreen = () => {
    if (!isFullscreen) {
      if (previewContainerRef.current?.requestFullscreen) {
        previewContainerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= (document.pages || 1)) {
      setCurrentPage(page);
    }
  };

  const handlePrint = () => {
    if (documentViewerRef.current) {
      documentViewerRef.current.contentWindow?.print();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (format: string) => {
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

  // Render document content based on format
  const renderDocumentContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <RefreshCw className="mx-auto w-12 h-12 text-blue-500 animate-spin mb-4" />
            <p className="text-lg font-medium text-gray-900">Loading document...</p>
            <p className="text-sm text-gray-500">Please wait while we prepare the preview</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <FileText className="mx-auto w-12 h-12 text-red-500 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">Preview Error</p>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <button
              onClick={loadDocument}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    const contentStyle = {
      transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
      transformOrigin: 'center center',
      transition: 'transform 0.3s ease'
    };

    switch (document.format) {
      case 'pdf':
        return (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <div style={contentStyle}>
              <iframe
                ref={documentViewerRef}
                src={`${document.url}#page=${currentPage}`}
                className="w-full h-full border border-gray-300 shadow-lg"
                style={{ width: '210mm', height: '297mm' }}
                title={document.fileName}
              />
            </div>
          </div>
        );

      case 'html':
        return (
          <div className="w-full h-full flex items-center justify-center bg-white">
            <div style={contentStyle} className="max-w-4xl w-full">
              <div
                className="prose prose-sm max-w-none p-8 bg-white shadow-lg border border-gray-200"
                dangerouslySetInnerHTML={{ __html: document.content || '' }}
              />
            </div>
          </div>
        );

      case 'word':
      case 'excel':
        return (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <div className="text-center">
              {getFileIcon(document.format)}
              <p className="text-lg font-medium text-gray-900 mt-4 mb-2">
                {document.format.toUpperCase()} Preview
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Preview not available for this format. Download to view the document.
              </p>
              <button
                onClick={onDownload}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mx-auto"
              >
                <Download className="w-4 h-4" />
                Download Document
              </button>
            </div>
          </div>
        );

      default:
        return (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <FileText className="mx-auto w-12 h-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-900">Preview not available</p>
              <p className="text-sm text-gray-500">This document format is not supported for preview</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-3">
              {getFileIcon(document.format)}
              <div>
                <h1 className="text-lg font-medium text-gray-900">{document.fileName}</h1>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span>{document.templateName}</span>
                  <span>•</span>
                  <span>{formatFileSize(document.size)}</span>
                  <span>•</span>
                  <span>{new Date(document.generatedAt).toLocaleDateString()}</span>
                  {document.pages && (
                    <>
                      <span>•</span>
                      <span>{document.pages} pages</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
              title="Search"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              onClick={handlePrint}
              className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
              title="Print"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowSender(true)}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
            <button
              onClick={onDownload}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="mt-4">
            <div className="max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search in document..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left Tools */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              disabled={zoom <= 25}
              className="p-2 text-gray-600 hover:text-gray-900 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded">
              <span className="text-sm font-medium">{zoom}%</span>
            </div>

            <button
              onClick={handleZoomIn}
              disabled={zoom >= 200}
              className="p-2 text-gray-600 hover:text-gray-900 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-gray-300 mx-2" />

            {/* View Mode */}
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as ViewMode)}
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="fit">Fit Page</option>
              <option value="width">Fit Width</option>
              <option value="height">Fit Height</option>
              <option value="actual">Actual Size</option>
            </select>

            <button
              onClick={handleRotate}
              className="p-2 text-gray-600 hover:text-gray-900 rounded hover:bg-gray-100"
              title="Rotate"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            <button
              onClick={handleFullscreen}
              className="p-2 text-gray-600 hover:text-gray-900 rounded hover:bg-gray-100"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>

          {/* Page Navigation */}
          {document.pages && document.pages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="p-2 text-gray-600 hover:text-gray-900 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={currentPage}
                  onChange={(e) => handlePageChange(parseInt(e.target.value))}
                  min={1}
                  max={document.pages}
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-sm text-gray-600">
                  of {document.pages}
                </span>
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= document.pages}
                className="p-2 text-gray-600 hover:text-gray-900 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 overflow-hidden">
        <div
          ref={previewContainerRef}
          className="w-full h-full overflow-auto"
        >
          {renderDocumentContent()}
        </div>
      </div>

      {/* Document Sender Modal */}
      {showSender && (
        <DocumentSender
          document={document}
          onClose={() => setShowSender(false)}
          onSent={() => {
            setShowSender(false);
            onSend?.();
          }}
        />
      )}
    </div>
  );
};

export default DocumentPreviewer;