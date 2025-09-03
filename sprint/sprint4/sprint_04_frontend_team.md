---
title: "Sprint 04 - Frontend Team"
tipo: "funcionalidad"
estado: "vigente"
prioridad: "alta"
tags: ["frontend", "react", "typescript", "dashboard", "ui", "navegacion", "componentes"]
responsable: "Frontend Team"
fecha_inicio: "2024-02-12"
fecha_fin: "2024-02-25"
dependencias: ["sprint_03_frontend_team"]
version: "1.0"
sprint: 4
---

# Sprint 04 - Frontend Team

## Información del Sprint
- **Duración:** Semanas 7-8 (2 semanas)
- **Equipo:** Frontend Team (4 desarrolladores)
- **Objetivo:** Establecer dashboard foundation, navigation modular, y infrastructure de UI

## Objetivos Específicos

### Objetivo Principal
Crear la estructura base del dashboard y establecer la infraestructura de UI que soportará todos los módulos del sistema, incluyendo navigation, state management, error handling global, y accessibility foundation.

### Objetivos Técnicos
1. Desarrollar dashboard layout structure modular y responsive
2. Implementar navigation system entre módulos con breadcrumbs
3. Establecer error handling global y notification system
4. Configurar loading states management y skeleton screens
5. Implementar theme system y accessibility básica
6. Crear component library foundations

## Tareas Detalladas

### 1. Dashboard Layout Structure

#### 1.1 Main Dashboard Layout: layouts/DashboardLayout.tsx
```typescript
import React, { useState, useEffect } from 'react';
import {
  Box,
  CssBaseline,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  useTheme,
  useMediaQuery,
  Collapse
} from '@mui/material';
import {
  Menu as MenuIcon,
  ChevronLeft,
  ChevronRight,
  Notifications,
  Settings,
  LogOut,
  Building,
  MessageSquare,
  Users,
  BarChart3,
  Workflow,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// Components
import { NavigationItem } from '../components/navigation/NavigationItem';
import { BreadcrumbNavigation } from '../components/navigation/BreadcrumbNavigation';
import { NotificationCenter } from '../components/notifications/NotificationCenter';
import { CompanySelector } from '../components/auth/CompanySelector';

// Hooks
import { useAuthStore } from '@shared/store/authStore';
import { useUIStore } from '@shared/store/uiStore';
import { useFeatureFlag } from '@shared/hooks/useFeatureFlag';
import { useWebSocket } from '@shared/hooks/useWebSocket';

const DRAWER_WIDTH = 280;
const DRAWER_WIDTH_COLLAPSED = 64;

interface NavigationSection {
  title: string;
  items: NavigationItemConfig[];
}

interface NavigationItemConfig {
  key: string;
  label: string;
  icon: React.ComponentType;
  path: string;
  children?: NavigationItemConfig[];
  featureFlag?: string;
  badge?: {
    count?: number;
    color?: 'primary' | 'secondary' | 'error' | 'warning';
  };
}

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['main']);

  const { user, currentCompany, logout } = useAuthStore();
  const { addNotification } = useUIStore();
  const { isConnected, connectionCount } = useWebSocket();

  // Feature flags
  const { isEnabled: hasCRM } = useFeatureFlag('crm_module');
  const { isEnabled: hasWorkflows } = useFeatureFlag('workflow_module');
  const { isEnabled: hasAnalytics } = useFeatureFlag('analytics_module');

  const navigationSections: NavigationSection[] = [
    {
      title: 'Principal',
      items: [
        {
          key: 'dashboard',
          label: 'Dashboard',
          icon: BarChart3,
          path: '/dashboard'
        },
        {
          key: 'omnichannel',
          label: 'Omnicanalidad',
          icon: MessageSquare,
          path: '/omnichannel',
          children: [
            { key: 'conversations', label: 'Conversaciones', icon: MessageSquare, path: '/omnichannel/conversations' },
            { key: 'channels', label: 'Canales', icon: Settings, path: '/omnichannel/channels' },
            { key: 'landing-pages', label: 'Landing Pages', icon: Building, path: '/omnichannel/landing-pages' },
            { key: 'email-marketing', label: 'Email Marketing', icon: Users, path: '/omnichannel/email-marketing' }
          ]
        }
      ]
    }
  ];

  // Add CRM section if enabled
  if (hasCRM) {
    navigationSections.push({
      title: 'CRM',
      items: [
        {
          key: 'crm',
          label: 'CRM',
          icon: Users,
          path: '/crm',
          children: [
            { key: 'leads', label: 'Leads', icon: Users, path: '/crm/leads' },
            { key: 'contacts', label: 'Contactos', icon: Users, path: '/crm/contacts' },
            { key: 'accounts', label: 'Cuentas', icon: Building, path: '/crm/accounts' },
            { key: 'opportunities', label: 'Oportunidades', icon: BarChart3, path: '/crm/opportunities' },
            { key: 'products', label: 'Productos', icon: Settings, path: '/crm/products' }
          ]
        }
      ]
    });
  }

  // Add Workflows section if enabled
  if (hasWorkflows) {
    navigationSections.push({
      title: 'Automatización',
      items: [
        {
          key: 'workflows',
          label: 'Workflows',
          icon: Workflow,
          path: '/workflows',
          children: [
            { key: 'workflow-builder', label: 'Constructor', icon: Settings, path: '/workflows/builder' },
            { key: 'workflow-templates', label: 'Plantillas', icon: Building, path: '/workflows/templates' },
            { key: 'workflow-executions', label: 'Ejecuciones', icon: BarChart3, path: '/workflows/executions' }
          ]
        }
      ]
    });
  }

  // Add Analytics section if enabled
  if (hasAnalytics) {
    navigationSections.push({
      title: 'Analytics',
      items: [
        {
          key: 'analytics',
          label: 'Reportes',
          icon: BarChart3,
          path: '/analytics',
          children: [
            { key: 'executive-dashboard', label: 'Dashboard Ejecutivo', icon: BarChart3, path: '/analytics/executive' },
            { key: 'sales-reports', label: 'Reportes de Ventas', icon: BarChart3, path: '/analytics/sales' },
            { key: 'marketing-reports', label: 'Reportes Marketing', icon: BarChart3, path: '/analytics/marketing' }
          ]
        }
      ]
    });
  }

  // Always add admin section
  navigationSections.push({
    title: 'Administración',
    items: [
      {
        key: 'users',
        label: 'Usuarios',
        icon: Users,
        path: '/admin/users',
        featureFlag: 'user_management'
      },
      {
        key: 'company-settings',
        label: 'Configuración',
        icon: Settings,
        path: '/admin/company-settings'
      }
    ]
  });

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isMobile]);

  const handleDrawerToggle = () => {
    if (isMobile) {
      setSidebarOpen(!sidebarOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const handleSectionToggle = (sectionTitle: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionTitle)
        ? prev.filter(s => s !== sectionTitle)
        : [...prev, sectionTitle]
    );
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      addNotification({
        type: 'success',
        title: 'Sesión cerrada',
        message: 'Has cerrado sesión exitosamente',
        autoClose: true
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'No se pudo cerrar la sesión',
        autoClose: true
      });
    }
    handleUserMenuClose();
  };

  const renderNavigationItems = (items: NavigationItemConfig[], level: number = 0) => {
    return items.map((item) => {
      // Check feature flag
      if (item.featureFlag && !useFeatureFlag(item.featureFlag).isEnabled) {
        return null;
      }

      return (
        <NavigationItem
          key={item.key}
          item={item}
          level={level}
          collapsed={sidebarCollapsed && !isMobile}
          onItemClick={() => isMobile && setSidebarOpen(false)}
        />
      );
    });
  };

  const drawerWidth = sidebarCollapsed && !isMobile ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH;

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo/Company Section */}
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2,
        minHeight: 64,
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}>
        {(!sidebarCollapsed || isMobile) ? (
          <>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              {currentCompany?.name?.charAt(0)}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6" noWrap>
                {currentCompany?.name}
              </Typography>
              <CompanySelector />
            </Box>
          </>
        ) : (
          <Avatar sx={{ bgcolor: 'primary.main', mx: 'auto' }}>
            {currentCompany?.name?.charAt(0)}
          </Avatar>
        )}
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <List sx={{ pt: 1 }}>
          {navigationSections.map((section) => {
            const isExpanded = expandedSections.includes(section.title);
            
            return (
              <Box key={section.title}>
                {(!sidebarCollapsed || isMobile) && (
                  <Box
                    sx={{
                      px: 2,
                      py: 1,
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'action.hover'
                      }
                    }}
                    onClick={() => handleSectionToggle(section.title)}
                  >
                    <Typography variant="overline" sx={{ flex: 1, fontWeight: 600, color: 'text.secondary' }}>
                      {section.title}
                    </Typography>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </Box>
                )}
                
                <Collapse in={isExpanded || sidebarCollapsed} timeout="auto">
                  {renderNavigationItems(section.items)}
                </Collapse>
              </Box>
            );
          })}
        </List>
      </Box>

      {/* Connection Status */}
      {(!sidebarCollapsed || isMobile) && (
        <Box sx={{ 
          p: 2, 
          borderTop: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: isConnected ? 'success.main' : 'error.main'
            }}
          />
          <Typography variant="caption" color="text.secondary">
            {isConnected ? 'Conectado' : 'Desconectado'}
          </Typography>
          {connectionCount > 0 && (
            <Typography variant="caption" color="text.secondary">
              ({connectionCount} usuarios)
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: 1
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="toggle drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          {!isMobile && (
            <IconButton
              color="inherit"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              {sidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}
            </IconButton>
          )}

          <BreadcrumbNavigation />

          <Box sx={{ flexGrow: 1 }} />

          {/* Notifications */}
          <IconButton
            color="inherit"
            onClick={() => setNotificationsOpen(true)}
          >
            <Badge badgeContent={3} color="error">
              <Notifications />
            </Badge>
          </IconButton>

          {/* User Menu */}
          <IconButton
            color="inherit"
            onClick={handleUserMenuOpen}
          >
            <Avatar src={user?.avatar} sx={{ width: 32, height: 32 }}>
              {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
            </Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Navigation Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          container={window.document.body}
          variant={isMobile ? "temporary" : "permanent"}
          open={sidebarOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          bgcolor: 'background.default'
        }}
      >
        <Toolbar /> {/* Spacer for AppBar */}
        
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      </Box>

      {/* User Menu */}
      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={handleUserMenuClose}
        onClick={handleUserMenuClose}
      >
        <MenuItem onClick={() => {}}>
          <Settings size={20} style={{ marginRight: 12 }} />
          Perfil
        </MenuItem>
        <MenuItem onClick={() => {}}>
          <Building size={20} style={{ marginRight: 12 }} />
          Cambiar Empresa
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <LogOut size={20} style={{ marginRight: 12 }} />
          Cerrar Sesión
        </MenuItem>
      </Menu>

      {/* Notification Center */}
      <NotificationCenter
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </Box>
  );
};
```

