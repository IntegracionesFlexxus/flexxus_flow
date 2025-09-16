/**
 * FileUpload Component - Sprint 3
 * Componente de carga de archivos reutilizable con drag & drop
 * Implementación con principios SOLID y Clean Code
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  LinearProgress,
  Alert,
  Chip,
  Stack,
  useTheme,
  alpha,
  Tooltip,
  Collapse,
  Grid
} from '@mui/material';
import {
  Upload,
  X,
  File,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Code,
  Database,
  Folder,
  CheckCircle,
  AlertCircle,
  XCircle,
  Download,
  Eye,
  Trash2,
  RefreshCw,
  CloudUpload,
  Plus
} from 'lucide-react';

export interface FileWithProgress extends File {
  id: string;
  progress?: number;
  status?: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  url?: string;
}

export interface FileUploadProps {
  // File handling
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSize?: number; // in bytes
  minSize?: number;
  files?: FileWithProgress[];
  onFilesChange?: (files: FileWithProgress[]) => void;
  onUpload?: (files: File[]) => Promise<void>;
  onRemove?: (file: FileWithProgress) => void;
  // Validation
  validator?: (file: File) => string | null;
  allowDuplicates?: boolean;
  // UI Options
  variant?: 'dropzone' | 'button' | 'compact';
  showPreview?: boolean;
  showFileList?: boolean;
  showProgress?: boolean;
  disabled?: boolean;
  // Labels
  title?: string;
  description?: string;
  buttonLabel?: string;
  dropzoneText?: string;
  // Styling
  height?: string | number;
  fullWidth?: boolean;
  color?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
}

/**
 * FileUpload Component
 * Principios aplicados:
 * - S: Responsabilidad única de manejo de archivos
 * - O: Extensible con validadores y handlers personalizados
 * - L: Sustituible por cualquier componente de carga
 * - I: Interface segregada con opciones modulares
 * - D: Depende de abstracciones (callbacks)
 */
