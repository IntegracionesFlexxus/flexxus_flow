// Price Matrix Viewer Component - Sprint 19 Phase 3
// Grid view of price matrix by customer/product with editing capabilities

import React, { useState, useMemo } from 'react';
import {
  Grid,
  Edit,
  Save,
  X,
  Plus,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  Search,
  Filter,
  MoreVertical,
  DollarSign,
  Percent,
  Users,
  Package,
  Hash,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import {
  PriceMatrix,
  PriceMatrixRule,
  PriceMatrixViewerProps
} from '../../../shared/types/pricing.types';
import { Button } from '../../../../../shared/ui/Button';
import { Card } from '../../../../../shared/ui/Card';
import { Badge } from '../../../../../shared/ui/Badge';
import { Loading } from '../../../../../shared/ui/Loading';
import { Modal } from '../../../../../shared/ui/Modal';

interface MatrixCell {
  productId?: number;
  customerId?: number;
  quantityTier: number;
  price: number;
  discountPercentage?: number;
  isEditing: boolean;
  isNew: boolean;
  hasChanges: boolean;
}

interface MatrixDimensions {
  rows: Array<{ id: number; label: string; type: 'product' | 'customer' }>;
  columns: Array<{ minQty: number; maxQty?: number; label: string }>;
}

export const PriceMatrixViewer: React.FC<PriceMatrixViewerProps> = ({
  matrix,
  editable = false,
  onUpdate
}) => {
  const [matrixData, setMatrixData] = useState<MatrixCell[][]>([]);
  const [dimensions, setDimensions] = useState<MatrixDimensions>({ rows: [], columns: [] });
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [viewMode, setViewMode] = useState<'price' | 'discount' | 'both'>('price');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [loading, setLoading] = useState(false);

  // Initialize matrix data
  React.useEffect(() => {
    if (matrix) {
      initializeMatrix();
    }
  }, [matrix]);

  const initializeMatrix = () => {
    // Create dimensions based on matrix data
    const rows: MatrixDimensions['rows'] = [];
    const columns: MatrixDimensions['columns'] = [];

    // Extract unique products/customers for rows
    if (matrix.type === 'customer_specific') {
      matrix.customers.forEach(customerId => {
        rows.push({
          id: customerId,
          label: `Customer ${customerId}`,
          type: 'customer'
        });
      });
    } else {
      matrix.products.forEach(productId => {
        rows.push({
          id: productId,
          label: `Product ${productId}`,
          type: 'product'
        });
      });
    }

    // Extract quantity tiers for columns
    const quantityTiers = new Set<number>();
    matrix.rules.forEach(rule => {
      quantityTiers.add(rule.minQuantity);
    });

    Array.from(quantityTiers).sort((a, b) => a - b).forEach((minQty, index, arr) => {
      const maxQty = arr[index + 1] ? arr[index + 1] - 1 : undefined;
      columns.push({
        minQty,
        maxQty,
        label: maxQty ? `${minQty}-${maxQty}` : `${minQty}+`
      });
    });

    setDimensions({ rows, columns });

    // Initialize matrix cells
    const cells: MatrixCell[][] = rows.map(row =>
      columns.map(col => {
        const rule = findRule(row.id, col.minQty);
        return {
          productId: row.type === 'product' ? row.id : undefined,
          customerId: row.type === 'customer' ? row.id : undefined,
          quantityTier: col.minQty,
          price: rule?.price || 0,
          discountPercentage: rule?.discountPercentage,
          isEditing: false,
          isNew: !rule,
          hasChanges: false
        };
      })
    );

    setMatrixData(cells);
  };

  const findRule = (entityId: number, minQuantity: number): PriceMatrixRule | undefined => {
    return matrix.rules.find(rule =>
      rule.minQuantity === minQuantity &&
      (matrix.type === 'customer_specific'
        ? matrix.customers.includes(entityId)
        : matrix.products.includes(entityId))
    );
  };

  const handleCellEdit = (rowIndex: number, colIndex: number, field: 'price' | 'discountPercentage', value: number) => {
    const newData = [...matrixData];
    newData[rowIndex][colIndex] = {
      ...newData[rowIndex][colIndex],
      [field]: value,
      hasChanges: true
    };
    setMatrixData(newData);
    setHasUnsavedChanges(true);
  };

  const startEditing = (rowIndex: number, colIndex: number) => {
    if (!editable) return;
    setEditingCell({ row: rowIndex, col: colIndex });
  };

  const stopEditing = () => {
    setEditingCell(null);
  };

  const addRow = () => {
    if (!editable) return;

    const newRowId = Math.max(...dimensions.rows.map(r => r.id)) + 1;
    const newRow = {
      id: newRowId,
      label: matrix.type === 'customer_specific' ? `Customer ${newRowId}` : `Product ${newRowId}`,
      type: matrix.type === 'customer_specific' ? 'customer' as const : 'product' as const
    };

    const newRowCells = dimensions.columns.map(col => ({
      productId: newRow.type === 'product' ? newRow.id : undefined,
      customerId: newRow.type === 'customer' ? newRow.id : undefined,
      quantityTier: col.minQty,
      price: 0,
      discountPercentage: 0,
      isEditing: false,
      isNew: true,
      hasChanges: false
    }));

    setDimensions(prev => ({
      ...prev,
      rows: [...prev.rows, newRow]
    }));

    setMatrixData(prev => [...prev, newRowCells]);
    setHasUnsavedChanges(true);
  };

  const addColumn = () => {
    if (!editable) return;

    const lastColumn = dimensions.columns[dimensions.columns.length - 1];
    const newMinQty = lastColumn ? (lastColumn.maxQty || lastColumn.minQty) + 1 : 1;

    const newColumn = {
      minQty: newMinQty,
      maxQty: undefined,
      label: `${newMinQty}+`
    };

    // Update previous column's maxQty
    const updatedColumns = [...dimensions.columns];
    if (updatedColumns.length > 0) {
      updatedColumns[updatedColumns.length - 1] = {
        ...lastColumn,
        maxQty: newMinQty - 1,
        label: `${lastColumn.minQty}-${newMinQty - 1}`
      };
    }
    updatedColumns.push(newColumn);

    setDimensions(prev => ({
      ...prev,
      columns: updatedColumns
    }));

    // Add new cells to each row
    const newData = matrixData.map(row => [
      ...row,
      {
        productId: row[0]?.productId,
        customerId: row[0]?.customerId,
        quantityTier: newMinQty,
        price: 0,
        discountPercentage: 0,
        isEditing: false,
        isNew: true,
        hasChanges: false
      }
    ]);

    setMatrixData(newData);
    setHasUnsavedChanges(true);
  };

  const removeRow = (rowIndex: number) => {
    if (!editable) return;

    setDimensions(prev => ({
      ...prev,
      rows: prev.rows.filter((_, index) => index !== rowIndex)
    }));

    setMatrixData(prev => prev.filter((_, index) => index !== rowIndex));
    setHasUnsavedChanges(true);
  };

  const removeColumn = (colIndex: number) => {
    if (!editable) return;

    setDimensions(prev => ({
      ...prev,
      columns: prev.columns.filter((_, index) => index !== colIndex)
    }));

    setMatrixData(prev => prev.map(row =>
      row.filter((_, index) => index !== colIndex)
    ));

    setHasUnsavedChanges(true);
  };

  const saveChanges = async () => {
    if (!onUpdate) return;

    setLoading(true);
    try {
      // Convert matrix data back to PriceMatrix format
      const rules: PriceMatrixRule[] = [];

      matrixData.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
          if (cell.price > 0 || cell.discountPercentage) {
            rules.push({
              minQuantity: cell.quantityTier,
              maxQuantity: dimensions.columns[colIndex].maxQty,
              price: cell.price,
              discountPercentage: cell.discountPercentage
            });
          }
        });
      });

      const updatedMatrix: PriceMatrix = {
        ...matrix,
        rules,
        products: matrix.type !== 'customer_specific'
          ? dimensions.rows.filter(r => r.type === 'product').map(r => r.id)
          : matrix.products,
        customers: matrix.type === 'customer_specific'
          ? dimensions.rows.filter(r => r.type === 'customer').map(r => r.id)
          : matrix.customers
      };

      await onUpdate(updatedMatrix);
      setHasUnsavedChanges(false);

      // Reset change flags
      const resetData = matrixData.map(row =>
        row.map(cell => ({ ...cell, hasChanges: false, isNew: false }))
      );
      setMatrixData(resetData);

    } catch (error) {
      console.error('Failed to save matrix changes:', error);
    } finally {
      setLoading(false);
    }
  };

  const discardChanges = () => {
    initializeMatrix();
    setHasUnsavedChanges(false);
  };

  const exportMatrix = () => {
    const csv = generateCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `price-matrix-${matrix.name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateCSV = (): string => {
    const headers = ['Entity', ...dimensions.columns.map(col => col.label)];
    const rows = [headers.join(',')];

    matrixData.forEach((row, rowIndex) => {
      const entityLabel = dimensions.rows[rowIndex].label;
      const values = [entityLabel];

      row.forEach(cell => {
        if (viewMode === 'price') {
          values.push(cell.price.toString());
        } else if (viewMode === 'discount') {
          values.push((cell.discountPercentage || 0).toString());
        } else {
          values.push(`${cell.price}/${cell.discountPercentage || 0}%`);
        }
      });

      rows.push(values.join(','));
    });

    return rows.join('\n');
  };

  const getCellColor = (cell: MatrixCell) => {
    if (cell.hasChanges) return 'bg-yellow-50 border-yellow-200';
    if (cell.isNew) return 'bg-blue-50 border-blue-200';
    return 'bg-white border-gray-200';
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const filteredRows = useMemo(() => {
    if (!searchTerm) return dimensions.rows.map((_, index) => index);

    return dimensions.rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) =>
        row.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .map(({ index }) => index);
  }, [dimensions.rows, searchTerm]);

  if (!matrix) {
    return (
      <Card className="p-8 text-center">
        <Grid className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p className="text-gray-500">No price matrix selected</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{matrix.name}</h3>
            <p className="text-sm text-gray-500 capitalize">{matrix.type.replace('_', ' ')} pricing matrix</p>
          </div>

          <div className="flex items-center space-x-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
              />
            </div>

            {/* View Mode */}
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="price">Price View</option>
              <option value="discount">Discount View</option>
              <option value="both">Both</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={exportMatrix}
            >
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>

            {editable && (
              <>
                {hasUnsavedChanges && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={discardChanges}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Discard
                    </Button>
                    <Button
                      size="sm"
                      onClick={saveChanges}
                      disabled={loading}
                    >
                      {loading ? (
                        <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-1" />
                      )}
                      Save
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {hasUnsavedChanges && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-center">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mr-2" />
              <span className="text-sm text-yellow-800">You have unsaved changes</span>
            </div>
          </div>
        )}
      </Card>

      {/* Matrix Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {matrix.type === 'customer_specific' ? 'Customer' : 'Product'}
                </th>
                {dimensions.columns.map((col, colIndex) => (
                  <th
                    key={colIndex}
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <Hash className="w-3 h-3" />
                      <span>{col.label}</span>
                      {editable && (
                        <button
                          onClick={() => removeColumn(colIndex)}
                          className="text-red-400 hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                {editable && (
                  <th className="px-4 py-3 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addColumn}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRows.map(rowIndex => (
                <tr key={rowIndex} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {matrix.type === 'customer_specific' ? (
                          <Users className="w-4 h-4 text-gray-400" />
                        ) : (
                          <Package className="w-4 h-4 text-gray-400" />
                        )}
                        <span>{dimensions.rows[rowIndex].label}</span>
                      </div>
                      {editable && (
                        <button
                          onClick={() => removeRow(rowIndex)}
                          className="text-red-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>

                  {matrixData[rowIndex]?.map((cell, colIndex) => (
                    <td
                      key={colIndex}
                      className={`px-4 py-3 text-center text-sm border ${getCellColor(cell)}`}
                    >
                      {editingCell?.row === rowIndex && editingCell?.col === colIndex ? (
                        <div className="space-y-1">
                          {(viewMode === 'price' || viewMode === 'both') && (
                            <input
                              type="number"
                              step="0.01"
                              value={cell.price}
                              onChange={(e) => handleCellEdit(rowIndex, colIndex, 'price', parseFloat(e.target.value) || 0)}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-xs"
                              placeholder="Price"
                            />
                          )}
                          {(viewMode === 'discount' || viewMode === 'both') && (
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              value={cell.discountPercentage || 0}
                              onChange={(e) => handleCellEdit(rowIndex, colIndex, 'discountPercentage', parseFloat(e.target.value) || 0)}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-xs"
                              placeholder="%"
                            />
                          )}
                          <div className="flex justify-center space-x-1">
                            <button
                              onClick={stopEditing}
                              className="text-green-600 hover:text-green-800"
                            >
                              <CheckCircle className="w-3 h-3" />
                            </button>
                            <button
                              onClick={stopEditing}
                              className="text-red-600 hover:text-red-800"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => startEditing(rowIndex, colIndex)}
                          className={`${editable ? 'cursor-pointer hover:bg-gray-100' : ''} p-1 rounded`}
                        >
                          {viewMode === 'price' && (
                            <div className="font-medium">
                              {formatPrice(cell.price)}
                            </div>
                          )}
                          {viewMode === 'discount' && (
                            <div className="text-green-600">
                              {cell.discountPercentage || 0}%
                            </div>
                          )}
                          {viewMode === 'both' && (
                            <div>
                              <div className="font-medium text-xs">
                                {formatPrice(cell.price)}
                              </div>
                              <div className="text-green-600 text-xs">
                                {cell.discountPercentage || 0}%
                              </div>
                            </div>
                          )}
                          {cell.hasChanges && (
                            <div className="mt-1">
                              <Badge variant="warning" size="sm">
                                Changed
                              </Badge>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  ))}

                  {editable && (
                    <td className="px-4 py-3 text-center">
                      {/* Actions for this row if needed */}
                    </td>
                  )}
                </tr>
              ))}

              {editable && (
                <tr>
                  <td colSpan={dimensions.columns.length + 2} className="px-4 py-3 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addRow}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add {matrix.type === 'customer_specific' ? 'Customer' : 'Product'}
                    </Button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {matrixData.length === 0 && (
          <div className="text-center py-12">
            <Grid className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No matrix data</h3>
            <p className="text-gray-500">
              {editable ? 'Add rows and columns to build your price matrix' : 'This matrix is empty'}
            </p>
          </div>
        )}
      </Card>

      {/* Matrix Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Cells</p>
              <p className="text-2xl font-bold text-gray-900">
                {dimensions.rows.length * dimensions.columns.length}
              </p>
            </div>
            <Grid className="w-8 h-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Filled Cells</p>
              <p className="text-2xl font-bold text-green-600">
                {matrixData.flat().filter(cell => cell.price > 0).length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Price</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatPrice(
                  matrixData.flat().reduce((sum, cell) => sum + cell.price, 0) / matrixData.flat().length || 0
                )}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Discount</p>
              <p className="text-2xl font-bold text-purple-600">
                {(matrixData.flat().reduce((sum, cell) => sum + (cell.discountPercentage || 0), 0) / matrixData.flat().length || 0).toFixed(1)}%
              </p>
            </div>
            <Percent className="w-8 h-8 text-purple-600" />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PriceMatrixViewer;