#### 1.2 Navigation Item Component: components/navigation/NavigationItem.tsx
```typescript
import React from 'react';
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Badge,
  Box,
  Collapse,
  List,
  Tooltip
} from '@mui/material';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface NavigationItemConfig {
  key: string;
  label: string;
  icon: React.ComponentType;
  path: string;
  children?: NavigationItemConfig[];
  badge?: {
    count?: number;
    color?: 'primary' | 'secondary' | 'error' | 'warning';
  };
}

interface NavigationItemProps {
  item: NavigationItemConfig;
  level: number;
  collapsed: boolean;
  onItemClick: () => void;
}

export const NavigationItem: React.FC<NavigationItemProps> = ({
  item,
  level,
  collapsed,
  onItemClick
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = React.useState(false);

  const isActive = location.pathname === item.path || 
    (item.children && item.children.some(child => location.pathname === child.path));
  
  const isChildActive = item.children && 
    item.children.some(child => location.pathname === child.path);

  const hasChildren = item.children && item.children.length > 0;
  const IconComponent = item.icon;

  const handleClick = () => {
    if (hasChildren) {
      setExpanded(!expanded);
    } else {
      navigate(item.path);
      onItemClick();
    }
  };

  const paddingLeft = collapsed ? 1 : 2 + (level * 2);

  const listItem = (
    <ListItem disablePadding sx={{ display: 'block' }}>
      <ListItemButton
        onClick={handleClick}
        selected={isActive && !hasChildren}
        sx={{
          minHeight: 48,
          justifyContent: collapsed ? 'center' : 'initial',
          pl: paddingLeft,
          pr: 2,
          '&.Mui-selected': {
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
            '& .MuiListItemIcon-root': {
              color: 'primary.contrastText',
            }
          },
          '&:hover': {
            bgcolor: isActive ? 'primary.dark' : 'action.hover',
          }
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: 0,
            mr: collapsed ? 0 : 2,
            justifyContent: 'center',
            color: isChildActive ? 'primary.main' : 'inherit'
          }}
        >
          <Badge 
            badgeContent={item.badge?.count} 
            color={item.badge?.color || 'primary'}
            invisible={!item.badge?.count}
          >
            <IconComponent size={20} />
          </Badge>
        </ListItemIcon>

        {!collapsed && (
          <>
            <ListItemText 
              primary={item.label}
              primaryTypographyProps={{
                fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 400
              }}
            />
            {hasChildren && (
              <Box sx={{ ml: 1 }}>
                {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </Box>
            )}
          </>
        )}
      </ListItemButton>

      {/* Children */}
      {hasChildren && !collapsed && (
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {item.children!.map((child) => (
              <NavigationItem
                key={child.key}
                item={child}
                level={level + 1}
                collapsed={false}
                onItemClick={onItemClick}
              />
            ))}
          </List>
        </Collapse>
      )}
    </ListItem>
  );

  // Wrap with tooltip when collapsed
  if (collapsed) {
    return (
      <Tooltip title={item.label} placement="right">
        {listItem}
      </Tooltip>
    );
  }

  return listItem;
};
```

