import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Grid,
  Paper,
  Divider,
  Switch,
  FormControlLabel,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  Select,
  MenuItem,
  InputLabel,
  Tabs,
  Tab,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Slider,
  Chip
} from '@mui/material';
import {
  Save,
  Notifications,
  Security,
  Language,
  Palette,
  Business,
  Person,
  Email,
  Phone,
  Delete,
  Add
} from '@mui/icons-material';

// Formulario de configuración - MVP Nivel 1
// TODO: En Nivel 2 agregar configuración avanzada, API keys, webhooks

interface SettingsFormData {
  // Información personal
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  timezone: string;
  language: string;
  
  // Notificaciones
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  notificationFrequency: 'realtime' | 'daily' | 'weekly';
  notificationTypes: {
    messages: boolean;
    mentions: boolean;
    tasks: boolean;
    updates: boolean;
    marketing: boolean;
  };
  
  // Apariencia
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large';
  compactMode: boolean;
  colorScheme: string;
  
  // Empresa
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  companyWebsite: string;
  
  // Seguridad
  twoFactorAuth: boolean;
  sessionTimeout: number;
  passwordExpiry: number;
  ipWhitelist: string[];
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export function SettingsForm() {
  const [tabValue, setTabValue] = useState(0);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [ipWhitelist, setIpWhitelist] = useState<string[]>(['']);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    watch,
    reset
  } = useForm<SettingsFormData>({
    defaultValues: {
      firstName: 'Juan',
      lastName: 'Pérez',
      email: 'juan.perez@empresa.com',
      phone: '+1234567890',
      timezone: 'America/Mexico_City',
      language: 'es',
      
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      notificationFrequency: 'realtime',
      notificationTypes: {
        messages: true,
        mentions: true,
        tasks: true,
        updates: false,
        marketing: false
      },
      
      theme: 'light',
      fontSize: 'medium',
      compactMode: false,
      colorScheme: 'blue',
      
      companyName: 'Mi Empresa',
      companyEmail: 'contacto@empresa.com',
      companyPhone: '+1234567890',
      companyAddress: 'Calle Principal 123',
      companyWebsite: 'https://empresa.com',
      
      twoFactorAuth: false,
      sessionTimeout: 30,
      passwordExpiry: 90,
      ipWhitelist: []
    }
  });

  const theme = watch('theme');
  const fontSize = watch('fontSize');

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const onSubmit = async (data: SettingsFormData) => {
    try {
      setApiError(null);
      setSuccessMessage(null);
      
      // TODO: Reemplazar con llamada real a API
      console.log('Guardando configuración:', data);
      
      // Simulación de guardado
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setSuccessMessage('Configuración guardada exitosamente');
      reset(data); // Reset form with new values to clear dirty state
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Error al guardar configuración';
      setApiError(message);
    }
  };

  const addIpAddress = () => {
    setIpWhitelist([...ipWhitelist, '']);
  };

  const removeIpAddress = (index: number) => {
    setIpWhitelist(ipWhitelist.filter((_, i) => i !== index));
  };

  const updateIpAddress = (index: number, value: string) => {
    const updated = [...ipWhitelist];
    updated[index] = value;
    setIpWhitelist(updated);
  };

  return (
    <Paper elevation={0}>
      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} variant="scrollable">
            <Tab icon={<Person />} label="Perfil" />
            <Tab icon={<Notifications />} label="Notificaciones" />
            <Tab icon={<Palette />} label="Apariencia" />
            <Tab icon={<Business />} label="Empresa" />
            <Tab icon={<Security />} label="Seguridad" />
          </Tabs>
        </Box>

        {apiError && (
          <Alert severity="error" sx={{ m: 2 }} onClose={() => setApiError(null)}>
            {apiError}
          </Alert>
        )}
        
        {successMessage && (
          <Alert severity="success" sx={{ m: 2 }} onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        )}

