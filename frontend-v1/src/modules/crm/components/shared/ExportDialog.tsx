import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Box,
  Typography,
  Chip,
  Grid,
  Card,
  CardContent,
  Switch,
  Alert,
  LinearProgress
} from '@mui/material';
import {
  GetApp,
  Description,
  TableChart,
  PictureAsPdf,
  Image
} from '@mui/icons-material';

interface ExportFormat {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  fileExtension: string;
  features: string[];
}

interface ExportDialogProps {
  open: boolean;
  title: string;
  data: any[];
  onClose: () => void;
  onExport: (format: string, options: ExportOptions) => Promise<void>;
}

interface ExportOptions {
  format: string;
  filename: string;
  includeHeaders: boolean;
  includeFilters: boolean;
  includeCharts: boolean;
  pageSize?: string;
  orientation?: string;
  dateRange?: string;
  maxRows?: number;
}

const EXPORT_FORMATS: ExportFormat[] = [
  {
    id: 'csv',
    name: 'CSV',
    description: 'Comma-separated values file',
    icon: <TableChart />,
    fileExtension: '.csv',
    features: ['Lightweight', 'Excel compatible', 'Data only']
  },
  {
    id: 'xlsx',
    name: 'Excel',
    description: 'Microsoft Excel workbook',
    icon: <Description />,
    fileExtension: '.xlsx',
    features: ['Formatting preserved', 'Multiple sheets', 'Charts supported']
  },
  {
    id: 'pdf',
    name: 'PDF',
    description: 'Portable Document Format',
    icon: <PictureAsPdf />,
    fileExtension: '.pdf',
    features: ['Print ready', 'Professional layout', 'Charts included']
  },
  {
    id: 'png',
    name: 'Image',
    description: 'PNG image file',
    icon: <Image />,
    fileExtension: '.png',
    features: ['Charts only', 'High resolution', 'Easy sharing']
  }
];

