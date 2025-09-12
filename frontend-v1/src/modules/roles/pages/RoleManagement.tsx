/**
 * Role Management Page - Sprint 3
 * Página principal para gestión de roles y permisos
 * Implementación con principios SOLID y Clean Code
 */

console.log('🎭 RoleManagement: File loading started');

import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Alert,
  Grid,
  Card,
  CardContent,
  CardActions,
  Tooltip,
  Badge,
  Stack,
  Divider,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
  Avatar,
  AvatarGroup,
  CircularProgress
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import {
  Shield,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Download,
  Upload,
  Users,
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle,
  Info,
  Settings,
  ShieldCheck,
  UserCheck,
  Key,
  FileText,
  BarChart3,
  Eye
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

// Components
import { DataTable } from '@/components/ui/DataTable';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { RoleDialog } from '@modules/roles/components/RoleDialog';
import { RolePermissionsDialog } from '@modules/roles/components/RolePermissionsDialog';

// Services
import { roleService } from '@/modules/users/services/roleService';

// Hooks
import { useAuthStore } from '@/shared/store/authStore';
import { useUIStore } from '@/shared/store/uiStore';

// Types
import type { Role, Permission } from '@/modules/users/types';

interface RoleWithStats extends Role {
  userCount: number;
  lastModified: Date;
  createdBy: string;
}

/**
 * RoleManagement Component
 * Principios aplicados:
 * - S: Responsabilidad única de gestión de roles
 * - O: Abierto para extensión con nuevos tipos de roles
 * - D: Depende de abstracciones (services)
 */
console.log('🎭 RoleManagement: All imports completed');

export const RoleManagement: React.FC = () => {
  console.log('🎭 RoleManagement: Component initializing');
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<RoleWithStats | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [filterType, setFilterType] = useState<'all' | 'system' | 'custom'>('all');
  const [showInactive, setShowInactive] = useState(false);
  const [dialogState, setDialogState] = useState({
    create: false,
    edit: false,
    delete: false,
    permissions: false,
    clone: false,
    import: false
  });

  // Hooks
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, currentCompany } = useAuthStore();
  const { addNotification } = useUIStore();

  // ==================== Data Fetching ====================

  /**
   * Fetch roles with stats
   */
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['roles-with-stats', currentCompany?.id, filterType, showInactive],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      // Get roles based on filter
      let rolesList: Role[] = [];
      if (filterType === 'system') {
        rolesList = await roleService.getSystemRoles();
      } else if (filterType === 'custom') {
        rolesList = await roleService.getCompanyRoles(currentCompany.id);
      } else {
        const [system, custom] = await Promise.all([
          roleService.getSystemRoles(),
          roleService.getCompanyRoles(currentCompany.id)
        ]);
        rolesList = [...system, ...custom];
      }

      // Get stats for each role
      const stats = await roleService.getRoleStats(currentCompany.id);
      
      // Combine roles with stats
      return rolesList.map(role => ({
        ...role,
        userCount: stats.usersPerRole[role.id] || 0,
        lastModified: new Date(role.updatedAt || role.createdAt),
        createdBy: role.createdBy || 'Sistema'
      })) as RoleWithStats[];
    },
    enabled: !!currentCompany?.id
  });

  /**
   * Fetch all permissions for reference
   */
  const { data: allPermissions = [] } = useQuery({
    queryKey: ['all-permissions'],
    queryFn: () => roleService.getAllPermissions()
  });

  // ==================== Mutations ====================

  /**
   * Delete role mutation
   */
  const deleteRoleMutation = useMutation({
    mutationFn: (roleId: string) => roleService.deleteRole(roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles-with-stats'] });
      addNotification({
        type: 'success',
        title: 'Rol eliminado',
        message: 'El rol ha sido eliminado correctamente',
        autoClose: true
      });
      handleCloseDialog();
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Error al eliminar',
        message: error.message || 'No se pudo eliminar el rol',
        autoClose: false
      });
    }
  });

  /**
   * Clone role mutation
   */
  const cloneRoleMutation = useMutation({
    mutationFn: ({ roleId, name }: { roleId: string; name: string }) =>
      roleService.cloneRole(roleId, name, currentCompany?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles-with-stats'] });
      addNotification({
        type: 'success',
        title: 'Rol clonado',
        message: 'El rol ha sido clonado correctamente',
        autoClose: true
      });
      handleCloseDialog();
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Error al clonar',
        message: error.message || 'No se pudo clonar el rol',
        autoClose: false
      });
    }
  });

  /**
   * Export roles mutation
   */
  const exportRolesMutation = useMutation({
    mutationFn: () => roleService.exportRoles(currentCompany!.id),
    onSuccess: (data) => {
      // Create download link
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `roles_${currentCompany?.name}_${new Date().toISOString()}.json`;
      link.click();
      URL.revokeObjectURL(url);
      
      addNotification({
        type: 'success',
        title: 'Exportación exitosa',
        message: 'Los roles han sido exportados correctamente',
        autoClose: true
      });
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Error al exportar',
        message: error.message || 'No se pudieron exportar los roles',
        autoClose: false
      });
    }
  });

  // ==================== Computed Values ====================

  /**
   * Filter roles based on search term
   */
  const filteredRoles = useMemo(() => {
    let filtered = roles;

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(role =>
        role.name.toLowerCase().includes(term) ||
        role.description?.toLowerCase().includes(term) ||
        role.permissions.some(p => p.displayName.toLowerCase().includes(term))
      );
    }

    // Filter inactive
    if (!showInactive) {
      filtered = filtered.filter(role => role.isActive !== false);
    }

    return filtered;
  }, [roles, searchTerm, showInactive]);

  /**
   * Role statistics
   */
  const roleStats = useMemo(() => {
    const totalRoles = roles.length;
    const systemRoles = roles.filter(r => r.isSystem).length;
    const customRoles = totalRoles - systemRoles;
    const totalUsers = roles.reduce((sum, role) => sum + role.userCount, 0);
    const averagePermissions = Math.round(
      roles.reduce((sum, role) => sum + role.permissions.length, 0) / totalRoles || 0
    );

    return {
      totalRoles,
      systemRoles,
      customRoles,
      totalUsers,
      averagePermissions
    };
  }, [roles]);

  // ==================== Handlers ====================

  /**
   * Handle menu actions
   */
  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, role: RoleWithStats) => {
    event.stopPropagation();
    setSelectedRole(role);
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleCloseDialog = () => {
    setDialogState({
      create: false,
      edit: false,
      delete: false,
      permissions: false,
      clone: false,
      import: false
    });
    setSelectedRole(null);
  };

  /**
   * Handle role actions
   */
  const handleEditRole = () => {
    setDialogState(prev => ({ ...prev, edit: true }));
    handleMenuClose();
  };

  const handleDeleteRole = () => {
    setDialogState(prev => ({ ...prev, delete: true }));
    handleMenuClose();
  };

  const handleCloneRole = () => {
    setDialogState(prev => ({ ...prev, clone: true }));
    handleMenuClose();
  };

  const handleViewPermissions = () => {
    setDialogState(prev => ({ ...prev, permissions: true }));
    handleMenuClose();
  };

  /**
   * Handle file import
   */
  const handleImportRoles = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentCompany?.id) return;

    try {
      const result = await roleService.importRoles(currentCompany.id, file);
      
      queryClient.invalidateQueries({ queryKey: ['roles-with-stats'] });
      
      addNotification({
        type: 'success',
        title: 'Importación exitosa',
        message: `Se importaron ${result.imported} roles. ${result.skipped} fueron omitidos.`,
        autoClose: true
      });
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error al importar',
        message: error.message || 'No se pudieron importar los roles',
        autoClose: false
      });
    }

    // Reset input
    event.target.value = '';
  }, [currentCompany, queryClient, addNotification]);

  // ==================== Render Functions ====================

  /**
   * Render role card
   * Clean Code: Extracted complex rendering logic
   */
  const renderRoleCard = (role: RoleWithStats) => {
    const isSystem = role.isSystem;
    const isInactive = role.isActive === false;
    
    return (
      <Card
        key={role.id}
        elevation={1}
        sx={{
          position: 'relative',
          opacity: isInactive ? 0.7 : 1,
          transition: 'all 0.3s',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: 3
          }
        }}
      >
        {/* System badge */}
        {isSystem && (
          <Chip
            icon={<Lock size={12} />}
            label="Sistema"
            size="small"
            color="primary"
            sx={{
              position: 'absolute',
              top: 8,
              right: 8
            }}
          />
        )}

        <CardContent>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
            <Avatar
              sx={{
                width: 48,
                height: 48,
                bgcolor: isSystem ? 'primary.main' : 'secondary.main',
                mr: 2
              }}
            >
              <Shield size={24} />
            </Avatar>
            
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" gutterBottom>
                {role.name}
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {role.description}
              </Typography>
              
              {/* Stats */}
              <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                <Chip
                  icon={<Users size={14} />}
                  label={`${role.userCount} usuarios`}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  icon={<Key size={14} />}
                  label={`${role.permissions.length} permisos`}
                  size="small"
                  variant="outlined"
                />
              </Stack>
            </Box>
            
            {/* Actions menu */}
            <IconButton
              size="small"
              onClick={(e) => handleMenuClick(e, role)}
              disabled={isSystem && !user?.isSuperAdmin}
            >
              <MoreVertical size={18} />
            </IconButton>
          </Box>

          {/* Permission preview */}
          <Box>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Permisos principales:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
              {role.permissions.slice(0, 5).map(permission => (
                <Chip
                  key={permission.id}
                  label={permission.displayName}
                  size="small"
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              ))}
              {role.permissions.length > 5 && (
                <Chip
                  label={`+${role.permissions.length - 5} más`}
                  size="small"
                  sx={{ height: 20, fontSize: '0.7rem' }}
                  color="default"
                />
              )}
            </Box>
          </Box>

          {/* Footer info */}
          <Divider sx={{ my: 2 }} />
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" color="text.secondary">
              Creado por {role.createdBy}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Modificado {new Date(role.lastModified).toLocaleDateString()}
            </Typography>
          </Stack>
        </CardContent>

        <CardActions sx={{ px: 2, pb: 2 }}>
          <Button
            size="small"
            startIcon={<Eye size={16} />}
            onClick={() => {
              setSelectedRole(role);
              setDialogState(prev => ({ ...prev, permissions: true }));
            }}
          >
            Ver permisos
          </Button>
          
          {!isSystem && (
            <Button
              size="small"
              startIcon={<Edit size={16} />}
              onClick={() => {
                setSelectedRole(role);
                setDialogState(prev => ({ ...prev, edit: true }));
              }}
            >
              Editar
            </Button>
          )}
        </CardActions>
      </Card>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Shield size={32} />
          Gestión de Roles y Permisos
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Administra los roles y permisos de tu organización
        </Typography>
      </Box>

      {/* Statistics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <ShieldCheck size={32} color="#2196F3" />
            <Typography variant="h4" sx={{ mt: 1 }}>
              {roleStats.totalRoles}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Roles Totales
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Lock size={32} color="#4CAF50" />
            <Typography variant="h4" sx={{ mt: 1 }}>
              {roleStats.systemRoles}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Roles del Sistema
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Settings size={32} color="#FF9800" />
            <Typography variant="h4" sx={{ mt: 1 }}>
              {roleStats.customRoles}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Roles Personalizados
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Users size={32} color="#9C27B0" />
            <Typography variant="h4" sx={{ mt: 1 }}>
              {roleStats.totalUsers}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Usuarios Asignados
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Actions Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Buscar roles..."
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
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Filtrar por tipo</InputLabel>
              <Select
                value={filterType}
                label="Filtrar por tipo"
                onChange={(e) => setFilterType(e.target.value as typeof filterType)}
              >
                <MenuItem value="all">Todos los roles</MenuItem>
                <MenuItem value="system">Roles del sistema</MenuItem>
                <MenuItem value="custom">Roles personalizados</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                />
              }
              label="Mostrar inactivos"
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button
                variant="outlined"
                startIcon={<Download size={18} />}
                onClick={() => exportRolesMutation.mutate()}
                disabled={exportRolesMutation.isPending}
              >
                Exportar
              </Button>
              
              <Button
                variant="outlined"
                component="label"
                startIcon={<Upload size={18} />}
              >
                Importar
                <input
                  type="file"
                  accept=".json"
                  hidden
                  onChange={handleImportRoles}
                />
              </Button>
              
              <Button
                variant="contained"
                startIcon={<Plus size={18} />}
                onClick={() => setDialogState(prev => ({ ...prev, create: true }))}
              >
                Nuevo Rol
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Roles Grid */}
      {rolesLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredRoles.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Info size={48} color="#9e9e9e" />
          <Typography variant="h6" sx={{ mt: 2 }}>
            No se encontraron roles
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {searchTerm 
              ? 'Intenta con otros términos de búsqueda'
              : 'Comienza creando tu primer rol personalizado'}
          </Typography>
          {!searchTerm && (
            <Button
              variant="contained"
              startIcon={<Plus size={18} />}
              sx={{ mt: 2 }}
              onClick={() => setDialogState(prev => ({ ...prev, create: true }))}
            >
              Crear Rol
            </Button>
          )}
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredRoles.map(role => (
            <Grid item xs={12} md={6} lg={4} key={role.id}>
              {renderRoleCard(role)}
            </Grid>
          ))}
        </Grid>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleViewPermissions}>
          <ListItemIcon>
            <Shield size={18} />
          </ListItemIcon>
          <ListItemText>Ver permisos</ListItemText>
        </MenuItem>
        
        {!selectedRole?.isSystem && (
          <>
            <MenuItem onClick={handleEditRole}>
              <ListItemIcon>
                <Edit size={18} />
              </ListItemIcon>
              <ListItemText>Editar rol</ListItemText>
            </MenuItem>
            
            <MenuItem onClick={handleCloneRole}>
              <ListItemIcon>
                <Copy size={18} />
              </ListItemIcon>
              <ListItemText>Clonar rol</ListItemText>
            </MenuItem>
            
            <Divider />
            
            <MenuItem onClick={handleDeleteRole}>
              <ListItemIcon>
                <Trash2 size={18} />
              </ListItemIcon>
              <ListItemText>Eliminar rol</ListItemText>
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Dialogs */}
      {selectedRole && (
        <>
          <RolePermissionsDialog
            open={dialogState.permissions}
            role={selectedRole}
            onClose={handleCloseDialog}
            readOnly
          />
          
          <ConfirmDialog
            open={dialogState.delete}
            title="Eliminar Rol"
            message={`¿Estás seguro de que deseas eliminar el rol "${selectedRole.name}"? Los usuarios asignados a este rol perderán sus permisos.`}
            confirmLabel="Eliminar"
            onConfirm={() => deleteRoleMutation.mutate(selectedRole.id)}
            onCancel={handleCloseDialog}
            loading={deleteRoleMutation.isPending}
            severity="error"
          />
        </>
      )}
      
      <RoleDialog
        open={dialogState.create || dialogState.edit}
        role={dialogState.edit ? selectedRole : null}
        onClose={handleCloseDialog}
        onSave={() => {
          queryClient.invalidateQueries({ queryKey: ['roles-with-stats'] });
          handleCloseDialog();
        }}
      />
    </Box>
  );
};

// Export with memo for performance
export default React.memo(RoleManagement);