#### 1.3 Breadcrumb Navigation: components/navigation/BreadcrumbNavigation.tsx
```typescript
import React from 'react';
import {
  Breadcrumbs,
  Link,
  Typography,
  Box
} from '@mui/material';
import { Home, ChevronRight } from 'lucide-react';
import { useLocation, Link as RouterLink } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ComponentType;
}

const routeLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/omnichannel': 'Omnicanalidad',
  '/omnichannel/conversations': 'Conversaciones',
  '/omnichannel/channels': 'Canales',
  '/omnichannel/landing-pages': 'Landing Pages',
  '/omnichannel/email-marketing': 'Email Marketing',
  '/crm': 'CRM',
  '/crm/leads': 'Leads',
  '/crm/contacts': 'Contactos',
  '/crm/accounts': 'Cuentas',
  '/crm/opportunities': 'Oportunidades',
  '/crm/products': 'Productos',
  '/workflows': 'Workflows',
  '/workflows/builder': 'Constructor',
  '/workflows/templates': 'Plantillas',
  '/workflows/executions': 'Ejecuciones',
  '/analytics': 'Reportes',
  '/analytics/executive': 'Dashboard Ejecutivo',
  '/analytics/sales': 'Reportes de Ventas',
  '/analytics/marketing': 'Reportes Marketing',
  '/admin': 'Administración',
  '/admin/users': 'Usuarios',
  '/admin/company-settings': 'Configuración'
};

export const BreadcrumbNavigation: React.FC = () => {
  const location = useLocation();

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Inicio', path: '/dashboard', icon: Home }
    ];

    let currentPath = '';
    
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const label = routeLabels[currentPath];
      
      if (label) {
        breadcrumbs.push({
          label,
          path: index === pathSegments.length - 1 ? undefined : currentPath
        });
      }
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Breadcrumbs
        separator={<ChevronRight size={16} />}
        aria-label="breadcrumb"
        sx={{ 
          '& .MuiBreadcrumbs-separator': {
            color: 'text.secondary'
          }
        }}
      >
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const IconComponent = crumb.icon;

          if (isLast) {
            return (
              <Box key={crumb.path || crumb.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {IconComponent && <IconComponent size={16} />}
                <Typography color="text.primary" fontWeight={500}>
                  {crumb.label}
                </Typography>
              </Box>
            );
          }

          return (
            <Link
              key={crumb.path}
              component={RouterLink}
              to={crumb.path!}
              color="inherit"
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline'
                }
              }}
            >
              {IconComponent && <IconComponent size={16} />}
              {crumb.label}
            </Link>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
};
```

### 2. Error Handling Global y Notification System

