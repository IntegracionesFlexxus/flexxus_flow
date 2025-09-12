/**
 * Profile Security Component - Sprint 2
 * Siguiendo lineamientos nivel 2: Componente para gestión de seguridad del perfil
 * Implementa principios SOLID con responsabilidad única para configuración de seguridad
 */

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Switch,
  FormControlLabel,
  Divider,
  Chip,
  Grid,
  CircularProgress,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Tooltip,
  Badge,
  Skeleton
} from '@mui/material';
import {
  Shield,
  Lock,
  Key,
  Smartphone,
  Monitor,
  Tablet,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  RefreshCw,
  LogOut,
  Trash2,
  Download,
  QrCode,
  Mail,
  MessageSquare,
  Copy,
  Info,
  Warning,
  MapPin,
  Clock,
  Chrome,
  Globe
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import QRCode from 'qrcode';

// Hooks y servicios
import { useAuth } from '@/shared/hooks/useAuth';
import { useUIStore } from '@/shared/store/uiStore';
import { 
  profileService, 
  type SecuritySettings, 
  type TrustedDevice, 
  type PasswordChangeRequest 
} from '@modules/auth/services/profileService';

// Esquemas de validación
const passwordChangeSchema = yup.object({
  currentPassword: yup
    .string()
    .required('La contraseña actual es requerida'),
  newPassword: yup
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'La contraseña debe incluir mayúsculas, minúsculas, números y caracteres especiales'
    )
    .required('La nueva contraseña es requerida'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('newPassword')], 'Las contraseñas deben coincidir')
    .required('Confirma la nueva contraseña'),
  logoutOtherDevices: yup.boolean()
});

const deleteAccountSchema = yup.object({
  password: yup
    .string()
    .required('La contraseña es requerida para eliminar la cuenta'),
  reason: yup.string(),
  feedback: yup.string()
});

type PasswordChangeFormData = yup.InferType<typeof passwordChangeSchema>;
type DeleteAccountFormData = yup.InferType<typeof deleteAccountSchema>;

