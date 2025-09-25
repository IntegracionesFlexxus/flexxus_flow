// Document Generator Page - Sprint 19 Frontend Implementation

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  Settings,
  Eye,
  Download,
  Send,
  History,
  Template,
  Layers,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

// Local imports
import { DocumentGenerator } from '../components/DocumentGenerator';
import { TemplateGallery } from '../components/TemplateGallery';
import { DocumentPreviewer } from '../components/DocumentPreviewer';
import { GeneratedDocumentsList } from '../components/GeneratedDocumentsList';
import { DocumentAnalytics } from '../components/DocumentAnalytics';
import { useDocumentGeneration } from '../hooks/useDocumentGeneration';
import { useTemplates } from '../hooks/useTemplates';

interface DocumentGeneratorPageProps {
  entityType?: 'quote' | 'opportunity' | 'account' | 'contract';
  entityId?: number;
}

type TabType = 'generator' | 'templates' | 'preview' | 'history' | 'analytics';

export const DocumentGeneratorPage: React.FC<DocumentGeneratorPageProps> = ({
  entityType: propEntityType,
  entityId: propEntityId
}) => {
  const { entityType: urlEntityType, entityId: urlEntityId } = useParams();
  const navigate = useNavigate();

  // Use props or URL params
  const entityType = propEntityType || urlEntityType as ('quote' | 'opportunity' | 'account' | 'contract');
  const entityId = propEntityId || parseInt(urlEntityId || '0');

  // State
  const [activeTab, setActiveTab] = useState<TabType>('generator');
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [previewDocument, setPreviewDocument] = useState<any>(null);
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');

  // Hooks
  const {
    generateDocument,
    batchGenerate,
    isGenerating,
    error: generationError
  } = useDocumentGeneration();

  const {
    templates,
    isLoading: templatesLoading,
    refetch: refetchTemplates
  } = useTemplates();

  // Effects
  useEffect(() => {
    if (entityType && entityId) {
      // Load templates for this entity type
      refetchTemplates();
    }
  }, [entityType, entityId, refetchTemplates]);

  // Handlers
  const handleTemplateSelect = (templateId: number) => {
    setSelectedTemplate(templateId);
    setActiveTab('generator');
  };

  const handleGenerateDocument = async (data: any) => {
    if (!selectedTemplate || !entityType || !entityId) return;

    try {
      setGenerationStatus('generating');
      const result = await generateDocument({
        templateId: selectedTemplate,
        entityType,
        entityId,
        variables: data.variables,
        format: data.format || 'pdf'
      });

      if (result) {
        setPreviewDocument(result);
        setActiveTab('preview');
        setGenerationStatus('success');
      }
    } catch (error) {
      console.error('Failed to generate document:', error);
      setGenerationStatus('error');
    }
  };

  const handlePreviewDocument = (document: any) => {
    setPreviewDocument(document);
    setActiveTab('preview');
  };

  const handleBackToQuote = () => {
    if (entityType === 'quote' && entityId) {
      navigate(`/crm/quotes/${entityId}`);
    } else {
      navigate('/crm/documents');
    }
  };

  // Tab configuration
  const tabs = [
    {
      id: 'generator' as TabType,
      label: 'Generate Document',
      icon: FileText,
      description: 'Create new documents from templates'
    },
    {
      id: 'templates' as TabType,
      label: 'Template Gallery',
      icon: Template,
      description: 'Browse and select document templates'
    },
    {
      id: 'preview' as TabType,
      label: 'Preview',
      icon: Eye,
      description: 'Preview generated documents',
      disabled: !previewDocument
    },
    {
      id: 'history' as TabType,
      label: 'History',
      icon: History,
      description: 'View previously generated documents'
    },
    {
      id: 'analytics' as TabType,
      label: 'Analytics',
      icon: BarChart3,
      description: 'Document usage analytics'
    }
  ];

  // Status indicator
  const getStatusIndicator = () => {
    switch (generationStatus) {
      case 'generating':
        return (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg">
            <Clock className="w-4 h-4 animate-spin" />
            <span>Generating document...</span>
          </div>
        );
      case 'success':
        return (
          <div className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg">
            <CheckCircle className="w-4 h-4" />
            <span>Document generated successfully</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg">
            <AlertTriangle className="w-4 h-4" />
            <span>Failed to generate document</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackToQuote}
              className="text-gray-500 hover:text-gray-700"
            >
              ←
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Document Generator
              </h1>
              {entityType && entityId && (
                <p className="text-sm text-gray-500">
                  Generating documents for {entityType} #{entityId}
                </p>
              )}
            </div>
          </div>

          {/* Status Indicator */}
          {getStatusIndicator()}

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/crm/documents/templates')}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Settings className="w-4 h-4" />
              <span>Manage Templates</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex mt-6 border-b border-gray-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isDisabled = tab.disabled;

            return (
              <button
                key={tab.id}
                onClick={() => !isDisabled && setActiveTab(tab.id)}
                disabled={isDisabled}
                className={`
                  flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm
                  transition-colors duration-200
                  ${isActive
                    ? 'border-blue-500 text-blue-600'
                    : isDisabled
                    ? 'border-transparent text-gray-400 cursor-not-allowed'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
                title={tab.description}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'generator' && (
          <DocumentGenerator
            entityType={entityType}
            entityId={entityId}
            selectedTemplateId={selectedTemplate}
            onGenerate={handleGenerateDocument}
            isGenerating={isGenerating}
            error={generationError}
          />
        )}

        {activeTab === 'templates' && (
          <TemplateGallery
            entityType={entityType}
            onTemplateSelect={handleTemplateSelect}
            selectedTemplateId={selectedTemplate}
          />
        )}

        {activeTab === 'preview' && previewDocument && (
          <DocumentPreviewer
            document={previewDocument}
            onDownload={() => {}}
            onSend={() => {}}
            onEdit={() => setActiveTab('generator')}
          />
        )}

        {activeTab === 'history' && (
          <GeneratedDocumentsList
            entityType={entityType}
            entityId={entityId}
            onPreview={handlePreviewDocument}
            onRegenerate={(document) => {
              setSelectedTemplate(document.templateId);
              setActiveTab('generator');
            }}
          />
        )}

        {activeTab === 'analytics' && (
          <DocumentAnalytics
            entityType={entityType}
            entityId={entityId}
          />
        )}
      </div>
    </div>
  );
};

export default DocumentGeneratorPage;