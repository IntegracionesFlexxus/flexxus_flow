// Data Exporter Component - Sprint 19 Frontend Implementation

import React, { useState, useCallback } from 'react';
import {
  Download,
  FileText,
  FileSpreadsheet,
  FileImage,
  Settings,
  X,
  Check,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { ExportOptions, FilterConfig, TableColumn } from '../../types';

export interface DataExporterProps {
  data?: any[];
  columns: TableColumn[];
  availableFormats?: Array<'csv' | 'excel' | 'pdf' | 'json'>;
  defaultFormat?: 'csv' | 'excel' | 'pdf' | 'json';
  defaultFilename?: string;
  filters?: FilterConfig[];
  onExport: (options: ExportOptions) => Promise<Blob>;
  maxRecords?: number;
  className?: string;
  buttonVariant?: 'primary' | 'secondary' | 'minimal';
  showAdvancedOptions?: boolean;
}

interface ExportProgress {
  stage: 'preparing' | 'generating' | 'downloading' | 'complete' | 'error';
  message: string;
  progress?: number;
}

const DataExporter: React.FC<DataExporterProps> = ({
  data = [],
  columns,
  availableFormats = ['csv', 'excel', 'pdf'],
  defaultFormat = 'csv',
  defaultFilename = 'export',
  filters = [],
  onExport,
  maxRecords = 10000,
  className = "",
  buttonVariant = 'secondary',
  showAdvancedOptions = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);

  // Export options state
  const [selectedFormat, setSelectedFormat] = useState<ExportOptions['format']>(defaultFormat);
  const [filename, setFilename] = useState(defaultFilename);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    columns.map(col => col.key)
  );
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [includeFilters, setIncludeFilters] = useState(true);

  const formatIcons = {
    csv: <FileText className="h-4 w-4" />,
    excel: <FileSpreadsheet className="h-4 w-4" />,
    pdf: <FileImage className="h-4 w-4" />,
    json: <FileText className="h-4 w-4" />
  };

  const formatLabels = {
    csv: 'CSV',
    excel: 'Excel',
    pdf: 'PDF',
    json: 'JSON'
  };

  const getButtonClasses = () => {
    const baseClasses = "inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed";

    switch (buttonVariant) {
      case 'primary':
        return `${baseClasses} bg-blue-600 text-white hover:bg-blue-700`;
      case 'secondary':
        return `${baseClasses} bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300`;
      case 'minimal':
        return `${baseClasses} text-gray-600 hover:text-gray-800 hover:bg-gray-100`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-700 hover:bg-gray-200`;
    }
  };

  const toggleColumn = useCallback((columnKey: string) => {
    setSelectedColumns(prev =>
      prev.includes(columnKey)
        ? prev.filter(key => key !== columnKey)
        : [...prev, columnKey]
    );
  }, []);

  const selectAllColumns = useCallback(() => {
    setSelectedColumns(columns.map(col => col.key));
  }, [columns]);

  const deselectAllColumns = useCallback(() => {
    setSelectedColumns([]);
  }, []);

  const handleExport = useCallback(async () => {
    if (selectedColumns.length === 0) {
      return;
    }

    setIsExporting(true);
    setExportProgress({
      stage: 'preparing',
      message: 'Preparing export...',
      progress: 10
    });

    try {
      const exportOptions: ExportOptions = {
        format: selectedFormat,
        columns: selectedColumns,
        filters: includeFilters ? filters : undefined,
        includeHeaders,
        filename: filename || defaultFilename
      };

      setExportProgress({
        stage: 'generating',
        message: 'Generating file...',
        progress: 50
      });

      const blob = await onExport(exportOptions);

      setExportProgress({
        stage: 'downloading',
        message: 'Starting download...',
        progress: 90
      });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.${selectedFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setExportProgress({
        stage: 'complete',
        message: 'Export completed successfully!',
        progress: 100
      });

      // Close dialog after success
      setTimeout(() => {
        setIsOpen(false);
        setExportProgress(null);
      }, 1500);

    } catch (error) {
      console.error('Export failed:', error);
      setExportProgress({
        stage: 'error',
        message: error instanceof Error ? error.message : 'Export failed. Please try again.'
      });
    } finally {
      setIsExporting(false);
    }
  }, [
    selectedFormat,
    selectedColumns,
    includeHeaders,
    includeFilters,
    filename,
    defaultFilename,
    filters,
    onExport
  ]);

  const resetOptions = () => {
    setSelectedFormat(defaultFormat);
    setFilename(defaultFilename);
    setSelectedColumns(columns.map(col => col.key));
    setIncludeHeaders(true);
    setIncludeFilters(true);
    setExportProgress(null);
  };

  const recordCount = data.length;
  const willExceedLimit = recordCount > maxRecords;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`${getButtonClasses()} ${className}`}
        disabled={recordCount === 0}
        title={recordCount === 0 ? "No data to export" : "Export data"}
      >
        <Download className="h-4 w-4" />
        <span>Export</span>
        {recordCount > 0 && (
          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full ml-2">
            {recordCount.toLocaleString()}
          </span>
        )}
      </button>

      {/* Export Dialog */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Export Data
              </h2>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setExportProgress(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Export Progress */}
              {exportProgress && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    {exportProgress.stage === 'error' ? (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    ) : exportProgress.stage === 'complete' ? (
                      <Check className="h-5 w-5 text-green-600" />
                    ) : (
                      <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                    )}
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
                        exportProgress.stage === 'error' ? 'text-red-800' :
                        exportProgress.stage === 'complete' ? 'text-green-800' :
                        'text-gray-800'
                      }`}>
                        {exportProgress.message}
                      </p>
                      {exportProgress.progress !== undefined && (
                        <div className="mt-2 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${exportProgress.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Record Count Warning */}
              {willExceedLimit && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="text-sm font-medium text-orange-800">
                        Large Export Warning
                      </p>
                      <p className="text-sm text-orange-700 mt-1">
                        You're trying to export {recordCount.toLocaleString()} records.
                        Only the first {maxRecords.toLocaleString()} will be included.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Format Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Export Format
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {availableFormats.map(format => (
                    <button
                      key={format}
                      onClick={() => setSelectedFormat(format)}
                      className={`flex items-center justify-center space-x-2 p-3 border rounded-lg transition-colors ${
                        selectedFormat === format
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {formatIcons[format]}
                      <span className="text-sm font-medium">
                        {formatLabels[format]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Filename */}
              <div>
                <label htmlFor="filename" className="block text-sm font-medium text-gray-700 mb-2">
                  Filename
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    id="filename"
                    type="text"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter filename"
                  />
                  <span className="text-sm text-gray-500">
                    .{selectedFormat}
                  </span>
                </div>
              </div>

              {/* Advanced Options */}
              {showAdvancedOptions && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Options</h3>
                  <div className="space-y-3">
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={includeHeaders}
                        onChange={(e) => setIncludeHeaders(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">Include column headers</span>
                    </label>

                    {filters.length > 0 && (
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={includeFilters}
                          onChange={(e) => setIncludeFilters(e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">
                          Apply current filters ({filters.length} active)
                        </span>
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* Column Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700">
                    Columns to Export ({selectedColumns.length} of {columns.length})
                  </h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={selectAllColumns}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Select All
                    </button>
                    <span className="text-xs text-gray-400">|</span>
                    <button
                      onClick={deselectAllColumns}
                      className="text-xs text-gray-600 hover:text-gray-800"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                    {columns.map(column => (
                      <label
                        key={column.key}
                        className="flex items-center space-x-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={selectedColumns.includes(column.key)}
                          onChange={() => toggleColumn(column.key)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700 truncate">
                          {column.title}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={resetOptions}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Reset to Defaults
              </button>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setExportProgress(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isExporting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleExport}
                  disabled={selectedColumns.length === 0 || isExporting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExporting ? 'Exporting...' : 'Export'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DataExporter;