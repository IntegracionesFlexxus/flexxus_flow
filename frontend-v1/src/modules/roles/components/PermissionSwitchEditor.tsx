/**
 * PermissionSwitchEditor - MVP Component
 * Editor simple de permisos usando switches nativos
 * Diseño robusto sin sobreingeniería
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Alert,
  Paper,
  Skeleton,
  Stack,
  Chip,
  InputAdornment,
  TextField
} from '@mui/material';
import { Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

// Services & Hooks
import { roleService } from '@/modules/users/services/roleService';
import { useRoleValidation } from '@/shared/hooks/useRoleValidation';
import { useUIStore } from '@/shared/store/uiStore';

// Types
import type { Permission } from '@/modules/users/types';

// Sub-components
import { PermissionModuleGroup } from './PermissionModuleGroup';

interface PermissionSwitchEditorProps {
  roleId?: string;
  initialPermissions: Permission[];
  onPermissionsChange: (permissionIds: string[]) => void;
  canEdit: boolean;
  disabled?: boolean;
}

interface PermissionGroup {
  module: string;
  displayName: string;
  permissions: Permission[];
}

/**
 * Editor principal de permisos con switches
 */
export const PermissionSwitchEditor: React.FC<PermissionSwitchEditorProps> = ({
  roleId,
  initialPermissions,
  onPermissionsChange,
  canEdit,
  disabled = false
}) => {
  // State
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Hooks
  const { addNotification } = useUIStore();
  const { canAssignPermission, isSuperAdmin } = useRoleValidation();

  // Fetch all available permissions
  const { data: allPermissions = [], isLoading, error } = useQuery({
    queryKey: ['all-permissions'],
    queryFn: () => roleService.getAllPermissions(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    select: (data) => Array.isArray(data) ? data : []
  });

  // Initialize selected permissions
  useEffect(() => {
    const initialIds = initialPermissions.map(p => p.id);
    setSelectedPermissions(initialIds);
  }, [initialPermissions]);

  // Group permissions by module
  const permissionGroups = useMemo<PermissionGroup[]>(() => {
    if (!Array.isArray(allPermissions)) {
      return [];
    }

    const groups = allPermissions.reduce((acc, permission) => {
      // Extract module from permission name (e.g., "admin.users.view" -> "users")
      let module = 'general';
      let displayName = 'General';

      if (permission.name.includes('.')) {
        const parts = permission.name.split('.');
        if (parts.length >= 2) {
          module = parts[1]; // admin.users.view -> users
          displayName = module.charAt(0).toUpperCase() + module.slice(1);
        }
        if (parts[0] === 'admin' && parts.length >= 3) {
          module = parts[1]; // admin.users.view -> users
          displayName = `Admin ${module.charAt(0).toUpperCase() + module.slice(1)}`;
        }
      }

      if (!acc[module]) {
        acc[module] = {
          module,
          displayName,
          permissions: []
        };
      }

      acc[module].permissions.push(permission);
      return acc;
    }, {} as Record<string, PermissionGroup>);

    return Object.values(groups).sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [allPermissions]);

  // Filter groups by search term
  const filteredGroups = useMemo(() => {
    if (!searchTerm) return permissionGroups;

    return permissionGroups.map(group => ({
      ...group,
      permissions: group.permissions.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.displayName && p.displayName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    })).filter(group => group.permissions.length > 0);
  }, [permissionGroups, searchTerm]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = allPermissions.length;
    const selected = selectedPermissions.length;
    const restricted = allPermissions.filter(p => !canAssignPermission(p)).length;
    const available = total - restricted;

    return {
      total,
      selected,
      restricted,
      available,
      percentage: total > 0 ? Math.round((selected / total) * 100) : 0
    };
  }, [allPermissions, selectedPermissions, canAssignPermission]);

  // Handle permission toggle
  const handlePermissionToggle = useCallback((permissionId: string, enabled: boolean) => {
    if (disabled || !canEdit) return;

    const permission = allPermissions.find(p => p.id === permissionId);
    if (!permission) return;

    // Check if user can assign this permission
    if (enabled && !canAssignPermission(permission)) {
      addNotification({
        type: 'warning',
        title: 'Permiso restringido',
        message: `No puedes asignar el permiso "${permission.displayName || permission.name}"`,
        autoClose: true
      });
      return;
    }

    const newSelection = enabled
      ? [...selectedPermissions, permissionId]
      : selectedPermissions.filter(id => id !== permissionId);

    setSelectedPermissions(newSelection);
    onPermissionsChange(newSelection);
  }, [selectedPermissions, allPermissions, canAssignPermission, canEdit, disabled, onPermissionsChange, addNotification]);

  // Handle module toggle (all permissions in module)
  const handleModuleToggle = useCallback((module: PermissionGroup, enabled: boolean) => {
    if (disabled || !canEdit) return;

    if (enabled) {
      // Enable all allowed permissions in this module
      const allowedPermissions = module.permissions.filter(p => canAssignPermission(p));
      const restrictedCount = module.permissions.length - allowedPermissions.length;

      if (restrictedCount > 0) {
        addNotification({
          type: 'info',
          title: 'Algunos permisos omitidos',
          message: `${restrictedCount} permiso(s) en "${module.displayName}" no pueden ser asignados por tu rol`,
          autoClose: true
        });
      }

      const newIds = allowedPermissions.map(p => p.id);
      const updatedSelection = Array.from(new Set([...selectedPermissions, ...newIds]));

      setSelectedPermissions(updatedSelection);
      onPermissionsChange(updatedSelection);
    } else {
      // Disable all permissions in this module
      const modulePermissionIds = module.permissions.map(p => p.id);
      const updatedSelection = selectedPermissions.filter(id => !modulePermissionIds.includes(id));

      setSelectedPermissions(updatedSelection);
      onPermissionsChange(updatedSelection);
    }
  }, [selectedPermissions, canAssignPermission, canEdit, disabled, onPermissionsChange, addNotification]);

  // Loading state
  if (isLoading) {
    return (
      <Box sx={{ p: 2 }}>
        <Skeleton variant="text" width="60%" height={32} />
        <Stack spacing={2} sx={{ mt: 2 }}>
          {[1, 2, 3].map(i => (
            <Paper key={i} sx={{ p: 2 }}>
              <Skeleton variant="text" width="40%" height={24} />
              <Stack spacing={1} sx={{ mt: 1 }}>
                <Skeleton variant="rectangular" width="100%" height={40} />
                <Skeleton variant="rectangular" width="100%" height={40} />
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        <Typography variant="h6">Error al cargar permisos</Typography>
        <Typography variant="body2">
          No se pudieron obtener los permisos disponibles. Por favor, recarga la página.
        </Typography>
      </Alert>
    );
  }

  // No edit permissions
  if (!canEdit) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        <Typography variant="h6">Sin permisos de edición</Typography>
        <Typography variant="body2">
          No tienes autorización para modificar los permisos de este rol.
        </Typography>
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header with search and stats */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Editor de Permisos
        </Typography>

        {/* Search */}
        <TextField
          fullWidth
          size="small"
          placeholder="Buscar permisos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={18} />
              </InputAdornment>
            )
          }}
        />

        {/* Stats */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label={`${stats.selected} / ${stats.total} seleccionados`}
            color="primary"
            variant="outlined"
          />
          <Chip
            label={`${stats.percentage}% asignado`}
            color={stats.percentage > 50 ? 'success' : 'default'}
            variant="outlined"
          />
          {stats.restricted > 0 && (
            <Chip
              label={`${stats.restricted} restringidos`}
              color="warning"
              variant="outlined"
            />
          )}
        </Box>
      </Box>

      {/* Permission Groups */}
      <Stack spacing={2}>
        {filteredGroups.length === 0 ? (
          <Alert severity="info">
            {searchTerm ?
              'No se encontraron permisos que coincidan con tu búsqueda.' :
              'No hay permisos disponibles para mostrar.'
            }
          </Alert>
        ) : (
          filteredGroups.map(group => (
            <PermissionModuleGroup
              key={group.module}
              group={group}
              selectedPermissions={selectedPermissions}
              onPermissionToggle={handlePermissionToggle}
              onModuleToggle={handleModuleToggle}
              canAssignPermission={canAssignPermission}
              disabled={disabled}
            />
          ))
        )}
      </Stack>

      {/* Footer info */}
      {stats.restricted > 0 && !isSuperAdmin() && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Nota:</strong> Algunos permisos están restringidos según tu nivel de acceso.
            Solo puedes asignar permisos que tú mismo posees.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default PermissionSwitchEditor;