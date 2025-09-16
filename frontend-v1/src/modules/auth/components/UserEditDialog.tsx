/**
 * UserEditDialog Component - Sprint 3
 * Siguiendo lineamientos nivel 2: Componente para editar usuarios
 * SOLID: SRP (solo maneja edición de usuarios), Clean Code (funciones cortas y descriptivas)
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  IconButton,
  Grid,
  Divider,
  Alert,
  Tabs,
  Tab,
  Badge,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  FormHelperText
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import {
  Save,
  User as UserIcon,
  Shield,
  Camera,
  Key,
  Activity,
  Settings,
  X
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';

// Services
import { userService, User, UpdateUserData } from '@modules/auth/services/userService';
import { roleService, Role } from '@modules/auth/services/roleService';

// Hooks
import { useUIStore } from '@/shared/store/uiStore';

interface UserEditDialogProps {
  open: boolean;
  user: User | null;
  onClose: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

const validationSchema = Yup.object({
  firstName: Yup.string()
    .min(2, 'Mínimo 2 caracteres')
    .required('Nombre es requerido'),
  lastName: Yup.string()
    .min(2, 'Mínimo 2 caracteres')
    .required('Apellido es requerido'),
  email: Yup.string()
    .email('Email inválido')
    .required('Email es requerido'),
  roleId: Yup.string()
    .required('Rol es requerido'),
  status: Yup.string()
    .required('Estado es requerido'),
  department: Yup.string(),
  position: Yup.string(),
  phoneNumber: Yup.string()
});

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  roleId: string;
  status: string;
  department: string;
  position: string;
  phoneNumber: string;
}

export const UserEditDialog: React.FC<UserEditDialogProps> = ({
  open,
  user,
  onClose
}) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  const { addNotification } = useUIStore();
  const queryClient = useQueryClient();

  // Fetch roles
  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => roleService.getRoles(),
    enabled: open
  });

  // Fetch user activity
  const { data: userActivity = [] } = useQuery({
    queryKey: ['user-activity', user?.id],
    queryFn: () => userService.getUserActivity(user!.id, 10),
    enabled: open && !!user?.id && selectedTab === 2
  });

  // Fetch user sessions
  const { data: userSessions = [] } = useQuery({
    queryKey: ['user-sessions', user?.id],
    queryFn: () => userService.getUserSessions(user!.id),
    enabled: open && !!user?.id && selectedTab === 2
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: (data: UpdateUserData) => 
      userService.updateUser(user!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      addNotification({
        type: 'success',
        title: 'Usuario actualizado',
        message: 'Los cambios se han guardado exitosamente',
        autoClose: true
      });
      handleClose();
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Error al actualizar',
        message: error.response?.data?.message || 'No se pudo actualizar el usuario',
        autoClose: true
      });
    }
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: () => userService.resetPassword(user!.id),
    onSuccess: (data) => {
      addNotification({
        type: 'success',
        title: 'Contraseña reseteada',
        message: `Nueva contraseña temporal: ${data.temporaryPassword}`,
        autoClose: false
      });
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'No se pudo resetear la contraseña',
        autoClose: true
      });
    }
  });

  // Terminate session mutation
  const terminateSessionMutation = useMutation({
    mutationFn: (sessionId: string) => 
      userService.terminateSession(user!.id, sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-sessions'] });
      addNotification({
        type: 'success',
        title: 'Sesión terminada',
        message: 'La sesión ha sido cerrada exitosamente',
        autoClose: true
      });
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'No se pudo terminar la sesión',
        autoClose: true
      });
    }
  });

  // Upload avatar mutation
  const uploadAvatarMutation = useMutation({
    mutationFn: (file: File) => userService.uploadAvatar(user!.id, file),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      addNotification({
        type: 'success',
        title: 'Avatar actualizado',
        message: 'La imagen se ha cargado exitosamente',
        autoClose: true
      });
      setAvatarFile(null);
      setAvatarPreview(null);
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'No se pudo cargar la imagen',
        autoClose: true
      });
    }
  });

  // React Hook Form setup
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
    setValue
  } = useForm<FormData>({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      roleId: '',
      status: 'active',
      department: '',
      position: '',
      phoneNumber: ''
    }
  });

  const onSubmit = async (values: FormData) => {
    // Update user data
    await updateUserMutation.mutateAsync({
      firstName: values.firstName,
      lastName: values.lastName,
      roleId: values.roleId,
      status: values.status,
      department: values.department || undefined,
      position: values.position || undefined,
      phoneNumber: values.phoneNumber || undefined
    });

    // Upload avatar if changed
    if (avatarFile) {
      await uploadAvatarMutation.mutateAsync(avatarFile);
    }
  };

  useEffect(() => {
    if (user && open) {
      setValue('firstName', user.firstName || '');
      setValue('lastName', user.lastName || '');
      setValue('email', user.email || '');
      setValue('roleId', user.roleId || '');
      setValue('status', user.status || 'active');
      setValue('department', user.department || '');
      setValue('position', user.position || '');
      setValue('phoneNumber', user.phoneNumber || '');
    }
  }, [user, open, setValue]);

  const handleClose = () => {
    reset();
    setSelectedTab(0);
    setAvatarFile(null);
    setAvatarPreview(null);
    onClose();
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const renderBasicInfo = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Avatar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <Badge
          overlap="circular"
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          badgeContent={
            <IconButton
              component="label"
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': { bgcolor: 'primary.dark' }
              }}
              size="small"
            >
              <Camera size={16} />
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleAvatarChange}
              />
            </IconButton>
          }
        >
          <Avatar
            src={avatarPreview || user?.avatar}
            sx={{ width: 100, height: 100 }}
          >
            {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
          </Avatar>
        </Badge>
        
        <Box>
          <Typography variant="h6">
            {user?.firstName} {user?.lastName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user?.email}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            ID: {user?.id}
          </Typography>
        </Box>
      </Box>

      <Divider />

      {/* Basic fields */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Controller
            name="firstName"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Nombre"
                error={Boolean(errors.firstName)}
                helperText={errors.firstName?.message}
              />
            )}
          />
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <Controller
            name="lastName"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Apellido"
                error={Boolean(errors.lastName)}
                helperText={errors.lastName?.message}
              />
            )}
          />
        </Grid>
        
        <Grid item xs={12}>
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Email"
                disabled
                helperText="El email no puede ser modificado"
              />
            )}
          />
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <Controller
            name="department"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Departamento"
              />
            )}
          />
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <Controller
            name="position"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Cargo"
              />
            )}
          />
        </Grid>
        
        <Grid item xs={12}>
          <Controller
            name="phoneNumber"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Teléfono"
              />
            )}
          />
        </Grid>
      </Grid>
    </Box>
  );

  const renderSecuritySettings = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Role and Status */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Controller
            name="roleId"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth required error={Boolean(errors.roleId)}>
                <InputLabel>Rol</InputLabel>
                <Select {...field} label="Rol">
                  {roles.map((role) => (
                    <MenuItem key={role.id} value={role.id}>
                      <Box>
                        <Typography variant="body2">{role.displayName}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {role.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                {errors.roleId && (
                  <FormHelperText>{errors.roleId.message}</FormHelperText>
                )}
              </FormControl>
            )}
          />
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth required error={Boolean(errors.status)}>
                <InputLabel>Estado</InputLabel>
                <Select {...field} label="Estado">
                  <MenuItem value="active">Activo</MenuItem>
                  <MenuItem value="inactive">Inactivo</MenuItem>
                  <MenuItem value="suspended">Suspendido</MenuItem>
                  <MenuItem value="pending">Pendiente</MenuItem>
                </Select>
                {errors.status && (
                  <FormHelperText>{errors.status.message}</FormHelperText>
                )}
              </FormControl>
            )}
          />
        </Grid>
      </Grid>

      <Divider />

      {/* Security Actions */}
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Acciones de Seguridad
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <Alert severity="warning">
            Estas acciones afectarán inmediatamente el acceso del usuario al sistema.
          </Alert>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <LoadingButton
              variant="outlined"
              color="warning"
              startIcon={<Key size={20} />}
              loading={resetPasswordMutation.isPending}
              onClick={() => resetPasswordMutation.mutate()}
            >
              Resetear Contraseña
            </LoadingButton>
            
            <Button
              variant="outlined"
              color="error"
              onClick={() => {
                if (confirm('¿Estás seguro de que deseas terminar todas las sesiones?')) {
                  userService.terminateAllSessions(user!.id).then(() => {
                    queryClient.invalidateQueries({ queryKey: ['user-sessions'] });
                    addNotification({
                      type: 'success',
                      title: 'Sesiones terminadas',
                      message: 'Todas las sesiones han sido cerradas',
                      autoClose: true
                    });
                  });
                }
              }}
            >
              Cerrar Todas las Sesiones
            </Button>
          </Box>
        </Box>
      </Box>

      <Divider />

      {/* Account Info */}
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Información de la Cuenta
        </Typography>
        
        <List dense>
          <ListItem>
            <ListItemText
              primary="Creado"
              secondary={user?.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Último acceso"
              secondary={user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Nunca'}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Email verificado"
              secondary={user?.emailVerified ? 'Sí' : 'No'}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Teléfono verificado"
              secondary={user?.phoneVerified ? 'Sí' : 'No'}
            />
          </ListItem>
        </List>
      </Box>
    </Box>
  );

  const renderActivity = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Active Sessions */}
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Sesiones Activas
        </Typography>
        
        {userSessions.length === 0 ? (
          <Alert severity="info">No hay sesiones activas</Alert>
        ) : (
          <List>
            {userSessions.map((session) => (
              <ListItem key={session.id} divider>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {session.userAgent}
                      {session.isCurrentSession && (
                        <Chip label="Sesión actual" size="small" color="primary" />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="caption" display="block">
                        IP: {session.ipAddress} | Ubicación: {session.location || 'Desconocida'}
                      </Typography>
                      <Typography variant="caption" display="block">
                        Última actividad: {new Date(session.lastActivity).toLocaleString()}
                      </Typography>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <LoadingButton
                    size="small"
                    color="error"
                    disabled={session.isCurrentSession}
                    loading={terminateSessionMutation.isPending}
                    onClick={() => terminateSessionMutation.mutate(session.id)}
                  >
                    Terminar
                  </LoadingButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      <Divider />

      {/* Recent Activity */}
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Actividad Reciente
        </Typography>
        
        {userActivity.length === 0 ? (
          <Alert severity="info">No hay actividad reciente</Alert>
        ) : (
          <List dense>
            {userActivity.map((activity) => (
              <ListItem key={activity.id}>
                <ListItemText
                  primary={activity.action}
                  secondary={
                    <Box>
                      <Typography variant="caption" display="block">
                        {new Date(activity.timestamp).toLocaleString()}
                      </Typography>
                      {activity.ipAddress && (
                        <Typography variant="caption" display="block">
                          IP: {activity.ipAddress}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <UserIcon size={24} />
            <Typography variant="h6">
              Editar Usuario
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <X size={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Tabs value={selectedTab} onChange={(_, value) => setSelectedTab(value)}>
          <Tab label="Información Básica" icon={<UserIcon size={20} />} iconPosition="start" />
          <Tab label="Seguridad" icon={<Shield size={20} />} iconPosition="start" />
          <Tab label="Actividad" icon={<Activity size={20} />} iconPosition="start" />
        </Tabs>

        <TabPanel value={selectedTab} index={0}>
          {renderBasicInfo()}
        </TabPanel>
        
        <TabPanel value={selectedTab} index={1}>
          {renderSecuritySettings()}
        </TabPanel>
        
        <TabPanel value={selectedTab} index={2}>
          {renderActivity()}
        </TabPanel>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={handleClose}>
          Cancelar
        </Button>
        <LoadingButton
          variant="contained"
          loading={updateUserMutation.isPending || uploadAvatarMutation.isPending}
          startIcon={<Save size={20} />}
          onClick={handleSubmit(onSubmit)}
        >
          Guardar Cambios
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
};