        {/* Tab: Perfil */}
        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>
            Información Personal
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                {...register('firstName', {
                  required: 'El nombre es requerido'
                })}
                fullWidth
                label="Nombre"
                error={!!errors.firstName}
                helperText={errors.firstName?.message}
                disabled={isSubmitting}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                {...register('lastName', {
                  required: 'El apellido es requerido'
                })}
                fullWidth
                label="Apellido"
                error={!!errors.lastName}
                helperText={errors.lastName?.message}
                disabled={isSubmitting}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                {...register('email', {
                  required: 'El email es requerido',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Email inválido'
                  }
                })}
                fullWidth
                label="Email"
                type="email"
                error={!!errors.email}
                helperText={errors.email?.message}
                disabled={isSubmitting}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                {...register('phone')}
                fullWidth
                label="Teléfono"
                disabled={isSubmitting}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Zona Horaria</InputLabel>
                <Controller
                  name="timezone"
                  control={control}
                  render={({ field }) => (
                    <Select {...field} label="Zona Horaria" disabled={isSubmitting}>
                      <MenuItem value="America/New_York">Nueva York (EST)</MenuItem>
                      <MenuItem value="America/Chicago">Chicago (CST)</MenuItem>
                      <MenuItem value="America/Denver">Denver (MST)</MenuItem>
                      <MenuItem value="America/Los_Angeles">Los Angeles (PST)</MenuItem>
                      <MenuItem value="America/Mexico_City">Ciudad de México</MenuItem>
                      <MenuItem value="America/Buenos_Aires">Buenos Aires</MenuItem>
                      <MenuItem value="Europe/London">Londres</MenuItem>
                      <MenuItem value="Europe/Madrid">Madrid</MenuItem>
                    </Select>
                  )}
                />
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Idioma</InputLabel>
                <Controller
                  name="language"
                  control={control}
                  render={({ field }) => (
                    <Select {...field} label="Idioma" disabled={isSubmitting}>
                      <MenuItem value="es">Español</MenuItem>
                      <MenuItem value="en">English</MenuItem>
                      <MenuItem value="pt">Português</MenuItem>
                    </Select>
                  )}
                />
              </FormControl>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab: Notificaciones */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Preferencias de Notificación
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Controller
                    name="emailNotifications"
                    control={control}
                    render={({ field }) => (
                      <Switch {...field} checked={field.value} disabled={isSubmitting} />
                    )}
                  />
                }
                label="Notificaciones por Email"
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Controller
                    name="pushNotifications"
                    control={control}
                    render={({ field }) => (
                      <Switch {...field} checked={field.value} disabled={isSubmitting} />
                    )}
                  />
                }
                label="Notificaciones Push"
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Controller
                    name="smsNotifications"
                    control={control}
                    render={({ field }) => (
                      <Switch {...field} checked={field.value} disabled={isSubmitting} />
                    )}
                  />
                }
                label="Notificaciones SMS"
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
            </Grid>

            <Grid item xs={12}>
              <FormControl component="fieldset">
                <FormLabel component="legend">Frecuencia de Notificaciones</FormLabel>
                <Controller
                  name="notificationFrequency"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup {...field} disabled={isSubmitting}>
                      <FormControlLabel value="realtime" control={<Radio />} label="Tiempo Real" />
                      <FormControlLabel value="daily" control={<Radio />} label="Resumen Diario" />
                      <FormControlLabel value="weekly" control={<Radio />} label="Resumen Semanal" />
                    </RadioGroup>
                  )}
                />
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Tipos de Notificación
              </Typography>
              
              <List>
                <ListItem>
                  <ListItemText 
                    primary="Mensajes"
                    secondary="Nuevos mensajes en conversaciones"
                  />
                  <ListItemSecondaryAction>
                    <Controller
                      name="notificationTypes.messages"
                      control={control}
                      render={({ field }) => (
                        <Switch {...field} checked={field.value} disabled={isSubmitting} />
                      )}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                
                <ListItem>
                  <ListItemText 
                    primary="Menciones"
                    secondary="Cuando alguien te menciona"
                  />
                  <ListItemSecondaryAction>
                    <Controller
                      name="notificationTypes.mentions"
                      control={control}
                      render={({ field }) => (
                        <Switch {...field} checked={field.value} disabled={isSubmitting} />
                      )}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                
                <ListItem>
                  <ListItemText 
                    primary="Tareas"
                    secondary="Asignación y vencimiento de tareas"
                  />
                  <ListItemSecondaryAction>
                    <Controller
                      name="notificationTypes.tasks"
                      control={control}
                      render={({ field }) => (
                        <Switch {...field} checked={field.value} disabled={isSubmitting} />
                      )}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                
                <ListItem>
                  <ListItemText 
                    primary="Actualizaciones"
                    secondary="Actualizaciones del sistema"
                  />
                  <ListItemSecondaryAction>
                    <Controller
                      name="notificationTypes.updates"
                      control={control}
                      render={({ field }) => (
                        <Switch {...field} checked={field.value} disabled={isSubmitting} />
                      )}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                
                <ListItem>
                  <ListItemText 
                    primary="Marketing"
                    secondary="Noticias y ofertas"
                  />
                  <ListItemSecondaryAction>
                    <Controller
                      name="notificationTypes.marketing"
                      control={control}
                      render={({ field }) => (
                        <Switch {...field} checked={field.value} disabled={isSubmitting} />
                      )}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab: Apariencia */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Personalización de Interfaz
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl component="fieldset">
                <FormLabel component="legend">Tema</FormLabel>
                <Controller
                  name="theme"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup {...field} row disabled={isSubmitting}>
                      <FormControlLabel value="light" control={<Radio />} label="Claro" />
                      <FormControlLabel value="dark" control={<Radio />} label="Oscuro" />
                      <FormControlLabel value="auto" control={<Radio />} label="Automático" />
                    </RadioGroup>
                  )}
                />
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Typography gutterBottom>Tamaño de Fuente</Typography>
              <Controller
                name="fontSize"
                control={control}
                render={({ field }) => (
                  <Slider
                    {...field}
                    value={field.value === 'small' ? 0 : field.value === 'medium' ? 1 : 2}
                    onChange={(e, value) => {
                      field.onChange(value === 0 ? 'small' : value === 1 ? 'medium' : 'large');
                    }}
                    marks={[
                      { value: 0, label: 'Pequeño' },
                      { value: 1, label: 'Mediano' },
                      { value: 2, label: 'Grande' }
                    ]}
                    min={0}
                    max={2}
                    step={1}
                    disabled={isSubmitting}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Controller
                    name="compactMode"
                    control={control}
                    render={({ field }) => (
                      <Switch {...field} checked={field.value} disabled={isSubmitting} />
                    )}
                  />
                }
                label="Modo Compacto"
              />
            </Grid>

            <Grid item xs={12}>
              <Typography gutterBottom>Esquema de Color</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {['blue', 'green', 'purple', 'orange', 'red'].map(color => (
                  <Controller
                    key={color}
                    name="colorScheme"
                    control={control}
                    render={({ field }) => (
                      <Box
                        onClick={() => field.onChange(color)}
                        sx={{
                          width: 40,
                          height: 40,
                          bgcolor: `${color}.main`,
                          borderRadius: 1,
                          cursor: 'pointer',
                          border: field.value === color ? '3px solid' : 'none',
                          borderColor: 'primary.main'
                        }}
                      />
                    )}
                  />
                ))}
              </Box>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab: Empresa */}
        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>
            Información de la Empresa
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                {...register('companyName')}
                fullWidth
                label="Nombre de la Empresa"
                disabled={isSubmitting}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                {...register('companyEmail')}
                fullWidth
                label="Email de Contacto"
                type="email"
                disabled={isSubmitting}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                {...register('companyPhone')}
                fullWidth
                label="Teléfono"
                disabled={isSubmitting}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                {...register('companyAddress')}
                fullWidth
                label="Dirección"
                multiline
                rows={2}
                disabled={isSubmitting}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                {...register('companyWebsite')}
                fullWidth
                label="Sitio Web"
                type="url"
                disabled={isSubmitting}
              />
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab: Seguridad */}
        <TabPanel value={tabValue} index={4}>
          <Typography variant="h6" gutterBottom>
            Configuración de Seguridad
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Controller
                    name="twoFactorAuth"
                    control={control}
                    render={({ field }) => (
                      <Switch {...field} checked={field.value} disabled={isSubmitting} />
                    )}
                  />
                }
                label="Autenticación de Dos Factores"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography gutterBottom>
                Tiempo de Sesión (minutos)
              </Typography>
              <Controller
                name="sessionTimeout"
                control={control}
                render={({ field }) => (
                  <Slider
                    {...field}
                    min={5}
                    max={120}
                    step={5}
                    marks={[
                      { value: 5, label: '5' },
                      { value: 30, label: '30' },
                      { value: 60, label: '60' },
                      { value: 120, label: '120' }
                    ]}
                    valueLabelDisplay="auto"
                    disabled={isSubmitting}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography gutterBottom>
                Expiración de Contraseña (días)
              </Typography>
              <Controller
                name="passwordExpiry"
                control={control}
                render={({ field }) => (
                  <Slider
                    {...field}
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
                    disabled={isSubmitting}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                  Lista Blanca de IPs
                </Typography>
                <Button
                  startIcon={<Add />}
                  onClick={addIpAddress}
                  disabled={isSubmitting}
                  size="small"
                >
                  Agregar IP
                </Button>
              </Box>
              
              {ipWhitelist.map((ip, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    value={ip}
                    onChange={(e) => updateIpAddress(index, e.target.value)}
                    placeholder="192.168.1.1"
                    disabled={isSubmitting}
                  />
                  <IconButton
                    onClick={() => removeIpAddress(index)}
                    disabled={isSubmitting}
                    color="error"
                  >
                    <Delete />
                  </IconButton>
                </Box>
              ))}
            </Grid>
          </Grid>
        </TabPanel>

        {/* Botones de acción */}
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => reset()}
            disabled={isSubmitting || !isDirty}
          >
            Descartar Cambios
          </Button>
          
          <Button
            type="submit"
            variant="contained"
            startIcon={isSubmitting ? <CircularProgress size={20} /> : <Save />}
            disabled={isSubmitting || !isDirty}
          >
            {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}

export default SettingsForm;