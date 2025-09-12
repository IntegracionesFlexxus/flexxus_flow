/**
 * EnhancedSidebar - Dashboard Layout System
 * Sidebar mejorado con animaciones y gestos
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Typography,
  Collapse,
  Tooltip,
  Avatar,
  Chip,
  Badge,
  useTheme,
  alpha
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Message as MessageIcon,
  People as PeopleIcon,
  AccountTree as WorkflowIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ExpandLess,
  ExpandMore,
  Support as SupportIcon,
  Help as HelpIcon,
  Menu as MenuIcon,
  MenuOpen as MenuOpenIcon
} from '@mui/icons-material';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { useDrag } from '@use-gesture/react';
import { useAuthStore } from '@/shared/store';
import { useDashboard } from '@/components/dashboard/DashboardProvider';

// Menu item interface
interface MenuItem {
  id: string;
  text: string;
  icon: React.ReactNode;
  path: string;
  badge?: number | string;
  badgeColor?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  children?: MenuItem[];
  divider?: boolean;
  disabled?: boolean;
}

// Animation variants
const sidebarVariants = {
  open: {
    width: 'var(--sidebar-width)',
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30
    }
  },
  collapsed: {
    width: 64,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30
    }
  }
};

const itemVariants = {
  open: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.2
    }
  },
  collapsed: {
    opacity: 0,
    x: -20,
    transition: {
      duration: 0.15
    }
  }
};

interface EnhancedSidebarProps {
  open: boolean;
  collapsed: boolean;
  width?: number;
  pinned?: boolean;
  onToggle: () => void;
  onHover?: (isHovered: boolean) => void;
  animationsEnabled?: boolean;
}

/**
 * EnhancedSidebar Component
 */
