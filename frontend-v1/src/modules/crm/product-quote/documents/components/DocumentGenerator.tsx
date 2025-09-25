// Document Generator Component - Sprint 19 Frontend Implementation

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Settings,
  Eye,
  Download,
  Send,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Upload,
  Tag,
  Calendar,
  User,
  Building,
  DollarSign,
  Hash,
  Type,
  Image,
  Link,
  Mail
} from 'lucide-react';

// Local imports
import { TemplateVariablesManager } from './TemplateVariablesManager';
import { DocumentPreviewer } from './DocumentPreviewer';
import { useTemplates } from '../hooks/useTemplates';
import { useDocumentGeneration } from '../hooks/useDocumentGeneration';

interface DocumentGeneratorProps {
  entityType?: 'quote' | 'opportunity' | 'account' | 'contract';
  entityId?: number;
  selectedTemplateId?: number | null;
  onGenerate?: (data: any) => void;
  isGenerating?: boolean;
  error?: string | null;
}

interface FormData {
  templateId: number;
  format: 'pdf' | 'word' | 'excel' | 'html';
  variables: Record<string, any>;
  customBranding?: {
    logo?: string;
    colors?: {
      primary: string;
      secondary: string;
    };
    fonts?: {
      heading: string;
      body: string;
    };
  };
  language: string;
  fileName?: string;
  options: {
    includeAttachments: boolean;
    watermark: boolean;
    protection: boolean;
    digitalSignature: boolean;
  };
}

interface TemplateVariable {
  name: string;
  type: 'text' | 'number' | 'date' | 'currency' | 'percentage' | 'image' | 'url' | 'email';
  label: string;
  description?: string;
  required: boolean;
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  options?: string[];
}

