/**
 * User Profile Component - Sprint 2
 * Siguiendo lineamientos nivel 2: Componente de gestión de perfil con principios SOLID
 * Implementa patrón Container/Presentational y separación de responsabilidades
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  Grid,
  Divider,
  Alert,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  CircularProgress,
  FormHelperText,
  Chip,
  Card,
  CardContent,
  Skeleton
} from '@mui/material';
import { 
  Camera, 
  Save, 
  User, 
  Settings, 
  Bell, 
  Shield,
  Trash2,
  Upload,
  Download,
  RefreshCw,
  X
} from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

// Hooks y servicios
import { useAuth } from '@/shared/hooks/useAuth';
import { useUIStore } from '@/shared/store/uiStore';
import { profileService, type ProfileData, type UserProfile as UserProfileType } from '@/modules/auth/services/profileService';

// Types - Principio de Segregación de Interfaces
interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  timezone: string;
  language: string;
  bio?: string;
  department?: string;
  position?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Esquemas de validación
const profileSchema = yup.object({
  firstName: yup
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no puede exceder 50 caracteres')
    .required('El nombre es requerido'),
  lastName: yup
    .string()
    .min(2, 'El apellido debe tener al menos 2 caracteres')
    .max(50, 'El apellido no puede exceder 50 caracteres')
    .required('El apellido es requerido'),
  email: yup
    .string()
    .email('Ingresa un email válido')
    .required('El email es requerido'),
  phone: yup
    .string()
    .matches(/^\+?[1-9]\d{1,14}$/, 'Número de teléfono inválido')
    .optional(),
  timezone: yup.string().required('Selecciona una zona horaria'),
  language: yup.string().required('Selecciona un idioma'),
  bio: yup
    .string()
    .max(500, 'La biografía no puede exceder 500 caracteres')
    .optional(),
  department: yup.string().optional(),
  position: yup.string().optional()
});

// Configuraciones disponibles
const timezones = [
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (GMT-3)' },
  { value: 'America/Mexico_City', label: 'Ciudad de México (GMT-6)' },
  { value: 'America/New_York', label: 'Nueva York (GMT-5)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (GMT-3)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (GMT-8)' },
  { value: 'Europe/Madrid', label: 'Madrid (GMT+1)' },
  { value: 'Europe/London', label: 'Londres (GMT+0)' },
  { value: 'Asia/Tokyo', label: 'Tokio (GMT+9)' },
  { value: 'Australia/Sydney', label: 'Sydney (GMT+11)' }
];

const languages = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
  { value: 'pt', label: 'Português' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'it', label: 'Italiano' }
];

/**
 * Panel de pestañas reutilizable
 */
const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

/**
 * Componente principal de perfil de usuario
 * Siguiendo principio de Responsabilidad Única - gestión de perfil
 */
