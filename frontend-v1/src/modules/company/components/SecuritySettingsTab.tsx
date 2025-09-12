/**
 * Security Settings Tab Component - Sprint 3
 * Configuración de seguridad de la empresa
 * Principios SOLID: Responsabilidad única para seguridad
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Grid,
  TextField,
  Typography,
  FormControl,
  FormControlLabel,
  Switch,
  Slider,
  Divider,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Button,
  IconButton,
  InputAdornment,
  Select,
  MenuItem,
  FormHelperText,
  Tooltip
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import {
  Shield,
  Lock,
  Key,
  Users,
  Clock,
  AlertTriangle,
  Info,
  Save,
  Plus,
  X,
  Mail,
  Globe,
  Smartphone
} from 'lucide-react';

// Types
import type { SecuritySettings, MFAMethod } from '@modules/company/types';

interface SecuritySettingsTabProps {
  data: { security: SecuritySettings };
  onChange: (data: any) => void;
  onSave: () => void;
  isLoading?: boolean;
  hasChanges?: boolean;
}

/**
 * SecuritySettingsTab Component
 * Clean Code: Funciones pequeñas y nombres descriptivos
 */
export const SecuritySettingsTab: React.FC<SecuritySettingsTabProps> = ({
  data,
  onChange,
  onSave,
  isLoading = false,
  hasChanges = false
}) => {
  const [allowedDomains, setAllowedDomains] = useState<string[]>(
    data.security.invitationSettings?.allowedDomains || []
  );
  const [newDomain, setNewDomain] = useState('');
  
  // Update security settings
  const updateSecurity = useCallback((updates: Partial<SecuritySettings>) => {
    onChange({
      ...data,
      security: {
        ...data.security,
        ...updates
      }
    });
  }, [data, onChange]);
  
  // Password policy handlers
  const handlePasswordPolicyChange = useCallback((field: string, value: any) => {
    updateSecurity({
      passwordPolicy: {
        ...data.security.passwordPolicy,
        [field]: value
      }
    });
  }, [data.security.passwordPolicy, updateSecurity]);
  
  // Session settings handlers
  const handleSessionSettingsChange = useCallback((field: string, value: any) => {
    updateSecurity({
      sessionSettings: {
        ...data.security.sessionSettings,
        [field]: value
      }
    });
  }, [data.security.sessionSettings, updateSecurity]);
  
  // MFA settings handlers
  const handleMFAChange = useCallback((field: string, value: any) => {
    updateSecurity({
      mfaSettings: {
        ...data.security.mfaSettings,
        [field]: value
      }
    });
  }, [data.security.mfaSettings, updateSecurity]);
  
  // Invitation settings handlers
  const handleInvitationSettingsChange = useCallback((field: string, value: any) => {
    updateSecurity({
      invitationSettings: {
        ...data.security.invitationSettings,
        [field]: value
      }
    });
  }, [data.security.invitationSettings, updateSecurity]);
  
  // Domain management
  const handleAddDomain = useCallback(() => {
    if (newDomain && !allowedDomains.includes(newDomain)) {
      const updatedDomains = [...allowedDomains, newDomain];
      setAllowedDomains(updatedDomains);
      handleInvitationSettingsChange('allowedDomains', updatedDomains);
      setNewDomain('');
    }
  }, [newDomain, allowedDomains, handleInvitationSettingsChange]);
  
  const handleRemoveDomain = useCallback((domain: string) => {
    const updatedDomains = allowedDomains.filter(d => d !== domain);
    setAllowedDomains(updatedDomains);
    handleInvitationSettingsChange('allowedDomains', updatedDomains);
  }, [allowedDomains, handleInvitationSettingsChange]);
  
  return (
    <Box sx={{ p: 4 }}>
      {/* Security Overview */}
      <Alert severity="info" sx={{ mb: 4 }}>
        <Typography variant="body2">
          La configuración de seguridad ayuda a proteger tu empresa contra accesos no autorizados 
          y garantiza el cumplimiento de las políticas corporativas.
        </Typography>
      </Alert>
      
      {/* Password Policy */}
      <Paper elevation={0} sx={{ p: 3, mb: 4, bgcolor: 'background.default' }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Key size={20} />
          Política de Contraseñas
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography gutterBottom>
              Longitud mínima: {data.security.passwordPolicy.minLength} caracteres
            </Typography>
            <Slider
              value={data.security.passwordPolicy.minLength}
              onChange={(_, value) => handlePasswordPolicyChange('minLength', value)}
              min={6}
              max={20}
              marks
              valueLabelDisplay="auto"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography gutterBottom>
              Días hasta expiración: {data.security.passwordPolicy.expirationDays || 'Nunca'}
            </Typography>
            <Slider
              value={data.security.passwordPolicy.expirationDays || 0}
              onChange={(_, value) => handlePasswordPolicyChange('expirationDays', value || undefined)}
              min={0}
              max={365}
              step={30}
              marks={[
                { value: 0, label: 'Nunca' },
                { value: 90, label: '90' },
                { value: 180, label: '180' },
                { value: 365, label: '365' }
              ]}
              valueLabelDisplay="auto"
            />
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Requisitos de complejidad
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={data.security.passwordPolicy.requireUppercase}
                    onChange={(e) => handlePasswordPolicyChange('requireUppercase', e.target.checked)}
                  />
                }
                label="Requerir mayúsculas (A-Z)"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={data.security.passwordPolicy.requireLowercase}
                    onChange={(e) => handlePasswordPolicyChange('requireLowercase', e.target.checked)}
                  />
                }
                label="Requerir minúsculas (a-z)"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={data.security.passwordPolicy.requireNumbers}
                    onChange={(e) => handlePasswordPolicyChange('requireNumbers', e.target.checked)}
                  />
                }
                label="Requerir números (0-9)"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={data.security.passwordPolicy.requireSymbols}
                    onChange={(e) => handlePasswordPolicyChange('requireSymbols', e.target.checked)}
                  />
                }
                label="Requerir símbolos especiales (!@#$%)"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={data.security.passwordPolicy.preventCommonPasswords}
                    onChange={(e) => handlePasswordPolicyChange('preventCommonPasswords', e.target.checked)}
                  />
                }
                label="Bloquear contraseñas comunes"
              />
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              label="Prevenir reutilización de últimas"
              type="number"
              value={data.security.passwordPolicy.preventReuse}
              onChange={(e) => handlePasswordPolicyChange('preventReuse', parseInt(e.target.value))}
              fullWidth
              InputProps={{
                endAdornment: <InputAdornment position="end">contraseñas</InputAdornment>,
                inputProps: { min: 0, max: 24 }
              }}
              helperText="Número de contraseñas anteriores que no se pueden reutilizar"
            />
          </Grid>
        </Grid>
      </Paper>
      
      <Divider sx={{ my: 4 }} />
      
      {/* Session Settings */}
      <Paper elevation={0} sx={{ p: 3, mb: 4, bgcolor: 'background.default' }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Clock size={20} />
          Configuración de Sesiones
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Sesiones concurrentes máximas"
              type="number"
              value={data.security.sessionSettings.maxConcurrentSessions}
              onChange={(e) => handleSessionSettingsChange('maxConcurrentSessions', parseInt(e.target.value))}
              fullWidth
              InputProps={{
                inputProps: { min: 1, max: 10 }
              }}
              helperText="Número máximo de sesiones activas por usuario"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              label="Tiempo de sesión"
              type="number"
              value={data.security.sessionSettings.sessionTimeout}
              onChange={(e) => handleSessionSettingsChange('sessionTimeout', parseInt(e.target.value))}
              fullWidth
              InputProps={{
                endAdornment: <InputAdornment position="end">minutos</InputAdornment>,
                inputProps: { min: 15, max: 480 }
              }}
              helperText="Tiempo máximo de duración de la sesión"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              label="Tiempo de inactividad"
              type="number"
              value={data.security.sessionSettings.idleTimeout}
              onChange={(e) => handleSessionSettingsChange('idleTimeout', parseInt(e.target.value))}
              fullWidth
              InputProps={{
                endAdornment: <InputAdornment position="end">minutos</InputAdornment>,
                inputProps: { min: 5, max: 120 }
              }}
              helperText="Tiempo antes de cerrar sesión por inactividad"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              label="Duración de 'Recordarme'"
              type="number"
              value={data.security.sessionSettings.rememberMeDuration}
              onChange={(e) => handleSessionSettingsChange('rememberMeDuration', parseInt(e.target.value))}
              fullWidth
              InputProps={{
                endAdornment: <InputAdornment position="end">días</InputAdornment>,
                inputProps: { min: 1, max: 90 }
              }}
            />
          </Grid>
          
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={data.security.sessionSettings.requireReauthForSensitive}
                  onChange={(e) => handleSessionSettingsChange('requireReauthForSensitive', e.target.checked)}
                />
              }
              label="Requerir reautenticación para operaciones sensibles"
            />
          </Grid>
        </Grid>
      </Paper>
      
      <Divider sx={{ my: 4 }} />
      
      {/* MFA Settings */}
      <Paper elevation={0} sx={{ p: 3, mb: 4, bgcolor: 'background.default' }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Smartphone size={20} />
          Autenticación Multifactor (MFA)
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={data.security.mfaSettings.required}
                  onChange={(e) => handleMFAChange('required', e.target.checked)}
                />
              }
              label="Requerir MFA para todos los usuarios"
            />
          </Grid>
          
          {data.security.mfaSettings.required && (
            <>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Período de gracia"
                  type="number"
                  value={data.security.mfaSettings.gracePeriodDays || 0}
                  onChange={(e) => handleMFAChange('gracePeriodDays', parseInt(e.target.value))}
                  fullWidth
                  InputProps={{
                    endAdornment: <InputAdornment position="end">días</InputAdornment>,
                    inputProps: { min: 0, max: 30 }
                  }}
                  helperText="Días antes de forzar MFA para usuarios existentes"
                />
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Métodos de autenticación permitidos
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {Object.values(MFAMethod).map(method => (
                    <Chip
                      key={method}
                      label={method.toUpperCase()}
                      onClick={() => {
                        const methods = data.security.mfaSettings.methods || [];
                        const updated = methods.includes(method)
                          ? methods.filter(m => m !== method)
                          : [...methods, method];
                        handleMFAChange('methods', updated);
                      }}
                      color={data.security.mfaSettings.methods?.includes(method) ? 'primary' : 'default'}
                      variant={data.security.mfaSettings.methods?.includes(method) ? 'filled' : 'outlined'}
                    />
                  ))}
                </Box>
              </Grid>
            </>
          )}
        </Grid>
      </Paper>
      
      <Divider sx={{ my: 4 }} />
      
      {/* Invitation Settings */}
      <Paper elevation={0} sx={{ p: 3, mb: 4, bgcolor: 'background.default' }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Mail size={20} />
          Configuración de Invitaciones
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Días de expiración por defecto"
              type="number"
              value={data.security.invitationSettings.defaultExpirationDays}
              onChange={(e) => handleInvitationSettingsChange('defaultExpirationDays', parseInt(e.target.value))}
              fullWidth
              InputProps={{
                endAdornment: <InputAdornment position="end">días</InputAdornment>,
                inputProps: { min: 1, max: 30 }
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              label="Límite de invitaciones por día"
              type="number"
              value={data.security.invitationSettings.maxInvitationsPerDay || ''}
              onChange={(e) => handleInvitationSettingsChange('maxInvitationsPerDay', parseInt(e.target.value) || undefined)}
              fullWidth
              helperText="Dejar vacío para sin límite"
            />
          </Grid>
          
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={data.security.invitationSettings.requireDomainMatch}
                  onChange={(e) => handleInvitationSettingsChange('requireDomainMatch', e.target.checked)}
                />
              }
              label="Requerir que el email coincida con dominios permitidos"
            />
          </Grid>
          
          {data.security.invitationSettings.requireDomainMatch && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Dominios permitidos
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  size="small"
                  placeholder="ejemplo.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddDomain()}
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleAddDomain}
                  startIcon={<Plus size={16} />}
                >
                  Agregar
                </Button>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {allowedDomains.map(domain => (
                  <Chip
                    key={domain}
                    label={domain}
                    onDelete={() => handleRemoveDomain(domain)}
                    deleteIcon={<X size={16} />}
                  />
                ))}
                {allowedDomains.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No hay dominios configurados
                  </Typography>
                )}
              </Box>
            </Grid>
          )}
          
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={data.security.invitationSettings.autoApprove}
                  onChange={(e) => handleInvitationSettingsChange('autoApprove', e.target.checked)}
                />
              }
              label="Aprobar automáticamente nuevos usuarios"
            />
          </Grid>
        </Grid>
      </Paper>
      
      {/* Security Tips */}
      <Alert severity="warning" icon={<AlertTriangle />} sx={{ mb: 4 }}>
        <Typography variant="subtitle2" gutterBottom>
          Recomendaciones de seguridad:
        </Typography>
        <List dense>
          <ListItem>
            <ListItemIcon>
              <Info size={16} />
            </ListItemIcon>
            <ListItemText 
              primary="Activa MFA para todos los administradores"
              primaryTypographyProps={{ variant: 'body2' }}
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <Info size={16} />
            </ListItemIcon>
            <ListItemText 
              primary="Establece políticas de contraseña fuertes (mínimo 12 caracteres)"
              primaryTypographyProps={{ variant: 'body2' }}
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <Info size={16} />
            </ListItemIcon>
            <ListItemText 
              primary="Configura tiempos de sesión apropiados según tu industria"
              primaryTypographyProps={{ variant: 'body2' }}
            />
          </ListItem>
        </List>
      </Alert>
      
      {/* Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        {hasChanges && (
          <Chip 
            label="Tienes cambios sin guardar" 
            color="warning" 
            size="small"
            sx={{ mr: 'auto' }}
          />
        )}
        <LoadingButton
          variant="contained"
          loading={isLoading}
          loadingPosition="start"
          startIcon={<Save size={20} />}
          onClick={onSave}
        >
          Guardar Configuración de Seguridad
        </LoadingButton>
      </Box>
    </Box>
  );
};