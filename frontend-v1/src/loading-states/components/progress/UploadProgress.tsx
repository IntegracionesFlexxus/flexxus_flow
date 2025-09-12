/**
 * UploadProgress Component
 * Loading States - Progress para uploads con cancelación y retry
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  LinearProgress,
  Typography,
  IconButton,
  Paper,
  Collapse,
  Alert,
  Button,
  Chip,
  useTheme
} from '@mui/material';
import {
  CloudUpload,
  Cancel,
  CheckCircle,
  Error,
  Refresh,
  ExpandLess,
  ExpandMore,
  InsertDriveFile
} from '@mui/icons-material';

export interface UploadFile {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error' | 'cancelled';
  error?: string;
  uploadedSize?: number;
  speed?: number;
  remainingTime?: number;
}

interface UploadProgressProps {
  files: UploadFile[];
  onCancel?: (fileId: string) => void;
  onRetry?: (fileId: string) => void;
  onRemove?: (fileId: string) => void;
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  files,
  onCancel,
  onRetry,
  onRemove,
  showDetails = true,
  compact = false,
  className
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(!compact);
  
  const totalFiles = files.length;
  const completedFiles = files.filter(f => f.status === 'success').length;
  const errorFiles = files.filter(f => f.status === 'error').length;
  const uploadingFiles = files.filter(f => f.status === 'uploading').length;
  
  const overallProgress = totalFiles > 0
    ? files.reduce((acc, file) => acc + (file.progress || 0), 0) / totalFiles
    : 0;

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatTime = (seconds?: number) => {
    if (!seconds) return '--';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const formatSpeed = (bytesPerSecond?: number) => {
    if (!bytesPerSecond) return '--';
    return formatFileSize(bytesPerSecond) + '/s';
  };

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle color="success" fontSize="small" />;
      case 'error':
        return <Error color="error" fontSize="small" />;
      case 'cancelled':
        return <Cancel color="action" fontSize="small" />;
      case 'uploading':
        return <CloudUpload color="primary" fontSize="small" />;
      default:
        return <InsertDriveFile color="action" fontSize="small" />;
    }
  };

  const getProgressColor = (file: UploadFile) => {
    switch (file.status) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'cancelled':
        return 'inherit';
      default:
        return 'primary';
    }
  };

  return (
    <Paper elevation={2} className={className}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: expanded ? `1px solid ${theme.palette.divider}` : 'none'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CloudUpload color="primary" />
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              {uploadingFiles > 0
                ? `Uploading ${uploadingFiles} file${uploadingFiles > 1 ? 's' : ''}`
                : errorFiles > 0
                ? `${errorFiles} upload${errorFiles > 1 ? 's' : ''} failed`
                : `${completedFiles}/${totalFiles} completed`}
            </Typography>
            {showDetails && (
              <Typography variant="caption" color="text.secondary">
                {Math.round(overallProgress)}% complete
              </Typography>
            )}
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {errorFiles > 0 && (
            <Chip
              label={`${errorFiles} error${errorFiles > 1 ? 's' : ''}`}
              size="small"
              color="error"
              variant="outlined"
            />
          )}
          <IconButton 
            size="small" 
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>
      </Box>

      {/* Overall Progress */}
      {!compact && (
        <Box sx={{ px: 2, pb: expanded ? 1 : 2 }}>
          <LinearProgress
            variant="determinate"
            value={overallProgress}
            sx={{ height: 6, borderRadius: 1 }}
          />
        </Box>
      )}

      {/* File List */}
      <Collapse in={expanded}>
        <Box sx={{ p: 2, pt: 1 }}>
          {files.map((file) => (
            <Box
              key={file.id}
              sx={{
                mb: 2,
                '&:last-child': { mb: 0 }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                {getStatusIcon(file.status)}
                <Typography
                  variant="body2"
                  sx={{
                    ml: 1,
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {file.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                  {formatFileSize(file.size)}
                </Typography>
                
                {/* Actions */}
                <Box sx={{ ml: 2, display: 'flex', gap: 0.5 }}>
                  {file.status === 'uploading' && onCancel && (
                    <IconButton
                      size="small"
                      onClick={() => onCancel(file.id)}
                      title="Cancel upload"
                    >
                      <Cancel fontSize="small" />
                    </IconButton>
                  )}
                  {file.status === 'error' && onRetry && (
                    <IconButton
                      size="small"
                      onClick={() => onRetry(file.id)}
                      title="Retry upload"
                    >
                      <Refresh fontSize="small" />
                    </IconButton>
                  )}
                  {(file.status === 'success' || file.status === 'error' || file.status === 'cancelled') && onRemove && (
                    <IconButton
                      size="small"
                      onClick={() => onRemove(file.id)}
                      title="Remove"
                    >
                      <Cancel fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              </Box>

              {/* Progress Bar */}
              {file.status !== 'pending' && (
                <Box sx={{ mb: 1 }}>
                  <LinearProgress
                    variant={file.status === 'uploading' ? 'determinate' : 'determinate'}
                    value={file.progress}
                    color={getProgressColor(file)}
                    sx={{ height: 4, borderRadius: 1 }}
                  />
                </Box>
              )}

              {/* Details */}
              {showDetails && file.status === 'uploading' && (
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    {formatFileSize(file.uploadedSize || 0)} / {formatFileSize(file.size)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Speed: {formatSpeed(file.speed)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Time remaining: {formatTime(file.remainingTime)}
                  </Typography>
                </Box>
              )}

              {/* Error Message */}
              {file.status === 'error' && file.error && (
                <Alert 
                  severity="error" 
                  sx={{ mt: 1, py: 0 }}
                  action={
                    onRetry && (
                      <Button 
                        size="small" 
                        onClick={() => onRetry(file.id)}
                      >
                        Retry
                      </Button>
                    )
                  }
                >
                  {file.error}
                </Alert>
              )}
            </Box>
          ))}
        </Box>
      </Collapse>
    </Paper>
  );
};

export default UploadProgress;