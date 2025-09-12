/**
 * User Invite Dialog Component - Sprint 3
 * Diálogo para invitar usuarios con validación y opciones avanzadas
 * Siguiendo principios SOLID y Clean Code
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  Typography,
  Alert,
  Chip,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  IconButton,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Switch,
  FormControlLabel,
  CircularProgress
} from '@mui/material';
import {
  X,
  UserPlus,
  Mail,
  AlertCircle,
  Plus,
  Trash2,
  Upload,
  Users
} from 'lucide-react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

// Services & Stores
import { invitationService } from '@modules/users/services/invitationService';
import { roleService } from '@modules/users/services/roleService';
import { useUIStore } from '@/shared/store/uiStore';

// Types
import type { 
  InviteUserRequest, 
  BulkInviteRequest, 
  Role 
} from '@modules/users/types';

interface UserInviteDialogProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
}

// Validation schemas (Clean Code: validación centralizada)
const singleInviteSchema = yup.object({
  email: yup
    .string()
    .required('El email es requerido')
    .email('Debe ser un email válido'),
  roleId: yup
    .string()
    .required('El rol es requerido'),
  personalMessage: yup
    .string()
    .max(500, 'El mensaje no puede exceder 500 caracteres'),
  sendWelcomeEmail: yup.boolean(),
  expirationDays: yup
    .number()
    .min(1, 'Mínimo 1 día')
    .max(30, 'Máximo 30 días')
});

const bulkInviteSchema = yup.object({
  invitations: yup.array().of(
    yup.object({
      email: yup
        .string()
        .required('El email es requerido')
        .email('Debe ser un email válido'),
      roleId: yup.string()
    })
  ).min(1, 'Debe agregar al menos una invitación'),
  defaultRoleId: yup.string(),
  expirationDays: yup
    .number()
    .min(1, 'Mínimo 1 día')
    .max(30, 'Máximo 30 días')
});

type SingleInviteForm = yup.InferType<typeof singleInviteSchema>;
type BulkInviteForm = yup.InferType<typeof bulkInviteSchema>;

/**
 * UserInviteDialog Component
 * Patrón Factory para diferentes modos de invitación
 */