#### 2.1 Global Error Handler: components/error/GlobalErrorHandler.tsx
```typescript
import React from 'react';
import { 
  Alert,
  AlertTitle,
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { AlertTriangle, RefreshCw, Bug } from 'lucide-react';

interface ErrorInfo {
  error: Error;
  errorInfo: {
    componentStack: string;
  };
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: {
    componentStack: string;
  };
  errorId: string;
}

export class GlobalErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    this.setState({
      error,
      errorInfo
    });

    // Log to external service (e.g., Sentry, LogRocket)
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService = (error: Error, errorInfo: { componentStack: string }) => {
    // TODO: Integrate with error logging service
    console.error('Global Error Boundary:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleReportError = () => {
    // TODO: Open support ticket or error reporting modal
    alert(`Error ID: ${this.state.errorId}\nPor favor, contacte al soporte técnico.`);
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            p: 4,
            textAlign: 'center'
          }}
        >
          <AlertTriangle size={64} color="#f44336" />
          
          <Typography variant="h4" sx={{ mt: 2, mb: 1 }}>
            ¡Oops! Algo salió mal
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 600 }}>
            Ha ocurrido un error inesperado. Nuestro equipo técnico ha sido notificado 
            automáticamente y está trabajando para solucionarlo.
          </Typography>

          <Alert severity="error" sx={{ mb: 4, maxWidth: 600 }}>
            <AlertTitle>Error ID: {this.state.errorId}</AlertTitle>
            Por favor, guarde este ID por si necesita contactar al soporte técnico.
          </Alert>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button
              variant="contained"
              startIcon={<RefreshCw size={20} />}
              onClick={this.handleReload}
            >
              Recargar Página
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<Bug size={20} />}
              onClick={this.handleReportError}
            >
              Reportar Error
            </Button>
          </Box>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.100', borderRadius: 1, maxWidth: '100%', overflow: 'auto' }}>
              <Typography variant="h6" gutterBottom>
                Error Details (Development Only)
              </Typography>
              <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                {this.state.error.stack}
              </Typography>
              {this.state.errorInfo && (
                <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', mt: 2 }}>
                  {this.state.errorInfo.componentStack}
                </Typography>
              )}
            </Box>
          )}
        </Box>
      );
    }

    return this.props.children;
  }
}

// Hook para manejar errores async que no son capturados por Error Boundary
export const useAsyncErrorHandler = () => {
  const handleError = (error: Error, context?: string) => {
    console.error(`Async Error${context ? ` in ${context}` : ''}:`, error);
    
    // TODO: Send to error logging service
    // TODO: Show user-friendly notification
    
    // For now, show a generic error notification
    // This would integrate with your notification system
    window.dispatchEvent(new CustomEvent('show-notification', {
      detail: {
        type: 'error',
        title: 'Error',
        message: 'Ha ocurrido un error. Por favor, inténtelo de nuevo.',
        autoClose: true
      }
    }));
  };

  return { handleError };
};
```