export const DocumentGenerator: React.FC<DocumentGeneratorProps> = ({
  entityType,
  entityId,
  selectedTemplateId,
  onGenerate,
  isGenerating = false,
  error
}) => {
  // State
  const [formData, setFormData] = useState<FormData>({
    templateId: selectedTemplateId || 0,
    format: 'pdf',
    variables: {},
    language: 'en',
    options: {
      includeAttachments: false,
      watermark: false,
      protection: false,
      digitalSignature: false
    }
  });

  const [activeStep, setActiveStep] = useState<'template' | 'variables' | 'options' | 'preview'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [templateVariables, setTemplateVariables] = useState<TemplateVariable[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showBrandingOptions, setShowBrandingOptions] = useState(false);

  // Hooks
  const {
    templates,
    getTemplate,
    getTemplateVariables,
    isLoading: templatesLoading
  } = useTemplates();

  const {
    previewDocument,
    validateVariables
  } = useDocumentGeneration();

  // Effects
  useEffect(() => {
    if (selectedTemplateId && selectedTemplateId !== formData.templateId) {
      setFormData(prev => ({ ...prev, templateId: selectedTemplateId }));
      loadTemplate(selectedTemplateId);
    }
  }, [selectedTemplateId]);

  useEffect(() => {
    if (formData.templateId && formData.templateId > 0) {
      loadTemplate(formData.templateId);
    }
  }, [formData.templateId]);

  // Handlers
  const loadTemplate = async (templateId: number) => {
    try {
      const template = await getTemplate(templateId);
      const variables = await getTemplateVariables(templateId);

      setSelectedTemplate(template);
      setTemplateVariables(variables);

      // Initialize variables with default values
      const initialVariables: Record<string, any> = {};
      variables.forEach(variable => {
        if (variable.defaultValue !== undefined) {
          initialVariables[variable.name] = variable.defaultValue;
        }
      });

      setFormData(prev => ({
        ...prev,
        variables: initialVariables
      }));
    } catch (error) {
      console.error('Failed to load template:', error);
    }
  };

  const handleTemplateSelect = (templateId: number) => {
    setFormData(prev => ({ ...prev, templateId }));
    setActiveStep('variables');
  };

  const handleVariableChange = (name: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      variables: {
        ...prev.variables,
        [name]: value
      }
    }));

    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    // Validate required variables
    templateVariables.forEach(variable => {
      if (variable.required) {
        const value = formData.variables[variable.name];
        if (value === undefined || value === null || value === '') {
          errors[variable.name] = `${variable.label} is required`;
        }
      }

      // Validate by type
      const value = formData.variables[variable.name];
      if (value !== undefined && value !== null && value !== '') {
        switch (variable.type) {
          case 'email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
              errors[variable.name] = 'Invalid email format';
            }
            break;
          case 'url':
            try {
              new URL(value);
            } catch {
              errors[variable.name] = 'Invalid URL format';
            }
            break;
          case 'number':
            if (isNaN(Number(value))) {
              errors[variable.name] = 'Must be a valid number';
            }
            break;
        }

        // Validate patterns
        if (variable.validation?.pattern) {
          const regex = new RegExp(variable.validation.pattern);
          if (!regex.test(value)) {
            errors[variable.name] = 'Invalid format';
          }
        }

        // Validate min/max
        if (variable.type === 'number' && !isNaN(Number(value))) {
          const numValue = Number(value);
          if (variable.validation?.min !== undefined && numValue < variable.validation.min) {
            errors[variable.name] = `Must be at least ${variable.validation.min}`;
          }
          if (variable.validation?.max !== undefined && numValue > variable.validation.max) {
            errors[variable.name] = `Must be no more than ${variable.validation.max}`;
          }
        }
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleGenerate = () => {
    if (!validateForm()) {
      return;
    }

    onGenerate?.(formData);
  };

  const handlePreview = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const preview = await previewDocument({
        templateId: formData.templateId,
        variables: formData.variables,
        format: 'html'
      });

      setActiveStep('preview');
    } catch (error) {
      console.error('Failed to generate preview:', error);
    }
  };

  // Render variable input
  const renderVariableInput = (variable: TemplateVariable) => {
    const value = formData.variables[variable.name] || '';
    const hasError = !!validationErrors[variable.name];

    const baseClasses = `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
      hasError ? 'border-red-300' : 'border-gray-300'
    }`;

    const renderInput = () => {
      switch (variable.type) {
        case 'text':
          return (
            <input
              type="text"
              value={value}
              onChange={(e) => handleVariableChange(variable.name, e.target.value)}
              className={baseClasses}
              placeholder={variable.description}
            />
          );

        case 'number':
          return (
            <input
              type="number"
              value={value}
              onChange={(e) => handleVariableChange(variable.name, Number(e.target.value))}
              className={baseClasses}
              placeholder={variable.description}
              min={variable.validation?.min}
              max={variable.validation?.max}
            />
          );

        case 'date':
          return (
            <input
              type="date"
              value={value}
              onChange={(e) => handleVariableChange(variable.name, e.target.value)}
              className={baseClasses}
            />
          );

        case 'currency':
          return (
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="number"
                value={value}
                onChange={(e) => handleVariableChange(variable.name, Number(e.target.value))}
                className={`${baseClasses} pl-10`}
                placeholder="0.00"
                step="0.01"
              />
            </div>
          );

        case 'percentage':
          return (
            <div className="relative">
              <input
                type="number"
                value={value}
                onChange={(e) => handleVariableChange(variable.name, Number(e.target.value))}
                className={`${baseClasses} pr-8`}
                placeholder="0"
                min="0"
                max="100"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">%</span>
            </div>
          );

        case 'email':
          return (
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="email"
                value={value}
                onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                className={`${baseClasses} pl-10`}
                placeholder="email@example.com"
              />
            </div>
          );

        case 'url':
          return (
            <div className="relative">
              <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="url"
                value={value}
                onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                className={`${baseClasses} pl-10`}
                placeholder="https://example.com"
              />
            </div>
          );

        case 'image':
          return (
            <div className="space-y-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    // Convert to base64 or upload to server
                    const reader = new FileReader();
                    reader.onload = () => {
                      handleVariableChange(variable.name, reader.result);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className={baseClasses}
              />
              {value && (
                <img src={value} alt="Preview" className="w-20 h-20 object-cover rounded" />
              )}
            </div>
          );

        default:
          if (variable.options && variable.options.length > 0) {
            return (
              <select
                value={value}
                onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                className={baseClasses}
              >
                <option value="">Select option...</option>
                {variable.options.map((option, index) => (
                  <option key={index} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            );
          }

          return (
            <textarea
              value={value}
              onChange={(e) => handleVariableChange(variable.name, e.target.value)}
              className={`${baseClasses} min-h-20 resize-y`}
              placeholder={variable.description}
            />
          );
      }
    };

    return (
      <div key={variable.name} className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {variable.label}
          {variable.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {renderInput()}
        {variable.description && (
          <p className="text-xs text-gray-500">{variable.description}</p>
        )}
        {hasError && (
          <p className="text-xs text-red-600">{validationErrors[variable.name]}</p>
        )}
      </div>
    );
  };

  // Step indicators
  const steps = [
    { id: 'template', label: 'Select Template', icon: FileText },
    { id: 'variables', label: 'Configure Variables', icon: Tag },
    { id: 'options', label: 'Document Options', icon: Settings },
    { id: 'preview', label: 'Preview & Generate', icon: Eye }
  ];

  const currentStepIndex = steps.findIndex(step => step.id === activeStep);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Step Indicator */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = step.id === activeStep;
            const isCompleted = index < currentStepIndex;
            const isAccessible = index <= currentStepIndex;

            return (
              <div key={step.id} className="flex items-center">
                <div className="flex items-center">
                  <button
                    onClick={() => isAccessible && setActiveStep(step.id as any)}
                    disabled={!isAccessible}
                    className={`
                      flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors
                      ${isActive
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : isCompleted
                        ? 'border-green-500 bg-green-500 text-white'
                        : isAccessible
                        ? 'border-gray-300 text-gray-500 hover:border-blue-300'
                        : 'border-gray-200 text-gray-300 cursor-not-allowed'
                      }
                    `}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </button>
                  <span className={`ml-2 text-sm font-medium ${
                    isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-4 ${
                    index < currentStepIndex ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* Template Selection */}
        {activeStep === 'template' && (
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-2">
                Select Document Template
              </h2>
              <p className="text-sm text-gray-600">
                Choose a template to generate your document from.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates?.map((template) => (
                <div
                  key={template.id}
                  className={`
                    border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md
                    ${formData.templateId === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                  onClick={() => handleTemplateSelect(template.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {template.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {template.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {template.category}
                        </span>
                        <span className="text-xs text-gray-500">
                          {template.language || 'EN'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Variables Configuration */}
        {activeStep === 'variables' && (
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-2">
                Configure Template Variables
              </h2>
              <p className="text-sm text-gray-600">
                Fill in the required information for your document.
              </p>
            </div>

            {templateVariables.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {templateVariables.map(renderVariableInput)}
              </div>
            ) : (
              <div className="text-center py-12">
                <Tag className="mx-auto w-12 h-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">No variables required</h3>
                <p className="mt-2 text-sm text-gray-500">
                  This template doesn't require any variables to be configured.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Document Options */}
        {activeStep === 'options' && (
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-2">
                Document Options
              </h2>
              <p className="text-sm text-gray-600">
                Configure how your document should be generated.
              </p>
            </div>

            <div className="space-y-6">
              {/* Format Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Output Format
                </label>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {[
                    { value: 'pdf', label: 'PDF', icon: FileText },
                    { value: 'word', label: 'Word', icon: FileText },
                    { value: 'excel', label: 'Excel', icon: FileText },
                    { value: 'html', label: 'HTML', icon: FileText }
                  ].map((format) => {
                    const Icon = format.icon;
                    return (
                      <button
                        key={format.value}
                        onClick={() => setFormData(prev => ({ ...prev, format: format.value as any }))}
                        className={`
                          flex items-center gap-2 p-3 border rounded-lg transition-colors
                          ${formData.format === format.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                          }
                        `}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="font-medium">{format.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Language Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Language
                </label>
                <select
                  value={formData.language}
                  onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value }))}
                  className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="it">Italian</option>
                </select>
              </div>

              {/* File Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom File Name (Optional)
                </label>
                <input
                  type="text"
                  value={formData.fileName || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, fileName: e.target.value }))}
                  className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Leave empty for auto-generated name"
                />
              </div>

              {/* Document Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Additional Options
                </label>
                <div className="space-y-3">
                  {[
                    { key: 'includeAttachments', label: 'Include Attachments', description: 'Attach related files to the document' },
                    { key: 'watermark', label: 'Add Watermark', description: 'Add a watermark to protect the document' },
                    { key: 'protection', label: 'Password Protection', description: 'Require password to open the document' },
                    { key: 'digitalSignature', label: 'Digital Signature', description: 'Add digital signature for authenticity' }
                  ].map((option) => (
                    <label key={option.key} className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={formData.options[option.key as keyof typeof formData.options]}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          options: {
                            ...prev.options,
                            [option.key]: e.target.checked
                          }
                        }))}
                        className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{option.label}</div>
                        <div className="text-xs text-gray-500">{option.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Custom Branding */}
              <div>
                <button
                  onClick={() => setShowBrandingOptions(!showBrandingOptions)}
                  className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  <Settings className="w-4 h-4" />
                  {showBrandingOptions ? 'Hide' : 'Show'} Custom Branding Options
                </button>

                {showBrandingOptions && (
                  <div className="mt-4 p-4 border border-gray-200 rounded-lg space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Primary Color
                      </label>
                      <input
                        type="color"
                        value={formData.customBranding?.colors?.primary || '#3B82F6'}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          customBranding: {
                            ...prev.customBranding,
                            colors: {
                              ...prev.customBranding?.colors,
                              primary: e.target.value
                            }
                          }
                        }))}
                        className="w-16 h-8 border border-gray-300 rounded"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Secondary Color
                      </label>
                      <input
                        type="color"
                        value={formData.customBranding?.colors?.secondary || '#6B7280'}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          customBranding: {
                            ...prev.customBranding,
                            colors: {
                              ...prev.customBranding?.colors,
                              secondary: e.target.value
                            }
                          }
                        }))}
                        className="w-16 h-8 border border-gray-300 rounded"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Preview */}
        {activeStep === 'preview' && (
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-2">
                Preview & Generate
              </h2>
              <p className="text-sm text-gray-600">
                Review your document before generating the final version.
              </p>
            </div>

            {/* Document preview would be rendered here */}
            <div className="border border-gray-200 rounded-lg p-8 text-center">
              <FileText className="mx-auto w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Document Preview</h3>
              <p className="text-sm text-gray-500 mb-6">
                Preview will be generated when you click the preview button below.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="border-t border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            {error && (
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {activeStep !== 'template' && (
              <button
                onClick={() => {
                  const currentIndex = steps.findIndex(s => s.id === activeStep);
                  if (currentIndex > 0) {
                    setActiveStep(steps[currentIndex - 1].id as any);
                  }
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Previous
              </button>
            )}

            {activeStep === 'preview' ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePreview}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Generate Document
                    </>
                  )}
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  const currentIndex = steps.findIndex(s => s.id === activeStep);
                  if (currentIndex < steps.length - 1) {
                    setActiveStep(steps[currentIndex + 1].id as any);
                  }
                }}
                disabled={
                  (activeStep === 'template' && !formData.templateId) ||
                  (activeStep === 'variables' && !validateForm())
                }
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {activeStep === 'options' ? 'Preview' : 'Next'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentGenerator;