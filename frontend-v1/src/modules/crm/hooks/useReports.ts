import { useCallback } from 'react';
import { useReportsStore } from '../stores/reportsStore';

export const useReports = () => {
  const {
    reports,
    currentReport,
    reportData,
    loading,
    error,
    fetchReports,
    getReport,
    createReport,
    updateReport,
    deleteReport,
    cloneReport,
    executeReport,
    exportReport,
    scheduleReport,
    clearError
  } = useReportsStore();

  const getReportsByType = useCallback((type: string) => {
    return reports.filter(report => report.report_type === type);
  }, [reports]);

  const getScheduledReports = useCallback(() => {
    return reports.filter(report => report.is_scheduled);
  }, [reports]);

  const getPublicReports = useCallback(() => {
    return reports.filter(report => report.is_public);
  }, [reports]);

  const getRecentReports = useCallback((limit = 5) => {
    return [...reports]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
  }, [reports]);

  const getPopularReports = useCallback((limit = 5) => {
    return [...reports]
      .sort((a, b) => (b.execution_count || 0) - (a.execution_count || 0))
      .slice(0, limit);
  }, [reports]);

  const runReport = useCallback(async (reportId: number, filters = {}) => {
    const report = reports.find(r => r.id === reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    return executeReport(report, filters);
  }, [reports, executeReport]);

  const duplicateReport = useCallback(async (reportId: number, newName?: string) => {
    const report = reports.find(r => r.id === reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    const cloneName = newName || `${report.name} (Copy)`;
    return cloneReport(reportId, cloneName);
  }, [reports, cloneReport]);

  const exportReportData = useCallback(async (
    reportId: number,
    format: string,
    options: any = {}
  ) => {
    return exportReport(reportId, format, options);
  }, [exportReport]);

  const scheduleReportExecution = useCallback(async (
    reportId: number,
    schedule: any
  ) => {
    return scheduleReport(reportId, schedule);
  }, [scheduleReport]);

  const validateReportConfig = useCallback((config: any) => {
    const errors: string[] = [];

    if (!config.name || config.name.trim() === '') {
      errors.push('Report name is required');
    }

    if (!config.report_type) {
      errors.push('Report type is required');
    }

    if (!config.query_config || !config.query_config.fields || config.query_config.fields.length === 0) {
      errors.push('At least one field must be selected');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);

  const getReportStats = useCallback(() => {
    return {
      total: reports.length,
      scheduled: reports.filter(r => r.is_scheduled).length,
      public: reports.filter(r => r.is_public).length,
      byType: {
        tabular: reports.filter(r => r.report_type === 'tabular').length,
        summary: reports.filter(r => r.report_type === 'summary').length,
        chart: reports.filter(r => r.report_type === 'chart').length,
        dashboard: reports.filter(r => r.report_type === 'dashboard').length
      }
    };
  }, [reports]);

  const searchReports = useCallback((searchTerm: string) => {
    if (!searchTerm.trim()) return reports;

    const term = searchTerm.toLowerCase();
    return reports.filter(report =>
      report.name.toLowerCase().includes(term) ||
      report.description?.toLowerCase().includes(term) ||
      report.report_type.toLowerCase().includes(term)
    );
  }, [reports]);

  const sortReports = useCallback((
    sortBy: 'name' | 'created_at' | 'updated_at' | 'execution_count',
    direction: 'asc' | 'desc' = 'desc'
  ) => {
    return [...reports].sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === 'created_at' || sortBy === 'updated_at') {
        aValue = new Date(aValue as string).getTime();
        bValue = new Date(bValue as string).getTime();
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (direction === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, [reports]);

  const getReportPreview = useCallback(async (reportConfig: any, limit = 10) => {
    // Create a temporary report for preview
    const previewReport = {
      id: -1,
      ...reportConfig,
      query_config: {
        ...reportConfig.query_config,
        limit
      }
    };

    return executeReport(previewReport as any, {});
  }, [executeReport]);

  const canEditReport = useCallback((reportId: number) => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return false;

    // Add your authorization logic here
    // For now, assume all reports can be edited
    return true;
  }, [reports]);

  const canDeleteReport = useCallback((reportId: number) => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return false;

    // Add your authorization logic here
    // For now, assume all reports can be deleted
    return true;
  }, [reports]);

  const formatReportData = useCallback((data: any[], format: 'csv' | 'json' | 'table') => {
    if (!data || data.length === 0) return '';

    switch (format) {
      case 'csv':
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(row => Object.values(row).join(','));
        return [headers, ...rows].join('\n');

      case 'json':
        return JSON.stringify(data, null, 2);

      case 'table':
      default:
        return data;
    }
  }, []);

  return {
    // Data
    reports,
    currentReport,
    reportData,
    loading,
    error,

    // Basic actions
    fetchReports,
    getReport,
    createReport,
    updateReport,
    deleteReport,
    runReport,
    clearError,

    // Advanced actions
    duplicateReport,
    exportReportData,
    scheduleReportExecution,
    getReportPreview,

    // Filtering & searching
    getReportsByType,
    getScheduledReports,
    getPublicReports,
    getRecentReports,
    getPopularReports,
    searchReports,
    sortReports,

    // Utilities
    validateReportConfig,
    getReportStats,
    canEditReport,
    canDeleteReport,
    formatReportData
  };
};