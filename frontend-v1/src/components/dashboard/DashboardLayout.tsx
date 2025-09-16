/**
 * DashboardLayout - Dashboard Layout System
 * Layout principal del dashboard con soporte completo para responsive y temas
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Fade, useTheme } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboard } from './DashboardProvider';
import { EnhancedSidebar } from '@/components/layout/EnhancedSidebar';
import { ResponsiveHeader } from '@/components/layout/ResponsiveHeader';
import { DashboardGrid } from '@/components/dashboard/DashboardGrid';
import { LayoutControls } from '@/components/layout/LayoutControls';
import { ThemeSwitcher } from '@/components/layout/ThemeSwitcher';
import { getSidebarWidth } from '@/stores/layoutStore';

// Animation variants
const layoutVariants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: {
      duration: 0.3,
      staggerChildren: 0.1
    }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

const contentVariants = {
  initial: { x: -20, opacity: 0 },
  animate: { 
    x: 0, 
    opacity: 1,
    transition: { duration: 0.3 }
  }
};

interface DashboardLayoutProps {
  showGrid?: boolean;
  showControls?: boolean;
}

/**
 * DashboardLayout Component
 */
export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  showGrid = false,
  showControls = true
}) => {
  const { layout, theme, responsive } = useDashboard();
  const muiTheme = useTheme();
  const [sidebarHovered, setSidebarHovered] = useState(false);
  
  // Calculate effective sidebar width
  const effectiveSidebarWidth = getSidebarWidth(
    layout.sidebarCollapsed && !sidebarHovered,
    layout.sidebarWidth
  );
  
  // Handle sidebar toggle
  const handleSidebarToggle = useCallback(() => {
    layout.toggleSidebar();
  }, [layout]);
  
  // Handle sidebar hover (for mini-drawer expand)
  const handleSidebarHover = useCallback((isHovered: boolean) => {
    if (layout.sidebarCollapsed) {
      setSidebarHovered(isHovered);
    }
  }, [layout.sidebarCollapsed]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + B: Toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        handleSidebarToggle();
      }
      
      // Ctrl/Cmd + Shift + D: Toggle dark mode
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'd') {
        e.preventDefault();
        theme.toggleTheme();
      }
      
      // Ctrl/Cmd + Shift + L: Lock/unlock layout
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'l') {
        e.preventDefault();
        layout.setLayoutLocked(!layout.layoutLocked);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleSidebarToggle, theme, layout]);
  
  // Apply density class to root
  useEffect(() => {
    document.documentElement.setAttribute('data-density', layout.density);
  }, [layout.density]);
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        variants={layoutVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{ 
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: muiTheme.palette.background.default
        }}
      >
        {/* Main Layout Container */}
        <Box
          sx={{
            display: 'flex',
            flex: 1,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Enhanced Sidebar */}
          <EnhancedSidebar
            open={!responsive.isMobile || layout.sidebarOpen}
            collapsed={layout.sidebarCollapsed}
            width={layout.sidebarWidth}
            pinned={layout.sidebarPinned}
            onToggle={handleSidebarToggle}
            onHover={handleSidebarHover}
            animationsEnabled={layout.animationsEnabled}
          />
          
          {/* Main Content Area */}
          <Box
            component="main"
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              marginLeft: responsive.isMobile 
                ? 0 
                : `${effectiveSidebarWidth}px`,
              transition: layout.animationsEnabled 
                ? muiTheme.transitions.create('margin', {
                    easing: muiTheme.transitions.easing.sharp,
                    duration: muiTheme.transitions.duration.enteringScreen
                  })
                : 'none',
              backgroundColor: muiTheme.palette.background.default
            }}
          >
            {/* Responsive Header */}
            <ResponsiveHeader 
              onMenuClick={handleSidebarToggle}
              height={layout.headerHeight}
            />
            
            {/* Page Content */}
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'auto',
                pt: `${layout.headerHeight}px`
              }}
            >
              <motion.div
                variants={contentVariants}
                initial="initial"
                animate="animate"
                style={{
                  flex: 1,
                  padding: layout.density === 'compact' ? '12px' : 
                          layout.density === 'spacious' ? '32px' : '24px'
                }}
              >
                {showGrid ? (
                  <DashboardGrid />
                ) : (
                  <Fade in timeout={300}>
                    <Box sx={{ height: '100%' }}>
                      <Outlet />
                    </Box>
                  </Fade>
                )}
              </motion.div>
            </Box>
          </Box>
          
          {/* Floating Controls */}
          {showControls && (
            <>
              {/* Layout Controls */}
              <LayoutControls
                position="bottom-right"
                showDensity
                showAnimations
                showReset
              />
              
              {/* Theme Switcher */}
              <Box
                sx={{
                  position: 'fixed',
                  top: 80,
                  right: 16,
                  zIndex: muiTheme.zIndex.speedDial
                }}
              >
                <ThemeSwitcher />
              </Box>
            </>
          )}
        </Box>
        
        {/* Mobile Overlay when sidebar is open */}
        {responsive.isMobile && layout.sidebarOpen && (
          <Box
            onClick={handleSidebarToggle}
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: muiTheme.zIndex.drawer - 1,
              cursor: 'pointer'
            }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default DashboardLayout;