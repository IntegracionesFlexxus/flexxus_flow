// Price Breakdown Component - Sprint 19 Phase 3
// Detailed price calculation breakdown with visual representation

import React, { useState } from 'react';
import {
  DollarSign,
  Percent,
  TrendingDown,
  TrendingUp,
  Receipt,
  Tag,
  Gift,
  Truck,
  Calculator,
  Info,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import {
  PriceResult,
  PriceBreakdown as PriceBreakdownType,
  AppliedRule,
  DiscountInfo,
  TaxInfo
} from '../../../shared/types/pricing.types';
import { Card } from '../../../../../shared/ui/Card';
import { Badge } from '../../../../../shared/ui/Badge';
import { Button } from '../../../../../shared/ui/Button';

interface PriceBreakdownProps {
  result: PriceResult;
  showDetails?: boolean;
  showRules?: boolean;
  showTaxes?: boolean;
  showDiscounts?: boolean;
  className?: string;
}

interface BreakdownSection {
  id: string;
  title: string;
  amount: number;
  percentage?: number;
  type: 'positive' | 'negative' | 'neutral';
  icon: React.ComponentType<any>;
  items?: Array<{
    label: string;
    amount: number;
    description?: string;
    metadata?: any;
  }>;
  expanded?: boolean;
}

export const PriceBreakdown: React.FC<PriceBreakdownProps> = ({
  result,
  showDetails = true,
  showRules = true,
  showTaxes = true,
  showDiscounts = true,
  className = ''
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['breakdown']));
  const [showMetadata, setShowMetadata] = useState(false);

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  // Process breakdown data into sections
  const processBreakdown = (): BreakdownSection[] => {
    const sections: BreakdownSection[] = [];

    // Base Price Section
    sections.push({
      id: 'base',
      title: 'Base Price',
      amount: result.basePrice,
      type: 'neutral',
      icon: DollarSign,
      items: [{
        label: 'Unit Price',
        amount: result.basePrice,
        description: 'Original product price'
      }]
    });

    // Discounts Section
    if (result.discounts && result.discounts.length > 0) {
      const totalDiscounts = result.discounts.reduce((sum, discount) => sum + discount.amount, 0);
      sections.push({
        id: 'discounts',
        title: 'Discounts',
        amount: -totalDiscounts,
        percentage: (totalDiscounts / result.basePrice) * 100,
        type: 'positive',
        icon: Gift,
        items: result.discounts.map(discount => ({
          label: discount.description || `${discount.type} discount`,
          amount: -discount.amount,
          description: discount.code ? `Code: ${discount.code}` : undefined,
          metadata: discount
        }))
      });
    }

    // Detailed Breakdown from API
    if (result.breakdown && result.breakdown.length > 0) {
      const breakdownByComponent: Record<string, PriceBreakdownType[]> = {};

      result.breakdown.forEach(item => {
        if (!breakdownByComponent[item.component]) {
          breakdownByComponent[item.component] = [];
        }
        breakdownByComponent[item.component].push(item);
      });

      Object.entries(breakdownByComponent).forEach(([component, items]) => {
        const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
        const isDiscount = component.includes('discount') || totalAmount < 0;

        sections.push({
          id: component,
          title: component.split('_').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' '),
          amount: totalAmount,
          percentage: Math.abs(totalAmount / result.basePrice) * 100,
          type: isDiscount ? 'positive' : totalAmount > 0 ? 'negative' : 'neutral',
          icon: getComponentIcon(component),
          items: items.map(item => ({
            label: item.description,
            amount: item.amount,
            description: item.percentage ? `${item.percentage}%` : undefined,
            metadata: item
          }))
        });
      });
    }

    // Taxes Section
    if (result.taxes && result.taxes.length > 0) {
      const totalTaxes = result.taxes.reduce((sum, tax) => sum + tax.amount, 0);
      sections.push({
        id: 'taxes',
        title: 'Taxes',
        amount: totalTaxes,
        percentage: (totalTaxes / result.basePrice) * 100,
        type: 'negative',
        icon: Receipt,
        items: result.taxes.map(tax => ({
          label: tax.name,
          amount: tax.amount,
          description: `${tax.rate}% ${tax.included ? '(included)' : '(additional)'}`,
          metadata: tax
        }))
      });
    }

    return sections;
  };

  const getComponentIcon = (component: string) => {
    switch (component) {
      case 'discount':
      case 'promotion':
        return Gift;
      case 'markup':
        return TrendingUp;
      case 'tax':
        return Receipt;
      case 'shipping':
        return Truck;
      case 'fee':
        return Tag;
      default:
        return Calculator;
    }
  };

  const formatCurrency = (amount: number) => {
    return `${result.currency} ${Math.abs(amount).toFixed(2)}`;
  };

  const getAmountColor = (type: 'positive' | 'negative' | 'neutral') => {
    switch (type) {
      case 'positive':
        return 'text-green-600';
      case 'negative':
        return 'text-red-600';
      default:
        return 'text-gray-900';
    }
  };

  const sections = processBreakdown();
  const totalSavings = result.basePrice - result.finalPrice;
  const savingsPercentage = (totalSavings / result.basePrice) * 100;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Summary Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Price Breakdown</h3>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMetadata(!showMetadata)}
            >
              {showMetadata ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </Button>
            <Badge variant="info">
              {result.calculatedAt ? new Date(result.calculatedAt).toLocaleTimeString() : 'Now'}
            </Badge>
          </div>
        </div>

        {/* Price Flow */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">Base Price:</span>
              <span className="font-medium">{formatCurrency(result.basePrice)}</span>
            </div>

            {totalSavings > 0 && (
              <>
                <div className="flex items-center space-x-2">
                  <TrendingDown className="w-4 h-4 text-green-500" />
                  <span className="text-green-600">Savings:</span>
                  <span className="font-medium text-green-600">
                    -{formatCurrency(totalSavings)} ({savingsPercentage.toFixed(1)}%)
                  </span>
                </div>
              </>
            )}

            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-blue-500" />
              <span className="text-gray-600">Final Price:</span>
              <span className="font-bold text-lg">{formatCurrency(result.finalPrice)}</span>
            </div>
          </div>
        </div>

        {/* Visual Price Flow */}
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                <DollarSign className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-sm text-gray-600">Base</p>
              <p className="font-semibold">{formatCurrency(result.basePrice)}</p>
            </div>

            <div className="flex-1 mx-4">
              <div className="h-2 bg-gray-200 rounded-full relative overflow-hidden">
                {totalSavings > 0 && (
                  <div
                    className="h-full bg-green-400 rounded-full"
                    style={{ width: `${Math.min(savingsPercentage, 100)}%` }}
                  />
                )}
              </div>
              <p className="text-xs text-center text-gray-500 mt-1">
                {totalSavings > 0 ? `${savingsPercentage.toFixed(1)}% savings` : 'No discounts'}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-2">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-sm text-gray-600">Final</p>
              <p className="font-semibold">{formatCurrency(result.finalPrice)}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Detailed Breakdown */}
      {showDetails && (
        <Card className="p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Detailed Breakdown</h4>

          <div className="space-y-3">
            {sections.map(section => (
              <div key={section.id} className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <section.icon className="w-5 h-5 text-gray-500" />
                    <span className="font-medium text-gray-900">{section.title}</span>
                    {section.percentage && (
                      <Badge variant="outline" size="sm">
                        {section.percentage.toFixed(1)}%
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className={`font-semibold ${getAmountColor(section.type)}`}>
                      {section.amount >= 0 ? '' : '-'}{formatCurrency(section.amount)}
                    </span>
                    {expandedSections.has(section.id) ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </button>

                {expandedSections.has(section.id) && section.items && (
                  <div className="px-4 pb-3 border-t border-gray-100">
                    <div className="space-y-2 mt-3">
                      {section.items.map((item, index) => (
                        <div key={index} className="flex items-center justify-between py-2 text-sm">
                          <div className="flex-1">
                            <span className="text-gray-700">{item.label}</span>
                            {item.description && (
                              <span className="text-gray-500 ml-2">({item.description})</span>
                            )}
                            {showMetadata && item.metadata && (
                              <div className="mt-1 text-xs text-gray-400 font-mono">
                                {JSON.stringify(item.metadata, null, 2)}
                              </div>
                            )}
                          </div>
                          <span className={`font-medium ${getAmountColor(section.type)}`}>
                            {item.amount >= 0 ? '' : '-'}{formatCurrency(item.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Applied Rules */}
      {showRules && result.appliedRules && result.appliedRules.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-gray-900">Applied Pricing Rules</h4>
            <Badge variant="info">
              {result.appliedRules.length} rules
            </Badge>
          </div>

          <div className="space-y-3">
            {result.appliedRules.map((rule, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Tag className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{rule.ruleName}</p>
                    <p className="text-sm text-gray-600">{rule.description}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-semibold text-blue-600">
                    {rule.impact >= 0 ? '+' : '-'}{formatCurrency(rule.impact)}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{rule.type}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Discount Codes */}
      {showDiscounts && result.discounts && result.discounts.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-gray-900">Discount Codes</h4>
            <Badge variant="success">
              {result.discounts.length} applied
            </Badge>
          </div>

          <div className="space-y-3">
            {result.discounts.map((discount, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Gift className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {discount.description}
                      {discount.code && (
                        <Badge variant="outline" size="sm" className="ml-2">
                          {discount.code}
                        </Badge>
                      )}
                    </p>
                    <p className="text-sm text-gray-600">
                      {discount.type === 'percentage' ? `${discount.value}% discount` : `${formatCurrency(discount.value)} off`}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-semibold text-green-600">
                    -{formatCurrency(discount.amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tax Details */}
      {showTaxes && result.taxes && result.taxes.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-gray-900">Tax Breakdown</h4>
            <Badge variant="warning">
              {result.taxes.length} taxes
            </Badge>
          </div>

          <div className="space-y-3">
            {result.taxes.map((tax, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Receipt className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{tax.name}</p>
                    <p className="text-sm text-gray-600">
                      {tax.rate}% {tax.included ? '(included in price)' : '(additional)'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-semibold text-yellow-600">
                    {formatCurrency(tax.amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Metadata */}
      {showMetadata && result.metadata && Object.keys(result.metadata).length > 0 && (
        <Card className="p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Calculation Metadata</h4>
          <pre className="text-xs text-gray-600 bg-gray-50 p-3 rounded overflow-x-auto">
            {JSON.stringify(result.metadata, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
};

export default PriceBreakdown;