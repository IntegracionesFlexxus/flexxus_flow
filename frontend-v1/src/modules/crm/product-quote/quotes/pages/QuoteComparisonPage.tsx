// QuoteComparisonPage - Sprint 19 Frontend Implementation
// Compare multiple quotes side by side

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ScaleIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  UserIcon,
  ClockIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

// Internal imports
import { useQuotes } from '../hooks/useQuotes';
import { useNotification } from '../../../../../shared/hooks/useNotification';
import { QuoteComparison } from '../components/QuoteComparison';
import {
  Quote,
  QuoteLineItem,
  QuoteTotals
} from '../../shared/types';

// Comparison criteria
const COMPARISON_CRITERIA = [
  { key: 'basic-info', label: 'Basic Information', icon: DocumentTextIcon },
  { key: 'pricing', label: 'Pricing & Totals', icon: CurrencyDollarIcon },
  { key: 'line-items', label: 'Line Items', icon: ScaleIcon },
  { key: 'timeline', label: 'Timeline & Dates', icon: CalendarIcon },
  { key: 'stakeholders', label: 'Stakeholders', icon: UserIcon }
];

interface ComparisonMetric {
  label: string;
  value1: any;
  value2: any;
  formatter?: (value: any) => string;
  isDifferent: boolean;
  importance: 'high' | 'medium' | 'low';
}

