// QuoteLineItemsTable - Sprint 19 Frontend Implementation
// Editable table for quote line items

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useDrag, useDrop, DragDropContext, Droppable, Draggable } from 'react-dnd';
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  Bars3Icon,
  ChevronUpIcon,
  ChevronDownIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

// Internal imports
import {
  QuoteLineItem,
  QuoteSection,
  QuoteLineItemsTableProps
} from '../../shared/types';

// DnD Item Types
const ITEM_TYPES = {
  LINE_ITEM: 'line_item'
};

// Draggable Line Item Component
interface DraggableLineItemProps {
  item: QuoteLineItem;
  index: number;
  isEditable: boolean;
  onEdit: (item: QuoteLineItem) => void;
  onRemove: (itemId: number) => void;
  onUpdateQuantity: (itemId: number, quantity: number) => void;
  onUpdateDiscount: (itemId: number, discount: number, type: 'percentage' | 'fixed') => void;
}

const DraggableLineItem: React.FC<DraggableLineItemProps> = ({
  item,
  index,
  isEditable,
  onEdit,
  onRemove,
  onUpdateQuantity,
  onUpdateDiscount
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    quantity: item.quantity,
    discount: item.discount,
    discountType: item.discountType
  });

  const ref = useRef<HTMLTableRowElement>(null);

  // Drag and drop hooks
  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPES.LINE_ITEM,
    item: { id: item.id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    }),
    canDrag: isEditable
  });

  const [, drop] = useDrop({
    accept: ITEM_TYPES.LINE_ITEM,
    hover: (draggedItem: { id: number; index: number }) => {
      if (!ref.current) return;

      const dragIndex = draggedItem.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) return;

      // Update the indices for immediate visual feedback
      draggedItem.index = hoverIndex;
    }
  });

  // Combine drag and drop refs
  drag(drop(ref));

  const handleSaveEdit = useCallback(() => {
    if (editValues.quantity !== item.quantity) {
      onUpdateQuantity(item.id, editValues.quantity);
    }
    if (editValues.discount !== item.discount || editValues.discountType !== item.discountType) {
      onUpdateDiscount(item.id, editValues.discount, editValues.discountType);
    }
    setIsEditing(false);
  }, [item, editValues, onUpdateQuantity, onUpdateDiscount]);

  const handleCancelEdit = useCallback(() => {
    setEditValues({
      quantity: item.quantity,
      discount: item.discount,
      discountType: item.discountType
    });
    setIsEditing(false);
  }, [item]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD' // Should come from quote currency
    }).format(amount);
  };

  return (
    <tr
      ref={ref}
      className={`
        hover:bg-gray-50 transition-colors
        ${isDragging ? 'opacity-50' : 'opacity-100'}
        ${item.isOptional ? 'bg-blue-50' : ''}
      `}
    >
      {/* Drag Handle */}
      <td className="w-8 px-2 py-4">
        {isEditable && (
          <button
            className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
            title="Drag to reorder"
          >
            <Bars3Icon className="w-4 h-4" />
          </button>
        )}
      </td>

      {/* Product Information */}
      <td className="px-4 py-4">
        <div className="flex items-start space-x-3">
          {item.product?.imageUrl && (
            <img
              src={item.product.imageUrl}
              alt={item.name}
              className="w-12 h-12 object-cover rounded-md border border-gray-200"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium text-gray-900">{item.name}</p>
              {item.isOptional && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  Optional
                </span>
              )}
            </div>
            {item.description && (
              <p className="text-sm text-gray-500 mt-1">{item.description}</p>
            )}
            {item.sku && (
              <p className="text-xs text-gray-400 mt-1">SKU: {item.sku}</p>
            )}
          </div>
        </div>
      </td>

      {/* Quantity */}
      <td className="px-4 py-4 text-center">
        {isEditing ? (
          <input
            type="number"
            value={editValues.quantity}
            onChange={(e) => setEditValues(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
            className="w-20 text-center border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
            step="0.01"
          />
        ) : (
          <span className="text-sm text-gray-900">{item.quantity}</span>
        )}
      </td>

      {/* Unit Price */}
      <td className="px-4 py-4 text-right">
        <span className="text-sm text-gray-900">{formatCurrency(item.unitPrice)}</span>
        {item.listPrice && item.listPrice !== item.unitPrice && (
          <div className="text-xs text-gray-500 line-through">
            {formatCurrency(item.listPrice)}
          </div>
        )}
      </td>

      {/* Discount */}
      <td className="px-4 py-4 text-center">
        {isEditing ? (
          <div className="flex items-center space-x-1">
            <input
              type="number"
              value={editValues.discount}
              onChange={(e) => setEditValues(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
              className="w-16 text-center border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              step="0.01"
            />
            <select
              value={editValues.discountType}
              onChange={(e) => setEditValues(prev => ({ ...prev, discountType: e.target.value as 'percentage' | 'fixed' }))}
              className="text-xs border border-gray-300 rounded-md px-1 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="percentage">%</option>
              <option value="fixed">$</option>
            </select>
          </div>
        ) : (
          <span className="text-sm text-gray-900">
            {item.discount > 0 ? (
              item.discountType === 'percentage'
                ? `${item.discount}%`
                : formatCurrency(item.discount)
            ) : (
              '-'
            )}
          </span>
        )}
      </td>

      {/* Subtotal */}
      <td className="px-4 py-4 text-right">
        <span className="text-sm font-medium text-gray-900">
          {formatCurrency(item.subtotal)}
        </span>
      </td>

      {/* Actions */}
      <td className="px-4 py-4">
        {isEditable && (
          <div className="flex items-center space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveEdit}
                  className="text-green-600 hover:text-green-800"
                  title="Save changes"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="text-red-600 hover:text-red-800"
                  title="Cancel changes"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-blue-600 hover:text-blue-800"
                  title="Edit item"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onEdit(item)}
                  className="text-gray-600 hover:text-gray-800"
                  title="Configure item"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                <button
                  onClick={() => onRemove(item.id)}
                  className="text-red-600 hover:text-red-800"
                  title="Remove item"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        )}
      </td>
    </tr>
  );
};

// Section Component
interface SectionComponentProps {
  section: QuoteSection;
  items: QuoteLineItem[];
  isEditable: boolean;
  onEditItem: (item: QuoteLineItem) => void;
  onRemoveItem: (itemId: number) => void;
  onUpdateQuantity: (itemId: number, quantity: number) => void;
  onUpdateDiscount: (itemId: number, discount: number, type: 'percentage' | 'fixed') => void;
}

const SectionComponent: React.FC<SectionComponentProps> = ({
  section,
  items,
  isEditable,
  onEditItem,
  onRemoveItem,
  onUpdateQuantity,
  onUpdateDiscount
}) => {
  const [isExpanded, setIsExpanded] = useState(!section.isCollapsed);

  const sectionTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.subtotal, 0);
  }, [items]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <>
      {/* Section Header */}
      <tr className="bg-gray-50 border-t-2 border-gray-200">
        <td colSpan={8} className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {section.isCollapsible && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  {isExpanded ? (
                    <ChevronUpIcon className="w-4 h-4" />
                  ) : (
                    <ChevronDownIcon className="w-4 h-4" />
                  )}
                </button>
              )}
              <h4 className="text-sm font-medium text-gray-900">{section.name}</h4>
              {section.description && (
                <span className="text-sm text-gray-500">- {section.description}</span>
              )}
              <span className="text-xs text-gray-400">({items.length} items)</span>
            </div>
            {section.showTotals && (
              <div className="text-sm font-medium text-gray-900">
                Section Total: {formatCurrency(sectionTotal)}
              </div>
            )}
          </div>
        </td>
      </tr>

      {/* Section Items */}
      {isExpanded && items.map((item, index) => (
        <DraggableLineItem
          key={item.id}
          item={item}
          index={index}
          isEditable={isEditable}
          onEdit={onEditItem}
          onRemove={onRemoveItem}
          onUpdateQuantity={onUpdateQuantity}
          onUpdateDiscount={onUpdateDiscount}
        />
      ))}
    </>
  );
};

