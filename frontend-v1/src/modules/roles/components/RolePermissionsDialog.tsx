/**
 * RolePermissionsDialog Component - Sprint 3
 * Diálogo para visualizar permisos de un rol
 * Implementación con principios SOLID y Clean Code
 */

import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Paper,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Alert,
  Stack,
  Badge
} from '@mui/material';
import {
  Shield,
  Search,
  X,
  Info,
  Key,
  Eye,
  Edit,
  Trash2,
  Plus,
  Lock,
  Users,
  Building,
  Settings,
  Database,
  FileText,
  Bell,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Copy
} from 'lucide-react';

// Types
import type { Role, Permission } from '@/modules/roles/types';

interface RolePermissionsDialogProps {
  open: boolean;
  role: Role | null;
  onClose: () => void;
  readOnly?: boolean;
}

interface PermissionGroup {
  module: string;
  permissions: Permission[];
}

/**
 * RolePermissionsDialog Component
 * Principios aplicados:
 * - S: Responsabilidad única de visualización de permisos
 * - O: Abierto para extensión con nuevos formatos de visualización
 */
export const RolePermissionsDialog: React.FC<RolePermissionsDialogProps> = ({
  open,
  role,
  onClose,
  readOnly = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grouped' | 'list'>('grouped');

  // ==================== Computed Values ====================

  /**
   * Group permissions by module
   */
  const permissionGroups = useMemo<PermissionGroup[]>(() => {
    if (!role) return [];

    const groups = role.permissions.reduce((acc, permission) => {
      const module = permission.module || 'General';
      if (!acc[module]) {
        acc[module] = {
          module,
          permissions: []
        };
      }
      acc[module].permissions.push(permission);
      return acc;
    }, {} as Record<string, PermissionGroup>);

    return Object.values(groups).sort((a, b) => a.module.localeCompare(b.module));
  }, [role]);

  /**
   * Filter permissions based on search
   */
  const filteredPermissions = useMemo(() => {
    if (!searchTerm || !role) return role?.permissions || [];

    const term = searchTerm.toLowerCase();
    return role.permissions.filter(p =>
      p.name.toLowerCase().includes(term) ||
      (p.displayName || '').toLowerCase().includes(term) ||
      p.description?.toLowerCase().includes(term) ||
      p.module?.toLowerCase().includes(term)
    );
  }, [role, searchTerm]);

  /**
   * Filtered groups for grouped view
   */
  const filteredGroups = useMemo(() => {
    if (!searchTerm) return permissionGroups;

    return permissionGroups.map(group => ({
      ...group,
      permissions: group.permissions.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })).filter(group => group.permissions.length > 0);
  }, [permissionGroups, searchTerm]);

  /**
   * Permission statistics
   */
  const stats = useMemo(() => {
    if (!role) return { total: 0, critical: 0, byModule: {} };

    const critical = role.permissions.filter(p => p.critical).length;
    
    const byModule = permissionGroups.reduce((acc, group) => {
      acc[group.module] = group.permissions.length;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: role.permissions.length,
      critical,
      byModule
    };
  }, [role, permissionGroups]);

  // ==================== Utility Functions ====================

  /**
   * Get icon for module
   */
  const getModuleIcon = (module: string) => {
    const iconMap: Record<string, any> = {
      'auth': Users,
      'company': Building,
      'system': Settings,
      'analytics': BarChart3,
      'database': Database,
      'reports': FileText,
      'notifications': Bell
    };
    
    const IconComponent = iconMap[module.toLowerCase()] || Shield;
    return <IconComponent size={20} />;
  };

  /**
   * Get module color
   */
  const getModuleColor = (module: string): string => {
    const colorMap: Record<string, string> = {
      'auth': '#2196F3',
      'users': '#4CAF50',
      'company': '#FF9800',
      'system': '#607D8B',
      'analytics': '#00BCD4',
      'database': '#795548',
      'reports': '#3F51B5',
      'notifications': '#F44336'
    };
    
    return colorMap[module.toLowerCase()] || '#9E9E9E';
  };

  /**
   * Get action icon for permission
   */
  const getActionIcon = (permission: string) => {
    if (permission.includes('view') || permission.includes('read')) {
      return <Eye size={14} />;
    }
    if (permission.includes('create') || permission.includes('add')) {
      return <Plus size={14} />;
    }
    if (permission.includes('edit') || permission.includes('update')) {
      return <Edit size={14} />;
    }
    if (permission.includes('delete') || permission.includes('remove')) {
      return <Trash2 size={14} />;
    }
    return <Key size={14} />;
  };

  /**
   * Copy permissions to clipboard
   */
  const handleCopyPermissions = () => {
    if (!role) return;

    const text = role.permissions
      .map(p => `- ${(p.displayName || p.name)} (${p.module || 'General'})`)
      .join('\n');
    
    navigator.clipboard.writeText(text);
  };

  // ==================== Render Functions ====================

  /**
   * Render grouped view
   */
  const renderGroupedView = () => (
    <Grid container spacing={2}>
      {filteredGroups.map(group => (
        <Grid item xs={12} md={6} key={group.module}>
          <Paper elevation={0} sx={{ p: 2, height: '100%', bgcolor: 'background.default' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: `${getModuleColor(group.module)}20`,
                  color: getModuleColor(group.module)
                }}
              >
                {getModuleIcon(group.module)}
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight={600}>
                  {group.module}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {group.permissions.length} permisos
                </Typography>
              </Box>
            </Box>
            
            <List dense disablePadding>
              {group.permissions.map(permission => (
                <ListItem key={permission.id} sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 24 }}>
                    {getActionIcon(permission.name)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body2">
                        {permission.displayName || permission.name}
                        {permission.critical && (
                          <Tooltip title="Permiso crítico">
                            <AlertCircle
                              size={14} 
                              color="#ff9800"
                              style={{ marginLeft: 4, verticalAlign: 'middle' }}
                            />
                          </Tooltip>
                        )}
                      </Typography>
                    }
                    secondary={
                      permission.description && (
                        <Typography variant="caption" color="text.secondary">
                          {permission.description}
                        </Typography>
                      )
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );

  /**
   * Render list view
   */
  const renderListView = () => (
    <List>
      {filteredPermissions.map((permission, index) => (
        <React.Fragment key={permission.id}>
          <ListItem>
            <ListItemIcon>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: `${getModuleColor(permission.module || 'General')}20`,
                  color: getModuleColor(permission.module || 'General')
                }}
              >
                {getActionIcon(permission.name)}
              </Box>
            </ListItemIcon>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" fontWeight={500}>
                    {permission.displayName || permission.name}
                  </Typography>
                  <Chip
                    label={permission.module || 'General'}
                    size="small"
                    sx={{ height: 18, fontSize: '0.7rem' }}
                  />
                  {permission.critical && (
                    <Chip
                      icon={<AlertCircle size={12} />}
                      label="Crítico"
                      size="small"
                      color="warning"
                      sx={{ height: 18, fontSize: '0.7rem' }}
                    />
                  )}
                </Box>
              }
              secondary={
                <Typography variant="caption" color="text.secondary">
                  {permission.description || `Permiso: ${permission.name}`}
                </Typography>
              }
            />
          </ListItem>
          {index < filteredPermissions.length - 1 && <Divider component="li" />}
        </React.Fragment>
      ))}
    </List>
  );

  if (!role) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: '85vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Shield size={24} />
            <Box>
              <Typography variant="h6">
                Permisos del Rol: {role.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {role.description}
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {role.isSystem && (
              <Chip
                icon={<Lock size={14} />}
                label="Rol del Sistema"
                size="small"
                color="primary"
              />
            )}
            
            <IconButton size="small" onClick={onClose}>
              <X size={20} />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        {/* Statistics */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Paper elevation={0} sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.main', color: 'primary.contrastText' }}>
              <Typography variant="h4">
                {stats.total}
              </Typography>
              <Typography variant="body2">
                Permisos Totales
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Paper elevation={0} sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.main', color: 'warning.contrastText' }}>
              <Typography variant="h4">
                {stats.critical}
              </Typography>
              <Typography variant="body2">
                Permisos Críticos
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Paper elevation={0} sx={{ p: 2, textAlign: 'center', bgcolor: 'success.main', color: 'success.contrastText' }}>
              <Typography variant="h4">
                {Object.keys(stats.byModule).length}
              </Typography>
              <Typography variant="body2">
                Módulos
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Paper elevation={0} sx={{ p: 2, textAlign: 'center', bgcolor: 'info.main', color: 'info.contrastText' }}>
              <Typography variant="h4">
                {Math.round(stats.total / Object.keys(stats.byModule).length) || 0}
              </Typography>
              <Typography variant="body2">
                Promedio por Módulo
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Search and View Controls */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Buscar permisos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              )
            }}
          />
          
          <Button
            variant={viewMode === 'grouped' ? 'contained' : 'outlined'}
            onClick={() => setViewMode('grouped')}
            size="small"
          >
            Agrupado
          </Button>
          
          <Button
            variant={viewMode === 'list' ? 'contained' : 'outlined'}
            onClick={() => setViewMode('list')}
            size="small"
          >
            Lista
          </Button>
        </Box>

        {/* Permissions Display */}
        {searchTerm && filteredPermissions.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Info size={48} color="#9e9e9e" />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              No se encontraron permisos que coincidan con "{searchTerm}"
            </Typography>
          </Paper>
        ) : (
          viewMode === 'grouped' ? renderGroupedView() : renderListView()
        )}

        {/* Module distribution */}
        {!searchTerm && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Distribución por Módulo
            </Typography>
            <Grid container spacing={1}>
              {Object.entries(stats.byModule).map(([module, count]) => (
                <Grid item key={module}>
                  <Chip
                    icon={getModuleIcon(module)}
                    label={`${module}: ${count}`}
                    variant="outlined"
                    sx={{ 
                      borderColor: getModuleColor(module),
                      color: getModuleColor(module)
                    }}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2.5 }}>
        <Button
          startIcon={<Copy size={18} />}
          onClick={handleCopyPermissions}
        >
          Copiar Lista
        </Button>
        <Button variant="contained" onClick={onClose}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Export with memo for performance
export default React.memo(RolePermissionsDialog);