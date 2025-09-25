import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Fab,
  Divider
} from '@mui/material';
import {
  Add,
  Search,
  FilterList,
  MoreVert,
  PlayArrow,
  Edit,
  Delete,
  Schedule,
  Share,
  GetApp,
  Assessment,
  Visibility,
  ContentCopy
} from '@mui/icons-material';
import { ReportBuilder } from '../components/reports/ReportBuilder';
import { ReportViewer } from '../components/reports/ReportViewer';
import { ExportDialog } from '../components/shared/ExportDialog';
import { useReportsStore } from '../stores/reportsStore';

export const ReportsPage: React.FC = () => {
  const {
    reports,
    loading,
    error,
    fetchReports,
    deleteReport,
    cloneReport,
    exportReport,
    clearError
  } = useReportsStore();

  const [view, setView] = useState<'list' | 'builder' | 'viewer'>('list');
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuReport, setMenuReport] = useState<any>(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [exportDialog, setExportDialog] = useState(false);
  const [exportData, setExportData] = useState<any[]>([]);

  useEffect(() => {
    fetchReports();
  }, []);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleFilterChange = (event: any) => {
    setFilterType(event.target.value);
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || report.report_type === filterType;

    return matchesSearch && matchesType;
  });

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, report: any) => {
    setMenuAnchor(event.currentTarget);
    setMenuReport(report);
    event.stopPropagation();
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuReport(null);
  };

  const handleRunReport = (report: any) => {
    setSelectedReport(report);
    setView('viewer');
    handleMenuClose();
  };

  const handleEditReport = (report: any) => {
    setSelectedReport(report);
    setView('builder');
    handleMenuClose();
  };

  const handleCloneReport = async (report: any) => {
    try {
      await cloneReport(report.id, `${report.name} (Copy)`);
      await fetchReports();
    } catch (error) {
      console.error('Clone error:', error);
    }
    handleMenuClose();
  };

  const handleDeleteReport = async () => {
    if (!menuReport) return;

    try {
      await deleteReport(menuReport.id);
      await fetchReports();
      setDeleteDialog(false);
    } catch (error) {
      console.error('Delete error:', error);
    }
    handleMenuClose();
  };

  const handleExportReport = async (format: string, options: any) => {
    if (!menuReport) return;

    try {
      await exportReport(menuReport.id, format, options);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const getReportTypeColor = (type: string) => {
    switch (type) {
      case 'tabular': return 'primary';
      case 'summary': return 'success';
      case 'chart': return 'info';
      case 'dashboard': return 'warning';
      default: return 'default';
    }
  };

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'chart': return '📊';
      case 'summary': return '📈';
      case 'dashboard': return '📋';
      case 'tabular':
      default: return '📄';
    }
  };

  const formatLastRun = (date: string | null) => {
    if (!date) return 'Never run';
    return new Date(date).toLocaleDateString();
  };

  if (view === 'builder') {
    return (
      <Container maxWidth="xl">
        <Box py={2}>
          <Button
            onClick={() => {
              setView('list');
              setSelectedReport(null);
            }}
            sx={{ mb: 2 }}
          >
            ← Back to Reports
          </Button>
          <ReportBuilder />
        </Box>
      </Container>
    );
  }

  if (view === 'viewer' && selectedReport) {
    return (
      <Container maxWidth="xl">
        <Box py={2}>
          <Button
            onClick={() => {
              setView('list');
              setSelectedReport(null);
            }}
            sx={{ mb: 2 }}
          >
            ← Back to Reports
          </Button>
          <ReportViewer reportId={selectedReport.id} />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box py={3}>
        {error && (
          <Alert severity="error" onClose={clearError} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Box>
            <Typography variant="h3" fontWeight="bold" gutterBottom>
              Reports & Analytics
            </Typography>
            <Typography variant="h6" color="textSecondary">
              Create, manage, and run business reports
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="large"
            startIcon={<Add />}
            onClick={() => setView('builder')}
          >
            Create Report
          </Button>
        </Box>

        {/* Filters */}
        <Grid container spacing={2} mb={3} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Report Type</InputLabel>
              <Select
                value={filterType}
                label="Report Type"
                onChange={handleFilterChange}
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="tabular">Tabular</MenuItem>
                <MenuItem value="summary">Summary</MenuItem>
                <MenuItem value="chart">Chart</MenuItem>
                <MenuItem value="dashboard">Dashboard</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FilterList />}
              size="small"
            >
              More Filters
            </Button>
          </Grid>
        </Grid>

        {/* Reports Grid */}
        {filteredReports.length > 0 ? (
          <Grid container spacing={3}>
            {filteredReports.map((report) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={report.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4
                    }
                  }}
                  onClick={() => handleRunReport(report)}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                      <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        {getReportTypeIcon(report.report_type)} {report.name}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuClick(e, report)}
                        sx={{ ml: 1 }}
                      >
                        <MoreVert />
                      </IconButton>
                    </Box>

                    <Typography variant="body2" color="textSecondary" paragraph>
                      {report.description || 'No description available'}
                    </Typography>

                    <Box mb={2}>
                      <Chip
                        label={report.report_type}
                        size="small"
                        color={getReportTypeColor(report.report_type) as any}
                        variant="outlined"
                      />
                      {report.is_scheduled && (
                        <Chip
                          label="Scheduled"
                          size="small"
                          color="info"
                          variant="filled"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Box>

                    <Box>
                      <Typography variant="caption" color="textSecondary" display="block">
                        Created: {new Date(report.created_at).toLocaleDateString()}
                      </Typography>
                      <Typography variant="caption" color="textSecondary" display="block">
                        Last run: {formatLastRun(report.last_executed)}
                      </Typography>
                    </Box>
                  </CardContent>

                  <CardActions sx={{ justifyContent: 'space-between', pt: 0 }}>
                    <Button
                      size="small"
                      startIcon={<PlayArrow />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRunReport(report);
                      }}
                    >
                      Run
                    </Button>
                    <Button
                      size="small"
                      startIcon={<Visibility />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRunReport(report);
                      }}
                    >
                      View
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            minHeight={400}
            textAlign="center"
          >
            <Assessment sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
            <Typography variant="h5" color="textSecondary" gutterBottom>
              {searchTerm || filterType !== 'all' ? 'No reports found' : 'No Reports Created'}
            </Typography>
            <Typography variant="body1" color="textSecondary" mb={3}>
              {searchTerm || filterType !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Create your first report to start analyzing your business data'
              }
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<Add />}
              onClick={() => setView('builder')}
            >
              Create Report
            </Button>
          </Box>
        )}

        {/* Floating Action Button */}
        {filteredReports.length > 0 && (
          <Fab
            color="primary"
            aria-label="add report"
            sx={{ position: 'fixed', bottom: 16, right: 16 }}
            onClick={() => setView('builder')}
          >
            <Add />
          </Fab>
        )}

        {/* Context Menu */}
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={() => handleRunReport(menuReport)}>
            <PlayArrow sx={{ mr: 1 }} />
            Run Report
          </MenuItem>
          <MenuItem onClick={() => handleEditReport(menuReport)}>
            <Edit sx={{ mr: 1 }} />
            Edit Report
          </MenuItem>
          <MenuItem onClick={() => handleCloneReport(menuReport)}>
            <ContentCopy sx={{ mr: 1 }} />
            Clone Report
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => setExportDialog(true)}>
            <GetApp sx={{ mr: 1 }} />
            Export Report
          </MenuItem>
          <MenuItem onClick={() => console.log('Share report')}>
            <Share sx={{ mr: 1 }} />
            Share Report
          </MenuItem>
          <MenuItem onClick={() => console.log('Schedule report')}>
            <Schedule sx={{ mr: 1 }} />
            Schedule Report
          </MenuItem>
          <Divider />
          <MenuItem
            onClick={() => setDeleteDialog(true)}
            sx={{ color: 'error.main' }}
          >
            <Delete sx={{ mr: 1 }} />
            Delete Report
          </MenuItem>
        </Menu>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
          <DialogTitle>Delete Report</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete "{menuReport?.name}"? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
            <Button onClick={handleDeleteReport} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Export Dialog */}
        {menuReport && (
          <ExportDialog
            open={exportDialog}
            title={menuReport.name}
            data={exportData}
            onClose={() => setExportDialog(false)}
            onExport={handleExportReport}
          />
        )}
      </Box>
    </Container>
  );
};