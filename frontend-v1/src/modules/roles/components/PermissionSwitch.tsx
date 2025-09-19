/**
 * PermissionSwitch - MVP Component
 * Switch individual para cada permiso con validaciones
 * Componente atómico reutilizable
 */

import React from 'react';
import {
  Box,
  Switch,
  Typography,
  FormControlLabel,
  Tooltip,
  Chip
} from '@mui/material';
import {
  Eye,
  Edit,
  Plus,
  Trash2,
  Key,
  Shield,
  AlertCircle
} from 'lucide-react';

// Types
import type { Permission } from '@/modules/users/types';

interface PermissionSwitchProps {
  permission: Permission;
  isSelected: boolean;
  onToggle: (permissionId: string, enabled: boolean) => void;
  canAssign: boolean;
  disabled?: boolean;
}

/**
 * Get icon based on permission action
 */
const getPermissionIcon = (permissionName: string) => {
  const name = permissionName.toLowerCase();

  if (name.includes('view') || name.includes('read')) {
    return <Eye size={16} color="#1976d2" />;
  }
  if (name.includes('create') || name.includes('add')) {
    return <Plus size={16} color="#388e3c" />;
  }
  if (name.includes('edit') || name.includes('update')) {
    return <Edit size={16} color="#f57c00" />;
  }
  if (name.includes('delete') || name.includes('remove')) {
    return <Trash2 size={16} color="#d32f2f" />;
  }
  if (name.includes('admin') || name.includes('manage')) {
    return <Shield size={16} color="#7b1fa2" />;
  }
  return <Key size={16} color="#616161" />;
};

/**
 * Get permission display name
 */
const getPermissionDisplayName = (permission: Permission): string => {
  if (permission.displayName) {
    return permission.displayName;
  }

  // Generate display name from permission name
  const parts = permission.name.split('.');
  if (parts.length >= 2) {
    const action = parts[parts.length - 1];
    const resource = parts[parts.length - 2];

    const actionMap: Record<string, string> = {
      'view': 'Ver',
      'create': 'Crear',
      'edit': 'Editar',
      'update': 'Actualizar',
      'delete': 'Eliminar',
      'manage': 'Gestionar'
    };

    const resourceMap: Record<string, string> = {
      'users': 'Usuarios',
      'roles': 'Roles',
      'companies': 'Empresas',
      'analytics': 'Analytics',
      'system': 'Sistema'
    };

    const displayAction = actionMap[action] || action;
    const displayResource = resourceMap[resource] || resource;

    return `${displayAction} ${displayResource}`;
  }

  return permission.name;
};

/**
 * Get permission level/severity
 */
const getPermissionLevel = (permissionName: string): 'low' | 'medium' | 'high' | 'critical' => {
  const name = permissionName.toLowerCase();

  if (name.includes('*') || name.includes('admin') || name.includes('system')) {
    return 'critical';
  }
  if (name.includes('delete') || name.includes('manage')) {
    return 'high';
  }
  if (name.includes('create') || name.includes('edit') || name.includes('update')) {
    return 'medium';
  }
  return 'low';
};

/**
 * Componente de switch individual para permisos
 */
export const PermissionSwitch: React.FC<PermissionSwitchProps> = ({
  permission,
  isSelected,
  onToggle,
  canAssign,
  disabled = false
}) => {
  const displayName = getPermissionDisplayName(permission);
  const level = getPermissionLevel(permission.name);
  const isRestricted = !canAssign;
  const isEffectivelyDisabled = disabled || (isRestricted && !isSelected);

  const handleToggle = (checked: boolean) => {
    if (isEffectivelyDisabled) return;
    onToggle(permission.id, checked);
  };

  // Determine colors based on permission level
  const levelColors = {
    low: 'primary',
    medium: 'warning',
    high: 'error',
    critical: 'secondary'
  } as const;

  const switchColor = levelColors[level] || 'primary';

  const tooltipContent = isRestricted
    ? isSelected
      ? 'Permiso asignado previamente. Puedes desactivarlo pero no reactivarlo.'
      : 'No tienes autorización para asignar este permiso.'
    : permission.description || `Permite: ${displayName}`;

  return (
    <Tooltip title={tooltipContent} placement="left" arrow>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 1,
          px: 1.5,
          borderRadius: 1,
          backgroundColor: isRestricted && !isSelected ? 'action.hover' : 'transparent',
          opacity: isEffectivelyDisabled ? 0.6 : 1,
          border: 1,
          borderColor: isSelected ? `${switchColor}.main` : 'divider',
          borderStyle: isRestricted ? 'dashed' : 'solid',
          '&:hover': {
            backgroundColor: isEffectivelyDisabled ? 'action.hover' : 'action.hover'
          }
        }}
      >
        {/* Permission Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
          {/* Icon */}
          <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 20 }}>
            {getPermissionIcon(permission.name)}
          </Box>

          {/* Name and Description */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: isSelected ? 600 : 400,
                  color: isEffectivelyDisabled ? 'text.disabled' : 'text.primary'
                }}
                noWrap
              >
                {displayName}
              </Typography>

              {/* Level indicator */}
              {level === 'critical' && (
                <Chip
                  label="CRÍTICO"
                  size="small"
                  color="error"
                  variant="outlined"
                  sx={{ fontSize: '0.6rem', height: 16 }}
                />
              )}
              {level === 'high' && (
                <Chip
                  label="ALTO"
                  size="small"
                  color="warning"
                  variant="outlined"
                  sx={{ fontSize: '0.6rem', height: 16 }}
                />
              )}
            </Box>

            {/* Technical name */}
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.7rem',
                opacity: 0.7
              }}
            >
              {permission.name}
            </Typography>
          </Box>
        </Box>

        {/* Switch and Status */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Restricted indicator */}
          {isRestricted && (
            <Tooltip title="Permiso restringido para tu rol">
              <Shield size={14} color="#f57c00" />
            </Tooltip>
          )}

          {/* Critical permission warning */}
          {level === 'critical' && isSelected && (
            <Tooltip title="Permiso crítico del sistema">
              <AlertCircle size={14} color="#d32f2f" />
            </Tooltip>
          )}

          {/* Switch */}
          <FormControlLabel
            control={
              <Switch
                checked={isSelected}
                onChange={(e) => handleToggle(e.target.checked)}
                disabled={isEffectivelyDisabled}
                color={switchColor}
                size="small"
              />
            }
            label=""
            sx={{ m: 0 }}
          />
        </Box>
      </Box>
    </Tooltip>
  );
};

export default PermissionSwitch;