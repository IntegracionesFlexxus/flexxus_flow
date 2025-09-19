/**
 * PermissionModuleGroup - MVP Component
 * Grupo de permisos por módulo con switch principal
 * Implementación simple y robusta
 */

import React, { useMemo } from 'react';
import {
  Paper,
  Box,
  Typography,
  Switch,
  Collapse,
  IconButton,
  Chip,
  Stack,
  FormControlLabel,
  Tooltip,
  Divider
} from '@mui/material';
import {
  ChevronDown,
  ChevronRight,
  Shield,
  Users,
  Building,
  Settings,
  BarChart3,
  Database,
  Key
} from 'lucide-react';

// Types
import type { Permission } from '@/modules/users/types';

// Sub-components
import { PermissionSwitch } from './PermissionSwitch';

interface PermissionGroup {
  module: string;
  displayName: string;
  permissions: Permission[];
}

interface PermissionModuleGroupProps {
  group: PermissionGroup;
  selectedPermissions: string[];
  onPermissionToggle: (permissionId: string, enabled: boolean) => void;
  onModuleToggle: (group: PermissionGroup, enabled: boolean) => void;
  canAssignPermission: (permission: Permission) => boolean;
  disabled?: boolean;
}

/**
 * Mapeo de módulos a iconos
 */
const getModuleIcon = (module: string) => {
  const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
    'users': Users,
    'roles': Shield,
    'companies': Building,
    'system': Settings,
    'analytics': BarChart3,
    'database': Database,
    'admin': Key,
    'general': Settings
  };

  const IconComponent = iconMap[module.toLowerCase()] || Settings;
  return <IconComponent size={20} />;
};

/**
 * Componente de grupo de permisos por módulo
 */
export const PermissionModuleGroup: React.FC<PermissionModuleGroupProps> = ({
  group,
  selectedPermissions,
  onPermissionToggle,
  onModuleToggle,
  canAssignPermission,
  disabled = false
}) => {
  const [isExpanded, setIsExpanded] = React.useState(true);

  // Calculate module statistics
  const stats = useMemo(() => {
    const total = group.permissions.length;
    const selected = group.permissions.filter(p => selectedPermissions.includes(p.id)).length;
    const assignable = group.permissions.filter(p => canAssignPermission(p)).length;
    const restricted = total - assignable;
    const isAllSelected = selected === total && total > 0;
    const isSomeSelected = selected > 0 && selected < total;

    return {
      total,
      selected,
      assignable,
      restricted,
      isAllSelected,
      isSomeSelected,
      hasRestrictions: restricted > 0
    };
  }, [group.permissions, selectedPermissions, canAssignPermission]);

  // Handle module master switch
  const handleModuleSwitch = (checked: boolean) => {
    onModuleToggle(group, checked);
  };

  // Toggle expanded state
  const handleToggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <Paper
      elevation={0}
      sx={{
        border: 1,
        borderColor: 'divider',
        borderLeft: stats.hasRestrictions ? '4px solid' : 'none',
        borderLeftColor: stats.hasRestrictions ? 'warning.light' : 'transparent'
      }}
    >
      {/* Module Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'background.default',
          cursor: 'pointer'
        }}
        onClick={handleToggleExpanded}
      >
        {/* Left side - Module info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
          <IconButton
            size="small"
            sx={{ p: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              handleToggleExpanded();
            }}
          >
            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </IconButton>

          {getModuleIcon(group.module)}

          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                {group.displayName}
              </Typography>
              {stats.hasRestrictions && (
                <Chip
                  label={`${stats.restricted} restringidos`}
                  size="small"
                  variant="outlined"
                  color="warning"
                  sx={{ fontSize: '0.65rem', height: 16 }}
                />
              )}
            </Box>
            <Typography variant="caption" color="text.secondary">
              {stats.selected} de {stats.total} seleccionados
              {stats.hasRestrictions && ` (${stats.assignable} disponibles)`}
            </Typography>
          </Box>
        </Box>

        {/* Right side - Master switch */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip
            title={
              stats.hasRestrictions
                ? `Solo puedes gestionar ${stats.assignable} de ${stats.total} permisos`
                : stats.isAllSelected
                ? 'Desactivar todos los permisos del módulo'
                : 'Activar todos los permisos del módulo'
            }
          >
            <FormControlLabel
              control={
                <Switch
                  checked={stats.isAllSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleModuleSwitch(e.target.checked);
                  }}
                  disabled={disabled || stats.assignable === 0}
                  color={stats.hasRestrictions ? 'warning' : 'primary'}
                />
              }
              label=""
              sx={{ m: 0 }}
              onClick={(e) => e.stopPropagation()}
            />
          </Tooltip>
        </Box>
      </Box>

      {/* Permissions List */}
      <Collapse in={isExpanded}>
        <Divider />
        <Box sx={{ p: 2 }}>
          <Stack spacing={1}>
            {group.permissions.map(permission => (
              <PermissionSwitch
                key={permission.id}
                permission={permission}
                isSelected={selectedPermissions.includes(permission.id)}
                onToggle={onPermissionToggle}
                canAssign={canAssignPermission(permission)}
                disabled={disabled}
              />
            ))}
          </Stack>

          {/* Module summary */}
          {stats.hasRestrictions && (
            <Box sx={{ mt: 2, p: 1.5, bgcolor: 'warning.50', borderRadius: 1 }}>
              <Typography variant="caption" color="warning.dark">
                ⚠️ {stats.restricted} permiso(s) restringido(s) según tu nivel de acceso
              </Typography>
            </Box>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
};

export default PermissionModuleGroup;