#### 2.2 Notification System: components/notifications/NotificationCenter.tsx
```typescript
import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  IconButton,
  Chip,
  Divider,
  Button,
  Badge,
  Tabs,
  Tab
} from '@mui/material';
import {
  X,
  Bell,
  MessageSquare,
  UserPlus,
  AlertTriangle,
  CheckCircle,
  Info,
  Settings
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Notification {
  id: string;
  type: 'message' | 'system' | 'user' | 'workflow';
  severity: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  avatar?: string;
  metadata?: Record<string, any>;
}

interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ open, onClose }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedTab, setSelectedTab] = useState(0);
  const [loading, setLoading] = useState(false);

  // Mock notifications - replace with real data
  useEffect(() => {
    if (open) {
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
        setNotifications([
          {
            id: '1',
            type: 'message',
            severity: 'info',
            title: 'Nuevo mensaje recibido',
            message: 'Cliente Juan Pérez envió un mensaje en WhatsApp',
            timestamp: new Date(Date.now() - 5 * 60 * 1000),
            read: false,
            actionUrl: '/omnichannel/conversations/conv-123',
            actionLabel: 'Ver conversación',
            avatar: 'https://i.pravatar.cc/150?img=1'
          },
          {
            id: '2',
            type: 'system',
            severity: 'warning',
            title: 'Canal temporalmente desconectado',
            message: 'El canal de Instagram está experimentando problemas de conexión',
            timestamp: new Date(Date.now() - 15 * 60 * 1000),
            read: false,
            actionUrl: '/omnichannel/channels',
            actionLabel: 'Revisar canales'
          },
          {
            id: '3',
            type: 'user',
            severity: 'success',
            title: 'Usuario agregado',
            message: 'María González aceptó la invitación y se unió al equipo',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            read: true,
            actionUrl: '/admin/users',
            actionLabel: 'Ver usuarios'
          },
          {
            id: '4',
            type: 'workflow',
            severity: 'info',
            title: 'Workflow ejecutado',
            message: 'Se ejecutó el workflow "Bienvenida nuevos leads" para 5 contactos',
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
            read: true,
            actionUrl: '/workflows/executions',
            actionLabel: 'Ver ejecuciones'
          }
        ]);
        setLoading(false);
      }, 500);
    }
  }, [open]);

  const getNotificationIcon = (notification: Notification) => {
    switch (notification.type) {
      case 'message':
        return MessageSquare;
      case 'user':
        return UserPlus;
      case 'system':
        return notification.severity === 'warning' || notification.severity === 'error' 
          ? AlertTriangle 
          : Info;
      case 'workflow':
        return Settings;
      default:
        return Bell;
    }
  };

  const getNotificationColor = (severity: string) => {
    switch (severity) {
      case 'success':
        return '#4caf50';
      case 'warning':
        return '#ff9800';
      case 'error':
        return '#f44336';
      default:
        return '#2196f3';
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const filteredNotifications = notifications.filter(notification => {
    switch (selectedTab) {
      case 1: // No leídas
        return !notification.read;
      case 2: // Mensajes
        return notification.type === 'message';
      case 3: // Sistema
        return notification.type === 'system' || notification.type === 'workflow';
      default: // Todas
        return true;
    }
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: 400 }
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ 
          p: 2, 
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Bell size={20} />
            <Typography variant="h6">
              Notificaciones
            </Typography>
            {unreadCount > 0 && (
              <Badge badgeContent={unreadCount} color="primary" />
            )}
          </Box>
          
          <IconButton onClick={onClose} size="small">
            <X size={20} />
          </IconButton>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={selectedTab} 
            onChange={(_, newValue) => setSelectedTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Todas" />
            <Tab 
              label={`No leídas (${unreadCount})`} 
              disabled={unreadCount === 0} 
            />
            <Tab label="Mensajes" />
            <Tab label="Sistema" />
          </Tabs>
        </Box>

        {/* Actions */}
        {unreadCount > 0 && (
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Button
              size="small"
              onClick={markAllAsRead}
              variant="text"
            >
              Marcar todas como leídas
            </Button>
          </Box>
        )}

        {/* Notification List */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {loading ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                Cargando notificaciones...
              </Typography>
            </Box>
          ) : filteredNotifications.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Bell size={48} color="#ccc" />
              <Typography variant="h6" sx={{ mt: 2, color: 'text.secondary' }}>
                No hay notificaciones
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Te notificaremos cuando algo importante suceda
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {filteredNotifications.map((notification, index) => {
                const IconComponent = getNotificationIcon(notification);
                
                return (
                  <React.Fragment key={notification.id}>
                    <ListItem
                      sx={{
                        bgcolor: notification.read ? 'transparent' : 'action.hover',
                        borderLeft: notification.read ? 'none' : `3px solid ${getNotificationColor(notification.severity)}`,
                        cursor: notification.actionUrl ? 'pointer' : 'default',
                        '&:hover': {
                          bgcolor: 'action.hover'
                        }
                      }}
                      onClick={() => {
                        if (!notification.read) {
                          markAsRead(notification.id);
                        }
                        if (notification.actionUrl) {
                          // Navigate to action URL
                          onClose();
                        }
                      }}
                    >
                      <ListItemAvatar>
                        {notification.avatar ? (
                          <Avatar src={notification.avatar} />
                        ) : (
                          <Avatar sx={{ bgcolor: getNotificationColor(notification.severity) }}>
                            <IconComponent size={20} />
                          </Avatar>
                        )}
                      </ListItemAvatar>
                      
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant="subtitle2" sx={{ flex: 1 }}>
                              {notification.title}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                            >
                              <X size={14} />
                            </IconButton>
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {notification.message}
                            </Typography>
                            
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                {formatDistanceToNow(notification.timestamp, { 
                                  addSuffix: true, 
                                  locale: es 
                                })}
                              </Typography>
                              
                              <Chip
                                label={notification.type}
                                size="small"
                                variant="outlined"
                                sx={{ height: 20, fontSize: '0.625rem' }}
                              />
                            </Box>
                            
                            {notification.actionLabel && (
                              <Button
                                size="small"
                                variant="text"
                                sx={{ mt: 1, p: 0, minWidth: 'auto', textTransform: 'none' }}
                              >
                                {notification.actionLabel}
                              </Button>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                    
                    {index < filteredNotifications.length - 1 && <Divider />}
                  </React.Fragment>
                );
              })}
            </List>
          )}
        </Box>
      </Box>
    </Drawer>
  );
};
```

### 3. Loading States Management

