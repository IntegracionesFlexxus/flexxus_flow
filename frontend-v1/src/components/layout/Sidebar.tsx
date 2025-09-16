import React from 'react'
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  Toolbar,
  Box,
  IconButton,
  Typography,
  Collapse,
  Tooltip,
  Avatar,
  Chip
} from '@mui/material'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Dashboard as DashboardIcon,
  Message as MessageIcon,
  People as PeopleIcon,
  AccountTree as WorkflowIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  ExpandLess,
  ExpandMore,
  ChevronLeft as ChevronLeftIcon,
  Support as SupportIcon,
  Help as HelpIcon
} from '@mui/icons-material'

// Store
import { useAuthStore } from '@/shared/store'

// Sidebar mejorado con soporte para collapsed state - MVP
// TODO: En Nivel 2 agregar submenús y badges de notificaciones

interface SidebarProps {
  open: boolean
  collapsed?: boolean
  variant?: 'permanent' | 'persistent' | 'temporary'
  onClose?: () => void
  onCollapseToggle?: () => void
}

interface MenuItem {
  text: string
  icon: React.ReactNode
  path: string
  badge?: number
  children?: MenuItem[]
  divider?: boolean
}

const Sidebar: React.FC<SidebarProps> = ({ 
  open, 
  collapsed = false,
  variant = 'persistent',
  onClose,
  onCollapseToggle
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentCompany, user } = useAuthStore()
  
  // Estado para submenús expandidos
  const [expandedItems, setExpandedItems] = React.useState<string[]>([])
  
  // Menú principal
  const menuItems: MenuItem[] = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/dashboard',
    },
    {
      text: 'Omnicanalidad', 
      icon: <MessageIcon />,
      path: '/omni',
      badge: 5 // Ejemplo de notificaciones pendientes
    },
    {
      text: 'CRM',
      icon: <PeopleIcon />,
      path: '/crm',
    },
    {
      text: 'Workflows',
      icon: <WorkflowIcon />,
      path: '/workflow',
    },
    {
      text: 'Analytics',
      icon: <AnalyticsIcon />,
      path: '/analytics',
    },
  ]
  
  // Menú secundario
  const secondaryItems: MenuItem[] = [
    {
      text: 'Configuración',
      icon: <SettingsIcon />,
      path: '/settings',
    },
    {
      text: 'Soporte',
      icon: <SupportIcon />,
      path: '/support',
    },
    {
      text: 'Ayuda',
      icon: <HelpIcon />,
      path: '/help',
    },
  ]
  
  const isActive = (path: string) => {
    return location.pathname.startsWith(path)
  }
  
  const handleItemClick = (item: MenuItem) => {
    if (item.children) {
      // Toggle submenu
      setExpandedItems(prev => 
        prev.includes(item.text) 
          ? prev.filter(i => i !== item.text)
          : [...prev, item.text]
      )
    } else {
      navigate(item.path)
      if (variant === 'temporary' && onClose) {
        onClose()
      }
    }
  }
  
  const renderMenuItem = (item: MenuItem) => {
    const active = isActive(item.path)
    const expanded = expandedItems.includes(item.text)
    
    const button = (
      <ListItemButton
        onClick={() => handleItemClick(item)}
        selected={active}
        sx={{
          borderRadius: 1,
          mx: 1,
          mb: 0.5,
          '&.Mui-selected': {
            backgroundColor: 'primary.light',
            color: 'primary.contrastText',
            '& .MuiListItemIcon-root': {
              color: 'primary.contrastText',
            },
            '&:hover': {
              backgroundColor: 'primary.main',
            },
          },
        }}
      >
        <ListItemIcon 
          sx={{ 
            minWidth: collapsed ? 0 : 40,
            color: active ? 'inherit' : 'text.secondary'
          }}
        >
          {item.badge ? (
            <Box sx={{ position: 'relative' }}>
              {item.icon}
              {!collapsed && (
                <Chip
                  label={item.badge}
                  size="small"
                  color="error"
                  sx={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    height: 16,
                    fontSize: '0.625rem',
                    '& .MuiChip-label': { px: 0.5 }
                  }}
                />
              )}
            </Box>
          ) : item.icon}
        </ListItemIcon>
        
        {!collapsed && (
          <>
            <ListItemText 
              primary={item.text}
              primaryTypographyProps={{
                fontSize: '0.875rem',
                fontWeight: active ? 600 : 400
              }}
            />
            {item.children && (expanded ? <ExpandLess /> : <ExpandMore />)}
          </>
        )}
      </ListItemButton>
    )
    
    return collapsed ? (
      <Tooltip title={item.text} placement="right" key={item.text}>
        {button}
      </Tooltip>
    ) : (
      <React.Fragment key={item.text}>
        {button}
        {item.children && (
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={{ pl: 2 }}>
              {item.children.map(child => renderMenuItem(child))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    )
  }
  
  const drawerContent = (
    <>
      <Toolbar 
        sx={{ 
          display: 'flex', 
          justifyContent: collapsed ? 'center' : 'space-between',
          px: collapsed ? 0 : 2
        }}
      >
        {!collapsed && (
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Menu
          </Typography>
        )}
        {onCollapseToggle && variant !== 'temporary' && (
          <IconButton 
            onClick={onCollapseToggle} 
            size="small"
            sx={{ ml: collapsed ? 0 : 'auto' }}
          >
            <ChevronLeftIcon sx={{ transform: collapsed ? 'rotate(180deg)' : 'none' }} />
          </IconButton>
        )}
      </Toolbar>
      
      <Divider />
      
      {/* Company Info - Solo si no está colapsado */}
      {!collapsed && currentCompany && (
        <Box sx={{ p: 2 }}>
          <Box sx={{ 
            p: 1.5, 
            bgcolor: 'background.default', 
            borderRadius: 1,
            mb: 2
          }}>
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
      )}
      
      {/* Main Menu */}
      <List sx={{ px: collapsed ? 0 : 1, flex: 1 }}>
        {menuItems.map(item => renderMenuItem(item))}
      </List>
      
      <Divider />
      
      {/* Secondary Menu */}
      <List sx={{ px: collapsed ? 0 : 1 }}>
        {secondaryItems.map(item => renderMenuItem(item))}
      </List>
      
      {/* User Info - Bottom */}
      {!collapsed && user && (
        <>
          <Divider />
          <Box sx={{ p: 2 }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              gap: 1,
              p: 1,
              bgcolor: 'background.default',
              borderRadius: 1
            }}>
              <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
                {user.firstName[0]}{user.lastName[0]}
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
        </>
      )}
    </>
  )
  
  return (
    <Drawer
      variant={variant}
      anchor="left"
      open={open}
      onClose={onClose}
      sx={{
        width: collapsed ? 64 : 240,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: collapsed ? 64 : 240,
          boxSizing: 'border-box',
          transition: 'width 0.3s ease',
          overflowX: 'hidden',
          borderRight: '1px solid',
          borderColor: 'divider'
        },
      }}
    >
      {drawerContent}
    </Drawer>
  )
}

export default Sidebar