// Componente principal
export const ProfileSecurity: React.FC = () => {
  const { user, logout } = useAuth();
  const { addNotification, startLoading, stopLoading, isLoading } = useUIStore();
  
  // Estados
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [activeStep2FA, setActiveStep2FA] = useState(0);
  const [verificationCode, setVerificationCode] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<TrustedDevice | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [twoFactorMethod, setTwoFactorMethod] = useState<'app' | 'sms' | 'email'>('app');

  // React Hook Form para cambio de contraseña
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPasswordForm,
    watch: watchPassword
  } = useForm<PasswordChangeFormData>({
    resolver: yupResolver(passwordChangeSchema),
    defaultValues: {
      logoutOtherDevices: false
    }
  });

  // React Hook Form para eliminar cuenta
  const {
    register: registerDelete,
    handleSubmit: handleDeleteSubmit,
    formState: { errors: deleteErrors },
    reset: resetDeleteForm
  } = useForm<DeleteAccountFormData>({
    resolver: yupResolver(deleteAccountSchema)
  });

  // Cargar configuración de seguridad al montar
  useEffect(() => {
    loadSecuritySettings();
  }, []);

  // Generar QR Code cuando sea necesario
  useEffect(() => {
    if (show2FADialog && !securitySettings?.twoFactorEnabled) {
      generateQRCode();
    }
  }, [show2FADialog]);

  const loadSecuritySettings = async () => {
    setIsLoadingSettings(true);
    try {
      const settings = await profileService.getSecuritySettings();
      setSecuritySettings(settings);
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'No se pudo cargar la configuración de seguridad',
        autoClose: true
      });
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const generateQRCode = async () => {
    try {
      // Generar URL TOTP
      const secret = generateSecret();
      const otpauth = `otpauth://totp/${encodeURIComponent(user?.email || '')}?secret=${secret}&issuer=FlexxusFlow`;
      
      // Generar QR Code
      const qrUrl = await QRCode.toDataURL(otpauth, {
        width: 256,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      setQrCodeUrl(qrUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const generateSecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars[Math.floor(Math.random() * chars.length)];
    }
    return secret;
  };

  const handlePasswordChange = async (data: PasswordChangeFormData) => {
    try {
      startLoading('password-change');
      
      const response = await profileService.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
        logoutOtherDevices: data.logoutOtherDevices
      });

      if (response.success) {
        addNotification({
          type: 'success',
          title: 'Contraseña actualizada',
          message: 'Tu contraseña ha sido cambiada exitosamente',
          autoClose: true
        });
        
        setShowPasswordDialog(false);
        resetPasswordForm();
        
        // Si eligió cerrar otras sesiones, actualizar settings
        if (data.logoutOtherDevices) {
          await loadSecuritySettings();
        }
      }
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.message || 'No se pudo cambiar la contraseña',
        autoClose: true
      });
    } finally {
      stopLoading('password-change');
    }
  };

  const handleToggle2FA = async () => {
    if (securitySettings?.twoFactorEnabled) {
      // Deshabilitar 2FA
      try {
        startLoading('2fa-toggle');
        
        const response = await profileService.toggleTwoFactorAuth(false);
        
        if (response.success) {
          addNotification({
            type: 'success',
            title: '2FA deshabilitado',
            message: 'La autenticación de dos factores ha sido deshabilitada',
            autoClose: true
          });
          
          await loadSecuritySettings();
        }
      } catch (error: any) {
        addNotification({
          type: 'error',
          title: 'Error',
          message: error.message || 'No se pudo deshabilitar 2FA',
          autoClose: true
        });
      } finally {
        stopLoading('2fa-toggle');
      }
    } else {
      // Mostrar diálogo para habilitar 2FA
      setShow2FADialog(true);
      setActiveStep2FA(0);
    }
  };

  const handleEnable2FA = async () => {
    try {
      startLoading('2fa-enable');
      
      const response = await profileService.toggleTwoFactorAuth(true, twoFactorMethod);
      
      if (response.success) {
        if (response.backupCodes) {
          setBackupCodes(response.backupCodes);
          setShowBackupCodes(true);
        }
        
        addNotification({
          type: 'success',
          title: '2FA habilitado',
          message: 'La autenticación de dos factores ha sido habilitada exitosamente',
          autoClose: true
        });
        
        setShow2FADialog(false);
        setActiveStep2FA(0);
        await loadSecuritySettings();
      }
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.message || 'No se pudo habilitar 2FA',
        autoClose: true
      });
    } finally {
      stopLoading('2fa-enable');
    }
  };

  const handleRevokeDevice = async (deviceId: string) => {
    try {
      startLoading(`revoke-${deviceId}`);
      
      const response = await profileService.revokeDevice(deviceId);
      
      if (response.success) {
        addNotification({
          type: 'success',
          title: 'Dispositivo revocado',
          message: 'El acceso del dispositivo ha sido revocado',
          autoClose: true
        });
        
        await loadSecuritySettings();
      }
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.message || 'No se pudo revocar el dispositivo',
        autoClose: true
      });
    } finally {
      stopLoading(`revoke-${deviceId}`);
    }
  };

  const handleTerminateAllSessions = async () => {
    try {
      startLoading('terminate-sessions');
      
      const response = await profileService.terminateAllSessions();
      
      if (response.success) {
        addNotification({
          type: 'success',
          title: 'Sesiones terminadas',
          message: `Se cerraron ${response.sessionsTerminated} sesiones activas`,
          autoClose: true
        });
        
        // Cerrar sesión actual también
        setTimeout(() => {
          logout();
        }, 2000);
      }
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.message || 'No se pudieron terminar las sesiones',
        autoClose: true
      });
    } finally {
      stopLoading('terminate-sessions');
    }
  };

  const handleDeleteAccount = async (data: DeleteAccountFormData) => {
    try {
      startLoading('delete-account');
      
      const response = await profileService.deleteAccount({
        password: data.password,
        reason: data.reason,
        feedback: data.feedback
      });
      
      if (response.success) {
        addNotification({
          type: 'success',
          title: 'Cuenta programada para eliminación',
          message: `Tu cuenta será eliminada el ${format(new Date(response.scheduledDeletion), 'dd/MM/yyyy', { locale: es })}`,
          autoClose: false
        });
        
        setShowDeleteDialog(false);
        
        // Cerrar sesión
        setTimeout(() => {
          logout();
        }, 3000);
      }
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.message || 'No se pudo eliminar la cuenta',
        autoClose: true
      });
    } finally {
      stopLoading('delete-account');
    }
  };

  const copyBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    navigator.clipboard.writeText(codesText);
    addNotification({
      type: 'success',
      title: 'Códigos copiados',
      message: 'Los códigos de respaldo han sido copiados al portapapeles',
      autoClose: true
    });
  };

  const downloadBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-codes-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'desktop':
        return <Monitor size={20} />;
      case 'mobile':
        return <Smartphone size={20} />;
      case 'tablet':
        return <Tablet size={20} />;
      default:
        return <Monitor size={20} />;
    }
  };

  const getBrowserIcon = (browser?: string) => {
    if (!browser) return null;
    
    const browserName = browser.toLowerCase();
    if (browserName.includes('chrome')) return <Chrome size={16} />;
    if (browserName.includes('firefox')) return <Globe size={16} />;
    if (browserName.includes('safari')) return <Monitor size={16} />;
    if (browserName.includes('edge')) return <Smartphone size={16} />;
    return null;
  };

  const getPasswordStrength = (password: string): { level: number; label: string; color: string } => {
    let strength = 0;
    
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[@$!%*?&]/.test(password)) strength++;
    
    if (strength <= 2) return { level: 1, label: 'Débil', color: 'error' };
    if (strength <= 3) return { level: 2, label: 'Media', color: 'warning' };
    if (strength <= 4) return { level: 3, label: 'Fuerte', color: 'success' };
    return { level: 4, label: 'Muy fuerte', color: 'success' };
  };

  // Loading skeleton
  if (isLoadingSettings) {
    return (
      <Box sx={{ space: 3 }}>
        <Skeleton variant="rectangular" height={200} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={200} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={200} />
      </Box>
    );
  }

  const passwordStrength = watchPassword('newPassword') 
    ? getPasswordStrength(watchPassword('newPassword'))
    : null;

  return (
    <Box sx={{ space: 3 }}>
      {/* Resumen de Seguridad */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Shield size={24} />
            Resumen de Seguridad
          </Typography>
          
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'background.default' }}>
                <Box sx={{ mb: 1 }}>
                  {securitySettings?.twoFactorEnabled ? (
                    <CheckCircle size={32} color="#4caf50" />
                  ) : (
                    <XCircle size={32} color="#f44336" />
                  )}
                </Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Autenticación 2FA
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {securitySettings?.twoFactorEnabled ? 'Habilitada' : 'Deshabilitada'}
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'background.default' }}>
                <Typography variant="h4" color="primary">
                  {securitySettings?.activeSessions || 0}
                </Typography>
                <Typography variant="subtitle2" color="text.secondary">
                  Sesiones Activas
                </Typography>
                <Typography variant="body2">
                  en {securitySettings?.trustedDevices?.length || 0} dispositivos
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'background.default' }}>
                <Box sx={{ mb: 1 }}>
                  <Clock size={32} color="#ff9800" />
                </Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Último cambio de contraseña
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {securitySettings?.passwordLastChanged
                    ? format(new Date(securitySettings.passwordLastChanged), 'dd MMM yyyy', { locale: es })
                    : 'Nunca'}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Contraseña */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Lock size={24} />
            Contraseña
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Mantén tu cuenta segura con una contraseña fuerte y única
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<Key size={20} />}
              onClick={() => setShowPasswordDialog(true)}
            >
              Cambiar Contraseña
            </Button>
            
            {securitySettings?.passwordLastChanged && (
              <Alert severity="info" sx={{ flex: 1 }}>
                Tu contraseña fue actualizada hace{' '}
                {Math.floor(
                  (Date.now() - new Date(securitySettings.passwordLastChanged).getTime()) / 
                  (1000 * 60 * 60 * 24)
                )}{' '}
                días
              </Alert>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Autenticación de Dos Factores */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Smartphone size={24} />
            Autenticación de Dos Factores (2FA)
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Añade una capa extra de seguridad requiriendo un código adicional al iniciar sesión
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="body1">
                Estado: {' '}
                <Chip
                  label={securitySettings?.twoFactorEnabled ? 'Habilitado' : 'Deshabilitado'}
                  color={securitySettings?.twoFactorEnabled ? 'success' : 'default'}
                  size="small"
                />
              </Typography>
              {securitySettings?.twoFactorEnabled && securitySettings?.twoFactorMethod && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Método: {
                    securitySettings.twoFactorMethod === 'app' ? 'Aplicación de autenticación' :
                    securitySettings.twoFactorMethod === 'sms' ? 'SMS' : 'Email'
                  }
                </Typography>
              )}
            </Box>
            
            <FormControlLabel
              control={
                <Switch
                  checked={securitySettings?.twoFactorEnabled || false}
                  onChange={handleToggle2FA}
                />
              }
              label=""
            />
          </Box>
          
          {securitySettings?.twoFactorEnabled && (
            <Alert severity="success">
              Tu cuenta está protegida con autenticación de dos factores
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Dispositivos Confiables */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Monitor size={24} />
            Dispositivos Confiables
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Dispositivos con sesiones activas en tu cuenta
          </Typography>
          
          <List>
            {securitySettings?.trustedDevices?.map((device) => (
              <React.Fragment key={device.id}>
                <ListItem>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                    {getDeviceIcon(device.type)}
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <span>{device.name}</span>
                          {getBrowserIcon(device.browser)}
                          {device.id === 'current' && (
                            <Chip label="Este dispositivo" size="small" color="primary" />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="caption" display="block">
                            Último uso: {format(new Date(device.lastUsed), 'dd MMM yyyy HH:mm', { locale: es })}
                          </Typography>
                          {device.location && (
                            <Typography variant="caption" display="block">
                              <MapPin size={12} style={{ verticalAlign: 'middle' }} /> {device.location}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </Box>
                  <ListItemSecondaryAction>
                    {device.id !== 'current' && (
                      <Tooltip title="Revocar acceso">
                        <IconButton
                          edge="end"
                          onClick={() => handleRevokeDevice(device.id)}
                          disabled={isLoading(`revoke-${device.id}`)}
                        >
                          {isLoading(`revoke-${device.id}`) ? (
                            <CircularProgress size={20} />
                          ) : (
                            <XCircle size={20} />
                          )}
                        </IconButton>
                      </Tooltip>
                    )}
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
          </List>
          
          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              color="error"
              startIcon={<LogOut size={20} />}
              onClick={handleTerminateAllSessions}
              disabled={isLoading('terminate-sessions')}
            >
              Cerrar Todas las Sesiones
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Zona de Peligro */}
      <Card sx={{ border: '1px solid', borderColor: 'error.main' }}>
        <CardContent>
          <Typography 
            variant="h6" 
            color="error" 
            gutterBottom 
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <AlertTriangle size={24} />
            Zona de Peligro
          </Typography>
          
          <Alert severity="warning" sx={{ mb: 2 }}>
            Estas acciones son irreversibles. Por favor, procede con precaución.
          </Alert>
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Trash2 size={20} />}
              onClick={() => setShowDeleteDialog(true)}
            >
              Eliminar Cuenta
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Diálogo de Cambio de Contraseña */}
      <Dialog 
        open={showPasswordDialog} 
        onClose={() => setShowPasswordDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={handlePasswordSubmit(handlePasswordChange)}>
          <DialogTitle>Cambiar Contraseña</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                {...registerPassword('currentPassword')}
                fullWidth
                label="Contraseña Actual"
                type={showCurrentPassword ? 'text' : 'password'}
                error={!!passwordErrors.currentPassword}
                helperText={passwordErrors.currentPassword?.message}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        edge="end"
                      >
                        {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              
              <TextField
                {...registerPassword('newPassword')}
                fullWidth
                label="Nueva Contraseña"
                type={showNewPassword ? 'text' : 'password'}
                error={!!passwordErrors.newPassword}
                helperText={passwordErrors.newPassword?.message}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        edge="end"
                      >
                        {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              
              {passwordStrength && (
                <Box>
                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    {[1, 2, 3, 4].map((level) => (
                      <Box
                        key={level}
                        sx={{
                          flex: 1,
                          height: 4,
                          bgcolor: level <= passwordStrength.level 
                            ? `${passwordStrength.color}.main`
                            : 'grey.300',
                          borderRadius: 1
                        }}
                      />
                    ))}
                  </Box>
                  <Typography variant="caption" color={`${passwordStrength.color}.main`}>
                    Fortaleza: {passwordStrength.label}
                  </Typography>
                </Box>
              )}
              
              <TextField
                {...registerPassword('confirmPassword')}
                fullWidth
                label="Confirmar Nueva Contraseña"
                type="password"
                error={!!passwordErrors.confirmPassword}
                helperText={passwordErrors.confirmPassword?.message}
              />
              
              <FormControlLabel
                control={
                  <Switch {...registerPassword('logoutOtherDevices')} />
                }
                label="Cerrar sesión en otros dispositivos"
              />
              
              <Alert severity="info">
                Usa al menos 8 caracteres con mayúsculas, minúsculas, números y símbolos
              </Alert>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => {
                setShowPasswordDialog(false);
                resetPasswordForm();
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isLoading('password-change')}
            >
              {isLoading('password-change') ? (
                <>
                  <CircularProgress size={16} sx={{ mr: 1 }} />
                  Cambiando...
                </>
              ) : (
                'Cambiar Contraseña'
              )}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Diálogo de 2FA */}
      <Dialog 
        open={show2FADialog} 
        onClose={() => setShow2FADialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Configurar Autenticación de Dos Factores</DialogTitle>
        <DialogContent>
          <Stepper activeStep={activeStep2FA} orientation="vertical">
            <Step>
              <StepLabel>Seleccionar método</StepLabel>
              <StepContent>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Método de autenticación</InputLabel>
                  <Select
                    value={twoFactorMethod}
                    onChange={(e) => setTwoFactorMethod(e.target.value as 'app' | 'sms' | 'email')}
                    label="Método de autenticación"
                  >
                    <MenuItem value="app">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Smartphone size={16} />
                        Aplicación de autenticación
                      </Box>
                    </MenuItem>
                    <MenuItem value="sms">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <MessageSquare size={16} />
                        SMS
                      </Box>
                    </MenuItem>
                    <MenuItem value="email">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Mail size={16} />
                        Email
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button onClick={() => setActiveStep2FA(1)}>
                    Continuar
                  </Button>
                </Box>
              </StepContent>
            </Step>
            
            <Step>
              <StepLabel>Configurar aplicación</StepLabel>
              <StepContent>
                {twoFactorMethod === 'app' && (
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      Escanea este código QR con tu aplicación de autenticación
                    </Typography>
                    {qrCodeUrl && (
                      <img src={qrCodeUrl} alt="QR Code" style={{ maxWidth: '100%' }} />
                    )}
                    <Typography variant="caption" display="block" sx={{ mt: 2 }}>
                      Usa Google Authenticator, Microsoft Authenticator o Authy
                    </Typography>
                  </Box>
                )}
                
                {twoFactorMethod === 'sms' && (
                  <Alert severity="info">
                    Se enviará un código de verificación a tu número de teléfono registrado
                  </Alert>
                )}
                
                {twoFactorMethod === 'email' && (
                  <Alert severity="info">
                    Se enviará un código de verificación a tu correo electrónico
                  </Alert>
                )}
                
                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  <Button onClick={() => setActiveStep2FA(0)}>
                    Atrás
                  </Button>
                  <Button onClick={() => setActiveStep2FA(2)}>
                    Continuar
                  </Button>
                </Box>
              </StepContent>
            </Step>
            
            <Step>
              <StepLabel>Verificar configuración</StepLabel>
              <StepContent>
                <TextField
                  fullWidth
                  label="Código de verificación"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="000000"
                  sx={{ mb: 2 }}
                />
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button onClick={() => setActiveStep2FA(1)}>
                    Atrás
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleEnable2FA}
                    disabled={isLoading('2fa-enable') || verificationCode.length !== 6}
                  >
                    {isLoading('2fa-enable') ? (
                      <>
                        <CircularProgress size={16} sx={{ mr: 1 }} />
                        Habilitando...
                      </>
                    ) : (
                      'Habilitar 2FA'
                    )}
                  </Button>
                </Box>
              </StepContent>
            </Step>
          </Stepper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShow2FADialog(false)}>
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Códigos de Respaldo */}
      <Dialog
        open={showBackupCodes}
        onClose={() => setShowBackupCodes(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Key size={24} />
            Códigos de Respaldo
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Guarda estos códigos en un lugar seguro. Cada código solo puede usarse una vez.
          </Alert>
          
          <Paper sx={{ p: 2, bgcolor: 'grey.100', mb: 2 }}>
            <Grid container spacing={1}>
              {backupCodes.map((code, index) => (
                <Grid item xs={6} key={index}>
                  <Typography variant="body2" fontFamily="monospace">
                    {code}
                  </Typography>
                </Grid>
              ))}
            </Grid>
          </Paper>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              startIcon={<Copy size={20} />}
              onClick={copyBackupCodes}
            >
              Copiar
            </Button>
            <Button
              startIcon={<Download size={20} />}
              onClick={downloadBackupCodes}
            >
              Descargar
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            variant="contained"
            onClick={() => setShowBackupCodes(false)}
          >
            He guardado los códigos
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Eliminar Cuenta */}
      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={handleDeleteSubmit(handleDeleteAccount)}>
          <DialogTitle color="error">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AlertTriangle size={24} />
              Eliminar Cuenta Permanentemente
            </Box>
          </DialogTitle>
          <DialogContent>
            <Alert severity="error" sx={{ mb: 2 }}>
              Esta acción es irreversible. Todos tus datos serán eliminados permanentemente.
            </Alert>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                {...registerDelete('password')}
                fullWidth
                label="Contraseña actual"
                type="password"
                error={!!deleteErrors.password}
                helperText={deleteErrors.password?.message}
              />
              
              <TextField
                {...registerDelete('reason')}
                fullWidth
                label="Razón (opcional)"
                multiline
                rows={2}
                placeholder="¿Por qué eliminas tu cuenta?"
              />
              
              <TextField
                {...registerDelete('feedback')}
                fullWidth
                label="Comentarios (opcional)"
                multiline
                rows={2}
                placeholder="¿Cómo podemos mejorar?"
              />
              
              <Alert severity="info">
                Tu cuenta será desactivada inmediatamente y eliminada permanentemente después de 30 días.
                Durante este período, puedes contactar soporte para recuperarla.
              </Alert>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => {
                setShowDeleteDialog(false);
                resetDeleteForm();
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="error"
              disabled={isLoading('delete-account')}
            >
              {isLoading('delete-account') ? (
                <>
                  <CircularProgress size={16} sx={{ mr: 1 }} />
                  Eliminando...
                </>
              ) : (
                'Eliminar Mi Cuenta'
              )}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default ProfileSecurity;