export const FileUpload: React.FC<FileUploadProps> = ({
  // File handling
  accept = '*',
  multiple = false,
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024, // 10MB
  minSize = 0,
  files: externalFiles,
  onFilesChange,
  onUpload,
  onRemove,
  // Validation
  validator,
  allowDuplicates = false,
  // UI Options
  variant = 'dropzone',
  showPreview = true,
  showFileList = true,
  showProgress = true,
  disabled = false,
  // Labels
  title = 'Cargar archivos',
  description = 'Arrastra archivos aquí o haz clic para seleccionar',
  buttonLabel = 'Seleccionar archivos',
  dropzoneText = 'Suelta los archivos aquí',
  // Styling
  height = 200,
  fullWidth = true,
  color = 'primary'
}) => {
  const theme = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [internalFiles, setInternalFiles] = useState<FileWithProgress[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  // Use external files if provided, otherwise use internal state
  const files = externalFiles || internalFiles;
  const setFiles = onFilesChange || setInternalFiles;

  /**
   * Generate unique ID for file
   */
  const generateFileId = (file: File): string => {
    return `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`;
  };

  /**
   * Get file icon based on type
   */
  const getFileIcon = (file: File) => {
    const type = file.type.split('/')[0];
    const extension = file.name.split('.').pop()?.toLowerCase();

    const iconProps = { size: 20 };

    if (type === 'image') return <Image {...iconProps} />;
    if (type === 'video') return <Video {...iconProps} />;
    if (type === 'audio') return <Music {...iconProps} />;
    
    switch (extension) {
      case 'pdf':
      case 'doc':
      case 'docx':
      case 'txt':
        return <FileText {...iconProps} />;
      case 'zip':
      case 'rar':
      case '7z':
        return <Archive {...iconProps} />;
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
      case 'css':
      case 'html':
        return <Code {...iconProps} />;
      case 'sql':
      case 'db':
        return <Database {...iconProps} />;
      default:
        return <File {...iconProps} />;
    }
  };

  /**
   * Format file size
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  /**
   * Validate file
   */
  const validateFile = useCallback((file: File): string | null => {
    // Size validation
    if (file.size > maxSize) {
      return `El archivo excede el tamaño máximo de ${formatFileSize(maxSize)}`;
    }
    if (file.size < minSize) {
      return `El archivo es menor al tamaño mínimo de ${formatFileSize(minSize)}`;
    }

    // Type validation
    if (accept !== '*') {
      const acceptedTypes = accept.split(',').map(t => t.trim());
      const fileType = file.type;
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      const isAccepted = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return fileExtension === type.toLowerCase();
        }
        if (type.endsWith('/*')) {
          return fileType.startsWith(type.replace('/*', ''));
        }
        return fileType === type;
      });

      if (!isAccepted) {
        return `Tipo de archivo no permitido. Se aceptan: ${accept}`;
      }
    }

    // Duplicate validation
    if (!allowDuplicates) {
      const isDuplicate = files.some(f => 
        f.name === file.name && f.size === file.size
      );
      if (isDuplicate) {
        return 'Este archivo ya ha sido agregado';
      }
    }

    // Custom validation
    if (validator) {
      return validator(file);
    }

    return null;
  }, [maxSize, minSize, accept, allowDuplicates, files, validator]);

  /**
   * Process selected files
   */
  const processFiles = useCallback(async (selectedFiles: File[]) => {
    const newErrors: string[] = [];
    const validFiles: FileWithProgress[] = [];

    // Check max files limit
    if (files.length + selectedFiles.length > maxFiles) {
      newErrors.push(`Máximo ${maxFiles} archivos permitidos`);
      selectedFiles = selectedFiles.slice(0, maxFiles - files.length);
    }

    // Validate and process each file
    for (const file of selectedFiles) {
      const error = validateFile(file);
      if (error) {
        newErrors.push(`${file.name}: ${error}`);
      } else {
        const fileWithProgress: FileWithProgress = Object.assign(file, {
          id: generateFileId(file),
          progress: 0,
          status: 'pending' as const
        });
        validFiles.push(fileWithProgress);
      }
    }

    setErrors(newErrors);

    if (validFiles.length > 0) {
      const updatedFiles = [...files, ...validFiles];
      setFiles(updatedFiles);

      // Auto upload if handler provided
      if (onUpload) {
        try {
          // Update status to uploading
          const uploadingFiles = updatedFiles.map(f => 
            validFiles.find(vf => vf.id === f.id) 
              ? { ...f, status: 'uploading' as const }
              : f
          );
          setFiles(uploadingFiles);

          await onUpload(validFiles);

          // Update status to success
          const successFiles = updatedFiles.map(f => 
            validFiles.find(vf => vf.id === f.id)
              ? { ...f, status: 'success' as const, progress: 100 }
              : f
          );
          setFiles(successFiles);
        } catch (error) {
          // Update status to error
          const errorFiles = updatedFiles.map(f => 
            validFiles.find(vf => vf.id === f.id)
              ? { ...f, status: 'error' as const, error: 'Error al cargar el archivo' }
              : f
          );
          setFiles(errorFiles);
        }
      }
    }
  }, [files, maxFiles, validateFile, setFiles, onUpload]);

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length > 0) {
      processFiles(selectedFiles);
    }
    // Reset input
    event.target.value = '';
  }, [processFiles]);

  /**
   * Handle drag events
   */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!disabled) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      if (!multiple) {
        processFiles([droppedFiles[0]]);
      } else {
        processFiles(droppedFiles);
      }
    }
  }, [disabled, multiple, processFiles]);

  /**
   * Handle file removal
   */
  const handleRemoveFile = useCallback((file: FileWithProgress) => {
    const updatedFiles = files.filter(f => f.id !== file.id);
    setFiles(updatedFiles);
    onRemove?.(file);
  }, [files, setFiles, onRemove]);

  /**
   * Handle retry upload
   */
  const handleRetry = useCallback((file: FileWithProgress) => {
    if (onUpload) {
      const updatedFiles = files.map(f => 
        f.id === file.id
          ? { ...f, status: 'uploading' as const, error: undefined }
          : f
      );
      setFiles(updatedFiles);
      
      onUpload([file]).then(() => {
        const successFiles = files.map(f => 
          f.id === file.id
            ? { ...f, status: 'success' as const, progress: 100 }
            : f
        );
        setFiles(successFiles);
      }).catch(() => {
        const errorFiles = files.map(f => 
          f.id === file.id
            ? { ...f, status: 'error' as const, error: 'Error al cargar el archivo' }
            : f
        );
        setFiles(errorFiles);
      });
    }
  }, [files, setFiles, onUpload]);

  /**
   * Render dropzone variant
   */
  const renderDropzone = () => (
    <Paper
      sx={{
        height,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px dashed',
        borderColor: isDragging ? 'primary.main' : 'divider',
        borderRadius: 2,
        backgroundColor: isDragging 
          ? alpha(theme.palette.primary.main, 0.05)
          : 'background.paper',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s ease',
        opacity: disabled ? 0.5 : 1,
        '&:hover': !disabled ? {
          borderColor: 'primary.main',
          backgroundColor: alpha(theme.palette.primary.main, 0.02)
        } : {}
      }}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && fileInputRef.current?.click()}
    >
      <CloudUpload size={48} color={theme.palette.text.secondary} />
      <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
        {isDragging ? dropzoneText : title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
      <Button
        variant="contained"
        color={color}
        sx={{ mt: 2 }}
        startIcon={<Upload size={18} />}
        disabled={disabled}
      >
        {buttonLabel}
      </Button>
    </Paper>
  );

  /**
   * Render button variant
   */
  const renderButton = () => (
    <Button
      variant="contained"
      color={color}
      fullWidth={fullWidth}
      disabled={disabled}
      startIcon={<Upload size={18} />}
      onClick={() => fileInputRef.current?.click()}
    >
      {buttonLabel}
    </Button>
  );

  /**
   * Render compact variant
   */
  const renderCompact = () => (
    <Box sx={{ display: 'inline-flex' }}>
      <IconButton
        color={color}
        disabled={disabled}
        onClick={() => fileInputRef.current?.click()}
      >
        <Plus size={20} />
      </IconButton>
    </Box>
  );

  /**
   * Render file list item
   */
  const renderFileItem = (file: FileWithProgress) => {
    const isImage = file.type.startsWith('image/');
    const imageUrl = isImage && showPreview ? URL.createObjectURL(file) : null;

    return (
      <ListItem key={file.id}>
        <ListItemIcon>
          {imageUrl ? (
            <Box
              component="img"
              src={imageUrl}
              alt={file.name}
              sx={{
                width: 40,
                height: 40,
                objectFit: 'cover',
                borderRadius: 1
              }}
            />
          ) : (
            getFileIcon(file)
          )}
        </ListItemIcon>
        
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                {file.name}
              </Typography>
              {file.status === 'success' && (
                <CheckCircle size={16} color={theme.palette.success.main} />
              )}
              {file.status === 'error' && (
                <Tooltip title={file.error}>
                  <XCircle size={16} color={theme.palette.error.main} />
                </Tooltip>
              )}
            </Box>
          }
          secondary={
            <Stack spacing={0.5}>
              <Typography variant="caption" color="text.secondary">
                {formatFileSize(file.size)}
              </Typography>
              {showProgress && file.status === 'uploading' && (
                <LinearProgress 
                  variant="determinate" 
                  value={file.progress || 0}
                  sx={{ height: 2 }}
                />
              )}
            </Stack>
          }
        />
        
        <ListItemSecondaryAction>
          <Stack direction="row" spacing={0.5}>
            {file.status === 'error' && onUpload && (
              <IconButton
                size="small"
                onClick={() => handleRetry(file)}
              >
                <RefreshCw size={16} />
              </IconButton>
            )}
            <IconButton
              size="small"
              onClick={() => handleRemoveFile(file)}
            >
              <X size={16} />
            </IconButton>
          </Stack>
        </ListItemSecondaryAction>
      </ListItem>
    );
  };

  return (
    <Box sx={{ width: fullWidth ? '100%' : 'auto' }}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={disabled}
      />

      {/* Main upload area */}
      {variant === 'dropzone' && renderDropzone()}
      {variant === 'button' && renderButton()}
      {variant === 'compact' && renderCompact()}

      {/* Error messages */}
      {errors.length > 0 && (
        <Alert 
          severity="error" 
          sx={{ mt: 2 }}
          onClose={() => setErrors([])}
        >
          <Stack spacing={0.5}>
            {errors.map((error, index) => (
              <Typography key={index} variant="caption">
                {error}
              </Typography>
            ))}
          </Stack>
        </Alert>
      )}

      {/* File list */}
      {showFileList && files.length > 0 && (
        <Paper sx={{ mt: 2 }} variant="outlined">
          <List dense>
            {files.map(renderFileItem)}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default FileUpload;