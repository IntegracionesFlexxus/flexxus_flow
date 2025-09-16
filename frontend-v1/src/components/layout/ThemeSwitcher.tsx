/**
 * ThemeSwitcher - Dashboard Layout System
 * Control de temas con presets y personalización
 */

import React, { useState, useRef } from 'react';
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Switch,
  Typography,
  Slider,
  Chip,
  Button,
  Tooltip,
  Paper,
  useTheme,
  alpha,
  Stack
} from '@mui/material';
import {
  Palette as PaletteIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  SettingsBrightness as AutoModeIcon,
  FormatSize as FontSizeIcon,
  RoundedCorner as RadiusIcon,
  Refresh as ResetIcon,
  Check as CheckIcon,
  Brush as BrushIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '@/stores/themeStore';
import { useDashboard } from '@/components/dashboard/DashboardProvider';

// Preset color schemes
const presetThemes = [
  {
    id: 'default',
    name: 'Default',
    primary: '#1976d2',
    secondary: '#dc004e'
  },
  {
    id: 'emerald',
    name: 'Emerald',
    primary: '#10b981',
    secondary: '#6366f1'
  },
  {
    id: 'purple',
    name: 'Purple',
    primary: '#8b5cf6',
    secondary: '#ec4899'
  },
  {
    id: 'orange',
    name: 'Orange',
    primary: '#f97316',
    secondary: '#06b6d4'
  },
  {
    id: 'rose',
    name: 'Rose',
    primary: '#f43f5e',
    secondary: '#8b5cf6'
  }
];

// Animation variants
const menuVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      duration: 0.1,
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 }
};

interface ColorPickerProps {
  label: string;
  color: string;
  onChange: (color: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ label, color, onChange }) => {
  const [tempColor, setTempColor] = useState(color);
  
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" color="text.secondary" gutterBottom>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1,
            backgroundColor: tempColor,
            border: '2px solid',
            borderColor: 'divider'
          }}
        />
        <input
          type="color"
          value={tempColor}
          onChange={(e) => setTempColor(e.target.value)}
          onBlur={() => onChange(tempColor)}
          style={{
            border: 'none',
            background: 'none',
            width: 100,
            height: 32,
            cursor: 'pointer'
          }}
        />
        <Typography variant="caption" sx={{ ml: 'auto' }}>
          {tempColor.toUpperCase()}
        </Typography>
      </Box>
    </Box>
  );
};

interface ThemeSwitcherProps {
  position?: 'fixed' | 'relative';
  showLabel?: boolean;
}

/**
 * ThemeSwitcher Component
 */
