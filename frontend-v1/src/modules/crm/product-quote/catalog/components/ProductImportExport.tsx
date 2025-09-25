// ProductImportExport - Sprint 19 Frontend Implementation

import React, { useState, useCallback } from 'react';
import {
  Upload,
  Download,
  FileText,
  CheckCircle,
  AlertTriangle,
  X,
  RefreshCw
} from 'lucide-react';
import { ImportResult } from '../../../shared/types';

interface ProductImportExportProps {
  onClose: () => void;
  onImportComplete?: () => void;
  onExportComplete?: () => void;
}

type TabType = 'import' | 'export';

const ProductImportExport: React.FC<ProductImportExportProps> = ({
  onClose,
  onImportComplete,
  onExportComplete
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('import');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel'>('csv');

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportResult(null);
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!importFile) return;

    setIsProcessing(true);
    try {
      // Simulate import process
      await new Promise(resolve => setTimeout(resolve, 2000));

      const mockResult: ImportResult = {
        success: 85,
        failed: 15,
        errors: [
          { row: 5, field: 'sku', message: 'SKU already exists', value: 'PROD-001' },
          { row: 12, field: 'price', message: 'Invalid price format', value: 'abc' }
        ],
        warnings: [
          { row: 8, field: 'category', message: 'Category not found, using default', value: 'Unknown' }
        ]
      };

      setImportResult(mockResult);
      if (onImportComplete) {
        onImportComplete();
      }
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [importFile, onImportComplete]);

  const handleExport = useCallback(async () => {
    setIsProcessing(true);
    try {
      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Create and download file
      const blob = new Blob(['Product data...'], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products.${exportFormat}`;
      a.click();
      URL.revokeObjectURL(url);

      if (onExportComplete) {
        onExportComplete();
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [exportFormat, onExportComplete]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">
              Import/Export Products
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('import')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'import'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Upload className="h-4 w-4 inline mr-2" />
                Import
              </button>
              <button
                onClick={() => setActiveTab('export')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'export'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Download className="h-4 w-4 inline mr-2" />
                Export
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'import' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Import Products
                  </h3>
                  <p className="text-sm text-gray-600">
                    Upload a CSV or Excel file to import products into your catalog.
                  </p>
                </div>

                {/* File upload */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <div className="text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <div className="text-sm text-gray-600">
                      <label className="cursor-pointer">
                        <span className="text-blue-600 hover:text-blue-500">
                          Choose a file
                        </span>
                        <input
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                      {' '}or drag and drop
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      CSV, XLSX up to 10MB
                    </p>
                  </div>
                </div>

                {importFile && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {importFile.name}
                        </span>
                      </div>
                      <button
                        onClick={() => setImportFile(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Import results */}
                {importResult && (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                        <span className="text-sm font-medium text-green-900">
                          Import completed
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-green-700">
                        {importResult.success} products imported successfully,{' '}
                        {importResult.failed} failed
                      </div>
                    </div>

                    {importResult.errors.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center mb-2">
                          <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                          <span className="text-sm font-medium text-red-900">
                            Errors ({importResult.errors.length})
                          </span>
                        </div>
                        <div className="space-y-1">
                          {importResult.errors.slice(0, 3).map((error, index) => (
                            <div key={index} className="text-sm text-red-700">
                              Row {error.row}: {error.message}
                            </div>
                          ))}
                          {importResult.errors.length > 3 && (
                            <div className="text-sm text-red-600">
                              +{importResult.errors.length - 3} more errors
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={handleImport}
                    disabled={!importFile || isProcessing}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {isProcessing ? 'Importing...' : 'Import Products'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'export' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Export Products
                  </h3>
                  <p className="text-sm text-gray-600">
                    Export your product catalog to a file for backup or analysis.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Export Format
                  </label>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as 'csv' | 'excel')}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="csv">CSV</option>
                    <option value="excel">Excel (XLSX)</option>
                  </select>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Download className="h-5 w-5 text-blue-500 mr-2" />
                    <span className="text-sm font-medium text-blue-900">
                      Export includes all products
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-blue-700">
                    Name, SKU, description, price, category, and inventory data
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleExport}
                    disabled={isProcessing}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    {isProcessing ? 'Exporting...' : 'Export Products'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductImportExport;