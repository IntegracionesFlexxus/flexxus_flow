/**
 * RoleDialog Component - Sprint 3
 * Diálogo para crear y editar roles
 * Implementación con principios SOLID y Clean Code
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  FormControlLabel,
  Checkbox,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Paper,
  Collapse,
  IconButton,
  InputAdornment,
  Stack,
  Divider,
  Grid,
  Switch,
  Tooltip,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import {
  Shield,
  ChevronRight,
  ChevronDown,
  Search,
  AlertCircle,
  Save,
  Key,
  Eye,
  Edit,
  Trash2,
  Plus,
  Users,
  Building,
  Settings,
  Database,
  FileText,
  Bell,
  BarChart3
} from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useMutation, useQuery } from '@tanstack/react-query';

// Services
import { roleService } from '@/modules/users/services/roleService';

// Hooks
import { useUIStore } from '@/shared/store/uiStore';
import { useAuthStore } from '@/shared/store/authStore';

// Types
import type { Role, Permission } from '@/modules/users/types';

interface RoleDialogProps {
  open: boolean;
  role: Role | null;
  onClose: () => void;
  onSave: (role: Role) => void;
}

interface RoleFormData {
  name: string;
  description: string;
  permissions: string[];
  isActive: boolean;
}

interface PermissionGroup {
  module: string;
  permissions: Permission[];
}

// Validation schema
const roleSchema = yup.object({
  name: yup
    .string()
    .required('El nombre del rol es requerido')
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(50, 'El nombre no puede exceder 50 caracteres'),
  description: yup
    .string()
    .required('La descripción es requerida')
    .min(10, 'La descripción debe tener al menos 10 caracteres')
    .max(200, 'La descripción no puede exceder 200 caracteres'),
  permissions: yup
    .array()
    .of(yup.string())
    .min(1, 'Debes seleccionar al menos un permiso'),
  isActive: yup.boolean()
});

/**
 * RoleDialog Component
 * Principios aplicados:
 * - S: Responsabilidad única de gestión de formulario de rol
 * - O: Abierto para extensión con nuevos tipos de permisos
 * - I: Interface segregation con formularios paso a paso
 */
export const RoleDialog: React.FC<RoleDialogProps> = ({
  open,
  role,
  onClose,
  onSave
}) => {
  // State
  const [activeStep, setActiveStep] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState(false);

  // Hooks
  const { addNotification } = useUIStore();
  const { currentCompany } = useAuthStore();

  // Form
  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset
  } = useForm<RoleFormData>({
    resolver: yupResolver(roleSchema),
    defaultValues: {
      name: '',
      description: '',
      permissions: [],
      isActive: true
    },
    mode: 'onChange'
  });

  const selectedPermissions = watch('permissions');
  const formData = watch();

  // ==================== Data Fetching ====================

  /**
   * Fetch all available permissions
   */
  const { data: allPermissions = [] } = useQuery({
    queryKey: ['all-permissions'],
    queryFn: () => roleService.getAllPermissions(),
    enabled: open,
    select: (data) => Array.isArray(data) ? data : []
  });

  /**
   * Check if role name is available
   */
  const checkNameMutation = useMutation({
    mutationFn: (name: string) => 
      roleService.validateRoleName(name, currentCompany?.id),
    onError: () => {
      // Silent fail - will be handled in validation
    }
  });

  // ==================== Mutations ====================

  /**
   * Create role mutation
   */
  const createRoleMutation = useMutation({
    mutationFn: (data: RoleFormData) => {
      if (!currentCompany?.id) {
        throw new Error('No se ha seleccionado una empresa');
      }
      
      return roleService.createRole(currentCompany.id, {
        name: data.name,
        description: data.description,
        permissions: data.permissions
      });
    },
    onSuccess: (newRole) => {
      addNotification({
        type: 'success',
        title: 'Rol creado',
        message: `El rol "${newRole.name}" ha sido creado correctamente`,
        autoClose: true
      });
      onSave(newRole);
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Error al crear rol',
        message: error.message || 'No se pudo crear el rol',
        autoClose: false
      });
    }
  });

  /**
   * Update role mutation
   */
  const updateRoleMutation = useMutation({
    mutationFn: (data: RoleFormData) => {
      if (!role?.id) {
        throw new Error('No se ha seleccionado un rol');
      }
      
      return roleService.updateRole(role.id, {
        name: data.name,
        description: data.description,
        permissions: data.permissions
      });
    },
    onSuccess: (updatedRole) => {
      addNotification({
        type: 'success',
        title: 'Rol actualizado',
        message: `El rol "${updatedRole.name}" ha sido actualizado correctamente`,
        autoClose: true
      });
      onSave(updatedRole);
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Error al actualizar rol',
        message: error.message || 'No se pudo actualizar el rol',
        autoClose: false
      });
    }
  });

  // ==================== Effects ====================

  /**
   * Initialize form when role changes
   */
  useEffect(() => {
    if (role && open) {
      reset({
        name: role.name,
        description: role.description || '',
        permissions: role.permissions.map(p => p.id),
        isActive: role.isActive !== false
      });
    } else if (open) {
      reset({
        name: '',
        description: '',
        permissions: [],
        isActive: true
      });
    }
    setActiveStep(0);
    setPreviewMode(false);
  }, [role, open, reset]);

  // ==================== Computed Values ====================

  /**
   * Group permissions by module
   */
  const permissionGroups = useMemo<PermissionGroup[]>(() => {
    if (!Array.isArray(allPermissions)) {
      console.warn('allPermissions is not an array:', allPermissions);
      return [];
    }
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
   * Filter permissions based on search
   */
  const filteredGroups = useMemo(() => {
    if (!searchTerm) return permissionGroups;

    return permissionGroups.map(group => ({
      ...group,
      permissions: group.permissions.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })).filter(group => group.permissions.length > 0);
  }, [permissionGroups, searchTerm]);

  /**
   * Calculate permission statistics
   */
  const permissionStats = useMemo(() => {
    const safePermissions = Array.isArray(allPermissions) ? allPermissions : [];
    const total = safePermissions.length;
    const selected = selectedPermissions.length;
    const percentage = total > 0 ? Math.round((selected / total) * 100) : 0;
    
    const byModule = permissionGroups.reduce((acc, group) => {
      const moduleSelected = group.permissions.filter(p => 
        selectedPermissions.includes(p.id)
      ).length;
      acc[group.module] = {
        total: group.permissions.length,
        selected: moduleSelected
      };
      return acc;
    }, {} as Record<string, { total: number; selected: number }>);

    return {
      total,
      selected,
      percentage,
      byModule
    };
  }, [allPermissions, selectedPermissions, permissionGroups]);

  // ==================== Handlers ====================

  /**
   * Handle step navigation
   */
  const handleNext = () => {
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  /**
   * Handle permission selection
   */
  const handlePermissionToggle = useCallback((permissionId: string) => {
    setValue('permissions', 
      selectedPermissions.includes(permissionId)
        ? selectedPermissions.filter(id => id !== permissionId)
        : [...selectedPermissions, permissionId],
      { shouldValidate: true }
    );
  }, [selectedPermissions, setValue]);

  /**
   * Handle select all in module
   */
  const handleSelectAllInModule = useCallback((module: string, permissions: Permission[]) => {
    const modulePermissionIds = permissions.map(p => p.id);
    const allSelected = modulePermissionIds.every(id => selectedPermissions.includes(id));

    if (allSelected) {
      // Deselect all
      setValue('permissions',
        selectedPermissions.filter(id => !modulePermissionIds.includes(id)),
        { shouldValidate: true }
      );
    } else {
      // Select all
      const newSelection = new Set([...selectedPermissions, ...modulePermissionIds]);
      setValue('permissions', Array.from(newSelection), { shouldValidate: true });
    }
  }, [selectedPermissions, setValue]);

  /**
   * Handle module expand/collapse
   */
  const handleToggleModule = useCallback((module: string) => {
    setExpandedModules(prev =>
      prev.includes(module)
        ? prev.filter(m => m !== module)
        : [...prev, module]
    );
  }, []);

  /**
   * Handle form submission
   */
  const onSubmit = handleSubmit((data) => {
    if (previewMode) {
      // Final submission
      if (role) {
        updateRoleMutation.mutate(data);
      } else {
        createRoleMutation.mutate(data);
      }
    } else {
      // Move to preview
      setPreviewMode(true);
    }
  });

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

  // ==================== Render Functions ====================

  /**
   * Render permission item
   */
  const renderPermissionItem = (permission: Permission) => {
    const isSelected = selectedPermissions.includes(permission.id);

    return (
      <ListItem
        key={permission.id}
        dense
        button
        onClick={() => handlePermissionToggle(permission.id)}
        sx={{ pl: 4 }}
      >
        <ListItemIcon sx={{ minWidth: 36 }}>
          <Checkbox
            edge="start"
            checked={isSelected}
            tabIndex={-1}
            size="small"
          />
        </ListItemIcon>
        
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {getActionIcon(permission.name)}
              <Typography variant="body2">
                {permission.displayName}
              </Typography>
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
    const stats = permissionStats.byModule[group.module];
    const allSelected = stats?.selected === stats?.total;
    const someSelected = stats?.selected > 0 && stats?.selected < stats?.total;

    return (
      <Paper key={group.module} elevation={0} sx={{ mb: 2, border: 1, borderColor: 'divider' }}>
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'background.default',
            cursor: 'pointer'
          }}
          onClick={() => handleToggleModule(group.module)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <IconButton size="small" sx={{ p: 0 }}>
              {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </IconButton>
            
            {getModuleIcon(group.module)}
            
            <Box>
              <Typography variant="subtitle2" fontWeight={600}>
                {group.module}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {stats?.selected || 0} de {stats?.total || 0} seleccionados
              </Typography>
            </Box>
          </Box>

          <Checkbox
            checked={allSelected}
            indeterminate={someSelected}
            onChange={(e) => {
              e.stopPropagation();
              handleSelectAllInModule(group.module, group.permissions);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </Box>

        <Collapse in={isExpanded}>
          <List disablePadding>
            {group.permissions.map(renderPermissionItem)}
          </List>
        </Collapse>
      </Paper>
    );
  };

  const isLoading = createRoleMutation.isPending || updateRoleMutation.isPending;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { height: '90vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Shield size={24} />
          <Typography variant="h6">
            {role ? 'Editar Rol' : 'Crear Nuevo Rol'}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {!previewMode ? (
          <Stepper activeStep={activeStep} orientation="vertical">
            {/* Step 1: Basic Information */}
            <Step>
              <StepLabel>
                <Typography variant="subtitle1">Información Básica</Typography>
              </StepLabel>
              <StepContent>
                <Box sx={{ py: 2 }}>
                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <Controller
                        name="name"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Nombre del Rol"
                            fullWidth
                            required
                            error={!!errors.name}
                            helperText={errors.name?.message || 'Ej: Administrador de Ventas'}
                            onBlur={async (e) => {
                              field.onBlur();
                              if (e.target.value && (!role || e.target.value !== role.name)) {
                                const isAvailable = await checkNameMutation.mutateAsync(e.target.value);
                                if (!isAvailable) {
                                  // Set custom error
                                }
                              }
                            }}
                          />
                        )}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Controller
                        name="description"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Descripción"
                            fullWidth
                            required
                            multiline
                            rows={3}
                            error={!!errors.description}
                            helperText={errors.description?.message || 'Describe las responsabilidades de este rol'}
                          />
                        )}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Controller
                        name="isActive"
                        control={control}
                        render={({ field }) => (
                          <FormControlLabel
                            control={
                              <Switch
                                {...field}
                                checked={field.value}
                              />
                            }
                            label="Rol activo"
                          />
                        )}
                      />
                    </Grid>
                  </Grid>

                  <Box sx={{ mt: 3 }}>
                    <Button
                      variant="contained"
                      onClick={handleNext}
                      disabled={!formData.name || !formData.description}
                    >
                      Continuar
                    </Button>
                  </Box>
                </Box>
              </StepContent>
            </Step>

            {/* Step 2: Permissions */}
            <Step>
              <StepLabel>
                <Typography variant="subtitle1">Permisos</Typography>
              </StepLabel>
              <StepContent>
                <Box sx={{ py: 2 }}>
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

                  {/* Permission stats */}
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      {permissionStats.selected} de {permissionStats.total} permisos seleccionados
                      ({permissionStats.percentage}%)
                    </Typography>
                  </Alert>

                  {/* Permissions list */}
                  <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                    {filteredGroups.map(renderModuleSection)}
                  </Box>

                  {/* Navigation */}
                  <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                    <Button onClick={handleBack}>
                      Atrás
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleNext}
                      disabled={selectedPermissions.length === 0}
                    >
                      Continuar
                    </Button>
                  </Box>
                </Box>
              </StepContent>
            </Step>

            {/* Step 3: Review */}
            <Step>
              <StepLabel>
                <Typography variant="subtitle1">Revisar y Confirmar</Typography>
              </StepLabel>
              <StepContent>
                <Box sx={{ py: 2 }}>
                  <Alert severity="success" sx={{ mb: 3 }}>
                    <Typography variant="body2">
                      ¡Todo listo! Revisa la información antes de guardar.
                    </Typography>
                  </Alert>

                  <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default', mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Información del Rol
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Stack spacing={1}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Nombre:
                        </Typography>
                        <Typography variant="body2">
                          {formData.name}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Descripción:
                        </Typography>
                        <Typography variant="body2">
                          {formData.description}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Estado:
                        </Typography>
                        <Chip
                          label={formData.isActive ? 'Activo' : 'Inactivo'}
                          size="small"
                          color={formData.isActive ? 'success' : 'default'}
                        />
                      </Box>
                    </Stack>
                  </Paper>

                  <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Permisos Asignados ({selectedPermissions.length})
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {selectedPermissions.map(permId => {
                        const permission = Array.isArray(allPermissions) ? allPermissions.find(p => p.id === permId) : null;
                        return permission ? (
                          <Chip
                            key={permission.id}
                            label={permission.displayName}
                            size="small"
                            variant="outlined"
                          />
                        ) : null;
                      })}
                    </Box>
                  </Paper>

                  <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                    <Button onClick={handleBack}>
                      Atrás
                    </Button>
                    <Button
                      variant="contained"
                      onClick={() => setPreviewMode(true)}
                    >
                      Revisar
                    </Button>
                  </Box>
                </Box>
              </StepContent>
            </Step>
          </Stepper>
        ) : (
          // Preview Mode
          <Box sx={{ py: 2 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                Revisa toda la información antes de guardar. Puedes volver atrás para hacer cambios.
              </Typography>
            </Alert>

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.default' }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Shield size={20} />
                    {formData.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {formData.description}
                  </Typography>
                  <Chip
                    label={formData.isActive ? 'Activo' : 'Inactivo'}
                    color={formData.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.default' }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Resumen de Permisos
                  </Typography>
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    {Object.entries(permissionStats.byModule).map(([module, stats]) => (
                      <Grid item xs={6} md={4} key={module}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getModuleIcon(module)}
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              {module}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {stats.selected} / {stats.total} permisos
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.default' }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Todos los Permisos ({selectedPermissions.length})
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                    {selectedPermissions.map(permId => {
                      const permission = allPermissions.find(p => p.id === permId);
                      return permission ? (
                        <Chip
                          key={permission.id}
                          icon={getActionIcon(permission.name)}
                          label={permission.displayName}
                          size="small"
                          variant="outlined"
                        />
                      ) : null;
                    })}
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2.5 }}>
        {previewMode ? (
          <>
            <Button onClick={() => setPreviewMode(false)} disabled={isLoading}>
              Volver a Editar
            </Button>
            <LoadingButton
              variant="contained"
              onClick={onSubmit}
              loading={isLoading}
              loadingPosition="start"
              startIcon={<Save size={18} />}
            >
              {role ? 'Actualizar Rol' : 'Crear Rol'}
            </LoadingButton>
          </>
        ) : (
          <Button onClick={onClose}>
            Cancelar
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

// Export with memo for performance
export default React.memo(RoleDialog);