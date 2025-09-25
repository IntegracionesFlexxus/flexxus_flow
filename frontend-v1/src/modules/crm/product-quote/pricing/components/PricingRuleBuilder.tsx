// Pricing Rule Builder Component - Sprint 19 Phase 3
// Visual rule builder with drag & drop conditions and actions

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import {
  Plus,
  Trash2,
  Move,
  Settings,
  Play,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  Info,
  Code,
  Eye,
  Calendar,
  Users,
  Package,
  DollarSign,
  Percent,
  Hash,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import {
  PricingRule,
  PricingCondition,
  PricingAction,
  PricingRuleBuilderProps
} from '../../../shared/types/pricing.types';
import { Button } from '../../../../../shared/ui/Button';
import { Card } from '../../../../../shared/ui/Card';
import { Badge } from '../../../../../shared/ui/Badge';
import { Modal } from '../../../../../shared/ui/Modal';

interface ConditionTemplate {
  id: string;
  name: string;
  description: string;
  field: string;
  operator: string;
  valueType: 'number' | 'text' | 'boolean' | 'select' | 'multiselect';
  options?: { value: string; label: string }[];
  icon: React.ComponentType<any>;
  category: 'product' | 'customer' | 'order' | 'date' | 'context';
}

interface ActionTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  valueType: 'number' | 'percent' | 'fixed';
  icon: React.ComponentType<any>;
  category: 'discount' | 'markup' | 'price';
}

const CONDITION_TEMPLATES: ConditionTemplate[] = [
  // Product Conditions
  {
    id: 'product_id',
    name: 'Product ID',
    description: 'Specific product identifier',
    field: 'productId',
    operator: 'equals',
    valueType: 'number',
    icon: Package,
    category: 'product'
  },
  {
    id: 'product_category',
    name: 'Product Category',
    description: 'Product belongs to category',
    field: 'productCategory',
    operator: 'in',
    valueType: 'multiselect',
    options: [
      { value: 'electronics', label: 'Electronics' },
      { value: 'clothing', label: 'Clothing' },
      { value: 'books', label: 'Books' },
      { value: 'home', label: 'Home & Garden' }
    ],
    icon: Package,
    category: 'product'
  },
  // Customer Conditions
  {
    id: 'customer_id',
    name: 'Customer ID',
    description: 'Specific customer identifier',
    field: 'customerId',
    operator: 'equals',
    valueType: 'number',
    icon: Users,
    category: 'customer'
  },
  {
    id: 'customer_tier',
    name: 'Customer Tier',
    description: 'Customer loyalty tier',
    field: 'customerTier',
    operator: 'equals',
    valueType: 'select',
    options: [
      { value: 'bronze', label: 'Bronze' },
      { value: 'silver', label: 'Silver' },
      { value: 'gold', label: 'Gold' },
      { value: 'platinum', label: 'Platinum' }
    ],
    icon: Users,
    category: 'customer'
  },
  // Order Conditions
  {
    id: 'quantity',
    name: 'Quantity',
    description: 'Order quantity threshold',
    field: 'quantity',
    operator: 'greater_than',
    valueType: 'number',
    icon: Hash,
    category: 'order'
  },
  {
    id: 'order_total',
    name: 'Order Total',
    description: 'Total order value',
    field: 'orderTotal',
    operator: 'greater_than',
    valueType: 'number',
    icon: DollarSign,
    category: 'order'
  },
  // Date Conditions
  {
    id: 'date_range',
    name: 'Date Range',
    description: 'Within specific date range',
    field: 'date',
    operator: 'between',
    valueType: 'text',
    icon: Calendar,
    category: 'date'
  }
];