export const QuoteComparisonPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showNotification } = useNotification();

  // State management
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic-info', 'pricing']));
  const [highlightDifferences, setHighlightDifferences] = useState(true);
  const [comparisonMode, setComparisonMode] = useState<'side-by-side' | 'overlay'>('side-by-side');

  // Custom hooks
  const {
    quotes,
    isLoading,
    error,
    loadQuote
  } = useQuotes();

  // Extract quote IDs from URL parameters
  const quoteIds = useMemo(() => {
    const quotesParam = searchParams.get('quotes');
    if (!quotesParam) return [];
    return quotesParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
  }, [searchParams]);

  // Load quotes for comparison
  useEffect(() => {
    if (quoteIds.length < 2) {
      showNotification({
        type: 'error',
        title: 'Invalid Comparison',
        message: 'At least 2 quotes are required for comparison.'
      });
      navigate('/crm/quotes');
      return;
    }

    if (quoteIds.length > 3) {
      showNotification({
        type: 'warning',
        title: 'Too Many Quotes',
        message: 'Only the first 3 quotes will be compared.'
      });
    }

    // Load each quote
    quoteIds.slice(0, 3).forEach(id => {
      loadQuote(id);
    });
  }, [quoteIds, loadQuote, showNotification, navigate]);

  // Get loaded quotes
  const comparisonQuotes = useMemo(() => {
    return quoteIds.slice(0, 3).map(id => quotes.find(q => q.id === id)).filter(Boolean) as Quote[];
  }, [quoteIds, quotes]);

  // Toggle section expansion
  const handleToggleSection = useCallback((sectionKey: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionKey)) {
        newSet.delete(sectionKey);
      } else {
        newSet.add(sectionKey);
      }
      return newSet;
    });
  }, []);

  // Create comparison metrics
  const createComparisonMetrics = useCallback((quotes: Quote[]): Record<string, ComparisonMetric[]> => {
    if (quotes.length < 2) return {};

    const [quote1, quote2, quote3] = quotes;

    const formatCurrency = (value: number, currency: string = 'USD') => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency
      }).format(value);
    };

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString();
    };

    const formatStatus = (status: string) => {
      return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
    };

    return {
      'basic-info': [
        {
          label: 'Quote Number',
          value1: quote1.quoteNumber,
          value2: quote2.quoteNumber,
          isDifferent: quote1.quoteNumber !== quote2.quoteNumber,
          importance: 'medium' as const
        },
        {
          label: 'Title',
          value1: quote1.title,
          value2: quote2.title,
          isDifferent: quote1.title !== quote2.title,
          importance: 'high' as const
        },
        {
          label: 'Status',
          value1: formatStatus(quote1.status),
          value2: formatStatus(quote2.status),
          isDifferent: quote1.status !== quote2.status,
          importance: 'high' as const
        },
        {
          label: 'Type',
          value1: formatStatus(quote1.type),
          value2: formatStatus(quote2.type),
          isDifferent: quote1.type !== quote2.type,
          importance: 'medium' as const
        },
        {
          label: 'Version',
          value1: quote1.version,
          value2: quote2.version,
          isDifferent: quote1.version !== quote2.version,
          importance: 'low' as const
        }
      ],
      'pricing': [
        {
          label: 'Currency',
          value1: quote1.currencyCode,
          value2: quote2.currencyCode,
          isDifferent: quote1.currencyCode !== quote2.currencyCode,
          importance: 'high' as const
        },
        {
          label: 'Subtotal',
          value1: quote1.subtotal,
          value2: quote2.subtotal,
          formatter: (value) => formatCurrency(value, quote1.currencyCode),
          isDifferent: quote1.subtotal !== quote2.subtotal,
          importance: 'high' as const
        },
        {
          label: 'Total Discount',
          value1: quote1.totalDiscount,
          value2: quote2.totalDiscount,
          formatter: (value) => formatCurrency(value, quote1.currencyCode),
          isDifferent: quote1.totalDiscount !== quote2.totalDiscount,
          importance: 'high' as const
        },
        {
          label: 'Total Tax',
          value1: quote1.totalTax,
          value2: quote2.totalTax,
          formatter: (value) => formatCurrency(value, quote1.currencyCode),
          isDifferent: quote1.totalTax !== quote2.totalTax,
          importance: 'medium' as const
        },
        {
          label: 'Total',
          value1: quote1.total,
          value2: quote2.total,
          formatter: (value) => formatCurrency(value, quote1.currencyCode),
          isDifferent: quote1.total !== quote2.total,
          importance: 'high' as const
        },
        {
          label: 'Margin',
          value1: quote1.margin || 0,
          value2: quote2.margin || 0,
          formatter: (value) => `${value.toFixed(2)}%`,
          isDifferent: (quote1.margin || 0) !== (quote2.margin || 0),
          importance: 'medium' as const
        }
      ],
      'line-items': [
        {
          label: 'Number of Items',
          value1: quote1.lineItems.length,
          value2: quote2.lineItems.length,
          isDifferent: quote1.lineItems.length !== quote2.lineItems.length,
          importance: 'high' as const
        },
        {
          label: 'Number of Sections',
          value1: quote1.sections.length,
          value2: quote2.sections.length,
          isDifferent: quote1.sections.length !== quote2.sections.length,
          importance: 'medium' as const
        }
      ],
      'timeline': [
        {
          label: 'Valid From',
          value1: quote1.validFrom,
          value2: quote2.validFrom,
          formatter: formatDate,
          isDifferent: quote1.validFrom !== quote2.validFrom,
          importance: 'high' as const
        },
        {
          label: 'Valid To',
          value1: quote1.validTo,
          value2: quote2.validTo,
          formatter: formatDate,
          isDifferent: quote1.validTo !== quote2.validTo,
          importance: 'high' as const
        },
        {
          label: 'Created At',
          value1: quote1.createdAt,
          value2: quote2.createdAt,
          formatter: formatDate,
          isDifferent: quote1.createdAt !== quote2.createdAt,
          importance: 'low' as const
        },
        {
          label: 'Updated At',
          value1: quote1.updatedAt,
          value2: quote2.updatedAt,
          formatter: formatDate,
          isDifferent: quote1.updatedAt !== quote2.updatedAt,
          importance: 'low' as const
        }
      ],
      'stakeholders': [
        {
          label: 'Created By',
          value1: quote1.createdBy,
          value2: quote2.createdBy,
          isDifferent: quote1.createdBy !== quote2.createdBy,
          importance: 'low' as const
        },
        {
          label: 'Assigned To',
          value1: quote1.assignedTo || 'Unassigned',
          value2: quote2.assignedTo || 'Unassigned',
          isDifferent: quote1.assignedTo !== quote2.assignedTo,
          importance: 'medium' as const
        },
        {
          label: 'Customer ID',
          value1: quote1.customerId || 'None',
          value2: quote2.customerId || 'None',
          isDifferent: quote1.customerId !== quote2.customerId,
          importance: 'high' as const
        }
      ]
    };
  }, []);

  // Get comparison data
  const comparisonData = useMemo(() => {
    return createComparisonMetrics(comparisonQuotes);
  }, [comparisonQuotes, createComparisonMetrics]);

  // Get total differences count
  const totalDifferences = useMemo(() => {
    return Object.values(comparisonData).flat().filter(metric => metric.isDifferent).length;
  }, [comparisonData]);

  // Loading states
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quotes for comparison...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || comparisonQuotes.length < 2) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Comparison Error</h3>
          <p className="text-gray-600 mb-4">
            {error || 'Unable to load quotes for comparison.'}
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
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <ScaleIcon className="w-8 h-8 mr-3 text-blue-600" />
                  Quote Comparison
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Comparing {comparisonQuotes.length} quotes - {totalDifferences} differences found
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Highlight Differences Toggle */}
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={highlightDifferences}
                  onChange={(e) => setHighlightDifferences(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Highlight differences</span>
              </label>

              {/* Comparison Mode Toggle */}
              <div className="flex rounded-md shadow-sm">
                <button
                  onClick={() => setComparisonMode('side-by-side')}
                  className={`px-4 py-2 text-sm font-medium rounded-l-md border ${
                    comparisonMode === 'side-by-side'
                      ? 'bg-blue-50 border-blue-500 text-blue-700 z-10'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Side by Side
                </button>
                <button
                  onClick={() => setComparisonMode('overlay')}
                  className={`px-4 py-2 text-sm font-medium rounded-r-md border-l-0 border ${
                    comparisonMode === 'overlay'
                      ? 'bg-blue-50 border-blue-500 text-blue-700 z-10'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Overlay
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quote Headers */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className={`grid gap-6 ${comparisonQuotes.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {comparisonQuotes.map((quote, index) => (
              <div key={quote.id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium text-gray-900">
                    Quote #{quote.quoteNumber}
                  </h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    quote.status === 'approved'
                      ? 'bg-green-100 text-green-800'
                      : quote.status === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : quote.status === 'sent'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {quote.status.charAt(0).toUpperCase() + quote.status.slice(1).replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{quote.title}</p>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: quote.currencyCode
                    }).format(quote.total)}
                  </span>
                  <span>v{quote.version}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Comparison Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {COMPARISON_CRITERIA.map((criteria) => {
            const Icon = criteria.icon;
            const isExpanded = expandedSections.has(criteria.key);
            const sectionMetrics = comparisonData[criteria.key] || [];
            const sectionDifferences = sectionMetrics.filter(m => m.isDifferent).length;

            return (
              <div key={criteria.key} className="bg-white rounded-lg shadow-sm">
                <button
                  onClick={() => handleToggleSection(criteria.key)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="w-5 h-5 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900">{criteria.label}</h3>
                    {sectionDifferences > 0 && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        {sectionDifferences} difference{sectionDifferences !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {isExpanded ? (
                    <ChevronUpIcon className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-6 pb-6 border-t border-gray-100">
                    <div className="space-y-4 pt-4">
                      {sectionMetrics.map((metric, index) => (
                        <div
                          key={index}
                          className={`grid grid-cols-${comparisonQuotes.length + 1} gap-4 py-3 ${
                            metric.isDifferent && highlightDifferences
                              ? 'bg-yellow-50 border border-yellow-200 rounded-md px-3'
                              : ''
                          }`}
                        >
                          <div className="font-medium text-gray-900 flex items-center">
                            {metric.label}
                            {metric.isDifferent && (
                              <ExclamationTriangleIcon className="w-4 h-4 ml-2 text-yellow-500" />
                            )}
                            {metric.importance === 'high' && !metric.isDifferent && (
                              <CheckCircleIcon className="w-4 h-4 ml-2 text-green-500" />
                            )}
                          </div>

                          {comparisonQuotes.map((_, quoteIndex) => (
                            <div key={quoteIndex} className="text-sm text-gray-600">
                              {metric.formatter
                                ? metric.formatter(quoteIndex === 0 ? metric.value1 : metric.value2)
                                : (quoteIndex === 0 ? metric.value1 : metric.value2)
                              }
                            </div>
                          ))}
                        </div>
                      ))}

                      {criteria.key === 'line-items' && (
                        <div className="mt-6">
                          <QuoteComparison
                            quote1={comparisonQuotes[0]}
                            quote2={comparisonQuotes[1]}
                            onClose={() => {}}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Comparison Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{totalDifferences}</div>
              <div className="text-sm text-gray-500">Total Differences</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Object.values(comparisonData).flat().filter(m => m.importance === 'high' && !m.isDifferent).length}
              </div>
              <div className="text-sm text-gray-500">High Priority Matches</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {Object.values(comparisonData).flat().filter(m => m.importance === 'high' && m.isDifferent).length}
              </div>
              <div className="text-sm text-gray-500">High Priority Differences</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuoteComparisonPage;