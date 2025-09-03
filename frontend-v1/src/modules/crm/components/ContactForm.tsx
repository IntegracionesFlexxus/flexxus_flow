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
  MenuItem,
  Chip,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  CircularProgress,
  IconButton,
  InputAdornment
} from '@mui/material';
import {
  Save,
  Cancel,
  Person,
  Email,
  Phone,
  Business,
  LocationOn,
  LinkedIn,
  Twitter,
  Facebook,
  Add,
  Delete
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';

// Formulario de contacto CRM - MVP Nivel 1
// TODO: En Nivel 2 agregar campos personalizados, duplicados, importación masiva

interface ContactFormData {
  // Información básica
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  mobile?: string;
  
  // Información profesional
  company?: string;
  jobTitle?: string;
  department?: string;
  
  // Dirección
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  
  // Información adicional
  leadSource?: string;
  status?: string;
  tags?: string[];
  notes?: string;
  birthDate?: Date;
  
  // Redes sociales
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  website?: string;
}

const leadSources = [
  'Sitio Web',
  'Referido',
  'Redes Sociales',
  'Email Marketing',
  'Evento',
  'Llamada en Frío',
  'Partner',
  'Otro'
];

const contactStatuses = [
  'Nuevo',
  'Contactado',
  'Calificado',
  'Propuesta',
  'Negociación',
  'Ganado',
  'Perdido'
];

const availableTags = [
  'Cliente Potencial',
  'Cliente Actual',
  'Partner',
  'Proveedor',
  'VIP',
  'Influencer',
  'Decision Maker',
  'Technical Contact'
];

interface ContactFormProps {
  contact?: ContactFormData;
  onSubmit: (data: ContactFormData) => Promise<void>;
  onCancel: () => void;
}

export function ContactForm({ contact, onSubmit, onCancel }: ContactFormProps) {
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    watch,
    setValue
  } = useForm<ContactFormData>({
    defaultValues: contact || {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      status: 'Nuevo',
      tags: [],
      leadSource: 'Sitio Web'
    }
  });

  const selectedTags = watch('tags') || [];

  const handleFormSubmit = async (data: ContactFormData) => {
    try {
      setApiError(null);
      setSuccessMessage(null);
      
      await onSubmit(data);
      
      setSuccessMessage(contact ? 'Contacto actualizado exitosamente' : 'Contacto creado exitosamente');
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Error al guardar contacto';
      setApiError(message);
    }
  };

  const handleTagToggle = (tag: string) => {
    const currentTags = selectedTags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    setValue('tags', newTags, { shouldDirty: true });
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <Paper elevation={0}>
        <Box component="form" onSubmit={handleSubmit(handleFormSubmit)} p={3}>
          <Typography variant="h5" gutterBottom>
            {contact ? 'Editar Contacto' : 'Nuevo Contacto'}
          </Typography>
          
          <Divider sx={{ my: 2 }} />

          {apiError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setApiError(null)}>
              {apiError}
            </Alert>
          )}
          
          {successMessage && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>
              {successMessage}
            </Alert>
          )}

          {/* Información básica */}
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
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
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person color="action" />
                    </InputAdornment>
                  ),
                }}
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
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email color="action" />
                    </InputAdornment>
                  ),
                }}
                disabled={isSubmitting}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                {...register('phone', {
                  required: 'El teléfono es requerido'
                })}
                fullWidth
                label="Teléfono"
                error={!!errors.phone}
                helperText={errors.phone?.message}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Phone color="action" />
                    </InputAdornment>
                  ),
                }}
                disabled={isSubmitting}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                {...register('mobile')}
                fullWidth
                label="Móvil (Opcional)"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Phone color="action" />
                    </InputAdornment>
                  ),
                }}
                disabled={isSubmitting}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="birthDate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="Fecha de Nacimiento"
                    value={field.value || null}
                    onChange={field.onChange}
                    disabled={isSubmitting}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!errors.birthDate,
                        helperText: errors.birthDate?.message
                      }
                    }}
                  />
                )}
              />
            </Grid>
          </Grid>

          {/* Información profesional */}
          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Información Profesional
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                {...register('company')}
                fullWidth
                label="Empresa"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Business color="action" />
                    </InputAdornment>
                  ),
                }}
                disabled={isSubmitting}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                {...register('jobTitle')}
                fullWidth
                label="Cargo"
                disabled={isSubmitting}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                {...register('department')}
                fullWidth
                label="Departamento"
                disabled={isSubmitting}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                {...register('website')}
                fullWidth
                label="Sitio Web"
                type="url"
                disabled={isSubmitting}
              />
            </Grid>
          </Grid>

          {/* Estado y origen */}
          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Clasificación
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Estado</InputLabel>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      label="Estado"
                      disabled={isSubmitting}
                    >
                      {contactStatuses.map(status => (
                        <MenuItem key={status} value={status}>
                          {status}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Origen</InputLabel>
                <Controller
                  name="leadSource"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      label="Origen"
                      disabled={isSubmitting}
                    >
                      {leadSources.map(source => (
                        <MenuItem key={source} value={source}>
                          {source}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
              </FormControl>
            </Grid>
          </Grid>

          {/* Etiquetas */}
          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Etiquetas
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {availableTags.map(tag => (
              <Chip
                key={tag}
                label={tag}
                onClick={() => handleTagToggle(tag)}
                color={selectedTags?.includes(tag) ? 'primary' : 'default'}
                variant={selectedTags?.includes(tag) ? 'filled' : 'outlined'}
                disabled={isSubmitting}
              />
            ))}
          </Box>

          {/* Dirección */}
          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Dirección
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                {...register('address')}
                fullWidth
                label="Dirección"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationOn color="action" />
                    </InputAdornment>
                  ),
                }}
                disabled={isSubmitting}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                {...register('city')}
                fullWidth
                label="Ciudad"
                disabled={isSubmitting}
              />
            </Grid>
            
            <Grid item xs={12} sm={3}>
              <TextField
                {...register('state')}
                fullWidth
                label="Estado/Provincia"
                disabled={isSubmitting}
              />
            </Grid>
            
            <Grid item xs={12} sm={3}>
              <TextField
                {...register('postalCode')}
                fullWidth
                label="Código Postal"
                disabled={isSubmitting}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                {...register('country')}
                fullWidth
                label="País"
                disabled={isSubmitting}
              />
            </Grid>
          </Grid>

          {/* Redes sociales */}
          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Redes Sociales
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField
                {...register('linkedin')}
                fullWidth
                label="LinkedIn"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LinkedIn color="action" />
                    </InputAdornment>
                  ),
                }}
                disabled={isSubmitting}
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                {...register('twitter')}
                fullWidth
                label="Twitter"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Twitter color="action" />
                    </InputAdornment>
                  ),
                }}
                disabled={isSubmitting}
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                {...register('facebook')}
                fullWidth
                label="Facebook"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Facebook color="action" />
                    </InputAdornment>
                  ),
                }}
                disabled={isSubmitting}
              />
            </Grid>
          </Grid>

          {/* Notas */}
          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Notas
          </Typography>
          
          <TextField
            {...register('notes')}
            fullWidth
            label="Notas adicionales"
            multiline
            rows={4}
            disabled={isSubmitting}
          />

          {/* Botones de acción */}
          <Box sx={{ display: 'flex', gap: 2, mt: 4, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={onCancel}
              startIcon={<Cancel />}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            
            <Button
              type="submit"
              variant="contained"
              startIcon={isSubmitting ? <CircularProgress size={20} /> : <Save />}
              disabled={isSubmitting || !isDirty}
            >
              {isSubmitting ? 'Guardando...' : (contact ? 'Actualizar' : 'Crear')}
            </Button>
          </Box>
        </Box>
      </Paper>
    </LocalizationProvider>
  );
}

export default ContactForm;