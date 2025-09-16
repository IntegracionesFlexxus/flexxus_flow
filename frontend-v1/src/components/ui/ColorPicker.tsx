/**
 * ColorPicker Component - Sprint 3
 * Selector de color reutilizable con preview y paleta
 * Implementación siguiendo principios SOLID y Clean Code
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  Popover,
  TextField,
  Typography,
  Grid,
  IconButton,
  Paper,
  Tooltip,
  Stack,
  Button,
  InputAdornment,
  Slider
} from '@mui/material';
import {
  Palette,
  Pipette,
  RefreshCw,
  Check,
  X,
  Copy,
  ChevronDown
} from 'lucide-react';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  label?: string;
  disabled?: boolean;
  showAlpha?: boolean;
  presetColors?: string[];
  format?: 'hex' | 'rgb' | 'hsl';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  helperText?: string;
  error?: boolean;
  errorMessage?: string;
}

// Preset color palettes
const DEFAULT_COLORS = [
  // Material Design Primary Colors
  '#F44336', '#E91E63', '#9C27B0', '#673AB7',
  '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4',
  '#009688', '#4CAF50', '#8BC34A', '#CDDC39',
  '#FFEB3B', '#FFC107', '#FF9800', '#FF5722',
  // Grays
  '#9E9E9E', '#607D8B', '#455A64', '#263238',
  // Black & White
  '#000000', '#FFFFFF'
];

const RECENT_COLORS_KEY = 'colorPicker.recentColors';
const MAX_RECENT_COLORS = 8;

/**
 * ColorPicker Component
 * Principios aplicados:
 * - S: Responsabilidad única de selección de color
 * - O: Abierto para extensión mediante props
 * - I: Interface simple y clara
 */
