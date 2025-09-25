import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Card,
  CardContent,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import {
  GetApp,
  Refresh,
  FilterList,
  Sort,
  MoreVert,
  BarChart,
  PieChart,
  ShowChart,
  TableChart,
  Print,
  Share,
  Schedule
} from '@mui/icons-material';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement } from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { useReportsStore } from '../../stores/reportsStore';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement);

interface ReportViewerProps {
  reportId: number;
  executionId?: string;
}

export const ReportViewer: React.FC<ReportViewerProps> = ({
  reportId,
  executionId
}) => {
  const {
    currentReport,
    reportData,
    loading,
    error,
    getReport,
    executeReport,
    exportReport,
    clearError
  } = useReportsStore();

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [viewType, setViewType] = useState<'table' | 'chart'>('table');

  useEffect(() => {
    if (reportId) {
      getReport(reportId);
    }
  }, [reportId]);

  useEffect(() => {
    if (currentReport && !reportData.length) {
      handleExecuteReport();
    }
  }, [currentReport]);

  const handleExecuteReport = async () => {
    if (!currentReport) return;

    try {
      await executeReport(currentReport, {});
    } catch (error) {
      console.error('Execute report error:', error);
    }
  };

  const handleExport = async (format: string) => {
    if (!currentReport) return;

    try {
      await exportReport(currentReport.id, format);
      setMenuAnchor(null);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getColumns = () => {
    if (!reportData.length) return [];
    return Object.keys(reportData[0]);
  };

  const getPaginatedData = () => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return reportData.slice(start, end);
  };

  const formatCellValue = (value: any, column: string) => {
    if (value === null || value === undefined) return '-';

    // Format based on column name patterns
    if (column.includes('amount') || column.includes('revenue') || column.includes('value')) {
      return typeof value === 'number' ? `$${value.toLocaleString()}` : value;
    }
    if (column.includes('date') || column.includes('_at')) {
      return new Date(value).toLocaleDateString();
    }
    if (column.includes('percent') || column.includes('rate')) {
      return typeof value === 'number' ? `${value.toFixed(1)}%` : value;
    }

    return value.toString();
  };

  const generateChartData = () => {
    if (!reportData.length) return null;

    const columns = getColumns();
    const numericColumns = columns.filter(col => {
      const sampleValue = reportData[0][col];
      return typeof sampleValue === 'number';
    });

    if (numericColumns.length === 0) return null;

    const labels = reportData.slice(0, 10).map((row, index) => {
      // Use first string column as label, or row number
      const stringColumn = columns.find(col => typeof row[col] === 'string');
      return stringColumn ? row[stringColumn] : `Row ${index + 1}`;
    });

    const datasets = numericColumns.slice(0, 3).map((col, index) => ({
      label: col,
      data: reportData.slice(0, 10).map(row => row[col] || 0),
      backgroundColor: [
        'rgba(54, 162, 235, 0.6)',
        'rgba(255, 99, 132, 0.6)',
        'rgba(255, 205, 86, 0.6)'
      ][index],
      borderColor: [
        'rgba(54, 162, 235, 1)',
        'rgba(255, 99, 132, 1)',
        'rgba(255, 205, 86, 1)'
      ][index],
      borderWidth: 1
    }));

    return { labels, datasets };
  };

  const renderChart = () => {
    const chartData = generateChartData();
    if (!chartData) return null;

    const chartType = currentReport?.query_config?.chart_type || 'bar';

    switch (chartType) {
      case 'pie':
        return <Pie data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />;
      case 'line':
        return <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />;
      case 'bar':
      default:
        return <Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />;
    }
  };

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'chart': return <ShowChart />;
      case 'summary': return <BarChart />;
      case 'dashboard': return <PieChart />;
      case 'tabular':
      default: return <TableChart />;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (!currentReport) {
    return (
      <Alert severity="info">
        Report not found or not loaded.
      </Alert>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" onClose={clearError} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Report Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            {getReportTypeIcon(currentReport.report_type)}
            <Typography variant="h4" fontWeight="bold">
              {currentReport.name}
            </Typography>
            <Chip
              label={currentReport.report_type}
              size="small"
              variant="outlined"
            />
          </Box>
          {currentReport.description && (
            <Typography variant="body1" color="textSecondary">
              {currentReport.description}
            </Typography>
          )}
        </Box>

        <Box display="flex" gap={1}>
          <Button
            startIcon={<Refresh />}
            onClick={handleExecuteReport}
            disabled={loading}
          >
            Refresh
          </Button>
          <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)}>
            <MoreVert />
          </IconButton>
        </Box>
      </Box>

      {/* Report Summary */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {reportData.length.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Records
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {getColumns().length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Columns
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {new Date().toLocaleDateString()}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Last Updated
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {currentReport.is_public ? 'Public' : 'Private'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Visibility
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* View Toggle */}
      {currentReport.report_type === 'chart' && (
        <Box mb={2}>
          <Button
            variant={viewType === 'table' ? 'contained' : 'outlined'}
            onClick={() => setViewType('table')}
            startIcon={<TableChart />}
            sx={{ mr: 1 }}
          >
            Table View
          </Button>
          <Button
            variant={viewType === 'chart' ? 'contained' : 'outlined'}
            onClick={() => setViewType('chart')}
            startIcon={<BarChart />}
          >
            Chart View
          </Button>
        </Box>
      )}

      {/* Report Content */}
      <Paper>
        {viewType === 'chart' && currentReport.report_type === 'chart' ? (
          <Box p={3} height={400}>
            {renderChart()}
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    {getColumns().map((column) => (
                      <TableCell key={column}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {column.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Typography>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getPaginatedData().map((row, index) => (
                    <TableRow key={index}>
                      {getColumns().map((column) => (
                        <TableCell key={column}>
                          {formatCellValue(row[column], column)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {reportData.length > rowsPerPage && (
              <TablePagination
                component="div"
                count={reportData.length}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[10, 25, 50, 100]}
              />
            )}
          </>
        )}
      </Paper>

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={() => handleExport('csv')}>
          <GetApp sx={{ mr: 1 }} />
          Export CSV
        </MenuItem>
        <MenuItem onClick={() => handleExport('xlsx')}>
          <GetApp sx={{ mr: 1 }} />
          Export Excel
        </MenuItem>
        <MenuItem onClick={() => handleExport('pdf')}>
          <GetApp sx={{ mr: 1 }} />
          Export PDF
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => console.log('Print report')}>
          <Print sx={{ mr: 1 }} />
          Print
        </MenuItem>
        <MenuItem onClick={() => console.log('Share report')}>
          <Share sx={{ mr: 1 }} />
          Share
        </MenuItem>
        <MenuItem onClick={() => console.log('Schedule report')}>
          <Schedule sx={{ mr: 1 }} />
          Schedule
        </MenuItem>
      </Menu>
    </Box>
  );
};