export const UserInviteDialog: React.FC<UserInviteDialogProps> = ({
  open,
  onClose,
  companyId
}) => {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [csvEmails, setCsvEmails] = useState<string[]>([]);
  
  const { addNotification } = useUIStore();
  const queryClient = useQueryClient();

  // Fetch available roles
  const { data: roles = [], isLoading: isLoadingRoles } = useQuery({
    queryKey: ['roles', companyId],
    queryFn: () => roleService.getCompanyRoles(companyId),
    enabled: open && !!companyId
  });

  // Single invite form
  const singleForm = useForm<SingleInviteForm>({
    resolver: yupResolver(singleInviteSchema),
    defaultValues: {
      email: '',
      roleId: '',
      personalMessage: '',
      sendWelcomeEmail: true,
      expirationDays: 7
    }
  });

  // Bulk invite form with field array
  const bulkForm = useForm<BulkInviteForm>({
    resolver: yupResolver(bulkInviteSchema),
    defaultValues: {
      invitations: [{ email: '', roleId: '' }],
      defaultRoleId: '',
      expirationDays: 7
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: bulkForm.control,
    name: 'invitations'
  });

  // Mutations
  const inviteSingleMutation = useMutation({
    mutationFn: (data: InviteUserRequest) => 
      invitationService.inviteUser(companyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations', companyId] });
      addNotification({
        type: 'success',
        title: 'Invitación enviada',
        message: 'La invitación ha sido enviada exitosamente'
      });
      handleClose();
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Error al enviar invitación',
        message: error.response?.data?.message || 'Ocurrió un error inesperado'
      });
    }
  });

  const inviteBulkMutation = useMutation({
    mutationFn: (data: BulkInviteRequest) => 
      invitationService.bulkInvite(companyId, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['invitations', companyId] });
      
      const { successful, failed } = response;
      
      if (successful.length > 0) {
        addNotification({
          type: 'success',
          title: 'Invitaciones enviadas',
          message: `${successful.length} invitación(es) enviada(s) exitosamente`
        });
      }
      
      if (failed.length > 0) {
        addNotification({
          type: 'warning',
          title: 'Algunas invitaciones fallaron',
          message: `${failed.length} invitación(es) no pudieron ser enviadas`
        });
      }
      
      if (successful.length > 0) {
        handleClose();
      }
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Error al enviar invitaciones',
        message: error.response?.data?.message || 'Ocurrió un error inesperado'
      });
    }
  });

  // Handlers
  const handleClose = useCallback(() => {
    singleForm.reset();
    bulkForm.reset();
    setCsvEmails([]);
    setMode('single');
    onClose();
  }, [singleForm, bulkForm, onClose]);

  const handleSingleSubmit = useCallback((data: SingleInviteForm) => {
    const request: InviteUserRequest = {
      email: data.email.toLowerCase().trim(),
      roleId: data.roleId,
      personalMessage: data.personalMessage || undefined,
      expirationDays: data.expirationDays
    };
    inviteSingleMutation.mutate(request);
  }, [inviteSingleMutation]);

  const handleBulkSubmit = useCallback((data: BulkInviteForm) => {
    const request: BulkInviteRequest = {
      invitations: data.invitations.map(inv => ({
        email: inv.email.toLowerCase().trim(),
        roleId: inv.roleId || data.defaultRoleId || '',
        personalMessage: undefined
      })),
      defaultRoleId: data.defaultRoleId,
      expirationDays: data.expirationDays
    };
    inviteBulkMutation.mutate(request);
  }, [inviteBulkMutation]);

  const handleAddBulkEmail = useCallback(() => {
    append({ email: '', roleId: '' });
  }, [append]);

  const handleRemoveBulkEmail = useCallback((index: number) => {
    remove(index);
  }, [remove]);

  const handleCsvUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const emails = text
        .split(/[\n,;]/)
        .map(email => email.trim())
        .filter(email => email && email.includes('@'));
      
      setCsvEmails(emails);
      
      // Auto-fill bulk form
      bulkForm.setValue('invitations', emails.map(email => ({ 
        email, 
        roleId: '' 
      })));
      
      addNotification({
        type: 'info',
        title: 'CSV cargado',
        message: `Se encontraron ${emails.length} emails válidos`
      });
    };
    reader.readAsText(file);
  }, [bulkForm, addNotification]);

  // Memoized values
  const isSubmitting = inviteSingleMutation.isLoading || inviteBulkMutation.isLoading;
  
  const availableRoles = useMemo(() => 
    roles.filter(role => !role.isSystemRole || role.name !== 'super_admin'),
    [roles]
  );

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: 400 }
      }}
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1}>
            <UserPlus />
            <Typography variant="h6">Invitar Usuarios</Typography>
          </Stack>
          <IconButton size="small" onClick={handleClose}>
            <X />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Tabs 
          value={mode} 
          onChange={(_, v) => setMode(v)}
          sx={{ mb: 3 }}
        >
          <Tab value="single" label="Invitación Individual" />
          <Tab value="bulk" label="Invitación Múltiple" />
        </Tabs>

        {mode === 'single' ? (
          <Box component="form" onSubmit={singleForm.handleSubmit(handleSingleSubmit)}>
            <Stack spacing={3}>
              <Alert severity="info" icon={<Mail />}>
                Se enviará un email de invitación al usuario con un enlace para 
                completar su registro y unirse a la empresa.
              </Alert>

              <Controller
                name="email"
                control={singleForm.control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Email del usuario"
                    type="email"
                    fullWidth
                    required
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    placeholder="usuario@ejemplo.com"
                    autoComplete="off"
                  />
                )}
              />

              <Controller
                name="roleId"
                control={singleForm.control}
                render={({ field, fieldState }) => (
                  <FormControl fullWidth error={!!fieldState.error} required>
                    <InputLabel>Rol</InputLabel>
                    <Select {...field} label="Rol">
                      {availableRoles.map(role => (
                        <MenuItem key={role.id} value={role.id}>
                          <Stack>
                            <Typography variant="body2">{role.name}</Typography>
                            {role.description && (
                              <Typography variant="caption" color="text.secondary">
                                {role.description}
                              </Typography>
                            )}
                          </Stack>
                        </MenuItem>
                      ))}
                    </Select>
                    {fieldState.error && (
                      <FormHelperText>{fieldState.error.message}</FormHelperText>
                    )}
                  </FormControl>
                )}
              />

              <Controller
                name="personalMessage"
                control={singleForm.control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Mensaje personalizado (opcional)"
                    multiline
                    rows={3}
                    fullWidth
                    error={!!fieldState.error}
                    helperText={
                      fieldState.error?.message || 
                      `${field.value?.length || 0}/500 caracteres`
                    }
                    placeholder="Añade un mensaje personal para el usuario invitado..."
                  />
                )}
              />

              <Stack direction="row" spacing={2}>
                <Controller
                  name="expirationDays"
                  control={singleForm.control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="Días de validez"
                      type="number"
                      InputProps={{ inputProps: { min: 1, max: 30 } }}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      sx={{ width: 150 }}
                    />
                  )}
                />

                <Controller
                  name="sendWelcomeEmail"
                  control={singleForm.control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch {...field} checked={field.value} />}
                      label="Enviar email de bienvenida"
                    />
                  )}
                />
              </Stack>
            </Stack>
          </Box>
        ) : (
          <Box component="form" onSubmit={bulkForm.handleSubmit(handleBulkSubmit)}>
            <Stack spacing={3}>
              <Alert severity="info" icon={<Users />}>
                Puedes invitar múltiples usuarios a la vez. Cada uno recibirá 
                un email de invitación personalizado.
              </Alert>

              <Stack direction="row" spacing={2} alignItems="center">
                <Button
                  variant="outlined"
                  startIcon={<Upload />}
                  component="label"
                >
                  Cargar CSV
                  <input
                    type="file"
                    accept=".csv,.txt"
                    hidden
                    onChange={handleCsvUpload}
                  />
                </Button>
                
                <Typography variant="caption" color="text.secondary">
                  Formato: un email por línea o separados por comas
                </Typography>
              </Stack>

              {csvEmails.length > 0 && (
                <Alert severity="success">
                  {csvEmails.length} emails cargados desde CSV
                </Alert>
              )}

              <Controller
                name="defaultRoleId"
                control={bulkForm.control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Rol por defecto</InputLabel>
                    <Select {...field} label="Rol por defecto">
                      <MenuItem value="">
                        <em>Seleccionar individualmente</em>
                      </MenuItem>
                      {availableRoles.map(role => (
                        <MenuItem key={role.id} value={role.id}>
                          {role.name}
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>
                      Aplicar este rol a todas las invitaciones
                    </FormHelperText>
                  </FormControl>
                )}
              />

              <Divider />

              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="subtitle1">
                    Usuarios a invitar ({fields.length})
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<Plus />}
                    onClick={handleAddBulkEmail}
                  >
                    Agregar
                  </Button>
                </Stack>

                <List sx={{ maxHeight: 250, overflow: 'auto' }}>
                  {fields.map((field, index) => (
                    <ListItem key={field.id} divider>
                      <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
                        <Controller
                          name={`invitations.${index}.email`}
                          control={bulkForm.control}
                          render={({ field: emailField, fieldState }) => (
                            <TextField
                              {...emailField}
                              size="small"
                              placeholder="Email"
                              error={!!fieldState.error}
                              helperText={fieldState.error?.message}
                              sx={{ flexGrow: 1 }}
                            />
                          )}
                        />
                        
                        {!bulkForm.watch('defaultRoleId') && (
                          <Controller
                            name={`invitations.${index}.roleId`}
                            control={bulkForm.control}
                            render={({ field: roleField }) => (
                              <FormControl size="small" sx={{ minWidth: 150 }}>
                                <Select {...roleField} displayEmpty>
                                  <MenuItem value="">
                                    <em>Seleccionar rol</em>
                                  </MenuItem>
                                  {availableRoles.map(role => (
                                    <MenuItem key={role.id} value={role.id}>
                                      {role.name}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            )}
                          />
                        )}
                      </Stack>
                      
                      <ListItemSecondaryAction>
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveBulkEmail(index)}
                          disabled={fields.length === 1}
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </Box>

              <Controller
                name="expirationDays"
                control={bulkForm.control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Días de validez para todas las invitaciones"
                    type="number"
                    InputProps={{ inputProps: { min: 1, max: 30 } }}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    fullWidth
                  />
                )}
              />
            </Stack>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={
            mode === 'single' 
              ? singleForm.handleSubmit(handleSingleSubmit)
              : bulkForm.handleSubmit(handleBulkSubmit)
          }
          disabled={isSubmitting || isLoadingRoles}
          startIcon={isSubmitting ? <CircularProgress size={16} /> : <Mail />}
        >
          {isSubmitting ? 'Enviando...' : 'Enviar Invitación(es)'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};