// QuoteSummary - Sprint 19 Frontend Implementation
// Quote summary with totals and discounts

import React, { useState, useCallback, useMemo } from 'react';
import {
  CurrencyDollarIcon,
  CalculatorIcon,
  TagIcon,
  InformationCircleIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

// Internal imports
import {
  Quote,
  QuoteTotals,
  QuoteSummaryProps,
  QuoteTerms,
  TaxCalculation
} from '../../shared/types';

// Tax breakdown component
interface TaxBreakdownProps {
  taxes: TaxCalculation[];
  totalTax: number;
}

const TaxBreakdown: React.FC<TaxBreakdownProps> = ({ taxes, totalTax }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (!taxes.length && totalTax === 0) {
    return null;
  }

  return (
    <div className="border-t border-gray-200 pt-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left hover:bg-gray-50 rounded-md p-2 -m-2"
      >
        <span className="text-sm text-gray-600">Tax Details</span>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-900">
            {formatCurrency(totalTax)}
          </span>
          {isExpanded ? (
            <ChevronUpIcon className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDownIcon className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="mt-2 pl-4 space-y-2">
          {taxes.map((tax, index) => (
            <div key={index} className="flex justify-between text-xs text-gray-600">
              <span>
                {tax.name} ({tax.rate}%)
                {tax.included && <span className="italic"> (included)</span>}
              </span>
              <span>{formatCurrency(tax.amount)}</span>
            </div>
          ))}
          {taxes.length === 0 && totalTax > 0 && (
            <div className="flex justify-between text-xs text-gray-600">
              <span>Tax</span>
              <span>{formatCurrency(totalTax)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Discount summary component
interface DiscountSummaryProps {
  quote: Quote;
  totalDiscount: number;
  onEdit?: () => void;
  editable?: boolean;
}

const DiscountSummary: React.FC<DiscountSummaryProps> = ({
  quote,
  totalDiscount,
  onEdit,
  editable = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: quote.currencyCode
    }).format(amount);
  };

  const discountedItems = useMemo(() => {
    return quote.lineItems.filter(item => item.discount > 0);
  }, [quote.lineItems]);

  if (totalDiscount === 0) {
    return null;
  }

  return (
    <div className="border-t border-gray-200 pt-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left hover:bg-gray-50 rounded-md p-2 -m-2"
      >
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Total Discounts</span>
          <TagIcon className="w-4 h-4 text-green-500" />
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-green-600">
            -{formatCurrency(totalDiscount)}
          </span>
          {isExpanded ? (
            <ChevronUpIcon className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDownIcon className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="mt-2 pl-4 space-y-2">
          {discountedItems.map((item, index) => {
            const discountAmount = item.discountType === 'percentage'
              ? (item.quantity * item.unitPrice * item.discount / 100)
              : item.discount;

            return (
              <div key={index} className="flex justify-between text-xs text-gray-600">
                <span>
                  {item.name}
                  {item.discountType === 'percentage'
                    ? ` (${item.discount}%)`
                    : ` (${formatCurrency(item.discount)})`
                  }
                </span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            );
          })}
          {editable && onEdit && (
            <button
              onClick={onEdit}
              className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800"
            >
              <PencilIcon className="w-3 h-3" />
              <span>Edit Discounts</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Margin information component
interface MarginInfoProps {
  quote: Quote;
  totals: QuoteTotals;
}

const MarginInfo: React.FC<MarginInfoProps> = ({ quote, totals }) => {
  const [showDetails, setShowDetails] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: quote.currencyCode
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`;
  };

  const totalCost = useMemo(() => {
    return quote.lineItems.reduce((sum, item) => sum + (item.cost || 0) * item.quantity, 0);
  }, [quote.lineItems]);

  const marginAmount = totals.total - totalCost;
  const marginPercentage = totals.total > 0 ? (marginAmount / totals.total) * 100 : 0;

  const getMarginColor = (percentage: number) => {
    if (percentage >= 30) return 'text-green-600';
    if (percentage >= 15) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="border-t border-gray-200 pt-3">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center justify-between w-full text-left hover:bg-gray-50 rounded-md p-2 -m-2"
      >
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Margin</span>
          <InformationCircleIcon className="w-4 h-4 text-gray-400" />
        </div>
        <div className="flex items-center space-x-2">
          <span className={`text-sm font-medium ${getMarginColor(marginPercentage)}`}>
            {formatPercentage(marginPercentage)}
          </span>
          {showDetails ? (
            <ChevronUpIcon className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDownIcon className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {showDetails && (
        <div className="mt-2 pl-4 space-y-2">
          <div className="flex justify-between text-xs text-gray-600">
            <span>Total Revenue</span>
            <span>{formatCurrency(totals.total)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-600">
            <span>Total Cost</span>
            <span>{formatCurrency(totalCost)}</span>
          </div>
          <div className="flex justify-between text-xs font-medium text-gray-900 border-t border-gray-200 pt-2">
            <span>Margin</span>
            <span className={getMarginColor(marginPercentage)}>
              {formatCurrency(marginAmount)} ({formatPercentage(marginPercentage)})
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// Terms preview component
interface TermsPreviewProps {
  terms?: QuoteTerms;
  onUpdateTerms?: (terms: QuoteTerms) => void;
  editable?: boolean;
}

const TermsPreview: React.FC<TermsPreviewProps> = ({
  terms,
  onUpdateTerms,
  editable = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingTerms, setEditingTerms] = useState<QuoteTerms>(terms || {});

  const handleSave = useCallback(() => {
    if (onUpdateTerms) {
      onUpdateTerms(editingTerms);
    }
    setIsEditing(false);
  }, [editingTerms, onUpdateTerms]);

  const handleCancel = useCallback(() => {
    setEditingTerms(terms || {});
    setIsEditing(false);
  }, [terms]);

  if (!terms && !editable) {
    return null;
  }

  return (
    <div className="border-t border-gray-200 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900">Terms & Conditions</h4>
        {editable && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
          >
            <PencilIcon className="w-3 h-3" />
            <span>Edit</span>
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Payment Terms
            </label>
            <textarea
              value={editingTerms.paymentTerms || ''}
              onChange={(e) => setEditingTerms(prev => ({ ...prev, paymentTerms: e.target.value }))}
              className="w-full text-xs border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              rows={2}
              placeholder="e.g., Net 30 days"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Delivery Terms
            </label>
            <textarea
              value={editingTerms.deliveryTerms || ''}
              onChange={(e) => setEditingTerms(prev => ({ ...prev, deliveryTerms: e.target.value }))}
              className="w-full text-xs border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              rows={2}
              placeholder="e.g., 5-7 business days"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <button
              onClick={handleCancel}
              className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
            >
              <CheckIcon className="w-3 h-3" />
              <span>Save</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2 text-xs text-gray-600">
          {terms?.paymentTerms && (
            <div>
              <span className="font-medium">Payment: </span>
              <span>{terms.paymentTerms}</span>
            </div>
          )}
          {terms?.deliveryTerms && (
            <div>
              <span className="font-medium">Delivery: </span>
              <span>{terms.deliveryTerms}</span>
            </div>
          )}
          {terms?.warrantyTerms && (
            <div>
              <span className="font-medium">Warranty: </span>
              <span>{terms.warrantyTerms}</span>
            </div>
          )}
          {!terms?.paymentTerms && !terms?.deliveryTerms && !terms?.warrantyTerms && editable && (
            <p className="italic text-gray-400">No terms specified</p>
          )}
        </div>
      )}
    </div>
  );
};

// Main QuoteSummary component
export const QuoteSummary: React.FC<QuoteSummaryProps> = ({
  quote,
  totals,
  showBreakdown = true,
  editable = false,
  onUpdateTerms
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: quote.currencyCode
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Mock tax calculations (would come from pricing engine)
  const taxCalculations: TaxCalculation[] = [
    {
      name: 'Sales Tax',
      rate: 8.25,
      amount: totals.totalTax,
      included: false
    }
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          <CalculatorIcon className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900">Quote Summary</h3>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Basic Information */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Quote #:</span>
            <span className="ml-2 font-medium">{quote.quoteNumber}</span>
          </div>
          <div>
            <span className="text-gray-600">Version:</span>
            <span className="ml-2 font-medium">{quote.version}</span>
          </div>
          <div>
            <span className="text-gray-600">Valid From:</span>
            <span className="ml-2">{formatDate(quote.validFrom)}</span>
          </div>
          <div>
            <span className="text-gray-600">Valid To:</span>
            <span className="ml-2">{formatDate(quote.validTo)}</span>
          </div>
        </div>

        {/* Pricing Breakdown */}
        <div className="space-y-3 pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal:</span>
            <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
          </div>

          {/* Discount Details */}
          {showBreakdown && totals.totalDiscount > 0 && (
            <DiscountSummary
              quote={quote}
              totalDiscount={totals.totalDiscount}
              editable={editable}
            />
          )}

          {/* Tax Details */}
          {showBreakdown && (totals.totalTax > 0 || taxCalculations.length > 0) && (
            <TaxBreakdown
              taxes={taxCalculations}
              totalTax={totals.totalTax}
            />
          )}

          {totals.totalDiscount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">After Discount:</span>
              <span className="font-medium">
                {formatCurrency(totals.subtotal - totals.totalDiscount)}
              </span>
            </div>
          )}

          {totals.totalTax > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax:</span>
              <span className="font-medium">{formatCurrency(totals.totalTax)}</span>
            </div>
          )}

          {/* Total */}
          <div className="flex justify-between text-lg font-semibold text-gray-900 pt-3 border-t border-gray-200">
            <span>Total:</span>
            <span className="flex items-center">
              <CurrencyDollarIcon className="w-5 h-5 mr-1" />
              {formatCurrency(totals.total)}
            </span>
          </div>
        </div>

        {/* Margin Information */}
        {showBreakdown && (
          <MarginInfo quote={quote} totals={totals} />
        )}

        {/* Terms Preview */}
        {(quote.terms || editable) && (
          <TermsPreview
            terms={quote.terms}
            onUpdateTerms={onUpdateTerms}
            editable={editable}
          />
        )}

        {/* Additional Information */}
        {quote.notes && (
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Notes</h4>
            <p className="text-sm text-gray-600">{quote.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuoteSummary;