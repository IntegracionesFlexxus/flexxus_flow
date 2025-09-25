// QuoteBuilderPage - Sprint 19 Frontend Implementation
// Main quote builder with step-by-step wizard

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  CheckIcon,
  DocumentDuplicateIcon,
  ShoppingCartIcon,
  CalculatorIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

// Internal imports
import { useQuoteBuilder } from '../hooks/useQuoteBuilder';
import { useQuotes } from '../hooks/useQuotes';
import { useNotification } from '../../../../../shared/hooks/useNotification';
import { QuoteBuilder } from '../components/QuoteBuilder';
import { QuoteBuilderProps, Quote } from '../../shared/types';

// Step definitions for the quote builder wizard
const BUILDER_STEPS = [
  {
    id: 'basic-info',
    title: 'Basic Information',
    description: 'Quote title, customer, and basic details',
    icon: DocumentDuplicateIcon,
    isRequired: true
  },
  {
    id: 'line-items',
    title: 'Products & Services',
    description: 'Add products, services, and configure items',
    icon: ShoppingCartIcon,
    isRequired: true
  },
  {
    id: 'pricing',
    title: 'Pricing & Discounts',
    description: 'Apply discounts and configure pricing',
    icon: CalculatorIcon,
    isRequired: false
  },
  {
    id: 'terms',
    title: 'Terms & Conditions',
    description: 'Payment terms, delivery, and legal conditions',
    icon: DocumentTextIcon,
    isRequired: false
  },
  {
    id: 'review',
    title: 'Review & Submit',
    description: 'Final review before saving or submitting',
    icon: CheckCircleIcon,
    isRequired: true
  }
];

export const QuoteBuilderPage: React.FC = () => {
  const { id: quoteIdParam } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  // Extract query parameters
  const customerId = searchParams.get('customerId') ? parseInt(searchParams.get('customerId')!) : undefined;
  const accountId = searchParams.get('accountId') ? parseInt(searchParams.get('accountId')!) : undefined;
  const opportunityId = searchParams.get('opportunityId') ? parseInt(searchParams.get('opportunityId')!) : undefined;
  const duplicateFrom = searchParams.get('duplicateFrom') ? parseInt(searchParams.get('duplicateFrom')!) : undefined;

  // State management
  const [currentStep, setCurrentStep] = useState<string>('basic-info');
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [isExiting, setIsExiting] = useState(false);
  const [saveInProgress, setSaveInProgress] = useState(false);

  // Custom hooks
  const {
    quote,
    isLoading: builderLoading,
    isDirty,
    isValid,
    validationErrors,
    initializeQuote,
    validateStep,
    save: saveQuote,
    submitForApproval,
    reset: resetBuilder
  } = useQuoteBuilder();

  const {
    duplicateQuote,
    isLoading: quotesLoading
  } = useQuotes();

  // Initialize the quote builder
  useEffect(() => {
    const initializeBuilder = async () => {
      try {
        if (quoteIdParam) {
          // Edit existing quote
          await initializeQuote({ quoteId: parseInt(quoteIdParam) });
        } else if (duplicateFrom) {
          // Duplicate from existing quote
          const duplicatedQuote = await duplicateQuote(duplicateFrom);
          await initializeQuote({ quote: duplicatedQuote });
        } else {
          // Create new quote
          const initialData: Partial<Quote> = {
            customerId,
            accountId,
            opportunityId,
            status: 'draft' as const,
            type: 'standard' as const,
            currencyCode: 'USD', // Default currency
            exchangeRate: 1,
            lineItems: [],
            sections: []
          };
          await initializeQuote({ quote: initialData });
        }
      } catch (error) {
        console.error('Failed to initialize quote builder:', error);
        showNotification({
          type: 'error',
          title: 'Initialization Failed',
          message: 'Failed to initialize quote builder. Please try again.'
        });
        navigate('/crm/quotes');
      }
    };

    initializeBuilder();
  }, [quoteIdParam, duplicateFrom, customerId, accountId, opportunityId]);

  // Handle step validation and completion
  const handleStepComplete = useCallback((stepId: string) => {
    const isStepValid = validateStep(stepId);
    if (isStepValid) {
      setCompletedSteps(prev => new Set([...prev, stepId]));
      return true;
    }
    return false;
  }, [validateStep]);

  // Navigate to next step
  const handleNextStep = useCallback(() => {
    if (handleStepComplete(currentStep)) {
      const currentIndex = BUILDER_STEPS.findIndex(step => step.id === currentStep);
      if (currentIndex < BUILDER_STEPS.length - 1) {
        setCurrentStep(BUILDER_STEPS[currentIndex + 1].id);
      }
    } else {
      showNotification({
        type: 'warning',
        title: 'Validation Required',
        message: 'Please complete all required fields before proceeding to the next step.'
      });
    }
  }, [currentStep, handleStepComplete, showNotification]);

  // Navigate to previous step
  const handlePreviousStep = useCallback(() => {
    const currentIndex = BUILDER_STEPS.findIndex(step => step.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(BUILDER_STEPS[currentIndex - 1].id);
    }
  }, [currentStep]);

  // Navigate directly to a step
  const handleStepClick = useCallback((stepId: string) => {
    const stepIndex = BUILDER_STEPS.findIndex(step => step.id === stepId);
    const currentIndex = BUILDER_STEPS.findIndex(step => step.id === currentStep);

    if (stepIndex <= currentIndex || completedSteps.has(stepId)) {
      setCurrentStep(stepId);
    } else {
      showNotification({
        type: 'info',
        title: 'Complete Previous Steps',
        message: 'Please complete previous steps before accessing this step.'
      });
    }
  }, [currentStep, completedSteps, showNotification]);

  // Save quote as draft
  const handleSave = useCallback(async () => {
    if (!quote) return;

    setSaveInProgress(true);
    try {
      await saveQuote();
      showNotification({
        type: 'success',
        title: 'Quote Saved',
        message: 'Quote has been saved successfully as draft.'
      });
    } catch (error) {
      console.error('Failed to save quote:', error);
      showNotification({
        type: 'error',
        title: 'Save Failed',
        message: 'Failed to save quote. Please try again.'
      });
    } finally {
      setSaveInProgress(false);
    }
  }, [quote, saveQuote, showNotification]);

  // Submit for approval
  const handleSubmitApproval = useCallback(async () => {
    if (!quote || !isValid) {
      showNotification({
        type: 'warning',
        title: 'Validation Required',
        message: 'Please complete all required fields before submitting for approval.'
      });
      return;
    }

    try {
      await submitForApproval();
      showNotification({
        type: 'success',
        title: 'Submitted for Approval',
        message: 'Quote has been submitted for approval successfully.'
      });
      navigate('/crm/quotes');
    } catch (error) {
      console.error('Failed to submit for approval:', error);
      showNotification({
        type: 'error',
        title: 'Submission Failed',
        message: 'Failed to submit quote for approval. Please try again.'
      });
    }
  }, [quote, isValid, submitForApproval, showNotification, navigate]);

  // Handle exit with unsaved changes check
  const handleExit = useCallback(() => {
    if (isDirty) {
      setIsExiting(true);
    } else {
      navigate('/crm/quotes');
    }
  }, [isDirty, navigate]);

  // Confirm exit without saving
  const handleConfirmExit = useCallback(() => {
    resetBuilder();
    navigate('/crm/quotes');
  }, [resetBuilder, navigate]);

  // Cancel exit
  const handleCancelExit = useCallback(() => {
    setIsExiting(false);
  }, []);

  // Get current step configuration
  const currentStepConfig = BUILDER_STEPS.find(step => step.id === currentStep);
  const currentStepIndex = BUILDER_STEPS.findIndex(step => step.id === currentStep);

  // Loading states
  if (builderLoading || quotesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quote builder...</p>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleExit}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">
                    {quote?.id ? `Edit Quote ${quote.quoteNumber}` : 'New Quote'}
                  </h1>
                  <p className="text-sm text-gray-600">
                    Step {currentStepIndex + 1} of {BUILDER_STEPS.length}: {currentStepConfig?.title}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {isDirty && (
                  <span className="flex items-center text-sm text-amber-600">
                    <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                    Unsaved changes
                  </span>
                )}

                <button
                  onClick={handleSave}
                  disabled={saveInProgress}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {saveInProgress ? 'Saving...' : 'Save Draft'}
                </button>

                {currentStep === 'review' && (
                  <button
                    onClick={handleSubmitApproval}
                    disabled={!isValid}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    Submit for Approval
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Progress Stepper */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8 py-4" aria-label="Progress">
              {BUILDER_STEPS.map((step, index) => {
                const isActive = step.id === currentStep;
                const isCompleted = completedSteps.has(step.id);
                const isAccessible = index <= currentStepIndex || isCompleted;
                const Icon = step.icon;

                return (
                  <button
                    key={step.id}
                    onClick={() => isAccessible && handleStepClick(step.id)}
                    disabled={!isAccessible}
                    className={`
                      flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors
                      ${isActive
                        ? 'bg-blue-50 text-blue-700 border-2 border-blue-200'
                        : isCompleted
                        ? 'text-green-600 hover:bg-green-50'
                        : isAccessible
                        ? 'text-gray-600 hover:bg-gray-50'
                        : 'text-gray-400 cursor-not-allowed'
                      }
                    `}
                  >
                    <div className={`
                      flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                      ${isCompleted
                        ? 'bg-green-100 text-green-600'
                        : isActive
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-100 text-gray-400'
                      }
                    `}>
                      {isCompleted ? (
                        <CheckIcon className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <div className="text-left">
                      <div className={`text-sm font-medium ${isActive ? 'text-blue-900' : ''}`}>
                        {step.title}
                      </div>
                      <div className="text-xs text-gray-500">
                        {step.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm">
            {quote && (
              <QuoteBuilder
                quote={quote}
                currentStep={currentStep}
                validationErrors={validationErrors}
                onStepComplete={handleStepComplete}
              />
            )}
          </div>
        </div>

        {/* Step Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={handlePreviousStep}
                disabled={currentStepIndex === 0}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              <div className="flex items-center space-x-2">
                {validationErrors.length > 0 && (
                  <span className="flex items-center text-sm text-red-600">
                    <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                    {validationErrors.length} validation error{validationErrors.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <button
                onClick={handleNextStep}
                disabled={currentStepIndex === BUILDER_STEPS.length - 1}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {currentStepIndex === BUILDER_STEPS.length - 1 ? 'Complete' : 'Next'}
              </button>
            </div>
          </div>
        </div>

        {/* Exit Confirmation Modal */}
        {isExiting && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <ExclamationTriangleIcon className="mx-auto mb-4 w-12 h-12 text-yellow-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Unsaved Changes
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  You have unsaved changes. Are you sure you want to exit without saving?
                </p>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={handleCancelExit}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmExit}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Exit Without Saving
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DndProvider>
  );
};

export default QuoteBuilderPage;