export const UserProfile: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const { addNotification, startLoading, stopLoading, isLoading } = useUIStore();
  
  // Estados locales
  const [activeTab, setActiveTab] = useState(0);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [profileData, setProfileData] = useState<UserProfileType | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);

  // React Hook Form
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isDirty, dirtyFields },
    reset,
    watch,
    setValue
  } = useForm<ProfileFormData>({
    resolver: yupResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      timezone: 'America/Argentina/Buenos_Aires',
      language: 'es',
      bio: '',
      department: '',
      position: ''
    }
  });

  // Cargar perfil al montar el componente
  useEffect(() => {
    loadUserProfile();
  }, []);

  /**
   * Carga el perfil del usuario desde el servidor
   */
  const loadUserProfile = async () => {
    try {
      setIsLoadingProfile(true);
      const profile = await profileService.getProfile();
      setProfileData(profile);
      
      // Actualizar formulario con datos del perfil
      reset({
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        phone: profile.phone || '',
        timezone: profile.timezone,
        language: profile.language,
        bio: profile.bio || '',
        department: profile.department || '',
        position: profile.position || ''
      });

      if (profile.avatar) {
        setAvatarPreview(profile.avatar);
      }
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'No se pudo cargar el perfil',
        autoClose: true
      });
    } finally {
      setIsLoadingProfile(false);
    }
  };

  /**
   * Maneja el cambio de avatar
   */
  const handleAvatarChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tamaño (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        addNotification({
          type: 'error',
          title: 'Error',
          message: 'La imagen debe ser menor a 5MB',
          autoClose: true
        });
        return;
      }

      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setAvatarFile(file);
    }
  }, [addNotification]);

  /**
   * Sube el avatar al servidor
   */
  const handleAvatarUpload = async () => {
    if (!avatarFile) return;

    try {
      startLoading('avatar-upload');
      setUploadProgress(30);
      
      const response = await profileService.uploadAvatar(avatarFile);
      
      setUploadProgress(100);
      
      if (response.success) {
        setAvatarPreview(response.data.avatarUrl);
        setAvatarFile(null);
        
        addNotification({
          type: 'success',
          title: 'Avatar actualizado',
          message: 'Tu foto de perfil se ha actualizado correctamente',
          autoClose: true
        });

        // Actualizar el avatar en el store de auth
        await updateProfile({ avatar: response.data.avatarUrl });
      }
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.message || 'No se pudo actualizar el avatar',
        autoClose: true
      });
    } finally {
      stopLoading('avatar-upload');
      setUploadProgress(0);
    }
  };

  /**
   * Elimina el avatar del usuario
   */
  const handleAvatarDelete = async () => {
    try {
      startLoading('avatar-delete');
      
      const response = await profileService.deleteAvatar();
      
      if (response.success) {
        setAvatarPreview(null);
        setAvatarFile(null);
        
        addNotification({
          type: 'success',
          title: 'Avatar eliminado',
          message: 'Tu foto de perfil se ha eliminado',
          autoClose: true
        });

        // Actualizar el store
        await updateProfile({ avatar: undefined });
      }
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.message || 'No se pudo eliminar el avatar',
        autoClose: true
      });
    } finally {
      stopLoading('avatar-delete');
    }
  };

  /**
   * Envía el formulario de perfil
   */
  const onSubmit = async (data: ProfileFormData) => {
    try {
      startLoading('profile-update');
      
      // Solo enviar campos que han cambiado
      const changedFields: Partial<ProfileData> = {};
      Object.keys(dirtyFields).forEach(key => {
        const field = key as keyof ProfileFormData;
        if (dirtyFields[field]) {
          changedFields[field] = data[field];
        }
      });

      if (Object.keys(changedFields).length === 0) {
        addNotification({
          type: 'info',
          title: 'Sin cambios',
          message: 'No hay cambios para guardar',
          autoClose: true
        });
        return;
      }
      
      const response = await profileService.updateProfile(changedFields);
      
      if (response.success) {
        addNotification({
          type: 'success',
          title: 'Perfil actualizado',
          message: 'Tus datos se han guardado correctamente',
          autoClose: true
        });

        // Actualizar store de auth
        await updateProfile(changedFields);
        
        // Reset form con nuevos valores
        reset(data);
      }
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.message || 'No se pudo actualizar el perfil',
        autoClose: true
      });
    } finally {
      stopLoading('profile-update');
    }
  };

  /**
   * Exporta los datos del usuario
   */
  const handleExportData = async () => {
    try {
      startLoading('data-export');
      
      const blob = await profileService.exportUserData();
      
      // Crear link de descarga
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-data-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      addNotification({
        type: 'success',
        title: 'Datos exportados',
        message: 'Tus datos han sido descargados exitosamente',
        autoClose: true
      });
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.message || 'No se pudieron exportar los datos',
        autoClose: true
      });
    } finally {
      stopLoading('data-export');
    }
  };

  /**
   * Cambia de pestaña
   */
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Loading skeleton mientras carga el perfil
  if (isLoadingProfile) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
        <Paper sx={{ p: 4 }}>
          <Skeleton variant="text" width={200} height={40} />
          <Skeleton variant="rectangular" width="100%" height={400} sx={{ mt: 2 }} />
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Paper sx={{ p: { xs: 2, sm: 4 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <User size={28} />
          <Typography variant="h4" component="h1">
            Mi Perfil
          </Typography>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Tabs */}
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          aria-label="profile tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Información Personal" icon={<User size={16} />} iconPosition="start" />
          <Tab label="Preferencias" icon={<Settings size={16} />} iconPosition="start" />
          <Tab label="Notificaciones" icon={<Bell size={16} />} iconPosition="start" />
          <Tab label="Seguridad" icon={<Shield size={16} />} iconPosition="start" />
        </Tabs>

        {/* Tab 1: Información Personal */}
        <TabPanel value={activeTab} index={0}>
          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            {/* Avatar Section */}
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <Box sx={{ position: 'relative', display: 'inline-block' }}>
                <Avatar
                  src={avatarPreview || undefined}
                  sx={{ 
                    width: 150, 
                    height: 150, 
                    mx: 'auto', 
                    mb: 2,
                    fontSize: '3rem'
                  }}
                >
                  {!avatarPreview && (
                    <>
                      {profileData?.firstName?.charAt(0).toUpperCase()}
                      {profileData?.lastName?.charAt(0).toUpperCase()}
                    </>
                  )}
                </Avatar>
                
                {/* Avatar actions */}
                <Box sx={{ 
                  position: 'absolute', 
                  bottom: 8, 
                  right: -8,
                  display: 'flex',
                  gap: 0.5
                }}>
                  <IconButton
                    component="label"
                    size="small"
                    sx={{
                      bgcolor: 'primary.main',
                      color: 'white',
                      '&:hover': { bgcolor: 'primary.dark' }
                    }}
                  >
                    <Camera size={16} />
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleAvatarChange}
                    />
                  </IconButton>
                  
                  {avatarFile && (
                    <IconButton
                      size="small"
                      onClick={handleAvatarUpload}
                      disabled={isLoading('avatar-upload')}
                      sx={{
                        bgcolor: 'success.main',
                        color: 'white',
                        '&:hover': { bgcolor: 'success.dark' }
                      }}
                    >
                      {isLoading('avatar-upload') ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <Upload size={16} />
                      )}
                    </IconButton>
                  )}
                  
                  {avatarPreview && !avatarFile && (
                    <IconButton
                      size="small"
                      onClick={handleAvatarDelete}
                      disabled={isLoading('avatar-delete')}
                      sx={{
                        bgcolor: 'error.main',
                        color: 'white',
                        '&:hover': { bgcolor: 'error.dark' }
                      }}
                    >
                      {isLoading('avatar-delete') ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </IconButton>
                  )}
                </Box>

                {/* Upload progress */}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <CircularProgress 
                    variant="determinate" 
                    value={uploadProgress}
                    size={180}
                    sx={{
                      position: 'absolute',
                      top: -15,
                      left: -15
                    }}
                  />
                )}
              </Box>
              
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Haz clic en el ícono de cámara para cambiar tu foto de perfil
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Formatos permitidos: JPG, PNG, WebP, GIF (máx. 5MB)
              </Typography>
            </Box>

            {/* Form Fields */}
            <Grid container spacing={3}>
              {/* Nombre */}
              <Grid item xs={12} sm={6}>
                <TextField
                  {...register('firstName')}
                  fullWidth
                  label="Nombre"
                  error={!!errors.firstName}
                  helperText={errors.firstName?.message}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              {/* Apellido */}
              <Grid item xs={12} sm={6}>
                <TextField
                  {...register('lastName')}
                  fullWidth
                  label="Apellido"
                  error={!!errors.lastName}
                  helperText={errors.lastName?.message}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              {/* Email */}
              <Grid item xs={12} sm={6}>
                <TextField
                  {...register('email')}
                  fullWidth
                  label="Email"
                  type="email"
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    endAdornment: profileData?.emailVerified && (
                      <Chip 
                        label="Verificado" 
                        size="small" 
                        color="success"
                        variant="outlined"
                      />
                    )
                  }}
                />
              </Grid>
              
              {/* Teléfono */}
              <Grid item xs={12} sm={6}>
                <TextField
                  {...register('phone')}
                  fullWidth
                  label="Teléfono"
                  type="tel"
                  error={!!errors.phone}
                  helperText={errors.phone?.message || 'Formato: +1234567890'}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              {/* Zona horaria */}
              <Grid item xs={12} sm={6}>
                <Controller
                  name="timezone"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.timezone}>
                      <InputLabel>Zona Horaria</InputLabel>
                      <Select
                        {...field}
                        label="Zona Horaria"
                      >
                        {timezones.map((tz) => (
                          <MenuItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.timezone && (
                        <FormHelperText>{errors.timezone.message}</FormHelperText>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>
              
              {/* Idioma */}
              <Grid item xs={12} sm={6}>
                <Controller
                  name="language"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.language}>
                      <InputLabel>Idioma</InputLabel>
                      <Select
                        {...field}
                        label="Idioma"
                      >
                        {languages.map((lang) => (
                          <MenuItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.language && (
                        <FormHelperText>{errors.language.message}</FormHelperText>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>
              
              {/* Departamento */}
              <Grid item xs={12} sm={6}>
                <TextField
                  {...register('department')}
                  fullWidth
                  label="Departamento"
                  error={!!errors.department}
                  helperText={errors.department?.message}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              {/* Cargo */}
              <Grid item xs={12} sm={6}>
                <TextField
                  {...register('position')}
                  fullWidth
                  label="Cargo"
                  error={!!errors.position}
                  helperText={errors.position?.message}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              {/* Biografía */}
              <Grid item xs={12}>
                <TextField
                  {...register('bio')}
                  fullWidth
                  label="Biografía"
                  multiline
                  rows={4}
                  error={!!errors.bio}
                  helperText={`${errors.bio?.message || ''} ${watch('bio')?.length || 0}/500`}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>

            {/* Action Buttons */}
            <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                type="submit"
                variant="contained"
                startIcon={<Save size={20} />}
                disabled={isLoading('profile-update') || !isDirty}
                sx={{ minWidth: 140 }}
              >
                {isLoading('profile-update') ? (
                  <>
                    <CircularProgress size={16} sx={{ mr: 1 }} />
                    Guardando...
                  </>
                ) : (
                  'Guardar Cambios'
                )}
              </Button>
              
              <Button
                type="button"
                variant="outlined"
                startIcon={<RefreshCw size={20} />}
                onClick={() => reset()}
                disabled={isLoading('profile-update') || !isDirty}
              >
                Descartar Cambios
              </Button>

              <Button
                type="button"
                variant="text"
                startIcon={<Download size={20} />}
                onClick={handleExportData}
                disabled={isLoading('data-export')}
                sx={{ ml: 'auto' }}
              >
                Exportar Datos
              </Button>
            </Box>

            {/* Dirty fields alert */}
            {isDirty && (
              <Alert severity="info" sx={{ mt: 3 }}>
                Tienes cambios sin guardar. Asegúrate de hacer clic en "Guardar Cambios" para confirmar las modificaciones.
              </Alert>
            )}
          </Box>
        </TabPanel>

        {/* Tab 2: Preferencias */}
        <TabPanel value={activeTab} index={1}>
          <PreferencesSection />
        </TabPanel>

        {/* Tab 3: Notificaciones */}
        <TabPanel value={activeTab} index={2}>
          <NotificationsSection />
        </TabPanel>

        {/* Tab 4: Seguridad */}
        <TabPanel value={activeTab} index={3}>
          <SecuritySection />
        </TabPanel>
      </Paper>
    </Box>
  );
};

/**
 * Sección de preferencias - Importa el componente completo
 */
import ProfilePreferences from './ProfilePreferences';

const PreferencesSection: React.FC = () => {
  return <ProfilePreferences />;
};

/**
 * Sección de notificaciones - Importa el componente completo
 */
import ProfileNotifications from './ProfileNotifications';

const NotificationsSection: React.FC = () => {
  return <ProfileNotifications />;
};

/**
 * Sección de seguridad - Importa el componente completo
 */
import ProfileSecurity from './ProfileSecurity';

const SecuritySection: React.FC = () => {
  return <ProfileSecurity />;
};

export default UserProfile;