/**
 * DashboardGrid - Dashboard Layout System
 * Grid system para widgets del dashboard
 */

import React, { useState, useCallback } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  IconButton, 
  Card,
  CardContent,
  CardHeader,
  Skeleton,
  useTheme
} from '@mui/material';
import {
  DragIndicator as DragIcon,
  Close as CloseIcon,
  Settings as SettingsIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon
} from '@mui/icons-material';
import { motion, Reorder } from 'framer-motion';
import { useDashboard } from './DashboardProvider';
import { GridLayout } from '@/stores/layoutStore';

// Sample widget components
const widgets: Record<string, React.FC<WidgetProps>> = {
  stats: StatsWidget,
  chart: ChartWidget,
  table: TableWidget,
  activity: ActivityWidget
};

interface WidgetProps {
  id: string;
  title?: string;
  onClose?: () => void;
  onSettings?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

function StatsWidget({ title = 'Statistics' }: WidgetProps) {
  const theme = useTheme();
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>{title}</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
        {[1, 2, 3, 4].map(i => (
          <Box key={i} sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="primary">
              {Math.floor(Math.random() * 1000)}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Metric {i}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function ChartWidget({ title = 'Chart' }: WidgetProps) {
  return (
    <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" gutterBottom>{title}</Typography>
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Skeleton variant="rectangular" width="100%" height="100%" />
      </Box>
    </Box>
  );
}

function TableWidget({ title = 'Data Table' }: WidgetProps) {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>{title}</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} variant="rectangular" height={40} />
        ))}
      </Box>
    </Box>
  );
}

function ActivityWidget({ title = 'Recent Activity' }: WidgetProps) {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>{title}</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {[1, 2, 3, 4].map(i => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Skeleton variant="circular" width={32} height={32} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" />
              <Skeleton variant="text" width="60%" />
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

interface GridItemProps {
  item: GridLayout;
  children: React.ReactNode;
  isDraggable: boolean;
  onRemove: (id: string) => void;
  onSettings: (id: string) => void;
}

const GridItem: React.FC<GridItemProps> = ({
  item,
  children,
  isDraggable,
  onRemove,
  onSettings
}) => {
  const theme = useTheme();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      whileHover={{ scale: isDraggable ? 1.02 : 1 }}
      style={{
        gridColumn: `span ${item.w}`,
        gridRow: `span ${item.h}`,
        minHeight: `${item.h * 100}px`,
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : 'auto',
        left: isFullscreen ? 0 : 'auto',
        right: isFullscreen ? 0 : 'auto',
        bottom: isFullscreen ? 0 : 'auto',
        zIndex: isFullscreen ? theme.zIndex.modal : 1
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          cursor: isDraggable ? 'move' : 'default',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: theme.shadows[8]
          }
        }}
      >
        {/* Widget Header */}
        <CardHeader
          sx={{
            py: 1,
            px: 2,
            backgroundColor: theme.palette.background.default,
            borderBottom: `1px solid ${theme.palette.divider}`
          }}
          avatar={
            isDraggable && (
              <motion.div
                animate={{ opacity: isHovered ? 1 : 0.3 }}
                transition={{ duration: 0.2 }}
              >
                <DragIcon sx={{ cursor: 'grab', color: 'text.secondary' }} />
              </motion.div>
            )
          }
          action={
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <IconButton 
                size="small" 
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
              <IconButton 
                size="small" 
                onClick={() => onSettings(item.i)}
              >
                <SettingsIcon />
              </IconButton>
              <IconButton 
                size="small" 
                onClick={() => onRemove(item.i)}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          }
        />
        
        {/* Widget Content */}
        <CardContent sx={{ flex: 1, overflow: 'auto' }}>
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
};

/**
 * DashboardGrid Component
 */
export const DashboardGrid: React.FC = () => {
  const { layout, responsive } = useDashboard();
  const theme = useTheme();
  const currentLayout = layout.gridLayouts[layout.currentBreakpoint];
  const [items, setItems] = useState(currentLayout);
  
  // Handle widget removal
  const handleRemoveWidget = useCallback((id: string) => {
    const newLayout = items.filter(item => item.i !== id);
    setItems(newLayout);
    layout.updateGridLayout(layout.currentBreakpoint, newLayout);
  }, [items, layout]);
  
  // Handle widget settings
  const handleWidgetSettings = useCallback((id: string) => {
    console.log('Settings for widget:', id);
    // TODO: Open settings modal
  }, []);
  
  // Calculate grid columns based on breakpoint
  const getGridColumns = () => {
    switch (layout.currentBreakpoint) {
      case 'mobile': return 4;
      case 'tablet': return 8;
      case 'desktop': return 12;
      case 'wide': return 16;
      default: return 12;
    }
  };
  
  const gridColumns = getGridColumns();
  
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
        gap: theme.spacing(2),
        padding: theme.spacing(2),
        width: '100%',
        minHeight: '100%',
        position: 'relative'
      }}
    >
      {items.map((item) => {
        const WidgetComponent = widgets[item.i];
        
        if (!WidgetComponent) {
          return null;
        }
        
        return (
          <GridItem
            key={item.i}
            item={item}
            isDraggable={!layout.layoutLocked && !responsive.isMobile}
            onRemove={handleRemoveWidget}
            onSettings={handleWidgetSettings}
          >
            <WidgetComponent 
              id={item.i}
              onClose={() => handleRemoveWidget(item.i)}
              onSettings={() => handleWidgetSettings(item.i)}
            />
          </GridItem>
        );
      })}
      
      {/* Empty State */}
      {items.length === 0 && (
        <Box
          sx={{
            gridColumn: '1 / -1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 400,
            flexDirection: 'column',
            gap: 2
          }}
        >
          <Typography variant="h5" color="textSecondary">
            No widgets configured
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Add widgets to customize your dashboard
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default DashboardGrid;