// Main Component
export const QuoteLineItemsTable: React.FC<QuoteLineItemsTableProps> = ({
  lineItems,
  sections,
  editable = true,
  onAddItem,
  onEditItem,
  onRemoveItem,
  onReorderItems,
  onUpdateQuantity,
  onUpdateDiscount,
  loading = false
}) => {
  // Group items by section
  const { sectionedItems, unsectionedItems } = useMemo(() => {
    const sectionedItems = new Map<number, QuoteLineItem[]>();
    const unsectionedItems: QuoteLineItem[] = [];

    lineItems.forEach(item => {
      if (item.sectionId) {
        if (!sectionedItems.has(item.sectionId)) {
          sectionedItems.set(item.sectionId, []);
        }
        sectionedItems.get(item.sectionId)!.push(item);
      } else {
        unsectionedItems.push(item);
      }
    });

    // Sort items within each section by sortOrder
    sectionedItems.forEach(items => {
      items.sort((a, b) => a.sortOrder - b.sortOrder);
    });
    unsectionedItems.sort((a, b) => a.sortOrder - b.sortOrder);

    return { sectionedItems, unsectionedItems };
  }, [lineItems]);

  // Calculate totals
  const totals = useMemo(() => {
    return {
      subtotal: lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0),
      discount: lineItems.reduce((sum, item) => sum + (item.discountType === 'fixed' ? item.discount : (item.quantity * item.unitPrice * item.discount / 100)), 0),
      total: lineItems.reduce((sum, item) => sum + item.subtotal, 0)
    };
  }, [lineItems]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading line items...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Line Items</h3>
          {editable && (
            <button
              onClick={onAddItem}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Item
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-8 px-2 py-3"></th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product/Service
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unit Price
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Discount
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Subtotal
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {/* Sections with their items */}
            {sections.map(section => (
              <SectionComponent
                key={section.id}
                section={section}
                items={sectionedItems.get(section.id) || []}
                isEditable={editable}
                onEditItem={onEditItem}
                onRemoveItem={onRemoveItem}
                onUpdateQuantity={onUpdateQuantity}
                onUpdateDiscount={onUpdateDiscount}
              />
            ))}

            {/* Unsectioned items */}
            {unsectionedItems.map((item, index) => (
              <DraggableLineItem
                key={item.id}
                item={item}
                index={index}
                isEditable={editable}
                onEdit={onEditItem}
                onRemove={onRemoveItem}
                onUpdateQuantity={onUpdateQuantity}
                onUpdateDiscount={onUpdateDiscount}
              />
            ))}

            {/* Empty state */}
            {lineItems.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No line items</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by adding your first product or service.
                  </p>
                  {editable && (
                    <div className="mt-6">
                      <button
                        onClick={onAddItem}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <PlusIcon className="w-4 h-4 mr-2" />
                        Add First Item
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer with totals */}
      {lineItems.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end space-x-8 text-sm">
            <div className="text-gray-600">
              <span>Subtotal: </span>
              <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="text-gray-600">
              <span>Discount: </span>
              <span className="font-medium">-{formatCurrency(totals.discount)}</span>
            </div>
            <div className="text-gray-900 font-medium">
              <span>Total: </span>
              <span className="text-lg">{formatCurrency(totals.total)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuoteLineItemsTable;