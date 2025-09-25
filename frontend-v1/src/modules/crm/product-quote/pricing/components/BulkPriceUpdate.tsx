// Bulk Price Update Component - Sprint 19 Phase 3
// Bulk price update component with validation and preview

import React, { useState, useEffect } from 'react';
import {
  Upload,
  Download,
  CheckCircle,
  AlertTriangle,
  X,
  FileText,
  Calculator,
  Target,
  TrendingUp,
  TrendingDown,
  Percent,
  DollarSign,
  Package,
  Users,
  Play,
  Pause,
  RefreshCw,
  Eye,
  Save
} from 'lucide-react';
import {
  PricingRule,
  PriceCalculationParams,
  PriceResult
} from '../../../shared/types/pricing.types';
import { usePricingStore } from '../../../../stores/pricingStore';
import { Button } from '../../../../../shared/ui/Button';
import { Card } from '../../../../../shared/ui/Card';
import { Badge } from '../../../../../shared/ui/Badge';
import { Loading } from '../../../../../shared/ui/Loading';
import { Progress } from '../../../../../shared/ui/Progress';

interface BulkUpdateOperation {
  type: 'percentage_increase' | 'percentage_decrease' | 'fixed_increase' | 'fixed_decrease' | 'set_value' | 'apply_rule';
  value: number;
  targetField: 'priority' | 'discount_value' | 'markup_value' | 'validity_period';
  conditions?: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
  ruleId?: number;
}

interface BulkUpdatePreview {
  ruleId: number;
  ruleName: string;
  currentValue: any;
  newValue: any;
  changeType: 'increase' | 'decrease' | 'no_change';
  changeAmount: number;
  changePercentage: number;
}

interface BulkPriceUpdateProps {
  selectedRuleIds: number[];
  onComplete: () => void;
  onCancel: () => void;
}

interface ValidationError {
  ruleId: number;
  ruleName: string;
  error: string;
  severity: 'error' | 'warning';
}