export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  position = 'fixed',
  showLabel = false
}) => {
  const theme = useTheme();
  const themeStore = useThemeStore();
  const { layout } = useDashboard();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const fabRef = useRef<HTMLButtonElement>(null);
  
  const open = Boolean(anchorEl);
  const currentMode = themeStore.mode;
  const isDark = theme.palette.mode === 'dark';
  
  // Handle menu open/close
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
    setShowAdvanced(false);
  };
  
  // Handle theme mode change
  const handleModeChange = (mode: 'light' | 'dark' | 'system') => {
    themeStore.setThemeMode(mode);
  };
  
  // Handle preset theme selection
  const handlePresetSelect = (preset: typeof presetThemes[0]) => {
    themeStore.setCustomColors({
      primary: preset.primary,
      secondary: preset.secondary
    });
  };
  
  // Handle font size change
  const handleFontSizeChange = (_: Event, value: number | number[]) => {
    const sizes = ['small', 'medium', 'large'] as const;
    themeStore.setFontSize(sizes[value as number]);
  };
  
  // Handle border radius change
  const handleRadiusChange = (_: Event, value: number | number[]) => {
    themeStore.setBorderRadius(value as number);
  };
  
  // Handle glassmorphism toggle
  const handleGlassmorphismToggle = () => {
    themeStore.setGlassmorphism(!themeStore.glassmorphism);
  };
  
  // Handle reset
  const handleReset = () => {
    themeStore.resetTheme();
    handleClose();
  };
  
  // Get current theme icon
  const getThemeIcon = () => {
    switch (currentMode) {
      case 'light':
        return <LightModeIcon />;
      case 'dark':
        return <DarkModeIcon />;
      case 'system':
        return <AutoModeIcon />;
    }
  };
  
  return (
    <>
      {/* Floating Action Button */}
      <Tooltip title="Theme Settings" placement="left">
        <IconButton
          ref={fabRef}
          onClick={handleClick}
          sx={{
            position: position === 'fixed' ? 'fixed' : 'relative',
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            '&:hover': {
              backgroundColor: theme.palette.primary.dark,
              transform: 'scale(1.1)'
            },
            transition: 'all 0.2s ease-in-out',
            boxShadow: theme.shadows[4],
            ...(position === 'fixed' && {
              right: 16,
              top: 16,
              zIndex: theme.zIndex.speedDial
            })
          }}
        >
          <motion.div
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <PaletteIcon />
          </motion.div>
        </IconButton>
      </Tooltip>
      
      {/* Theme Menu */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: showAdvanced ? 360 : 280,
            maxHeight: 600,
            overflow: 'visible'
          }
        }}
      >
        <AnimatePresence mode="wait">
          {!showAdvanced ? (
            <motion.div
              key="basic"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Theme Mode Selection */}
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Theme Mode
                </Typography>
              </Box>
              
              <MenuItem
                onClick={() => handleModeChange('light')}
                selected={currentMode === 'light'}
              >
                <ListItemIcon>
                  <LightModeIcon />
                </ListItemIcon>
                <ListItemText>Light</ListItemText>
                {currentMode === 'light' && <CheckIcon fontSize="small" />}
              </MenuItem>
              
              <MenuItem
                onClick={() => handleModeChange('dark')}
                selected={currentMode === 'dark'}
              >
                <ListItemIcon>
                  <DarkModeIcon />
                </ListItemIcon>
                <ListItemText>Dark</ListItemText>
                {currentMode === 'dark' && <CheckIcon fontSize="small" />}
              </MenuItem>
              
              <MenuItem
                onClick={() => handleModeChange('system')}
                selected={currentMode === 'system'}
              >
                <ListItemIcon>
                  <AutoModeIcon />
                </ListItemIcon>
                <ListItemText>System</ListItemText>
                {currentMode === 'system' && <CheckIcon fontSize="small" />}
              </MenuItem>
              
              <Divider sx={{ my: 1 }} />
              
              {/* Preset Themes */}
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Color Presets
                </Typography>
              </Box>
              
              <Box sx={{ px: 2, pb: 1 }}>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {presetThemes.map((preset) => (
                    <Chip
                      key={preset.id}
                      label={preset.name}
                      size="small"
                      onClick={() => handlePresetSelect(preset)}
                      sx={{
                        mb: 1,
                        backgroundColor: alpha(preset.primary, 0.1),
                        borderColor: preset.primary,
                        '&:hover': {
                          backgroundColor: alpha(preset.primary, 0.2)
                        }
                      }}
                      icon={
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            backgroundColor: preset.primary
                          }}
                        />
                      }
                    />
                  ))}
                </Stack>
              </Box>
              
              <Divider sx={{ my: 1 }} />
              
              {/* Quick Settings */}
              <Box sx={{ px: 2, py: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Glassmorphism</Typography>
                  <Switch
                    size="small"
                    checked={themeStore.glassmorphism}
                    onChange={handleGlassmorphismToggle}
                  />
                </Box>
              </Box>
              
              <Divider sx={{ my: 1 }} />
              
              {/* Actions */}
              <Box sx={{ px: 2, py: 1, display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  startIcon={<BrushIcon />}
                  onClick={() => setShowAdvanced(true)}
                  fullWidth
                >
                  Advanced
                </Button>
                <Button
                  size="small"
                  startIcon={<ResetIcon />}
                  onClick={handleReset}
                  color="inherit"
                >
                  Reset
                </Button>
              </Box>
            </motion.div>
          ) : (
            <motion.div
              key="advanced"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Advanced Settings */}
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Advanced Settings
                </Typography>
              </Box>
              
              <Box sx={{ px: 2, py: 2 }}>
                {/* Custom Colors */}
                <ColorPicker
                  label="Primary Color"
                  color={themeStore.customColors.primary || '#1976d2'}
                  onChange={(color) => themeStore.setCustomColors({ primary: color })}
                />
                
                <ColorPicker
                  label="Secondary Color"
                  color={themeStore.customColors.secondary || '#dc004e'}
                  onChange={(color) => themeStore.setCustomColors({ secondary: color })}
                />
                
                {/* Font Size */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    Font Size
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                    <FontSizeIcon fontSize="small" />
                    <Slider
                      value={themeStore.fontSize === 'small' ? 0 : themeStore.fontSize === 'large' ? 2 : 1}
                      onChange={handleFontSizeChange}
                      step={1}
                      marks
                      min={0}
                      max={2}
                      sx={{ flex: 1 }}
                    />
                    <Typography variant="caption" sx={{ minWidth: 50 }}>
                      {themeStore.fontSize}
                    </Typography>
                  </Stack>
                </Box>
                
                {/* Border Radius */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    Border Radius
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                    <RadiusIcon fontSize="small" />
                    <Slider
                      value={themeStore.borderRadius}
                      onChange={handleRadiusChange}
                      min={0}
                      max={24}
                      sx={{ flex: 1 }}
                    />
                    <Typography variant="caption" sx={{ minWidth: 30 }}>
                      {themeStore.borderRadius}
                    </Typography>
                  </Stack>
                </Box>
                
                {/* Spacing */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    Spacing Factor
                  </Typography>
                  <Slider
                    value={themeStore.spacing}
                    onChange={(_, value) => themeStore.setSpacing(value as number)}
                    min={4}
                    max={12}
                    marks={[
                      { value: 4, label: 'Compact' },
                      { value: 8, label: 'Normal' },
                      { value: 12, label: 'Spacious' }
                    ]}
                    sx={{ mt: 2 }}
                  />
                </Box>
              </Box>
              
              <Divider />
              
              {/* Back button */}
              <Box sx={{ px: 2, py: 1 }}>
                <Button
                  size="small"
                  onClick={() => setShowAdvanced(false)}
                  fullWidth
                >
                  Back to Basic
                </Button>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>
      </Menu>
    </>
  );
};

export default ThemeSwitcher;