const ACTION_TEMPLATES: ActionTemplate[] = [
  {
    id: 'discount_percentage',
    name: 'Percentage Discount',
    description: 'Apply percentage discount',
    type: 'discount_percentage',
    valueType: 'percent',
    icon: Percent,
    category: 'discount'
  },
  {
    id: 'discount_amount',
    name: 'Fixed Discount',
    description: 'Apply fixed amount discount',
    type: 'discount_amount',
    valueType: 'number',
    icon: DollarSign,
    category: 'discount'
  },
  {
    id: 'set_price',
    name: 'Set Fixed Price',
    description: 'Override with fixed price',
    type: 'set_price',
    valueType: 'number',
    icon: DollarSign,
    category: 'price'
  },
  {
    id: 'markup_percentage',
    name: 'Percentage Markup',
    description: 'Apply percentage markup',
    type: 'markup_percentage',
    valueType: 'percent',
    icon: Percent,
    category: 'markup'
  }
];

const OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'greater_equal', label: 'Greater or Equal' },
  { value: 'less_equal', label: 'Less or Equal' },
  { value: 'in', label: 'In List' },
  { value: 'not_in', label: 'Not In List' },
  { value: 'contains', label: 'Contains' },
  { value: 'between', label: 'Between' }
];

export const PricingRuleBuilder: React.FC<PricingRuleBuilderProps> = ({
  rule,
  onSave,
  onCancel,
  availableProducts = [],
  availableCategories = []
}) => {
  const [ruleData, setRuleData] = useState<Partial<PricingRule>>({
    name: '',
    description: '',
    type: 'percentage',
    priority: 5,
    isActive: true,
    conditions: [],
    actions: [],
    applicableProducts: [],
    applicableCategories: [],
    applicableCustomers: [],
    minQuantity: 1
  });

  const [showConditionTemplates, setShowConditionTemplates] = useState(false);
  const [showActionTemplates, setShowActionTemplates] = useState(false);
  const [selectedConditionCategory, setSelectedConditionCategory] = useState<string>('all');
  const [selectedActionCategory, setSelectedActionCategory] = useState<string>('all');
  const [testMode, setTestMode] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    if (rule) {
      setRuleData({
        name: rule.name,
        description: rule.description,
        type: rule.type,
        priority: rule.priority,
        isActive: rule.isActive,
        conditions: rule.conditions || [],
        actions: rule.actions || [],
        validFrom: rule.validFrom,
        validTo: rule.validTo,
        minQuantity: rule.minQuantity,
        maxQuantity: rule.maxQuantity,
        applicableProducts: rule.applicableProducts || [],
        applicableCategories: rule.applicableCategories || [],
        applicableCustomers: rule.applicableCustomers || []
      });
    }
  }, [rule]);

  const validateRule = (): boolean => {
    const errors: string[] = [];

    if (!ruleData.name?.trim()) {
      errors.push('Rule name is required');
    }

    if (!ruleData.conditions?.length) {
      errors.push('At least one condition is required');
    }

    if (!ruleData.actions?.length) {
      errors.push('At least one action is required');
    }

    ruleData.conditions?.forEach((condition, index) => {
      if (!condition.field || !condition.operator) {
        errors.push(`Condition ${index + 1} is incomplete`);
      }
    });

    ruleData.actions?.forEach((action, index) => {
      if (!action.type || action.value === undefined || action.value === null) {
        errors.push(`Action ${index + 1} is incomplete`);
      }
    });

    if (ruleData.validFrom && ruleData.validTo && ruleData.validFrom > ruleData.validTo) {
      errors.push('Valid from date must be before valid to date');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSave = () => {
    if (validateRule()) {
      onSave(ruleData as Omit<PricingRule, 'id' | 'createdAt' | 'updatedAt'>);
    }
  };

  const addCondition = (template: ConditionTemplate) => {
    const newCondition: PricingCondition = {
      id: Date.now(),
      field: template.field,
      operator: template.operator,
      value: template.valueType === 'boolean' ? false : '',
      logicalOperator: ruleData.conditions?.length ? 'AND' : undefined
    };

    setRuleData({
      ...ruleData,
      conditions: [...(ruleData.conditions || []), newCondition]
    });

    setShowConditionTemplates(false);
  };

  const updateCondition = (index: number, updates: Partial<PricingCondition>) => {
    const updatedConditions = [...(ruleData.conditions || [])];
    updatedConditions[index] = { ...updatedConditions[index], ...updates };

    setRuleData({
      ...ruleData,
      conditions: updatedConditions
    });
  };

  const removeCondition = (index: number) => {
    const updatedConditions = ruleData.conditions?.filter((_, i) => i !== index) || [];

    // Remove logical operator from first condition if it exists
    if (updatedConditions.length > 0 && updatedConditions[0].logicalOperator) {
      updatedConditions[0] = { ...updatedConditions[0], logicalOperator: undefined };
    }

    setRuleData({
      ...ruleData,
      conditions: updatedConditions
    });
  };

  const addAction = (template: ActionTemplate) => {
    const newAction: PricingAction = {
      id: Date.now(),
      type: template.type as any,
      value: 0,
      applyTo: 'unit_price'
    };

    setRuleData({
      ...ruleData,
      actions: [...(ruleData.actions || []), newAction]
    });

    setShowActionTemplates(false);
  };

  const updateAction = (index: number, updates: Partial<PricingAction>) => {
    const updatedActions = [...(ruleData.actions || [])];
    updatedActions[index] = { ...updatedActions[index], ...updates };

    setRuleData({
      ...ruleData,
      actions: updatedActions
    });
  };

  const removeAction = (index: number) => {
    const updatedActions = ruleData.actions?.filter((_, i) => i !== index) || [];

    setRuleData({
      ...ruleData,
      actions: updatedActions
    });
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const { source, destination, type } = result;

    if (type === 'conditions') {
      const items = Array.from(ruleData.conditions || []);
      const [reorderedItem] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reorderedItem);

      setRuleData({
        ...ruleData,
        conditions: items
      });
    } else if (type === 'actions') {
      const items = Array.from(ruleData.actions || []);
      const [reorderedItem] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reorderedItem);

      setRuleData({
        ...ruleData,
        actions: items
      });
    }
  };

  const filteredConditionTemplates = selectedConditionCategory === 'all'
    ? CONDITION_TEMPLATES
    : CONDITION_TEMPLATES.filter(t => t.category === selectedConditionCategory);

  const filteredActionTemplates = selectedActionCategory === 'all'
    ? ACTION_TEMPLATES
    : ACTION_TEMPLATES.filter(t => t.category === selectedActionCategory);

  const renderConditionValue = (condition: PricingCondition, index: number) => {
    const template = CONDITION_TEMPLATES.find(t => t.field === condition.field);

    if (!template) {
      return (
        <input
          type="text"
          value={condition.value}
          onChange={(e) => updateCondition(index, { value: e.target.value })}
          className="px-3 py-1 border border-gray-300 rounded text-sm"
          placeholder="Value"
        />
      );
    }

    switch (template.valueType) {
      case 'number':
        return (
          <input
            type="number"
            value={condition.value}
            onChange={(e) => updateCondition(index, { value: parseFloat(e.target.value) || 0 })}
            className="px-3 py-1 border border-gray-300 rounded text-sm w-24"
            placeholder="0"
          />
        );
      case 'boolean':
        return (
          <button
            onClick={() => updateCondition(index, { value: !condition.value })}
            className={`flex items-center px-3 py-1 rounded text-sm ${
              condition.value ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'
            }`}
          >
            {condition.value ? (
              <ToggleRight className="w-4 h-4 mr-1" />
            ) : (
              <ToggleLeft className="w-4 h-4 mr-1" />
            )}
            {condition.value ? 'True' : 'False'}
          </button>
        );
      case 'select':
        return (
          <select
            value={condition.value}
            onChange={(e) => updateCondition(index, { value: e.target.value })}
            className="px-3 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="">Select...</option>
            {template.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      default:
        return (
          <input
            type="text"
            value={condition.value}
            onChange={(e) => updateCondition(index, { value: e.target.value })}
            className="px-3 py-1 border border-gray-300 rounded text-sm"
            placeholder="Value"
          />
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Rule Basic Info */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Rule Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rule Name *
            </label>
            <input
              type="text"
              value={ruleData.name}
              onChange={(e) => setRuleData({ ...ruleData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter rule name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority (1-10)
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={ruleData.priority}
              onChange={(e) => setRuleData({ ...ruleData, priority: parseInt(e.target.value) || 5 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={ruleData.description}
              onChange={(e) => setRuleData({ ...ruleData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="Describe what this rule does"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rule Type
            </label>
            <select
              value={ruleData.type}
              onChange={(e) => setRuleData({ ...ruleData, type: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="percentage">Percentage Discount</option>
              <option value="fixed_amount">Fixed Amount Discount</option>
              <option value="fixed_price">Fixed Price</option>
              <option value="tiered">Tiered Pricing</option>
              <option value="volume">Volume Discount</option>
            </select>
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={ruleData.isActive}
                onChange={(e) => setRuleData({ ...ruleData, isActive: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-700">Active</span>
            </label>
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valid From
            </label>
            <input
              type="date"
              value={ruleData.validFrom || ''}
              onChange={(e) => setRuleData({ ...ruleData, validFrom: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valid To
            </label>
            <input
              type="date"
              value={ruleData.validTo || ''}
              onChange={(e) => setRuleData({ ...ruleData, validTo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </Card>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Validation Errors</h3>
              <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        {/* Conditions */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Conditions</h3>
            <Button
              size="sm"
              onClick={() => setShowConditionTemplates(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Condition
            </Button>
          </div>

          <Droppable droppableId="conditions" type="conditions">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-3"
              >
                {ruleData.conditions?.map((condition, index) => (
                  <Draggable
                    key={condition.id}
                    draggableId={condition.id.toString()}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border-2 ${
                          snapshot.isDragging ? 'border-blue-300 shadow-lg' : 'border-transparent'
                        }`}
                      >
                        <div
                          {...provided.dragHandleProps}
                          className="text-gray-400 hover:text-gray-600 cursor-grab"
                        >
                          <Move className="w-4 h-4" />
                        </div>

                        {/* Logical Operator */}
                        {index > 0 && (
                          <select
                            value={condition.logicalOperator || 'AND'}
                            onChange={(e) => updateCondition(index, { logicalOperator: e.target.value as any })}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="AND">AND</option>
                            <option value="OR">OR</option>
                          </select>
                        )}

                        {/* Field */}
                        <select
                          value={condition.field}
                          onChange={(e) => updateCondition(index, { field: e.target.value })}
                          className="px-3 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="">Select field...</option>
                          {CONDITION_TEMPLATES.map(template => (
                            <option key={template.id} value={template.field}>
                              {template.name}
                            </option>
                          ))}
                        </select>

                        {/* Operator */}
                        <select
                          value={condition.operator}
                          onChange={(e) => updateCondition(index, { operator: e.target.value as any })}
                          className="px-3 py-1 border border-gray-300 rounded text-sm"
                        >
                          {OPERATORS.map(op => (
                            <option key={op.value} value={op.value}>
                              {op.label}
                            </option>
                          ))}
                        </select>

                        {/* Value */}
                        {renderConditionValue(condition, index)}

                        {/* Remove Button */}
                        <button
                          onClick={() => removeCondition(index)}
                          className="text-red-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}

                {(!ruleData.conditions || ruleData.conditions.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    <Info className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p>No conditions added yet</p>
                    <p className="text-sm">Add conditions to define when this rule applies</p>
                  </div>
                )}
              </div>
            )}
          </Droppable>
        </Card>

        {/* Actions */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Actions</h3>
            <Button
              size="sm"
              onClick={() => setShowActionTemplates(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Action
            </Button>
          </div>

          <Droppable droppableId="actions" type="actions">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-3"
              >
                {ruleData.actions?.map((action, index) => (
                  <Draggable
                    key={action.id}
                    draggableId={action.id.toString()}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border-2 ${
                          snapshot.isDragging ? 'border-blue-300 shadow-lg' : 'border-transparent'
                        }`}
                      >
                        <div
                          {...provided.dragHandleProps}
                          className="text-gray-400 hover:text-gray-600 cursor-grab"
                        >
                          <Move className="w-4 h-4" />
                        </div>

                        {/* Action Type */}
                        <select
                          value={action.type}
                          onChange={(e) => updateAction(index, { type: e.target.value as any })}
                          className="px-3 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="">Select action...</option>
                          {ACTION_TEMPLATES.map(template => (
                            <option key={template.id} value={template.type}>
                              {template.name}
                            </option>
                          ))}
                        </select>

                        {/* Value */}
                        <input
                          type="number"
                          value={action.value}
                          onChange={(e) => updateAction(index, { value: parseFloat(e.target.value) || 0 })}
                          className="px-3 py-1 border border-gray-300 rounded text-sm w-24"
                          placeholder="0"
                        />

                        {/* Apply To */}
                        <select
                          value={action.applyTo}
                          onChange={(e) => updateAction(index, { applyTo: e.target.value as any })}
                          className="px-3 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="unit_price">Unit Price</option>
                          <option value="line_total">Line Total</option>
                          <option value="shipping">Shipping</option>
                          <option value="tax">Tax</option>
                        </select>

                        {/* Remove Button */}
                        <button
                          onClick={() => removeAction(index)}
                          className="text-red-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}

                {(!ruleData.actions || ruleData.actions.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    <Info className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p>No actions added yet</p>
                    <p className="text-sm">Add actions to define what happens when conditions are met</p>
                  </div>
                )}
              </div>
            )}
          </Droppable>
        </Card>
      </DragDropContext>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Save Rule
        </Button>
      </div>

      {/* Condition Templates Modal */}
      {showConditionTemplates && (
        <Modal
          isOpen={showConditionTemplates}
          onClose={() => setShowConditionTemplates(false)}
          title="Add Condition"
          size="lg"
        >
          <div className="p-6">
            {/* Category Filter */}
            <div className="mb-4">
              <div className="flex space-x-2">
                {['all', 'product', 'customer', 'order', 'date', 'context'].map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedConditionCategory(category)}
                    className={`px-3 py-1 rounded text-sm ${
                      selectedConditionCategory === category
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Template Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredConditionTemplates.map(template => (
                <button
                  key={template.id}
                  onClick={() => addCondition(template)}
                  className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 text-left transition-colors"
                >
                  <div className="p-2 bg-gray-100 rounded">
                    <template.icon className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{template.name}</h4>
                    <p className="text-sm text-gray-500">{template.description}</p>
                    <Badge variant="outline" size="sm" className="mt-1">
                      {template.category}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* Action Templates Modal */}
      {showActionTemplates && (
        <Modal
          isOpen={showActionTemplates}
          onClose={() => setShowActionTemplates(false)}
          title="Add Action"
          size="lg"
        >
          <div className="p-6">
            {/* Category Filter */}
            <div className="mb-4">
              <div className="flex space-x-2">
                {['all', 'discount', 'markup', 'price'].map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedActionCategory(category)}
                    className={`px-3 py-1 rounded text-sm ${
                      selectedActionCategory === category
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Template Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredActionTemplates.map(template => (
                <button
                  key={template.id}
                  onClick={() => addAction(template)}
                  className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 text-left transition-colors"
                >
                  <div className="p-2 bg-gray-100 rounded">
                    <template.icon className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{template.name}</h4>
                    <p className="text-sm text-gray-500">{template.description}</p>
                    <Badge variant="outline" size="sm" className="mt-1">
                      {template.category}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PricingRuleBuilder;