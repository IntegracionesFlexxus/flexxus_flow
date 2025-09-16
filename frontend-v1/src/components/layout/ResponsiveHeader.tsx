/**
 * ResponsiveHeader - Dashboard Layout System
 * Header adaptativo con soporte para búsqueda y notificaciones
 */

import React, { useState, useCallback } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  InputBase,
  Badge,
  Box,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
  Chip,
  useTheme,
  alpha,
  Fade,
  Collapse
} from '@mui/material';
import {
  Menu as MenuIcon,
  Search as SearchIcon,
  AccountCircle as AccountIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Help as HelpIcon,
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Language as LanguageIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/shared/store';
import { useDashboard } from '@/components/dashboard/DashboardProvider';
import { useDebounce } from '@/hooks/useDebounce';
import { NotificationBell } from '@/components/notifications/NotificationBell';

interface ResponsiveHeaderProps {
  onMenuClick: () => void;
  height?: number;
  showSearch?: boolean;
  showNotifications?: boolean;
  showUserMenu?: boolean;
}

/**
 * ResponsiveHeader Component
 */
export const ResponsiveHeader: React.FC<ResponsiveHeaderProps> = ({
  onMenuClick,
  height = 64,
  showSearch = true,
  showNotifications = true,
  showUserMenu = true
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { responsive, theme: themeStore } = useDashboard();
  const { user, currentCompany, logoutAsync } = useAuthStore();
  
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  
  const debouncedSearch = useDebounce(searchValue, 300);
  
  // Handle search
  const handleSearchToggle = useCallback(() => {
    setSearchOpen(!searchOpen);
    if (searchOpen) {
      setSearchValue('');
    }
  }, [searchOpen]);
  
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  }, []);
  
  // Handle user menu
  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };
  
  // Handle notifications menu
  // Handle navigation
  const handleNavigate = (path: string) => {
    navigate(path);
    handleUserMenuClose();
  };
  
  // Handle logout
  const handleLogout = async () => {
    await logoutAsync();
    navigate('/login');
  };
  
  // Handle theme toggle
  const handleThemeToggle = () => {
    const nextMode = theme.palette.mode === 'dark' ? 'light' : 'dark';
    themeStore.setThemeMode(nextMode);
  };
  
  // Search effect
  React.useEffect(() => {
    if (debouncedSearch) {
      console.log('Searching for:', debouncedSearch);
      // TODO: Implement search functionality
    }
  }, [debouncedSearch]);
  
  return (
    <AppBar
      position="fixed"
      sx={{
        height,
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        boxShadow: theme.shadows[1],
        borderBottom: `1px solid ${theme.palette.divider}`,
        zIndex: theme.zIndex.drawer + 1,
        transition: theme.transitions.create(['height', 'background-color'])
      }}
    >
      <Toolbar
        sx={{
          height: '100%',
          px: { xs: 1, sm: 2, md: 3 }
        }}
      >
        {/* Menu Button (Mobile) */}
        {responsive.isMobile && (
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={onMenuClick}
            sx={{ mr: 1 }}
          >
            <MenuIcon />
          </IconButton>
        )}
        
        {/* Logo/Title */}
        {!searchOpen && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {!responsive.isMobile && (
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Flexxus
              </Typography>
            )}
            {currentCompany && (
              <Chip
                label={currentCompany.name}
                size="small"
                icon={<BusinessIcon />}
                sx={{ ml: 1 }}
              />
            )}
          </Box>
        )}
        
        {/* Spacer */}
        <Box sx={{ flexGrow: 1 }} />
        
        {/* Search Bar */}
        {showSearch && (
          <AnimatePresence>
            {searchOpen ? (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: responsive.isMobile ? '100%' : 400, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', alignItems: 'center' }}
              >
                <Box
                  sx={{
                    position: 'relative',
                    borderRadius: 1,
                    backgroundColor: alpha(theme.palette.common.white, 0.15),
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.common.white, 0.25)
                    },
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <Box sx={{ p: 1, display: 'flex' }}>
                    <SearchIcon />
                  </Box>
                  <InputBase
                    placeholder="Search…"
                    value={searchValue}
                    onChange={handleSearchChange}
                    autoFocus
                    sx={{
                      color: 'inherit',
                      flex: 1,
                      '& .MuiInputBase-input': {
                        padding: theme.spacing(1, 1, 1, 0),
                        width: '100%'
                      }
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={handleSearchToggle}
                    sx={{ mr: 1 }}
                  >
                    <CloseIcon />
                  </IconButton>
                </Box>
              </motion.div>
            ) : (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Tooltip title="Search">
                  <IconButton
                    color="inherit"
                    onClick={handleSearchToggle}
                  >
                    <SearchIcon />
                  </IconButton>
                </Tooltip>
              </motion.div>
            )}
          </AnimatePresence>
        )}
        
        {/* Quick Theme Toggle */}
        {!responsive.isMobile && (
          <Tooltip title="Toggle theme">
            <IconButton
              color="inherit"
              onClick={handleThemeToggle}
              sx={{ ml: 1 }}
            >
              {theme.palette.mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>
        )}
        
        {/* Notifications */}
        {showNotifications && !searchOpen && (
          <NotificationBell 
            size="medium"
            position="header"
            animate={true}
          />
        )}
        
        {/* User Menu */}
        {showUserMenu && user && !searchOpen && (
          <Box sx={{ ml: 1 }}>
            <IconButton
              onClick={handleUserMenuOpen}
              size="small"
              sx={{ ml: 2 }}
            >
              <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
                {user.firstName?.[0]}{user.lastName?.[0]}
              </Avatar>
              {!responsive.isMobile && (
                <ExpandMoreIcon sx={{ ml: 0.5 }} />
              )}
            </IconButton>
          </Box>
        )}
      </Toolbar>
      
      {/* User Menu Dropdown */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleUserMenuClose}
        TransitionComponent={Fade}
        PaperProps={{
          sx: { width: 280, mt: 1.5 }
        }}
      >
        {/* User Info */}
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {user?.firstName} {user?.lastName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {user?.email}
          </Typography>
          {user?.companies?.[0]?.role && (
            <Chip
              label={user.companies[0].role}
              size="small"
              color="primary"
              sx={{ mt: 0.5 }}
            />
          )}
        </Box>
        
        <Divider />
        
        <MenuItem onClick={() => handleNavigate('/profile')}>
          <ListItemIcon>
            <AccountIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>My Profile</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => handleNavigate('/settings')}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Settings</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => handleNavigate('/help')}>
          <ListItemIcon>
            <HelpIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Help & Support</ListItemText>
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Logout</ListItemText>
        </MenuItem>
      </Menu>
      
    </AppBar>
  );
};

export default ResponsiveHeader;