/**
 * LayoutControls - Dashboard Layout System
 * Controles flotantes para ajustes del layout
 */

import React, { useState } from 'react';
import {
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Box,
  Slider,
  Typography,
  Switch,
  FormControlLabel,
  Divider,
  Button,
  Paper,
  IconButton,
  Tooltip,
  Stack,
  useTheme,
  alpha
} from '@mui/material';
import {
  Settings as SettingsIcon,
  ViewCompact as CompactIcon,
  ViewComfy as ComfortableIcon,
  ViewCozy as CozyIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Animation as AnimationIcon,
  RestartAlt as ResetIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  GridView as GridIcon,
  ViewList as ListIcon,
  Dashboard as DashboardIcon,
  Tune as TuneIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboard } from '@/components/dashboard/DashboardProvider';

interface LayoutControlsProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  showDensity?: boolean;
  showAnimations?: boolean;
  showReset?: boolean;
}

/**
 * LayoutControls Component
 */
export const LayoutControls: React.FC<LayoutControlsProps> = ({
  position = 'bottom-right',
  showDensity = true,
  showAnimations = true,
  showReset = true
}) => {
  const theme = useTheme();
  const { layout, responsive } = useDashboard();
  const [open, setOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  
  // Calculate position styles
  const getPositionStyles = () => {
    const base = { position: 'fixed' as const, zIndex: theme.zIndex.speedDial };
    switch (position) {
      case 'bottom-right':
        return { ...base, bottom: 16, right: 16 };
      case 'bottom-left':
        return { ...base, bottom: 16, left: 16 };
      case 'top-right':
        return { ...base, top: 80, right: 16 };
      case 'top-left':
        return { ...base, top: 80, left: 16 };
    }
  };
  
  // Handle density change
  const handleDensityChange = (density: 'compact' | 'normal' | 'spacious') => {
    layout.setDensity(density);
  };
  
  // Handle sidebar width change
  const handleSidebarWidthChange = (_: Event, value: number | number[]) => {
    layout.setSidebarWidth(value as number);
  };
  
  // Handle header height change
  const handleHeaderHeightChange = (_: Event, value: number | number[]) => {
    layout.setHeaderHeight(value as number);
  };
  
  // Handle layout lock toggle
  const handleLayoutLockToggle = () => {
    layout.setLayoutLocked(!layout.layoutLocked);
  };
  
  // Handle animations toggle
  const handleAnimationsToggle = () => {
    layout.setAnimationsEnabled(!layout.animationsEnabled);
  };
  
  // Handle compact mode toggle
  const handleCompactModeToggle = () => {
    layout.setCompactMode(!layout.compactMode);
  };
  
  // Handle reset
  const handleReset = () => {
    layout.resetLayout();
    setPanelOpen(false);
  };
  
  // Handle save
  const handleSave = async () => {
    await layout.saveLayoutPreferences();
    setPanelOpen(false);
  };
  
  // Speed dial actions
  const actions = [
    {
      icon: layout.layoutLocked ? <LockIcon /> : <LockOpenIcon />,
      name: layout.layoutLocked ? 'Unlock Layout' : 'Lock Layout',
      onClick: handleLayoutLockToggle
    },
    {
      icon: <TuneIcon />,
      name: 'Layout Settings',
      onClick: () => setPanelOpen(true)
    }
  ];
  
  if (showAnimations) {
    actions.push({
      icon: <AnimationIcon />,
      name: layout.animationsEnabled ? 'Disable Animations' : 'Enable Animations',
      onClick: handleAnimationsToggle
    });
  }
  
  if (showReset) {
    actions.push({
      icon: <ResetIcon />,
      name: 'Reset Layout',
      onClick: handleReset
    });
  }
  
  return (
    <>
      {/* Speed Dial */}
      {!responsive.isMobile && (
        <SpeedDial
          ariaLabel="Layout controls"
          sx={getPositionStyles()}
          icon={<SpeedDialIcon icon={<SettingsIcon />} />}
          open={open}
          onOpen={() => setOpen(true)}
          onClose={() => setOpen(false)}
        >
          {actions.map((action) => (
            <SpeedDialAction
              key={action.name}
              icon={action.icon}
              tooltipTitle={action.name}
              onClick={() => {
                action.onClick();
                setOpen(false);
              }}
            />
          ))}
        </SpeedDial>
      )}
      
      {/* Settings Panel */}
      <AnimatePresence>
        {panelOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: theme.zIndex.modal
            }}
          >
            <Paper
              elevation={8}
              sx={{
                width: responsive.isMobile ? '90vw' : 480,
                maxHeight: '80vh',
                overflow: 'auto',
                p: 3
              }}
            >
              {/* Header */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ flex: 1 }}>
                  Layout Settings
                </Typography>
                <IconButton onClick={() => setPanelOpen(false)} size="small">
                  <CloseIcon />
                </IconButton>
              </Box>
              
              <Divider sx={{ mb: 3 }} />
              
              {/* Density Settings */}
              {showDensity && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Density
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Button
                      variant={layout.density === 'compact' ? 'contained' : 'outlined'}
                      size="small"
                      startIcon={<CompactIcon />}
                      onClick={() => handleDensityChange('compact')}
                    >
                      Compact
                    </Button>
                    <Button
                      variant={layout.density === 'normal' ? 'contained' : 'outlined'}
                      size="small"
                      startIcon={<ComfortableIcon />}
                      onClick={() => handleDensityChange('normal')}
                    >
                      Normal
                    </Button>
                    <Button
                      variant={layout.density === 'spacious' ? 'contained' : 'outlined'}
                      size="small"
                      startIcon={<CozyIcon />}
                      onClick={() => handleDensityChange('spacious')}
                    >
                      Spacious
                    </Button>
                  </Stack>
                </Box>
              )}
              
              {/* Sidebar Settings */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Sidebar
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={layout.sidebarCollapsed}
                      onChange={(e) => layout.setSidebarCollapsed(e.target.checked)}
                    />
                  }
                  label="Collapsed by default"
                  sx={{ mb: 1 }}
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={layout.sidebarPinned}
                      onChange={(e) => layout.setSidebarPinned(e.target.checked)}
                    />
                  }
                  label="Pin sidebar"
                  sx={{ mb: 2 }}
                />
                
                <Typography variant="caption" color="text.secondary">
                  Sidebar Width: {layout.sidebarWidth}px
                </Typography>
                <Slider
                  value={layout.sidebarWidth}
                  onChange={handleSidebarWidthChange}
                  min={200}
                  max={400}
                  step={10}
                  marks={[
                    { value: 200, label: '200' },
                    { value: 280, label: '280' },
                    { value: 400, label: '400' }
                  ]}
                  sx={{ mt: 1 }}
                />
              </Box>
              
              {/* Header Settings */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Header
                </Typography>
                
                <Typography variant="caption" color="text.secondary">
                  Header Height: {layout.headerHeight}px
                </Typography>
                <Slider
                  value={layout.headerHeight}
                  onChange={handleHeaderHeightChange}
                  min={48}
                  max={80}
                  step={4}
                  marks={[
                    { value: 48, label: '48' },
                    { value: 64, label: '64' },
                    { value: 80, label: '80' }
                  ]}
                  sx={{ mt: 1 }}
                />
              </Box>
              
              {/* View Mode */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  View Mode
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Button
                    variant={layout.viewMode === 'grid' ? 'contained' : 'outlined'}
                    size="small"
                    startIcon={<GridIcon />}
                    onClick={() => layout.setViewMode('grid')}
                  >
                    Grid
                  </Button>
                  <Button
                    variant={layout.viewMode === 'list' ? 'contained' : 'outlined'}
                    size="small"
                    startIcon={<ListIcon />}
                    onClick={() => layout.setViewMode('list')}
                  >
                    List
                  </Button>
                  <Button
                    variant={layout.viewMode === 'dashboard' ? 'contained' : 'outlined'}
                    size="small"
                    startIcon={<DashboardIcon />}
                    onClick={() => layout.setViewMode('dashboard')}
                  >
                    Dashboard
                  </Button>
                </Stack>
              </Box>
              
              {/* Additional Options */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Options
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={layout.compactMode}
                      onChange={(e) => layout.setCompactMode(e.target.checked)}
                    />
                  }
                  label="Compact mode"
                  sx={{ mb: 1 }}
                />
                
                {showAnimations && (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={layout.animationsEnabled}
                        onChange={(e) => layout.setAnimationsEnabled(e.target.checked)}
                      />
                    }
                    label="Enable animations"
                    sx={{ mb: 1 }}
                  />
                )}
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={layout.layoutLocked}
                      onChange={(e) => layout.setLayoutLocked(e.target.checked)}
                    />
                  }
                  label="Lock layout"
                />
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              {/* Actions */}
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  startIcon={<ResetIcon />}
                  onClick={handleReset}
                >
                  Reset
                </Button>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                >
                  Save
                </Button>
              </Stack>
            </Paper>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Backdrop */}
      {panelOpen && (
        <Box
          onClick={() => setPanelOpen(false)}
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: alpha(theme.palette.common.black, 0.5),
            zIndex: theme.zIndex.modal - 1
          }}
        />
      )}
    </>
  );
};

export default LayoutControls;