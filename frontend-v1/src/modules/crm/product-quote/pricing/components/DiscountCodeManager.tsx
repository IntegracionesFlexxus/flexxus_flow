// Discount Code Manager Component - Sprint 19 Phase 3
// Manage discount codes and promotions with validation

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Copy,
  Search,
  Filter,
  Download,
  Upload,
  RefreshCw,
  Calendar,
  Percent,
  DollarSign,
  Users,
  Package,
  Tag,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  BarChart3,
  TrendingUp
} from 'lucide-react';
import {
  DiscountCode,
  DiscountCodeManagerProps
} from '../../../shared/types/pricing.types';
import { Button } from '../../../../../shared/ui/Button';
import { Card } from '../../../../../shared/ui/Card';
import { Badge } from '../../../../../shared/ui/Badge';
import { Loading } from '../../../../../shared/ui/Loading';
import { Modal } from '../../../../../shared/ui/Modal';

interface DiscountCodeForm {
  code: string;
  name: string;
  description: string;
  type: 'percentage' | 'fixed_amount' | 'free_shipping' | 'buy_x_get_y';
  value: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  customerUsageLimit?: number;
  validFrom: string;
  validTo: string;
  isActive: boolean;
  applicableProducts: number[];
  applicableCategories: number[];
  excludedProducts: number[];
  excludedCategories: number[];
}

interface CodeFilters {
  search: string;
  status: 'all' | 'active' | 'inactive' | 'expired';
  type: string | null;
  usage: 'all' | 'unused' | 'limited' | 'exhausted';
}

