/**
 * PermissionDialog Component - Sprint 3
 * Diálogo para gestión granular de permisos de usuario
 * Principios SOLID aplicados con Clean Code
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  Grid,
  TextField,
  InputAdornment,
  IconButton,
  Collapse,
  Tabs,
  Tab,
  Paper,
  Stack,
  Tooltip,
  Badge,
  Switch,
  LinearProgress
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import {
  Shield,
  User as UserIcon,
  Building,
  Settings,
  BarChart3,
  Search,
  ChevronDown,
  ChevronRight,
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle,
  Info,
  Key,
  UserCheck,
  ShieldCheck,
  Database,
  FileText,
  Bell,
  Globe,
  Eye,
  Edit,
  Trash2,
  Plus,
  Copy,
  Save
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Services
import { roleService } from '@/modules/roles/services/roleService';
import { userService } from '@modules/users/services/userService';

// Hooks
import { useUIStore } from '@/shared/store/uiStore';
import { useAuthStore } from '@/shared/store/authStore';

// Types
import type { User } from '@modules/users/types';
import type { Role, Permission } from '@/modules/roles/types';
import { PermissionCategory } from '@/modules/roles/types';

interface PermissionDialogProps {
  open: boolean;
  user: User | null;
  onClose: () => void;
  readOnly?: boolean;
}

interface PermissionGroup {
  module: string;
  permissions: Permission[];
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

/**
 * TabPanel Component
 * Clean Code: Componente auxiliar para los tabs
 */
const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`permission-tabpanel-${index}`}
      aria-labelledby={`permission-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
};

/**
 * PermissionDialog Component
 * Principios aplicados:
 * - S: Responsabilidad única de gestión de permisos
 * - O: Abierto para extensión con nuevos módulos
 * - D: Depende de abstracciones (services)
 */
export const PermissionDialog: React.FC<PermissionDialogProps> = ({
  open,
  user,
  onClose,
  readOnly = false
}) => {
  // State management
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [customPermissions, setCustomPermissions] = useState<string[]>([]);
  const [useCustomPermissions, setUseCustomPermissions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [showInheritedPermissions, setShowInheritedPermissions] = useState(true);
  
  // Hooks
  const { addNotification } = useUIStore();
  const { user: currentUser } = useAuthStore();
  const queryClient = useQueryClient();

  // ==================== Data Fetching ====================
  
  /**
   * Fetch all available roles
   */
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => roleService.getSystemRoles(),
    enabled: open
  });

  /**
   * Fetch all available permissions
   */
  const { data: allPermissions = [], isLoading: permissionsLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => roleService.getAllPermissions(),
    enabled: open
  });

  /**
   * Fetch user's current permissions
   */
  const { data: userPermissions, isLoading: userPermissionsLoading } = useQuery({
    queryKey: ['user-permissions', user?.id],
    queryFn: () => user ? userService.getUserPermissions(user.id) : Promise.resolve([]),
    enabled: open && !!user?.id
  });

  /**
   * Fetch effective permissions (role + custom)
   */
  const { data: effectivePermissions } = useQuery({
    queryKey: ['effective-permissions', user?.id, user?.companyId],
    queryFn: () => user ? roleService.getEffectivePermissions(user.id, user.companyId) : null,
    enabled: open && !!user?.id && !!user?.companyId
  });

  // ==================== Mutations ====================

  /**
   * Update user permissions mutation
   * Clean Code: Separated mutation logic
   */
  const updatePermissionsMutation = useMutation({
    mutationFn: async (data: { roleId?: string; customPermissions?: string[] }) => {
      if (!user) throw new Error('Usuario no seleccionado');
      
      if (data.roleId) {
        // Assign role
        await roleService.assignRoleToUser(user.id, data.roleId);
      }
      
      if (data.customPermissions !== undefined) {
        // Update custom permissions
        await roleService.updateUserPermissions(user.id, data.customPermissions);
      }
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['effective-permissions'] });
      
      addNotification({
        type: 'success',
        title: 'Permisos actualizados',
        message: `Los permisos de ${user?.firstName} ${user?.lastName} han sido actualizados correctamente`,
        autoClose: true
      });
      
      onClose();
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Error al actualizar permisos',
        message: error.message || 'No se pudieron actualizar los permisos',
        autoClose: false
      });
    }
  });

  // ==================== Effects ====================

  /**
   * Initialize form when dialog opens
   */
  useEffect(() => {
    if (user && open && effectivePermissions) {
      // Set current role
      const currentRole = roles.find(role => role.id === user.roleId);
      setSelectedRole(currentRole?.id || '');
      
      // Set custom permissions
      const directPermissionIds = effectivePermissions.direct.map(p => p.id);
      setCustomPermissions(directPermissionIds);
      
      // Determine if using custom permissions
      setUseCustomPermissions(directPermissionIds.length > 0);
    }
  }, [user, open, roles, effectivePermissions]);

  // ==================== Computed Values ====================

  /**
   * Group permissions by module
   * Principio ISP: Interface segregation for permission groups
   */
  const permissionGroups = useMemo<PermissionGroup[]>(() => {
    const groups = allPermissions.reduce((acc, permission) => {
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
  }, [allPermissions]);

  /**
   * Filter permissions based on search term
   */
  const filteredPermissions = useMemo(() => {
    if (!searchTerm) return permissionGroups;

    return permissionGroups.map(group => ({
      ...group,
      permissions: group.permissions.filter(
        p => 
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })).filter(group => group.permissions.length > 0);
  }, [permissionGroups, searchTerm]);

  /**
   * Get selected role data
   */
  const selectedRoleData = useMemo(
    () => roles.find(role => role.id === selectedRole),
    [roles, selectedRole]
  );

  /**
   * Calculate permission statistics
   */
  const permissionStats = useMemo(() => {
    const total = allPermissions.length;
    const rolePermissions = selectedRoleData?.permissions || [];
    const effectiveCount = new Set([
      ...rolePermissions.map(p => p.id),
      ...customPermissions
    ]).size;

    return {
      total,
      fromRole: rolePermissions.length,
      custom: customPermissions.length,
      effective: effectiveCount
    };
  }, [allPermissions, selectedRoleData, customPermissions]);

  // ==================== Handlers ====================

  /**
   * Handle permission toggle
   * Clean Code: Single responsibility function
   */
  const handlePermissionToggle = useCallback((permissionId: string) => {
    setCustomPermissions(prev => {
      if (prev.includes(permissionId)) {
        return prev.filter(id => id !== permissionId);
      }
      return [...prev, permissionId];
    });
  }, []);

  /**
   * Handle select all permissions in a module
   */
  const handleSelectAllInModule = useCallback((module: string, permissions: Permission[]) => {
    const modulePermissionIds = permissions.map(p => p.id);
    const allSelected = modulePermissionIds.every(id => customPermissions.includes(id));

    setCustomPermissions(prev => {
      if (allSelected) {
        // Deselect all
        return prev.filter(id => !modulePermissionIds.includes(id));
      } else {
        // Select all
        const newSet = new Set([...prev, ...modulePermissionIds]);
        return Array.from(newSet);
      }
    });
  }, [customPermissions]);

  /**
   * Handle module expand/collapse
   */
  const handleToggleModule = useCallback((module: string) => {
    setExpandedModules(prev => {
      if (prev.includes(module)) {
        return prev.filter(m => m !== module);
      }
      return [...prev, module];
    });
  }, []);

  /**
   * Handle save permissions
   */
  const handleSave = useCallback(() => {
    const updateData = useCustomPermissions
      ? { customPermissions }
      : { roleId: selectedRole };
    
    updatePermissionsMutation.mutate(updateData);
  }, [useCustomPermissions, customPermissions, selectedRole, updatePermissionsMutation]);

  /**
   * Check if a permission is selected
   */
  const isPermissionSelected = useCallback((permissionId: string): boolean => {
    if (useCustomPermissions) {
      return customPermissions.includes(permissionId);
    }
    
    return selectedRoleData?.permissions.some(p => p.id === permissionId) || false;
  }, [useCustomPermissions, customPermissions, selectedRoleData]);

  /**
   * Check if permission is inherited from role
   */
  const isPermissionInherited = useCallback((permissionId: string): boolean => {
    if (useCustomPermissions) return false;
    return selectedRoleData?.permissions.some(p => p.id === permissionId) || false;
  }, [useCustomPermissions, selectedRoleData]);

  // ==================== Utility Functions ====================

  /**
   * Get icon for module
   * Patrón Factory: Creación de iconos según módulo
   */
  const getModuleIcon = (module: string) => {
    const iconMap: Record<string, any> = {
      'auth': UserIcon,
      'users': UserCheck,
      'roles': ShieldCheck,
      'company': Building,
      'system': Settings,
      'analytics': BarChart3,
      'database': Database,
      'reports': FileText,
      'notifications': Bell,
      'api': Globe,
      'security': Lock
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
      'roles': '#9C27B0',
      'company': '#FF9800',
      'system': '#607D8B',
      'analytics': '#00BCD4',
      'database': '#795548',
      'reports': '#3F51B5',
      'notifications': '#F44336',
      'api': '#009688',
      'security': '#FF5722'
    };
    
    return colorMap[module.toLowerCase()] || '#9E9E9E';
  };

  /**
   * Get permission action icon
   */
  const getActionIcon = (permission: string): React.ReactNode => {
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

  // ==================== Render Functions ====================

  /**
   * Render permission item
   * Clean Code: Extracted render logic
   */
  const renderPermissionItem = (permission: Permission, module: string) => {
    const isSelected = isPermissionSelected(permission.id);
    const isInherited = isPermissionInherited(permission.id);
    const isDisabled = readOnly || (isInherited && !useCustomPermissions);

    return (
      <ListItem
        key={permission.id}
        dense
        button={!isDisabled}
        onClick={() => !isDisabled && handlePermissionToggle(permission.id)}
        sx={{
          pl: 4,
          opacity: isDisabled ? 0.6 : 1,
          '&:hover': !isDisabled ? {
            backgroundColor: 'action.hover'
          } : {}
        }}
      >
        <ListItemIcon sx={{ minWidth: 36 }}>
          <Checkbox
            edge="start"
            checked={isSelected}
            disabled={isDisabled}
            tabIndex={-1}
            size="small"
            color={isInherited ? 'default' : 'primary'}
          />
        </ListItemIcon>
        
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {getActionIcon(permission.name)}
              <Typography variant="body2">
                {permission.displayName}
              </Typography>
              {isInherited && !useCustomPermissions && (
                <Chip
                  label="Rol"
                  size="small"
                  variant="outlined"
                  sx={{ height: 18, fontSize: '0.7rem' }}
                />
              )}
            </Box>
          }
          secondary={
            <Typography variant="caption" color="text.secondary">
              {permission.description}
            </Typography>
          }
        />
        
        {permission.critical && (
          <ListItemSecondaryAction>
            <Tooltip title="Permiso crítico">
              <AlertCircle size={16} color="#ff9800" />
            </Tooltip>
          </ListItemSecondaryAction>
        )}
      </ListItem>
    );
  };

  /**
   * Render module section
   */
  const renderModuleSection = (group: PermissionGroup) => {
    const isExpanded = expandedModules.includes(group.module);
    const modulePermissionIds = group.permissions.map(p => p.id);
    const selectedCount = modulePermissionIds.filter(id => 
      isPermissionSelected(id)
    ).length;
    const allSelected = selectedCount === group.permissions.length;
    const someSelected = selectedCount > 0 && selectedCount < group.permissions.length;

    return (
      <Paper key={group.module} elevation={0} sx={{ mb: 2, border: 1, borderColor: 'divider' }}>
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'background.default',
            borderBottom: isExpanded ? 1 : 0,
            borderColor: 'divider',
            cursor: 'pointer'
          }}
          onClick={() => handleToggleModule(group.module)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <IconButton size="small" sx={{ p: 0 }}>
              {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </IconButton>
            
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
                {selectedCount} de {group.permissions.length} permisos seleccionados
              </Typography>
            </Box>
          </Box>

          {useCustomPermissions && !readOnly && (
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected}
              onChange={(e) => {
                e.stopPropagation();
                handleSelectAllInModule(group.module, group.permissions);
              }}
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </Box>

        <Collapse in={isExpanded}>
          <List disablePadding>
            {group.permissions.map(permission => 
              renderPermissionItem(permission, group.module)
            )}
          </List>
        </Collapse>
      </Paper>
    );
  };

  // Loading state
  if (rolesLoading || permissionsLoading || userPermissionsLoading) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <LinearProgress sx={{ width: '50%' }} />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: '90vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Shield size={24} />
            <Box>
              <Typography variant="h6">
                Gestionar Permisos
              </Typography>
              {user && (
                <Typography variant="body2" color="text.secondary">
                  {user.firstName || ''} {user.lastName || ''} ({user.email})
                </Typography>
              )}
            </Box>
          </Box>
          
          {readOnly && (
            <Chip
              icon={<Lock size={14} />}
              label="Solo lectura"
              size="small"
              color="warning"
            />
          )}
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        <Tabs
          value={selectedTab}
          onChange={(_, value) => setSelectedTab(value)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}
        >
          <Tab label="Asignar Rol" />
          <Tab label="Permisos Personalizados" />
          <Tab label="Vista General" />
        </Tabs>

        <Box sx={{ p: 3, height: 'calc(100% - 48px)', overflow: 'auto' }}>
          {/* Tab 1: Role Assignment */}
          <TabPanel value={selectedTab} index={0}>
            <Stack spacing={3}>
              {/* Role selection */}
              <FormControl fullWidth>
                <InputLabel>Seleccionar Rol</InputLabel>
                <Select
                  value={selectedRole}
                  label="Seleccionar Rol"
                  onChange={(e) => {
                    setSelectedRole(e.target.value);
                    setUseCustomPermissions(false);
                  }}
                  disabled={readOnly}
                >
                  <MenuItem value="">
                    <em>Sin rol asignado</em>
                  </MenuItem>
                  {roles.map((role) => (
                    <MenuItem key={role.id} value={role.id}>
                      <Box sx={{ width: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography variant="body2" fontWeight={500}>
                            {role.name}
                          </Typography>
                          <Chip 
                            label={`${role.permissions.length} permisos`}
                            size="small"
                            sx={{ ml: 2 }}
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {role.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Role details */}
              {selectedRoleData && (
                <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Permisos incluidos en {selectedRoleData.name}:
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                    {selectedRoleData.permissions.map((permission) => (
                      <Chip
                        key={permission.id}
                        icon={getActionIcon(permission.name)}
                        label={permission.displayName}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                  
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="caption">
                      Los usuarios con este rol tendrán automáticamente todos estos permisos.
                      Puedes agregar permisos adicionales usando la pestaña "Permisos Personalizados".
                    </Typography>
                  </Alert>
                </Paper>
              )}
            </Stack>
          </TabPanel>

          {/* Tab 2: Custom Permissions */}
          <TabPanel value={selectedTab} index={1}>
            <Stack spacing={3}>
              {/* Search and filters */}
              <Box sx={{ display: 'flex', gap: 2 }}>
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
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={useCustomPermissions}
                      onChange={(e) => setUseCustomPermissions(e.target.checked)}
                      disabled={readOnly}
                    />
                  }
                  label="Activar"
                  sx={{ minWidth: 'auto' }}
                />
              </Box>

              {/* Warning message */}
              {useCustomPermissions && (
                <Alert severity="warning">
                  Los permisos personalizados se agregan además de los permisos del rol base.
                  Asegúrate de revisar todos los permisos antes de guardar.
                </Alert>
              )}

              {/* Permission modules */}
              <Box>
                {filteredPermissions.length === 0 ? (
                  <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Info size={48} color="#9e9e9e" />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      No se encontraron permisos que coincidan con tu búsqueda
                    </Typography>
                  </Paper>
                ) : (
                  filteredPermissions.map(group => renderModuleSection(group))
                )}
              </Box>
            </Stack>
          </TabPanel>

          {/* Tab 3: Overview */}
          <TabPanel value={selectedTab} index={2}>
            <Grid container spacing={3}>
              {/* Statistics */}
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                  <Typography variant="h6" gutterBottom>
                    Resumen de Permisos
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="primary">
                          {permissionStats.effective}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Permisos Efectivos
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4">
                          {permissionStats.fromRole}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Desde el Rol
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4">
                          {permissionStats.custom}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Personalizados
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="text.secondary">
                          {permissionStats.total}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Total Disponibles
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {/* Effective permissions list */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Permisos Efectivos del Usuario
                </Typography>
                
                {effectivePermissions && (
                  <Stack spacing={2}>
                    {/* From Role */}
                    {effectivePermissions.fromRole.length > 0 && (
                      <Paper elevation={0} sx={{ p: 2, border: 1, borderColor: 'divider' }}>
                        <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ShieldCheck size={18} />
                          Heredados del Rol
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                          {effectivePermissions.fromRole.map(permission => (
                            <Chip
                              key={permission.id}
                              label={permission.displayName}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      </Paper>
                    )}

                    {/* Direct/Custom */}
                    {effectivePermissions.direct.length > 0 && (
                      <Paper elevation={0} sx={{ p: 2, border: 1, borderColor: 'divider' }}>
                        <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Key size={18} />
                          Permisos Directos
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                          {effectivePermissions.direct.map(permission => (
                            <Chip
                              key={permission.id}
                              label={permission.displayName}
                              size="small"
                              color="secondary"
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      </Paper>
                    )}

                    {/* All effective */}
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'rgba(76, 175, 80, 0.1)' }}>
                      <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'success.main' }}>
                        <CheckCircle size={18} />
                        Total de Permisos Activos
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                        {effectivePermissions.effective.map(permission => (
                          <Chip
                            key={permission.id}
                            label={permission.displayName}
                            size="small"
                            color="success"
                          />
                        ))}
                      </Box>
                    </Paper>
                  </Stack>
                )}
              </Grid>
            </Grid>
          </TabPanel>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <Box>
            {!readOnly && (
              <FormControlLabel
                control={
                  <Switch
                    checked={showInheritedPermissions}
                    onChange={(e) => setShowInheritedPermissions(e.target.checked)}
                    size="small"
                  />
                }
                label={
                  <Typography variant="caption">
                    Mostrar permisos heredados
                  </Typography>
                }
              />
            )}
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={onClose} disabled={updatePermissionsMutation.isPending}>
              Cancelar
            </Button>
            
            {!readOnly && (
              <LoadingButton
                variant="contained"
                onClick={handleSave}
                loading={updatePermissionsMutation.isPending}
                loadingPosition="start"
                startIcon={<Save size={18} />}
                disabled={
                  (!useCustomPermissions && !selectedRole) ||
                  (useCustomPermissions && customPermissions.length === 0)
                }
              >
                Guardar Permisos
              </LoadingButton>
            )}
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

// Export with memo for performance
export default React.memo(PermissionDialog);