export const ColorPicker: React.FC<ColorPickerProps> = ({
  color: initialColor = '#000000',
  onChange,
  label,
  disabled = false,
  showAlpha = false,
  presetColors = DEFAULT_COLORS,
  format = 'hex',
  size = 'medium',
  fullWidth = false,
  helperText,
  error = false,
  errorMessage
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [currentColor, setCurrentColor] = useState(initialColor);
  const [hexInput, setHexInput] = useState(initialColor);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [opacity, setOpacity] = useState(100);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const open = Boolean(anchorEl);
  
  // Load recent colors from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(RECENT_COLORS_KEY);
    if (stored) {
      try {
        setRecentColors(JSON.parse(stored));
      } catch {}
    }
  }, []);
  
  // Handle opening color picker
  const handleOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (!disabled) {
      setAnchorEl(event.currentTarget);
      setHexInput(currentColor);
    }
  }, [disabled, currentColor]);
  
  // Handle closing color picker
  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);
  
  // Handle color selection
  const handleColorSelect = useCallback((newColor: string) => {
    setCurrentColor(newColor);
    setHexInput(newColor);
    
    // Add to recent colors
    const updatedRecent = [
      newColor,
      ...recentColors.filter(c => c !== newColor)
    ].slice(0, MAX_RECENT_COLORS);
    
    setRecentColors(updatedRecent);
    localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(updatedRecent));
  }, [recentColors]);
  
  // Apply color change
  const handleApply = useCallback(() => {
    let finalColor = currentColor;
    
    // Apply alpha if enabled
    if (showAlpha && opacity < 100) {
      finalColor = hexToRgba(currentColor, opacity / 100);
    }
    
    // Convert to requested format
    if (format === 'rgb' && finalColor.startsWith('#')) {
      finalColor = hexToRgb(finalColor);
    } else if (format === 'hsl' && finalColor.startsWith('#')) {
      finalColor = hexToHsl(finalColor);
    }
    
    onChange(finalColor);
    handleClose();
  }, [currentColor, opacity, showAlpha, format, onChange, handleClose]);
  
  // Handle hex input change
  const handleHexInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setHexInput(value);
    
    if (isValidHex(value)) {
      setCurrentColor(value);
    }
  }, []);
  
  // Copy color to clipboard
  const handleCopyColor = useCallback(() => {
    navigator.clipboard.writeText(currentColor);
  }, [currentColor]);
  
  // Reset to initial color
  const handleReset = useCallback(() => {
    setCurrentColor(initialColor);
    setHexInput(initialColor);
    setOpacity(100);
  }, [initialColor]);
  
  // Get button size styles
  const getButtonSize = () => {
    switch (size) {
      case 'small':
        return { width: 32, height: 32 };
      case 'large':
        return { width: 48, height: 48 };
      default:
        return { width: 40, height: 40 };
    }
  };
  
  return (
    <>
      {/* Color Display Button/Field */}
      <Box sx={{ width: fullWidth ? '100%' : 'auto' }}>
        {label && (
          <Typography variant="body2" gutterBottom>
            {label}
          </Typography>
        )}
        
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Seleccionar color">
            <Box
              onClick={handleOpen}
              sx={{
                ...getButtonSize(),
                border: '2px solid',
                borderColor: error ? 'error.main' : 'divider',
                borderRadius: 1,
                cursor: disabled ? 'default' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                background: currentColor,
                position: 'relative',
                overflow: 'hidden',
                '&:hover': !disabled ? {
                  borderColor: 'primary.main'
                } : {},
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  inset: 0,
                  background: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'8\' height=\'8\'%3E%3Crect width=\'4\' height=\'4\' fill=\'%23ccc\'/%3E%3Crect x=\'4\' y=\'4\' width=\'4\' height=\'4\' fill=\'%23ccc\'/%3E%3C/svg%3E")',
                  zIndex: -1
                }
              }}
            >
              {open && (
                <ChevronDown 
                  size={16} 
                  style={{
                    position: 'absolute',
                    bottom: 2,
                    right: 2,
                    color: 'white',
                    filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.5))'
                  }}
                />
              )}
            </Box>
          </Tooltip>
          
          <TextField
            ref={inputRef}
            value={currentColor}
            size="small"
            disabled={disabled}
            onClick={handleOpen}
            sx={{ 
              flexGrow: fullWidth ? 1 : 0,
              minWidth: 120
            }}
            InputProps={{
              readOnly: true,
              endAdornment: (
                <InputAdornment position="end">
                  <Palette size={16} />
                </InputAdornment>
              )
            }}
          />
        </Stack>
        
        {(helperText || errorMessage) && (
          <Typography 
            variant="caption" 
            color={error ? 'error' : 'text.secondary'}
            sx={{ mt: 0.5, display: 'block' }}
          >
            {errorMessage || helperText}
          </Typography>
        )}
      </Box>
      
      {/* Color Picker Popover */}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left'
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left'
        }}
      >
        <Paper sx={{ p: 2, width: 320 }}>
          {/* Current Color Preview */}
          <Stack direction="row" spacing={2} alignItems="center" mb={2}>
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: 1,
                background: currentColor,
                border: '1px solid',
                borderColor: 'divider',
                position: 'relative',
                overflow: 'hidden',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  inset: 0,
                  background: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'8\' height=\'8\'%3E%3Crect width=\'4\' height=\'4\' fill=\'%23ccc\'/%3E%3Crect x=\'4\' y=\'4\' width=\'4\' height=\'4\' fill=\'%23ccc\'/%3E%3C/svg%3E")',
                  zIndex: -1
                }
              }}
            />
            
            <Box sx={{ flexGrow: 1 }}>
              <TextField
                size="small"
                value={hexInput}
                onChange={handleHexInputChange}
                fullWidth
                label="Hex"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">#</InputAdornment>
                  )
                }}
                error={!isValidHex(hexInput)}
                helperText={!isValidHex(hexInput) ? 'Formato inválido' : ''}
              />
            </Box>
            
            <Stack direction="row">
              <Tooltip title="Copiar">
                <IconButton size="small" onClick={handleCopyColor}>
                  <Copy size={16} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Resetear">
                <IconButton size="small" onClick={handleReset}>
                  <RefreshCw size={16} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
          
          {/* Opacity Slider */}
          {showAlpha && (
            <Box mb={2}>
              <Typography variant="body2" gutterBottom>
                Opacidad: {opacity}%
              </Typography>
              <Slider
                value={opacity}
                onChange={(_, value) => setOpacity(value as number)}
                min={0}
                max={100}
                valueLabelDisplay="auto"
              />
            </Box>
          )}
          
          {/* Preset Colors */}
          <Typography variant="body2" gutterBottom>
            Colores predefinidos
          </Typography>
          <Grid container spacing={0.5} mb={2}>
            {presetColors.map((presetColor) => (
              <Grid item key={presetColor}>
                <Tooltip title={presetColor}>
                  <Box
                    onClick={() => handleColorSelect(presetColor)}
                    sx={{
                      width: 28,
                      height: 28,
                      background: presetColor,
                      border: '1px solid',
                      borderColor: currentColor === presetColor ? 'primary.main' : 'divider',
                      borderRadius: 0.5,
                      cursor: 'pointer',
                      position: 'relative',
                      '&:hover': {
                        borderColor: 'primary.main',
                        transform: 'scale(1.1)'
                      },
                      transition: 'all 0.2s'
                    }}
                  >
                    {currentColor === presetColor && (
                      <Check 
                        size={16} 
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          color: 'white',
                          filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.5))'
                        }}
                      />
                    )}
                  </Box>
                </Tooltip>
              </Grid>
            ))}
          </Grid>
          
          {/* Recent Colors */}
          {recentColors.length > 0 && (
            <>
              <Typography variant="body2" gutterBottom>
                Recientes
              </Typography>
              <Grid container spacing={0.5} mb={2}>
                {recentColors.map((recentColor) => (
                  <Grid item key={recentColor}>
                    <Tooltip title={recentColor}>
                      <Box
                        onClick={() => handleColorSelect(recentColor)}
                        sx={{
                          width: 28,
                          height: 28,
                          background: recentColor,
                          border: '1px solid',
                          borderColor: currentColor === recentColor ? 'primary.main' : 'divider',
                          borderRadius: 0.5,
                          cursor: 'pointer',
                          '&:hover': {
                            borderColor: 'primary.main',
                            transform: 'scale(1.1)'
                          },
                          transition: 'all 0.2s'
                        }}
                      />
                    </Tooltip>
                  </Grid>
                ))}
              </Grid>
            </>
          )}
          
          {/* Actions */}
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button size="small" onClick={handleClose}>
              Cancelar
            </Button>
            <Button 
              size="small" 
              variant="contained" 
              onClick={handleApply}
              startIcon={<Check size={16} />}
            >
              Aplicar
            </Button>
          </Stack>
        </Paper>
      </Popover>
    </>
  );
};

// Utility functions
const isValidHex = (hex: string): boolean => {
  return /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
};

const hexToRgb = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `rgb(${r}, ${g}, ${b})`;
  }
  return hex;
};

const hexToRgba = (hex: string, alpha: number): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
};

const hexToHsl = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    
    return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
  }
  return hex;
};