export const DiscountCodeManager: React.FC<DiscountCodeManagerProps> = ({
  codes,
  onEdit,
  onDelete,
  onCreate,
  loading = false
}) => {
  const [filteredCodes, setFilteredCodes] = useState<DiscountCode[]>(codes);
  const [filters, setFilters] = useState<CodeFilters>({
    search: '',
    status: 'all',
    type: null,
    usage: 'all'
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCode, setEditingCode] = useState<DiscountCode | null>(null);
  const [showCodeForm, setShowCodeForm] = useState(false);
  const [selectedCodes, setSelectedCodes] = useState<number[]>([]);
  const [sortField, setSortField] = useState<keyof DiscountCode>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [codeForm, setCodeForm] = useState<DiscountCodeForm>({
    code: '',
    name: '',
    description: '',
    type: 'percentage',
    value: 0,
    validFrom: new Date().toISOString().split('T')[0],
    validTo: '',
    isActive: true,
    applicableProducts: [],
    applicableCategories: [],
    excludedProducts: [],
    excludedCategories: []
  });

  useEffect(() => {
    applyFilters();
  }, [codes, filters, sortField, sortOrder]);

  const applyFilters = () => {
    let filtered = [...codes];

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(code =>
        code.code.toLowerCase().includes(searchTerm) ||
        code.name.toLowerCase().includes(searchTerm) ||
        (code.description && code.description.toLowerCase().includes(searchTerm))
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      const now = new Date();
      filtered = filtered.filter(code => {
        switch (filters.status) {
          case 'active':
            return code.isActive && new Date(code.validTo) > now;
          case 'inactive':
            return !code.isActive;
          case 'expired':
            return new Date(code.validTo) <= now;
          default:
            return true;
        }
      });
    }

    // Type filter
    if (filters.type) {
      filtered = filtered.filter(code => code.type === filters.type);
    }

    // Usage filter
    if (filters.usage !== 'all') {
      filtered = filtered.filter(code => {
        switch (filters.usage) {
          case 'unused':
            return code.usageCount === 0;
          case 'limited':
            return code.usageLimit && code.usageCount < code.usageLimit;
          case 'exhausted':
            return code.usageLimit && code.usageCount >= code.usageLimit;
          default:
            return true;
        }
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });

    setFilteredCodes(filtered);
  };

  const handleCreateCode = () => {
    setEditingCode(null);
    setCodeForm({
      code: '',
      name: '',
      description: '',
      type: 'percentage',
      value: 0,
      validFrom: new Date().toISOString().split('T')[0],
      validTo: '',
      isActive: true,
      applicableProducts: [],
      applicableCategories: [],
      excludedProducts: [],
      excludedCategories: []
    });
    setShowCreateModal(true);
  };

  const handleEditCode = (code: DiscountCode) => {
    setEditingCode(code);
    setCodeForm({
      code: code.code,
      name: code.name,
      description: code.description || '',
      type: code.type,
      value: code.value,
      minOrderAmount: code.minOrderAmount,
      maxDiscountAmount: code.maxDiscountAmount,
      usageLimit: code.usageLimit,
      customerUsageLimit: code.customerUsageLimit,
      validFrom: code.validFrom.split('T')[0],
      validTo: code.validTo.split('T')[0],
      isActive: code.isActive,
      applicableProducts: code.applicableProducts,
      applicableCategories: code.applicableCategories,
      excludedProducts: code.excludedProducts,
      excludedCategories: code.excludedCategories
    });
    setShowEditModal(true);
  };

  const handleSaveCode = () => {
    // Validation
    if (!codeForm.code.trim() || !codeForm.name.trim()) {
      alert('Code and name are required');
      return;
    }

    if (codeForm.value <= 0) {
      alert('Value must be greater than 0');
      return;
    }

    if (codeForm.validFrom && codeForm.validTo && codeForm.validFrom > codeForm.validTo) {
      alert('Valid from date must be before valid to date');
      return;
    }

    const codeData = {
      ...codeForm,
      validFrom: new Date(codeForm.validFrom).toISOString(),
      validTo: new Date(codeForm.validTo).toISOString()
    };

    if (editingCode) {
      onEdit({ ...editingCode, ...codeData });
    } else {
      onCreate();
    }

    setShowCreateModal(false);
    setShowEditModal(false);
  };

  const handleDuplicateCode = (code: DiscountCode) => {
    setEditingCode(null);
    setCodeForm({
      code: `${code.code}_COPY`,
      name: `${code.name} (Copy)`,
      description: code.description || '',
      type: code.type,
      value: code.value,
      minOrderAmount: code.minOrderAmount,
      maxDiscountAmount: code.maxDiscountAmount,
      usageLimit: code.usageLimit,
      customerUsageLimit: code.customerUsageLimit,
      validFrom: new Date().toISOString().split('T')[0],
      validTo: code.validTo.split('T')[0],
      isActive: false,
      applicableProducts: code.applicableProducts,
      applicableCategories: code.applicableCategories,
      excludedProducts: code.excludedProducts,
      excludedCategories: code.excludedCategories
    });
    setShowCreateModal(true);
  };

  const getStatusBadge = (code: DiscountCode) => {
    const now = new Date();
    const validTo = new Date(code.validTo);
    const isExpired = validTo <= now;
    const isExhausted = code.usageLimit && code.usageCount >= code.usageLimit;

    if (isExpired) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    if (isExhausted) {
      return <Badge variant="warning">Exhausted</Badge>;
    }
    if (!code.isActive) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    return <Badge variant="success">Active</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const typeLabels: Record<string, { label: string; icon: React.ComponentType<any> }> = {
      percentage: { label: 'Percentage', icon: Percent },
      fixed_amount: { label: 'Fixed Amount', icon: DollarSign },
      free_shipping: { label: 'Free Shipping', icon: Package },
      buy_x_get_y: { label: 'Buy X Get Y', icon: Tag }
    };

    const typeInfo = typeLabels[type] || { label: type, icon: Tag };
    const IconComponent = typeInfo.icon;

    return (
      <Badge variant="outline" className="flex items-center space-x-1">
        <IconComponent className="w-3 h-3" />
        <span>{typeInfo.label}</span>
      </Badge>
    );
  };

  const getUsageProgress = (code: DiscountCode) => {
    if (!code.usageLimit) return null;

    const percentage = (code.usageCount / code.usageLimit) * 100;
    const isNearLimit = percentage > 80;

    return (
      <div className="w-full">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>{code.usageCount} used</span>
          <span>{code.usageLimit} limit</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${
              isNearLimit ? 'bg-red-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    );
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCodeForm({ ...codeForm, code: result });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Discount Codes</h2>
          <p className="text-sm text-gray-500">Manage promotional codes and discounts</p>
        </div>
        <Button onClick={handleCreateCode}>
          <Plus className="w-4 h-4 mr-2" />
          Create Code
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search codes..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64"
              />
            </div>

            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="expired">Expired</option>
            </select>

            {/* Type Filter */}
            <select
              value={filters.type || ''}
              onChange={(e) => setFilters({ ...filters, type: e.target.value || null })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="percentage">Percentage</option>
              <option value="fixed_amount">Fixed Amount</option>
              <option value="free_shipping">Free Shipping</option>
              <option value="buy_x_get_y">Buy X Get Y</option>
            </select>

            {/* Usage Filter */}
            <select
              value={filters.usage}
              onChange={(e) => setFilters({ ...filters, usage: e.target.value as any })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Usage</option>
              <option value="unused">Unused</option>
              <option value="limited">Limited</option>
              <option value="exhausted">Exhausted</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {filteredCodes.length} codes
            </span>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Codes</p>
              <p className="text-2xl font-bold text-gray-900">{codes.length}</p>
            </div>
            <Tag className="w-8 h-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Codes</p>
              <p className="text-2xl font-bold text-green-600">
                {codes.filter(code => code.isActive && new Date(code.validTo) > new Date()).length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Usage</p>
              <p className="text-2xl font-bold text-purple-600">
                {codes.reduce((sum, code) => sum + code.usageCount, 0)}
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-purple-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Expired</p>
              <p className="text-2xl font-bold text-red-600">
                {codes.filter(code => new Date(code.validTo) <= new Date()).length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-red-600" />
          </div>
        </Card>
      </div>

      {/* Codes List */}
      <Card>
        {loading ? (
          <div className="p-8 text-center">
            <Loading size="lg" text="Loading discount codes..." />
          </div>
        ) : filteredCodes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type & Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valid Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCodes.map((code) => (
                  <tr key={code.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="flex items-center space-x-2">
                          <code className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                            {code.code}
                          </code>
                          <button
                            onClick={() => navigator.clipboard.writeText(code.code)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="text-sm font-medium text-gray-900 mt-1">
                          {code.name}
                        </div>
                        {code.description && (
                          <div className="text-sm text-gray-500">
                            {code.description}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {getTypeBadge(code.type)}
                        <div className="text-sm font-medium">
                          {code.type === 'percentage' ? `${code.value}%` : `$${code.value}`}
                        </div>
                        {code.minOrderAmount && (
                          <div className="text-xs text-gray-500">
                            Min order: ${code.minOrderAmount}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(code)}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-32">
                        {getUsageProgress(code) || (
                          <div className="text-sm text-gray-600">
                            {code.usageCount} uses
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div>From: {new Date(code.validFrom).toLocaleDateString()}</div>
                        <div className={new Date(code.validTo) <= new Date() ? 'text-red-600' : ''}>
                          To: {new Date(code.validTo).toLocaleDateString()}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditCode(code)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDuplicateCode(code)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDelete(code.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <Tag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No discount codes found</h3>
            <p className="text-gray-500 mb-4">
              {filters.search || filters.status !== 'all' || filters.type || filters.usage !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first discount code to get started'
              }
            </p>
            {(!filters.search && filters.status === 'all' && !filters.type && filters.usage === 'all') && (
              <Button onClick={handleCreateCode}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Code
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <Modal
          isOpen={showCreateModal || showEditModal}
          onClose={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
          }}
          title={editingCode ? 'Edit Discount Code' : 'Create Discount Code'}
          size="lg"
        >
          <div className="p-6 space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code *
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={codeForm.code}
                    onChange={(e) => setCodeForm({ ...codeForm, code: e.target.value.toUpperCase() })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="DISCOUNT10"
                  />
                  <Button variant="outline" onClick={generateCode}>
                    Generate
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={codeForm.name}
                  onChange={(e) => setCodeForm({ ...codeForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="10% Off Summer Sale"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={codeForm.description}
                onChange={(e) => setCodeForm({ ...codeForm, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Optional description"
              />
            </div>

            {/* Discount Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type *
                </label>
                <select
                  value={codeForm.type}
                  onChange={(e) => setCodeForm({ ...codeForm, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="percentage">Percentage Discount</option>
                  <option value="fixed_amount">Fixed Amount Discount</option>
                  <option value="free_shipping">Free Shipping</option>
                  <option value="buy_x_get_y">Buy X Get Y</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Value *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={codeForm.value}
                    onChange={(e) => setCodeForm({ ...codeForm, value: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center text-gray-500">
                    {codeForm.type === 'percentage' ? '%' : '$'}
                  </div>
                </div>
              </div>
            </div>

            {/* Restrictions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Order Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={codeForm.minOrderAmount || ''}
                  onChange={(e) => setCodeForm({ ...codeForm, minOrderAmount: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Discount Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={codeForm.maxDiscountAmount || ''}
                  onChange={(e) => setCodeForm({ ...codeForm, maxDiscountAmount: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="No limit"
                />
              </div>
            </div>

            {/* Usage Limits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Usage Limit
                </label>
                <input
                  type="number"
                  min="1"
                  value={codeForm.usageLimit || ''}
                  onChange={(e) => setCodeForm({ ...codeForm, usageLimit: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Unlimited"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Per Customer Limit
                </label>
                <input
                  type="number"
                  min="1"
                  value={codeForm.customerUsageLimit || ''}
                  onChange={(e) => setCodeForm({ ...codeForm, customerUsageLimit: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Unlimited"
                />
              </div>
            </div>

            {/* Validity Period */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valid From *
                </label>
                <input
                  type="date"
                  value={codeForm.validFrom}
                  onChange={(e) => setCodeForm({ ...codeForm, validFrom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valid To *
                </label>
                <input
                  type="date"
                  value={codeForm.validTo}
                  onChange={(e) => setCodeForm({ ...codeForm, validTo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Active Status */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={codeForm.isActive}
                  onChange={(e) => setCodeForm({ ...codeForm, isActive: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveCode}>
                {editingCode ? 'Update' : 'Create'} Code
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DiscountCodeManager;