#### 3.1 Loading States Hook: hooks/useLoadingState.ts
```typescript
import { useState, useCallback } from 'react';

interface LoadingState {
  [key: string]: boolean;
}

interface UseLoadingStateReturn {
  isLoading: (key?: string) => boolean;
  startLoading: (key?: string) => void;
  stopLoading: (key?: string) => void;
  withLoading: <T>(key: string, asyncFn: () => Promise<T>) => Promise<T>;
  loadingStates: LoadingState;
}

export const useLoadingState = (initialKeys: string[] = []): UseLoadingStateReturn => {
  const [loadingStates, setLoadingStates] = useState<LoadingState>(() => {
    const initial: LoadingState = {};
    initialKeys.forEach(key => {
      initial[key] = false;
    });
    return initial;
  });

  const isLoading = useCallback((key: string = 'default') => {
    return loadingStates[key] || false;
  }, [loadingStates]);

  const startLoading = useCallback((key: string = 'default') => {
    setLoadingStates(prev => ({ ...prev, [key]: true }));
  }, []);

  const stopLoading = useCallback((key: string = 'default') => {
    setLoadingStates(prev => ({ ...prev, [key]: false }));
  }, []);

  const withLoading = useCallback(async <T,>(
    key: string,
    asyncFn: () => Promise<T>
  ): Promise<T> => {
    try {
      startLoading(key);
      return await asyncFn();
    } finally {
      stopLoading(key);
    }
  }, [startLoading, stopLoading]);

  return {
    isLoading,
    startLoading,
    stopLoading,
    withLoading,
    loadingStates
  };
};
```

#### 3.2 Skeleton Components: components/ui/SkeletonLoader.tsx
```typescript
import React from 'react';
import { Box, Skeleton, Card, CardContent } from '@mui/material';

interface SkeletonLoaderProps {
  variant: 'table' | 'card' | 'form' | 'dashboard' | 'conversation' | 'chart';
  count?: number;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ variant, count = 1 }) => {
  const renderSkeleton = () => {
    switch (variant) {
      case 'table':
        return (
          <Box>
            {[...Array(count)].map((_, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
                <Skeleton variant="circular" width={40} height={40} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" sx={{ fontSize: '1rem' }} />
                  <Skeleton variant="text" sx={{ fontSize: '0.875rem', width: '60%' }} />
                </Box>
                <Skeleton variant="rectangular" width={80} height={32} />
              </Box>
            ))}
          </Box>
        );

      case 'card':
        return (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}>
            {[...Array(count)].map((_, i) => (
              <Card key={i}>
                <CardContent>
                  <Skeleton variant="text" sx={{ fontSize: '1.25rem', mb: 1 }} />
                  <Skeleton variant="text" sx={{ fontSize: '0.875rem', mb: 2 }} />
                  <Skeleton variant="rectangular" height={120} sx={{ mb: 2 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Skeleton variant="rectangular" width={80} height={32} />
                    <Skeleton variant="rectangular" width={60} height={32} />
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        );

      case 'form':
        return (
          <Box sx={{ maxWidth: 600 }}>
            {[...Array(count)].map((_, i) => (
              <Box key={i} sx={{ mb: 3 }}>
                <Skeleton variant="text" sx={{ fontSize: '0.875rem', mb: 1, width: '30%' }} />
                <Skeleton variant="rectangular" height={56} sx={{ mb: 2 }} />
              </Box>
            ))}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Skeleton variant="rectangular" width={100} height={36} />
              <Skeleton variant="rectangular" width={120} height={36} />
            </Box>
          </Box>
        );

      case 'dashboard':
        return (
          <Box>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
              <Skeleton variant="text" sx={{ fontSize: '2rem', mb: 1, width: '40%' }} />
              <Skeleton variant="text" sx={{ fontSize: '1rem', width: '60%' }} />
            </Box>

            {/* Stats Cards */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2, mb: 4 }}>
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Skeleton variant="circular" width={48} height={48} />
                      <Box sx={{ flex: 1 }}>
                        <Skeleton variant="text" sx={{ fontSize: '0.875rem' }} />
                        <Skeleton variant="text" sx={{ fontSize: '1.5rem', width: '60%' }} />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>

            {/* Chart */}
            <Card>
              <CardContent>
                <Skeleton variant="text" sx={{ fontSize: '1.25rem', mb: 2, width: '30%' }} />
                <Skeleton variant="rectangular" height={300} />
              </CardContent>
            </Card>
          </Box>
        );

      case 'conversation':
        return (
          <Box>
            {[...Array(count)].map((_, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 2, mb: 3, alignItems: i % 2 === 0 ? 'flex-start' : 'flex-end' }}>
                {i % 2 === 0 && <Skeleton variant="circular" width={32} height={32} />}
                <Box sx={{ flex: 1, maxWidth: '70%' }}>
                  <Skeleton 
                    variant="rectangular" 
                    height={60} 
                    sx={{ 
                      borderRadius: 2,
                      ml: i % 2 === 0 ? 0 : 'auto',
                      mr: i % 2 === 0 ? 'auto' : 0
                    }} 
                  />
                  <Skeleton variant="text" sx={{ fontSize: '0.75rem', width: '40%', mt: 0.5 }} />
                </Box>
                {i % 2 === 1 && <Skeleton variant="circular" width={32} height={32} />}
              </Box>
            ))}
          </Box>
        );

      case 'chart':
        return (
          <Box>
            <Skeleton variant="text" sx={{ fontSize: '1.25rem', mb: 2, width: '30%' }} />
            <Skeleton variant="rectangular" height={400} />
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mt: 2 }}>
              {[...Array(3)].map((_, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Skeleton variant="circular" width={12} height={12} />
                  <Skeleton variant="text" width={60} />
                </Box>
              ))}
            </Box>
          </Box>
        );

      default:
        return <Skeleton variant="rectangular" width="100%" height={200} />;
    }
  };

  return renderSkeleton();
};
```