export const EnhancedSidebar: React.FC<EnhancedSidebarProps> = ({
  open,
  collapsed,
  width = 280,
  pinned = true,
  onToggle,
  onHover,
  animationsEnabled = true
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { responsive } = useDashboard();
  const { currentCompany, user } = useAuthStore();
  
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Spring animation for width
  const springWidth = useSpring(collapsed && !isHovered ? 64 : width, {
    stiffness: 300,
    damping: 30
  });
  
  // Transform for drag gesture
  const dragX = useSpring(0, { stiffness: 300, damping: 30 });
  
  // Menu items
  const menuItems: MenuItem[] = useMemo(() => [
    {
      id: 'dashboard',
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/dashboard'
    },
    {
      id: 'omni',
      text: 'Omnicanalidad',
      icon: <MessageIcon />,
      path: '/omni',
      badge: 5,
      badgeColor: 'error'
    },
    {
      id: 'crm',
      text: 'CRM',
      icon: <PeopleIcon />,
      path: '/crm',
      badge: 'New',
      badgeColor: 'info'
    },
    {
      id: 'workflow',
      text: 'Workflows',
      icon: <WorkflowIcon />,
      path: '/workflow',
      children: [
        { id: 'workflow-list', text: 'Lista', icon: null, path: '/workflow/list' },
        { id: 'workflow-builder', text: 'Constructor', icon: null, path: '/workflow/builder' },
        { id: 'workflow-templates', text: 'Plantillas', icon: null, path: '/workflow/templates' }
      ]
    },
    {
      id: 'analytics',
      text: 'Analytics',
      icon: <AnalyticsIcon />,
      path: '/analytics'
    }
  ], []);
  
  const secondaryItems: MenuItem[] = useMemo(() => [
    {
      id: 'settings',
      text: 'Configuración',
      icon: <SettingsIcon />,
      path: '/settings'
    },
    {
      id: 'support',
      text: 'Soporte',
      icon: <SupportIcon />,
      path: '/support'
    },
    {
      id: 'help',
      text: 'Ayuda',
      icon: <HelpIcon />,
      path: '/help'
    }
  ], []);
  
  // Gesture handlers for swipe
  const bind = useDrag(({ movement: [mx], velocity: [vx], direction: [dx], cancel, canceled }) => {
    if (canceled) return;
    
    // Only allow drag on mobile
    if (!responsive.isMobile) {
      cancel();
      return;
    }
    
    setIsDragging(true);
    dragX.set(mx);
    
    // Determine if should close based on velocity or distance
    if (Math.abs(vx) > 0.5 || Math.abs(mx) > width / 2) {
      if (dx < 0) {
        onToggle(); // Close sidebar
      }
      cancel();
    }
  }, {
    from: () => [dragX.get(), 0],
    bounds: { left: -width, right: 0 },
    rubberband: true
  });
  
  // Handle hover
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    onHover?.(true);
  }, [onHover]);
  
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    onHover?.(false);
  }, [onHover]);
  
  // Handle item click
  const handleItemClick = useCallback((item: MenuItem) => {
    if (item.children) {
      setExpandedItems(prev =>
        prev.includes(item.id)
          ? prev.filter(id => id !== item.id)
          : [...prev, item.id]
      );
    } else if (!item.disabled) {
      navigate(item.path);
      if (responsive.isMobile) {
        onToggle();
      }
    }
  }, [navigate, responsive.isMobile, onToggle]);
  
  // Check if item is active
  const isItemActive = useCallback((path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  }, [location.pathname]);
  
  // Render menu item
  const renderMenuItem = (item: MenuItem, depth = 0) => {
    const active = isItemActive(item.path);
    const expanded = expandedItems.includes(item.id);
    const showText = !collapsed || isHovered;
    
    const button = (
      <ListItemButton
        onClick={() => handleItemClick(item)}
        selected={active}
        disabled={item.disabled}
        sx={{
          borderRadius: 1,
          mx: 1,
          mb: 0.5,
          pl: depth > 0 ? 4 : 2,
          transition: animationsEnabled ? 'all 0.2s ease' : 'none',
          '&.Mui-selected': {
            backgroundColor: alpha(theme.palette.primary.main, 0.15),
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.25)
            }
          },
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.08)
          }
        }}
      >
        {item.icon && (
          <ListItemIcon
            sx={{
              minWidth: collapsed && !isHovered ? 0 : 40,
              color: active ? 'primary.main' : 'text.secondary',
              transition: animationsEnabled ? 'all 0.2s ease' : 'none'
            }}
          >
            {item.badge ? (
              <Badge
                badgeContent={item.badge}
                color={item.badgeColor || 'default'}
                variant={typeof item.badge === 'string' ? 'standard' : 'standard'}
              >
                {item.icon}
              </Badge>
            ) : (
              item.icon
            )}
          </ListItemIcon>
        )}
        
        <AnimatePresence>
          {showText && (
            <motion.div
              initial="collapsed"
              animate="open"
              exit="collapsed"
              variants={itemVariants}
              style={{ flex: 1, display: 'flex', alignItems: 'center' }}
            >
              <ListItemText
                primary={item.text}
                primaryTypographyProps={{
                  fontSize: '0.875rem',
                  fontWeight: active ? 600 : 400
                }}
              />
              {item.children && (expanded ? <ExpandLess /> : <ExpandMore />)}
            </motion.div>
          )}
        </AnimatePresence>
      </ListItemButton>
    );
    
    return (
      <React.Fragment key={item.id}>
        {collapsed && !isHovered ? (
          <Tooltip title={item.text} placement="right">
            {button}
          </Tooltip>
        ) : (
          button
        )}
        
        {item.children && (
          <Collapse in={expanded && showText} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children.map(child => renderMenuItem(child, depth + 1))}
            </List>
          </Collapse>
        )}
        
        {item.divider && <Divider sx={{ my: 1 }} />}
      </React.Fragment>
    );
  };
  
  // Sidebar content
  const sidebarContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.palette.background.paper,
        borderRight: `1px solid ${theme.palette.divider}`
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed && !isHovered ? 'center' : 'space-between',
          p: 2,
          borderBottom: `1px solid ${theme.palette.divider}`
        }}
      >
        <AnimatePresence>
          {(!collapsed || isHovered) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Flexxus
              </Typography>
            </motion.div>
          )}
        </AnimatePresence>
        
        <IconButton
          onClick={onToggle}
          size="small"
          sx={{
            ml: collapsed && !isHovered ? 0 : 'auto',
            transition: animationsEnabled ? 'all 0.2s ease' : 'none'
          }}
        >
          {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </Box>
      
      {/* Company Info */}
      <AnimatePresence>
        {(!collapsed || isHovered) && currentCompany && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Box sx={{ p: 2 }}>
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: 'background.default',
                  borderRadius: 1
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Empresa activa
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {currentCompany.name}
                </Typography>
                <Chip
                  label={currentCompany.plan}
                  size="small"
                  color="primary"
                  sx={{ mt: 0.5 }}
                />
              </Box>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Main Menu */}
      <List sx={{ flex: 1, px: collapsed && !isHovered ? 0 : 1, overflowY: 'auto' }}>
        {menuItems.map(item => renderMenuItem(item))}
      </List>
      
      <Divider />
      
      {/* Secondary Menu */}
      <List sx={{ px: collapsed && !isHovered ? 0 : 1 }}>
        {secondaryItems.map(item => renderMenuItem(item))}
      </List>
      
      {/* User Info */}
      <AnimatePresence>
        {(!collapsed || isHovered) && user && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Divider />
            <Box sx={{ p: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 1,
                  bgcolor: 'background.default',
                  borderRadius: 1
                }}
              >
                <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </Avatar>
                <Box sx={{ overflow: 'hidden' }}>
                  <Typography variant="body2" noWrap fontWeight={500}>
                    {user.firstName} {user.lastName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {user.email}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
  
  // Mobile drawer
  if (responsive.isMobile) {
    return (
      <Drawer
        variant="temporary"
        anchor="left"
        open={open}
        onClose={onToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          '& .MuiDrawer-paper': {
            width,
            boxSizing: 'border-box'
          }
        }}
        {...bind()}
      >
        {sidebarContent}
      </Drawer>
    );
  }
  
  // Desktop animated sidebar
  return (
    <motion.aside
      initial={false}
      animate={collapsed && !isHovered ? 'collapsed' : 'open'}
      variants={sidebarVariants}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        zIndex: theme.zIndex.drawer,
        ['--sidebar-width' as any]: `${width}px`
      }}
    >
      {sidebarContent}
    </motion.aside>
  );
};

export default EnhancedSidebar;