export const ExportDialog: React.FC<ExportDialogProps> = ({
  open,
  title,
  data,
  onClose,
  onExport
}) => {
  const [selectedFormat, setSelectedFormat] = useState('csv');
  const [filename, setFilename] = useState(title.replace(/\s+/g, '_').toLowerCase());
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [includeFilters, setIncludeFilters] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [pageSize, setPageSize] = useState('A4');
  const [orientation, setOrientation] = useState('landscape');
  const [maxRows, setMaxRows] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const selectedFormatData = EXPORT_FORMATS.find(f => f.id === selectedFormat);

  const handleExport = async () => {
    if (!selectedFormatData) return;

    setExporting(true);
    setExportProgress(0);
    setError(null);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 200);

      const options: ExportOptions = {
        format: selectedFormat,
        filename: filename + selectedFormatData.fileExtension,
        includeHeaders,
        includeFilters,
        includeCharts: selectedFormat !== 'csv' && includeCharts,
        pageSize: selectedFormat === 'pdf' ? pageSize : undefined,
        orientation: selectedFormat === 'pdf' ? orientation : undefined,
        maxRows: maxRows || undefined
      };

      await onExport(selectedFormat, options);

      clearInterval(progressInterval);
      setExportProgress(100);

      // Close dialog after successful export
      setTimeout(() => {
        onClose();
        resetForm();
      }, 1000);

    } catch (error: any) {
      setError(error.message || 'Export failed. Please try again.');
      setExportProgress(0);
    } finally {
      setExporting(false);
    }
  };

  const resetForm = () => {
    setSelectedFormat('csv');
    setFilename(title.replace(/\s+/g, '_').toLowerCase());
    setIncludeHeaders(true);
    setIncludeFilters(true);
    setIncludeCharts(true);
    setPageSize('A4');
    setOrientation('landscape');
    setMaxRows(null);
    setExporting(false);
    setExportProgress(0);
    setError(null);
  };

  const handleClose = () => {
    if (!exporting) {
      onClose();
      resetForm();
    }
  };

  const getEstimatedFileSize = () => {
    const rowCount = maxRows ? Math.min(data.length, maxRows) : data.length;
    const columnCount = data.length > 0 ? Object.keys(data[0]).length : 0;

    switch (selectedFormat) {
      case 'csv':
        return `~${Math.round((rowCount * columnCount * 10) / 1024)} KB`;
      case 'xlsx':
        return `~${Math.round((rowCount * columnCount * 15) / 1024)} KB`;
      case 'pdf':
        return `~${Math.round((rowCount * columnCount * 25) / 1024)} KB`;
      case 'png':
        return '~50-200 KB';
      default:
        return 'Unknown';
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <GetApp sx={{ mr: 1 }} />
          Export {title}
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {exporting && (
          <Box mb={2}>
            <Typography variant="body2" gutterBottom>
              Exporting... {exportProgress}%
            </Typography>
            <LinearProgress variant="determinate" value={exportProgress} />
          </Box>
        )}

        {/* Format Selection */}
        <Box mb={3}>
          <Typography variant="h6" gutterBottom>
            Export Format
          </Typography>
          <Grid container spacing={2}>
            {EXPORT_FORMATS.map((format) => (
              <Grid item xs={12} sm={6} key={format.id}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    border: selectedFormat === format.id ? '2px solid' : '1px solid',
                    borderColor: selectedFormat === format.id ? 'primary.main' : 'divider',
                    '&:hover': { borderColor: 'primary.main' }
                  }}
                  onClick={() => setSelectedFormat(format.id)}
                >
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      {format.icon}
                      <Typography variant="h6" ml={1}>
                        {format.name}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      {format.description}
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={0.5}>
                      {format.features.map((feature, index) => (
                        <Chip
                          key={index}
                          label={feature}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Export Options */}
        <Box mb={3}>
          <Typography variant="h6" gutterBottom>
            Export Options
          </Typography>

          <TextField
            fullWidth
            label="Filename"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            margin="normal"
            helperText={`File will be saved as: ${filename}${selectedFormatData?.fileExtension}`}
          />

          <Box mt={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={includeHeaders}
                  onChange={(e) => setIncludeHeaders(e.target.checked)}
                />
              }
              label="Include column headers"
            />
          </Box>

          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={includeFilters}
                  onChange={(e) => setIncludeFilters(e.target.checked)}
                />
              }
              label="Include applied filters"
            />
          </Box>

          {selectedFormat !== 'csv' && (
            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={includeCharts}
                    onChange={(e) => setIncludeCharts(e.target.checked)}
                  />
                }
                label="Include charts and visualizations"
              />
            </Box>
          )}

          <Box mt={2}>
            <TextField
              type="number"
              label="Maximum rows (leave empty for all)"
              value={maxRows || ''}
              onChange={(e) => setMaxRows(e.target.value ? parseInt(e.target.value) : null)}
              fullWidth
              margin="normal"
              helperText={`Total available: ${data.length.toLocaleString()} rows`}
            />
          </Box>

          {/* PDF-specific options */}
          {selectedFormat === 'pdf' && (
            <Box mt={2}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <FormLabel>Page Size</FormLabel>
                    <RadioGroup
                      value={pageSize}
                      onChange={(e) => setPageSize(e.target.value)}
                    >
                      <FormControlLabel value="A4" control={<Radio />} label="A4" />
                      <FormControlLabel value="Letter" control={<Radio />} label="Letter" />
                      <FormControlLabel value="Legal" control={<Radio />} label="Legal" />
                    </RadioGroup>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <FormLabel>Orientation</FormLabel>
                    <RadioGroup
                      value={orientation}
                      onChange={(e) => setOrientation(e.target.value)}
                    >
                      <FormControlLabel value="portrait" control={<Radio />} label="Portrait" />
                      <FormControlLabel value="landscape" control={<Radio />} label="Landscape" />
                    </RadioGroup>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>
          )}
        </Box>

        {/* Export Summary */}
        <Box p={2} bgcolor="grey.50" borderRadius={1}>
          <Typography variant="subtitle2" gutterBottom>
            Export Summary
          </Typography>
          <Typography variant="body2" gutterBottom>
            <strong>Format:</strong> {selectedFormatData?.name} ({selectedFormatData?.fileExtension})
          </Typography>
          <Typography variant="body2" gutterBottom>
            <strong>Records:</strong> {maxRows ? Math.min(data.length, maxRows).toLocaleString() : data.length.toLocaleString()}
          </Typography>
          <Typography variant="body2" gutterBottom>
            <strong>Estimated size:</strong> {getEstimatedFileSize()}
          </Typography>
          <Typography variant="body2">
            <strong>Options:</strong> {[
              includeHeaders && 'Headers',
              includeFilters && 'Filters',
              includeCharts && selectedFormat !== 'csv' && 'Charts'
            ].filter(Boolean).join(', ') || 'None'}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button
          onClick={handleClose}
          disabled={exporting}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleExport}
          disabled={!filename.trim() || exporting}
          startIcon={exporting ? <LinearProgress /> : <GetApp />}
        >
          {exporting ? `Exporting... ${exportProgress}%` : 'Export'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};