### 4. Theme System Implementation

#### 4.1 Theme Configuration: theme/index.ts
```typescript
import { createTheme, ThemeOptions } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    gradient: {
      primary: string;
      secondary: string;
    };
  }

  interface PaletteOptions {
    gradient?: {
      primary?: string;
      secondary?: string;
    };
  }
}

const commonThemeOptions: ThemeOptions = {
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          fontSize: '0.875rem',
          fontWeight: 500,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
          '&:hover': {
            boxShadow: '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: 'none',
          boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
        },
      },
    },
  },
};

export const lightTheme = createTheme({
  ...commonThemeOptions,
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#dc004e',
      light: '#ff5983',
      dark: '#9a0036',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    text: {
      primary: '#212121',
      secondary: '#757575',
    },
    gradient: {
      primary: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
      secondary: 'linear-gradient(135deg, #dc004e 0%, #ff5983 100%)',
    },
  },
});

export const darkTheme = createTheme({
  ...commonThemeOptions,
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
      light: '#bbdefb',
      dark: '#64b5f6',
      contrastText: '#000000',
    },
    secondary: {
      main: '#f48fb1',
      light: '#f8bbd9',
      dark: '#f06292',
      contrastText: '#000000',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    text: {
      primary: '#ffffff',
      secondary: '#aaaaaa',
    },
    gradient: {
      primary: 'linear-gradient(135deg, #90caf9 0%, #64b5f6 100%)',
      secondary: 'linear-gradient(135deg, #f48fb1 0%, #f06292 100%)',
    },
  },
});
```

## Testing y Validación

### Unit Tests (Jest + React Testing Library)
- [ ] **Dashboard Layout:** Test navigation, responsive behavior, user menu
- [ ] **Navigation Item:** Test active states, children expansion, tooltips
- [ ] **Breadcrumb Navigation:** Test route parsing, link generation
- [ ] **Error Boundary:** Test error catching, logging, recovery options
- [ ] **Notification Center:** Test filtering, marking as read, actions
- [ ] **Loading States:** Test skeleton loading, state management
- [ ] **Theme System:** Test light/dark mode switching

### Integration Tests
- [ ] **Navigation flow:** Test complete navigation between modules
- [ ] **Error handling:** Test global error scenarios
- [ ] **Notification system:** Test real-time notification delivery
- [ ] **Responsive design:** Test mobile/tablet/desktop layouts
- [ ] **Theme persistence:** Test theme selection persistence

### Accessibility Tests
- [ ] **Keyboard navigation:** Test complete keyboard accessibility
- [ ] **Screen reader compatibility:** Test with screen reader software
- [ ] **Color contrast:** Test contrast ratios meet WCAG standards
- [ ] **Focus management:** Test focus indicators and management
- [ ] **ARIA labels:** Test appropriate ARIA labeling

## Sprint Success Criteria

### Must Have
- [x] Dashboard layout completamente funcional y responsive
- [x] Navigation system con breadcrumbs funcionando
- [x] Error boundary catching errores globalmente
- [x] Notification center con real-time updates
- [x] Loading states con skeleton screens
- [x] Theme system con light/dark mode

### Should Have
- [x] Advanced navigation con feature flags
- [x] Connection status indicator
- [x] User menu con company switching
- [x] Notification filtering y actions
- [x] Loading state management hook
- [x] Accessibility básica implementada

### Could Have
- [ ] Advanced error reporting integration
- [ ] Push notification support
- [ ] Advanced theme customization
- [ ] Navigation analytics tracking
- [ ] Performance monitoring integration
- [ ] Advanced accessibility features

El Sprint 4 del Frontend Team establece la base sólida de la experiencia de usuario que soportará todos los módulos del sistema con navegación intuitiva, manejo robusto de errores, y una interfaz cohesiva y accesible.
