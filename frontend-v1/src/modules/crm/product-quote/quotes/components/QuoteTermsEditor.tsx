// QuoteTermsEditor - Sprint 19 Frontend Implementation
// Terms and conditions editor

import React, { useState, useCallback } from 'react';
import {
  DocumentTextIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { QuoteTerms, TermSection } from '../../shared/types';

interface QuoteTermsEditorProps {
  terms?: QuoteTerms;
  onUpdate: (terms: QuoteTerms) => void;
}

const TEMPLATE_TERMS = {
  paymentTerms: [
    'Net 30 days',
    'Net 15 days',
    'Due upon receipt',
    '50% upfront, 50% on completion',
    'Payment by credit card or bank transfer'
  ],
  deliveryTerms: [
    '5-7 business days',
    '2-3 weeks',
    'Standard delivery within 10 business days',
    'Express delivery available',
    'Digital delivery within 24 hours'
  ],
  warrantyTerms: [
    '1 year limited warranty',
    '90 day warranty',
    'Warranty as per manufacturer terms',
    'No warranty - sold as is',
    'Extended warranty available'
  ],
  supportTerms: [
    '90 days free support included',
    'Email support only',
    'Phone and email support',
    'Premium support package available',
    '24/7 support included'
  ]
};

export const QuoteTermsEditor: React.FC<QuoteTermsEditorProps> = ({
  terms = {},
  onUpdate
}) => {
  const [localTerms, setLocalTerms] = useState<QuoteTerms>(terms);
  const [showTemplates, setShowTemplates] = useState<string | null>(null);

  const handleFieldChange = useCallback((field: keyof QuoteTerms, value: string) => {
    const updatedTerms = { ...localTerms, [field]: value };
    setLocalTerms(updatedTerms);
    onUpdate(updatedTerms);
  }, [localTerms, onUpdate]);

  const handleAddCustomTerm = useCallback(() => {
    const customTerms = localTerms.customTerms || [];
    const newTerm: TermSection = {
      title: 'Custom Term',
      content: '',
      isRequired: false
    };

    const updatedTerms = {
      ...localTerms,
      customTerms: [...customTerms, newTerm]
    };
    setLocalTerms(updatedTerms);
    onUpdate(updatedTerms);
  }, [localTerms, onUpdate]);

  const handleUpdateCustomTerm = useCallback((index: number, updates: Partial<TermSection>) => {
    const customTerms = [...(localTerms.customTerms || [])];
    customTerms[index] = { ...customTerms[index], ...updates };

    const updatedTerms = { ...localTerms, customTerms };
    setLocalTerms(updatedTerms);
    onUpdate(updatedTerms);
  }, [localTerms, onUpdate]);

  const handleRemoveCustomTerm = useCallback((index: number) => {
    const customTerms = [...(localTerms.customTerms || [])];
    customTerms.splice(index, 1);

    const updatedTerms = { ...localTerms, customTerms };
    setLocalTerms(updatedTerms);
    onUpdate(updatedTerms);
  }, [localTerms, onUpdate]);

  const handleSelectTemplate = useCallback((field: keyof typeof TEMPLATE_TERMS, template: string) => {
    handleFieldChange(field as keyof QuoteTerms, template);
    setShowTemplates(null);
  }, [handleFieldChange]);

  return (
    <div className="space-y-6">
      {/* Standard Terms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payment Terms */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Terms
          </label>
          <div className="relative">
            <textarea
              value={localTerms.paymentTerms || ''}
              onChange={(e) => handleFieldChange('paymentTerms', e.target.value)}
              className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Enter payment terms..."
            />
            <button
              onClick={() => setShowTemplates(showTemplates === 'paymentTerms' ? null : 'paymentTerms')}
              className="absolute top-2 right-2 text-xs text-blue-600 hover:text-blue-800"
            >
              Templates
            </button>
            {showTemplates === 'paymentTerms' && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg">
                {TEMPLATE_TERMS.paymentTerms.map((template, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectTemplate('paymentTerms', template)}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                  >
                    {template}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Delivery Terms */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Delivery Terms
          </label>
          <div className="relative">
            <textarea
              value={localTerms.deliveryTerms || ''}
              onChange={(e) => handleFieldChange('deliveryTerms', e.target.value)}
              className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Enter delivery terms..."
            />
            <button
              onClick={() => setShowTemplates(showTemplates === 'deliveryTerms' ? null : 'deliveryTerms')}
              className="absolute top-2 right-2 text-xs text-blue-600 hover:text-blue-800"
            >
              Templates
            </button>
            {showTemplates === 'deliveryTerms' && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg">
                {TEMPLATE_TERMS.deliveryTerms.map((template, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectTemplate('deliveryTerms', template)}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                  >
                    {template}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Warranty Terms */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Warranty Terms
          </label>
          <div className="relative">
            <textarea
              value={localTerms.warrantyTerms || ''}
              onChange={(e) => handleFieldChange('warrantyTerms', e.target.value)}
              className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Enter warranty terms..."
            />
            <button
              onClick={() => setShowTemplates(showTemplates === 'warrantyTerms' ? null : 'warrantyTerms')}
              className="absolute top-2 right-2 text-xs text-blue-600 hover:text-blue-800"
            >
              Templates
            </button>
            {showTemplates === 'warrantyTerms' && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg">
                {TEMPLATE_TERMS.warrantyTerms.map((template, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectTemplate('warrantyTerms', template)}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                  >
                    {template}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Support Terms */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Support Terms
          </label>
          <div className="relative">
            <textarea
              value={localTerms.supportTerms || ''}
              onChange={(e) => handleFieldChange('supportTerms', e.target.value)}
              className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Enter support terms..."
            />
            <button
              onClick={() => setShowTemplates(showTemplates === 'supportTerms' ? null : 'supportTerms')}
              className="absolute top-2 right-2 text-xs text-blue-600 hover:text-blue-800"
            >
              Templates
            </button>
            {showTemplates === 'supportTerms' && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg">
                {TEMPLATE_TERMS.supportTerms.map((template, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectTemplate('supportTerms', template)}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                  >
                    {template}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom Terms */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-gray-900">Custom Terms</h4>
          <button
            onClick={handleAddCustomTerm}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Custom Term
          </button>
        </div>

        {localTerms.customTerms && localTerms.customTerms.length > 0 ? (
          <div className="space-y-4">
            {localTerms.customTerms.map((term, index) => (
              <div key={index} className="border border-gray-300 rounded-md p-4">
                <div className="flex items-center justify-between mb-3">
                  <input
                    type="text"
                    value={term.title}
                    onChange={(e) => handleUpdateCustomTerm(index, { title: e.target.value })}
                    className="text-sm font-medium border-none p-0 focus:outline-none focus:ring-0 bg-transparent"
                    placeholder="Term title"
                  />
                  <div className="flex items-center space-x-2">
                    <label className="flex items-center text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={term.isRequired}
                        onChange={(e) => handleUpdateCustomTerm(index, { isRequired: e.target.checked })}
                        className="mr-1 rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      Required
                    </label>
                    <button
                      onClick={() => handleRemoveCustomTerm(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <textarea
                  value={term.content}
                  onChange={(e) => handleUpdateCustomTerm(index, { content: e.target.value })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Enter term content..."
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <DocumentTextIcon className="mx-auto h-8 w-8 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No custom terms</h3>
            <p className="mt-1 text-sm text-gray-500">
              Add custom terms and conditions specific to this quote.
            </p>
          </div>
        )}
      </div>

      {/* Cancellation Terms */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cancellation Terms
        </label>
        <textarea
          value={localTerms.cancellationTerms || ''}
          onChange={(e) => handleFieldChange('cancellationTerms', e.target.value)}
          className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          placeholder="Enter cancellation terms..."
        />
      </div>
    </div>
  );
};

export default QuoteTermsEditor;