export const BulkPriceUpdate: React.FC<BulkPriceUpdateProps> = ({
  selectedRuleIds,
  onComplete,
  onCancel
}) => {
  const [operation, setOperation] = useState<BulkUpdateOperation>({
    type: 'percentage_increase',
    value: 0,
    targetField: 'priority'
  });

  const [preview, setPreview] = useState<BulkUpdatePreview[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [updateMode, setUpdateMode] = useState<'form' | 'csv'>('form');

  const {
    pricingRules,
    updatePricingRule,
    batchCalculatePrice,
    loading,
    error
  } = usePricingStore();

  const selectedRules = pricingRules.filter(rule => selectedRuleIds.includes(rule.id));

  useEffect(() => {
    if (showPreview) {
      generatePreview();
    }
  }, [operation, selectedRules, showPreview]);

  const generatePreview = () => {
    const previewData: BulkUpdatePreview[] = [];

    selectedRules.forEach(rule => {
      const currentValue = getCurrentValue(rule, operation.targetField);
      const newValue = calculateNewValue(currentValue, operation);
      const changeAmount = newValue - currentValue;
      const changePercentage = currentValue !== 0 ? (changeAmount / currentValue) * 100 : 0;

      previewData.push({
        ruleId: rule.id,
        ruleName: rule.name,
        currentValue,
        newValue,
        changeType: changeAmount > 0 ? 'increase' : changeAmount < 0 ? 'decrease' : 'no_change',
        changeAmount,
        changePercentage
      });
    });

    setPreview(previewData);
    validateChanges(previewData);
  };

  const getCurrentValue = (rule: PricingRule, field: string): number => {
    switch (field) {
      case 'priority':
        return rule.priority;
      case 'discount_value':
        // Get discount value from first action
        const discountAction = rule.actions.find(a =>
          a.type === 'discount_percentage' || a.type === 'discount_amount'
        );
        return discountAction?.value || 0;
      case 'markup_value':
        const markupAction = rule.actions.find(a =>
          a.type === 'markup_percentage' || a.type === 'markup_amount'
        );
        return markupAction?.value || 0;
      default:
        return 0;
    }
  };

  const calculateNewValue = (currentValue: number, op: BulkUpdateOperation): number => {
    switch (op.type) {
      case 'percentage_increase':
        return currentValue * (1 + op.value / 100);
      case 'percentage_decrease':
        return currentValue * (1 - op.value / 100);
      case 'fixed_increase':
        return currentValue + op.value;
      case 'fixed_decrease':
        return currentValue - op.value;
      case 'set_value':
        return op.value;
      default:
        return currentValue;
    }
  };

  const validateChanges = (previewData: BulkUpdatePreview[]) => {
    const errors: ValidationError[] = [];

    previewData.forEach(item => {
      // Validate priority range
      if (operation.targetField === 'priority') {
        if (item.newValue < 1 || item.newValue > 10) {
          errors.push({
            ruleId: item.ruleId,
            ruleName: item.ruleName,
            error: 'Priority must be between 1 and 10',
            severity: 'error'
          });
        }
      }

      // Validate percentage values
      if (operation.targetField === 'discount_value' || operation.targetField === 'markup_value') {
        if (item.newValue < 0) {
          errors.push({
            ruleId: item.ruleId,
            ruleName: item.ruleName,
            error: 'Value cannot be negative',
            severity: 'error'
          });
        }
        if (item.newValue > 100 && operation.targetField === 'discount_value') {
          errors.push({
            ruleId: item.ruleId,
            ruleName: item.ruleName,
            error: 'Discount cannot exceed 100%',
            severity: 'warning'
          });
        }
      }

      // Validate extreme changes
      if (Math.abs(item.changePercentage) > 50) {
        errors.push({
          ruleId: item.ruleId,
          ruleName: item.ruleName,
          error: `Large change detected: ${Math.abs(item.changePercentage).toFixed(1)}%`,
          severity: 'warning'
        });
      }
    });

    setValidationErrors(errors);
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target?.result as string;
      const lines = csv.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());

      const data = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });
        return row;
      }).filter(row => row.ruleId); // Filter out empty rows

      setCsvData(data);
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const template = [
      'ruleId,ruleName,field,operation,value',
      ...selectedRules.map(rule =>
        `${rule.id},"${rule.name}",priority,set_value,${rule.priority}`
      )
    ].join('\n');

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk-update-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const processBulkUpdate = async () => {
    if (validationErrors.some(e => e.severity === 'error')) {
      alert('Please fix all errors before proceeding');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setProcessedCount(0);

    try {
      for (let i = 0; i < preview.length; i++) {
        const item = preview[i];
        const rule = selectedRules.find(r => r.id === item.ruleId);

        if (!rule) continue;

        // Create updated rule data
        const updatedRule = { ...rule };

        switch (operation.targetField) {
          case 'priority':
            updatedRule.priority = Math.round(item.newValue);
            break;
          case 'discount_value':
            // Update discount actions
            updatedRule.actions = rule.actions.map(action => {
              if (action.type === 'discount_percentage' || action.type === 'discount_amount') {
                return { ...action, value: item.newValue };
              }
              return action;
            });
            break;
          case 'markup_value':
            // Update markup actions
            updatedRule.actions = rule.actions.map(action => {
              if (action.type === 'markup_percentage' || action.type === 'markup_amount') {
                return { ...action, value: item.newValue };
              }
              return action;
            });
            break;
        }

        await updatePricingRule(rule.id, updatedRule);

        setProcessedCount(i + 1);
        setProgress(((i + 1) / preview.length) * 100);

        // Add small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      onComplete();
    } catch (error) {
      console.error('Bulk update failed:', error);
      alert('Bulk update failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const processCsvUpdate = async () => {
    setIsProcessing(true);
    setProgress(0);
    setProcessedCount(0);

    try {
      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        const rule = selectedRules.find(r => r.id === parseInt(row.ruleId));

        if (!rule) continue;

        const updatedRule = { ...rule };
        const value = parseFloat(row.value);

        switch (row.field) {
          case 'priority':
            updatedRule.priority = Math.round(value);
            break;
          // Add more field handling as needed
        }

        await updatePricingRule(rule.id, updatedRule);

        setProcessedCount(i + 1);
        setProgress(((i + 1) / csvData.length) * 100);

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      onComplete();
    } catch (error) {
      console.error('CSV update failed:', error);
      alert('CSV update failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'increase':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'decrease':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Target className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatValue = (value: number, field: string) => {
    if (field === 'priority') {
      return Math.round(value).toString();
    }
    if (field.includes('percentage')) {
      return `${value.toFixed(1)}%`;
    }
    return value.toFixed(2);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Bulk Price Update</h3>
          <p className="text-sm text-gray-500">
            Update {selectedRuleIds.length} selected pricing rules
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="info">
            {selectedRuleIds.length} rules selected
          </Badge>
        </div>
      </div>

      {/* Update Mode Selection */}
      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Update Method:</span>
          <div className="flex space-x-2">
            <button
              onClick={() => setUpdateMode('form')}
              className={`px-3 py-1 rounded text-sm ${
                updateMode === 'form'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Form Update
            </button>
            <button
              onClick={() => setUpdateMode('csv')}
              className={`px-3 py-1 rounded text-sm ${
                updateMode === 'csv'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              CSV Upload
            </button>
          </div>
        </div>
      </Card>

      {updateMode === 'form' ? (
        <>
          {/* Form Update Configuration */}
          <Card className="p-6">
            <h4 className="text-md font-semibold text-gray-900 mb-4">Update Configuration</h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Field
                </label>
                <select
                  value={operation.targetField}
                  onChange={(e) => setOperation({ ...operation, targetField: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="priority">Priority</option>
                  <option value="discount_value">Discount Value</option>
                  <option value="markup_value">Markup Value</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Operation Type
                </label>
                <select
                  value={operation.type}
                  onChange={(e) => setOperation({ ...operation, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="percentage_increase">Percentage Increase</option>
                  <option value="percentage_decrease">Percentage Decrease</option>
                  <option value="fixed_increase">Fixed Increase</option>
                  <option value="fixed_decrease">Fixed Decrease</option>
                  <option value="set_value">Set Value</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Value
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={operation.value}
                    onChange={(e) => setOperation({ ...operation, value: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center text-gray-500">
                    {operation.type.includes('percentage') ? '%' : operation.targetField === 'priority' ? '' : '$'}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="w-4 h-4 mr-2" />
                {showPreview ? 'Hide' : 'Show'} Preview
              </Button>
            </div>
          </Card>
        </>
      ) : (
        <>
          {/* CSV Upload Configuration */}
          <Card className="p-6">
            <h4 className="text-md font-semibold text-gray-900 mb-4">CSV Upload</h4>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    Upload a CSV file with your bulk updates. Download the template to get started.
                  </p>
                </div>
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    Click to upload CSV file or drag and drop
                  </p>
                </label>
              </div>

              {csvFile && (
                <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
                  <FileText className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-800">{csvFile.name}</span>
                  <Badge variant="success">{csvData.length} rows</Badge>
                </div>
              )}
            </div>
          </Card>
        </>
      )}

      {/* Preview Section */}
      {showPreview && preview.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-gray-900">Update Preview</h4>
            <Badge variant={validationErrors.length > 0 ? 'warning' : 'success'}>
              {validationErrors.length} issues
            </Badge>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="mb-4 space-y-2">
              {validationErrors.map((error, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg ${
                    error.severity === 'error'
                      ? 'bg-red-50 border border-red-200'
                      : 'bg-yellow-50 border border-yellow-200'
                  }`}
                >
                  <div className="flex items-center">
                    <AlertTriangle className={`w-4 h-4 mr-2 ${
                      error.severity === 'error' ? 'text-red-600' : 'text-yellow-600'
                    }`} />
                    <span className={`text-sm ${
                      error.severity === 'error' ? 'text-red-800' : 'text-yellow-800'
                    }`}>
                      {error.ruleName}: {error.error}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Preview Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rule
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    New Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Change
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {preview.map((item) => (
                  <tr key={item.ruleId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {item.ruleName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatValue(item.currentValue, operation.targetField)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatValue(item.newValue, operation.targetField)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getChangeIcon(item.changeType)}
                        <span className={`text-sm ${
                          item.changeType === 'increase' ? 'text-green-600' :
                          item.changeType === 'decrease' ? 'text-red-600' :
                          'text-gray-600'
                        }`}>
                          {item.changeAmount > 0 ? '+' : ''}
                          {formatValue(item.changeAmount, operation.targetField)}
                          {Math.abs(item.changePercentage) > 0.1 && (
                            <span className="ml-1">
                              ({item.changePercentage > 0 ? '+' : ''}{item.changePercentage.toFixed(1)}%)
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Processing Progress */}
      {isProcessing && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-gray-900">Processing Updates</h4>
            <Badge variant="info">
              {processedCount} / {updateMode === 'form' ? preview.length : csvData.length}
            </Badge>
          </div>

          <Progress value={progress} className="mb-2" />

          <p className="text-sm text-gray-600">
            Updating pricing rules... Please do not close this window.
          </p>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
          Cancel
        </Button>

        {updateMode === 'form' ? (
          <Button
            onClick={processBulkUpdate}
            disabled={
              !showPreview ||
              preview.length === 0 ||
              validationErrors.some(e => e.severity === 'error') ||
              isProcessing
            }
          >
            {isProcessing ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Apply Updates
          </Button>
        ) : (
          <Button
            onClick={processCsvUpdate}
            disabled={!csvFile || csvData.length === 0 || isProcessing}
          >
            {isProcessing ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            Process CSV
          </Button>
        )}
      </div>
    </div>
  );
};

export default BulkPriceUpdate;