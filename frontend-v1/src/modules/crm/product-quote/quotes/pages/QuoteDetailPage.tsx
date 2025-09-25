// QuoteDetailPage - Sprint 19 Frontend Implementation
// View and edit quote details

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  PencilIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  PaperAirplaneIcon,
  DocumentTextIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  ShareIcon,
  ClockIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

// Internal imports
import { useQuotes } from '../hooks/useQuotes';
import { useQuoteVersioning } from '../hooks/useQuoteVersioning';
import { useQuoteExport } from '../hooks/useQuoteExport';
import { useNotification } from '../../../../../shared/hooks/useNotification';
import { QuoteHeader } from '../components/QuoteHeader';
import { QuoteLineItemsTable } from '../components/QuoteLineItemsTable';
import { QuoteSummary } from '../components/QuoteSummary';
import { QuoteTimeline } from '../components/QuoteTimeline';
import { QuoteVersionManager } from '../components/QuoteVersionManager';
import { QuotePDFPreview } from '../components/QuotePDFPreview';
import { QuoteApprovalStatus } from '../components/QuoteApprovalStatus';
import {
  Quote,
  QuoteLineItem,
  TabItem
} from '../../shared/types';

// Tab configuration
const QUOTE_TABS: TabItem[] = [
  { key: 'overview', label: 'Overview', content: null },
  { key: 'line-items', label: 'Line Items', content: null },
  { key: 'versions', label: 'Versions', content: null },
  { key: 'activity', label: 'Activity', content: null },
  { key: 'documents', label: 'Documents', content: null }
];

export const QuoteDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showNotification } = useNotification();

  // State management
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Custom hooks
  const {
    currentQuote: quote,
    isLoading,
    error,
    loadQuote,
    updateQuote,
    deleteQuote,
    duplicateQuote,
    submitForApproval,
    convertToOrder
  } = useQuotes();

  const {
    versions,
    isLoading: versionsLoading,
    loadVersions,
    createVersion,
    restoreVersion
  } = useQuoteVersioning(id ? parseInt(id) : 0);

  const {
    generatePDF,
    sendEmail,
    isGenerating
  } = useQuoteExport();

  // Get tab from URL parameter
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && QUOTE_TABS.some(t => t.key === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Load quote data
  useEffect(() => {
    if (id) {
      const quoteId = parseInt(id);
      loadQuote(quoteId);
      loadVersions(quoteId);
    }
  }, [id, loadQuote, loadVersions]);

  // Update URL when tab changes
  const handleTabChange = useCallback((tabKey: string) => {
    setActiveTab(tabKey);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', tabKey);
    navigate(`/crm/quotes/${id}?${newParams.toString()}`, { replace: true });
  }, [id, navigate, searchParams]);

  // Quote actions
  const handleEdit = useCallback(() => {
    if (quote) {
      navigate(`/crm/quotes/builder/${quote.id}`);
    }
  }, [quote, navigate]);

  const handleDuplicate = useCallback(async () => {
    if (!quote) return;

    try {
      const duplicatedQuote = await duplicateQuote(quote.id);
      showNotification({
        type: 'success',
        title: 'Quote Duplicated',
        message: `Quote has been duplicated successfully.`
      });
      navigate(`/crm/quotes/builder/${duplicatedQuote.id}`);
    } catch (error) {
      console.error('Failed to duplicate quote:', error);
      showNotification({
        type: 'error',
        title: 'Duplication Failed',
        message: 'Failed to duplicate quote. Please try again.'
      });
    }
  }, [quote, duplicateQuote, showNotification, navigate]);

  const handleDelete = useCallback(async () => {
    if (!quote) return;

    try {
      await deleteQuote(quote.id);
      showNotification({
        type: 'success',
        title: 'Quote Deleted',
        message: 'Quote has been deleted successfully.'
      });
      navigate('/crm/quotes');
    } catch (error) {
      console.error('Failed to delete quote:', error);
      showNotification({
        type: 'error',
        title: 'Deletion Failed',
        message: 'Failed to delete quote. Please try again.'
      });
    } finally {
      setShowDeleteModal(false);
    }
  }, [quote, deleteQuote, showNotification, navigate]);

  const handleSubmitApproval = useCallback(async () => {
    if (!quote) return;

    try {
      await submitForApproval(quote.id);
      showNotification({
        type: 'success',
        title: 'Submitted for Approval',
        message: 'Quote has been submitted for approval successfully.'
      });
    } catch (error) {
      console.error('Failed to submit for approval:', error);
      showNotification({
        type: 'error',
        title: 'Submission Failed',
        message: 'Failed to submit quote for approval. Please try again.'
      });
    }
  }, [quote, submitForApproval, showNotification]);

  const handleConvertToOrder = useCallback(async () => {
    if (!quote) return;

    try {
      const result = await convertToOrder(quote.id);
      showNotification({
        type: 'success',
        title: 'Quote Converted',
        message: 'Quote has been converted to order successfully.'
      });
      navigate(`/crm/orders/${result.orderId}`);
    } catch (error) {
      console.error('Failed to convert quote:', error);
      showNotification({
        type: 'error',
        title: 'Conversion Failed',
        message: 'Failed to convert quote to order. Please try again.'
      });
    }
  }, [quote, convertToOrder, showNotification, navigate]);

  const handleGeneratePDF = useCallback(async () => {
    if (!quote) return;

    try {
      await generatePDF(quote.id);
      setShowPDFPreview(true);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      showNotification({
        type: 'error',
        title: 'PDF Generation Failed',
        message: 'Failed to generate PDF. Please try again.'
      });
    }
  }, [quote, generatePDF, showNotification]);

  const handleSendEmail = useCallback(async (emailData: {
    to: string[];
    subject: string;
    message: string;
    includeAttachments: boolean;
  }) => {
    if (!quote) return;

    try {
      await sendEmail(quote.id, emailData);
      showNotification({
        type: 'success',
        title: 'Email Sent',
        message: 'Quote has been sent via email successfully.'
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      showNotification({
        type: 'error',
        title: 'Email Failed',
        message: 'Failed to send quote via email. Please try again.'
      });
    }
  }, [quote, sendEmail, showNotification]);

  // Version management
  const handleCreateVersion = useCallback(async () => {
    if (!quote) return;

    try {
      await createVersion(quote.id);
      showNotification({
        type: 'success',
        title: 'Version Created',
        message: 'New version has been created successfully.'
      });
    } catch (error) {
      console.error('Failed to create version:', error);
      showNotification({
        type: 'error',
        title: 'Version Creation Failed',
        message: 'Failed to create new version. Please try again.'
      });
    }
  }, [quote, createVersion, showNotification]);

  const handleRestoreVersion = useCallback(async (versionId: number) => {
    if (!quote) return;

    try {
      await restoreVersion(quote.id, versionId);
      showNotification({
        type: 'success',
        title: 'Version Restored',
        message: 'Version has been restored successfully.'
      });
    } catch (error) {
      console.error('Failed to restore version:', error);
      showNotification({
        type: 'error',
        title: 'Version Restore Failed',
        message: 'Failed to restore version. Please try again.'
      });
    }
  }, [quote, restoreVersion, showNotification]);

  // Get status icon and color
  const getStatusInfo = (status: Quote['status']) => {
    switch (status) {
      case 'draft':
        return { icon: ClockIcon, color: 'text-gray-500', bg: 'bg-gray-100' };
      case 'sent':
        return { icon: PaperAirplaneIcon, color: 'text-blue-500', bg: 'bg-blue-100' };
      case 'approved':
        return { icon: CheckCircleIcon, color: 'text-green-500', bg: 'bg-green-100' };
      case 'rejected':
        return { icon: XCircleIcon, color: 'text-red-500', bg: 'bg-red-100' };
      case 'accepted':
        return { icon: CheckCircleIcon, color: 'text-green-500', bg: 'bg-green-100' };
      case 'expired':
        return { icon: ExclamationTriangleIcon, color: 'text-orange-500', bg: 'bg-orange-100' };
      case 'converted':
        return { icon: CheckCircleIcon, color: 'text-purple-500', bg: 'bg-purple-100' };
      default:
        return { icon: ClockIcon, color: 'text-gray-500', bg: 'bg-gray-100' };
    }
  };

  // Loading states
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quote...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Quote Not Found</h3>
          <p className="text-gray-600 mb-4">
            {error || 'The requested quote could not be found.'}
          </p>
          <button
            onClick={() => navigate('/crm/quotes')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Quotes
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(quote.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/crm/quotes')}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeftIcon className="w-6 h-6" />
              </button>

              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-3xl font-bold text-gray-900">
                    {quote.title || `Quote ${quote.quoteNumber}`}
                  </h1>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {quote.status.charAt(0).toUpperCase() + quote.status.slice(1).replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                  <span>Quote #{quote.quoteNumber}</span>
                  <span>•</span>
                  <span>Version {quote.version}</span>
                  <span>•</span>
                  <span className="flex items-center">
                    <CurrencyDollarIcon className="w-4 h-4 mr-1" />
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: quote.currencyCode
                    }).format(quote.total)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Approval Status */}
              {quote.approvalStatus !== 'not_required' && (
                <QuoteApprovalStatus
                  status={quote.approvalStatus}
                  processId={quote.approvalProcessId}
                />
              )}

              {/* Action Buttons */}
              <button
                onClick={() => setShowPDFPreview(true)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <EyeIcon className="w-4 h-4 mr-2" />
                Preview
              </button>

              <button
                onClick={handleGeneratePDF}
                disabled={isGenerating}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <DocumentTextIcon className="w-4 h-4 mr-2" />
                {isGenerating ? 'Generating...' : 'PDF'}
              </button>

              <button
                onClick={handleDuplicate}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <DocumentDuplicateIcon className="w-4 h-4 mr-2" />
                Duplicate
              </button>

              <button
                onClick={handleEdit}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <PencilIcon className="w-4 h-4 mr-2" />
                Edit
              </button>

              {quote.status === 'approved' && (
                <button
                  onClick={handleConvertToOrder}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                >
                  Convert to Order
                </button>
              )}

              {quote.status === 'draft' && (
                <button
                  onClick={handleSubmitApproval}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PaperAirplaneIcon className="w-4 h-4 mr-2" />
                  Submit for Approval
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            {QUOTE_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.label}
                {tab.key === 'versions' && versions.length > 1 && (
                  <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                    {versions.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <QuoteHeader
              quote={quote}
              onEdit={handleEdit}
              onSendEmail={handleSendEmail}
            />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <QuoteLineItemsTable
                  lineItems={quote.lineItems}
                  sections={quote.sections}
                  editable={false}
                  onAddItem={() => {}}
                  onEditItem={() => {}}
                  onRemoveItem={() => {}}
                  onReorderItems={() => {}}
                  onUpdateQuantity={() => {}}
                  onUpdateDiscount={() => {}}
                />
              </div>
              <div>
                <QuoteSummary
                  quote={quote}
                  totals={{
                    subtotal: quote.subtotal,
                    totalDiscount: quote.totalDiscount,
                    totalTax: quote.totalTax,
                    total: quote.total,
                    margin: quote.margin
                  }}
                  showBreakdown={true}
                  editable={false}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'line-items' && (
          <QuoteLineItemsTable
            lineItems={quote.lineItems}
            sections={quote.sections}
            editable={false}
            onAddItem={() => {}}
            onEditItem={() => {}}
            onRemoveItem={() => {}}
            onReorderItems={() => {}}
            onUpdateQuantity={() => {}}
            onUpdateDiscount={() => {}}
          />
        )}

        {activeTab === 'versions' && (
          <QuoteVersionManager
            quote={quote}
            versions={versions}
            onCreateVersion={handleCreateVersion}
            onRestoreVersion={handleRestoreVersion}
            onCompareVersions={(v1, v2) => navigate(`/crm/quotes/compare?quotes=${v1},${v2}`)}
          />
        )}

        {activeTab === 'activity' && (
          <QuoteTimeline
            quoteId={quote.id}
          />
        )}

        {activeTab === 'documents' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Documents</h3>
            <div className="space-y-4">
              {quote.documents?.map((document) => (
                <div key={document.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <DocumentTextIcon className="w-8 h-8 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{document.name}</p>
                      <p className="text-sm text-gray-500">
                        Generated on {new Date(document.generatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => window.open(document.url, '_blank')}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    View
                  </button>
                </div>
              ))}

              {(!quote.documents || quote.documents.length === 0) && (
                <div className="text-center py-12">
                  <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by generating a PDF document.</p>
                  <div className="mt-6">
                    <button
                      onClick={handleGeneratePDF}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <DocumentTextIcon className="w-4 h-4 mr-2" />
                      Generate PDF
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* PDF Preview Modal */}
      {showPDFPreview && (
        <QuotePDFPreview
          quoteId={quote.id}
          onClose={() => setShowPDFPreview(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <ExclamationTriangleIcon className="mx-auto mb-4 w-12 h-12 text-red-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Quote</h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to delete this quote? This action cannot be undone.
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuoteDetailPage;