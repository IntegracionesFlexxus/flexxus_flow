/**
 * Lead Form Component - Sprint 15
 * Form for creating and editing leads with BANT scoring
 */

import React, { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  FormHelperText,
  Typography,
  Box
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import type { LeadFormData } from '../../types';

interface LeadFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: LeadFormData) => void;
  initialData?: Partial<LeadFormData>;
  isLoading?: boolean;
}

export const LeadForm: React.FC<LeadFormProps> = ({
  open,
  onClose,
  onSubmit,
  initialData,
  isLoading = false
}) => {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isValid }
  } = useForm<LeadFormData>({
    defaultValues: {
      status: 'new',
      ...initialData
    },
    mode: 'onChange'
  });

  useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);

  const handleFormSubmit = (data: LeadFormData) => {
    onSubmit(data);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogTitle>
          {initialData ? 'Editar Lead' : 'Nuevo Lead'}
        </DialogTitle>

        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Basic Information */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                Información Básica
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="first_name"
                control={control}
                rules={{ required: 'Nombre requerido' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Nombre"
                    fullWidth
                    error={!!errors.first_name}
                    helperText={errors.first_name?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="last_name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Apellido"
                    fullWidth
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="email"
                control={control}
                rules={{
                  required: 'Email requerido',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Email inválido'
                  }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Email"
                    type="email"
                    fullWidth
                    error={!!errors.email}
                    helperText={errors.email?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Teléfono"
                    fullWidth
                    placeholder="+54 11 XXXX-XXXX"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="company_name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Empresa"
                    fullWidth
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="job_title"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Cargo"
                    fullWidth
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="website"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Sitio Web"
                    fullWidth
                    placeholder="https://www.ejemplo.com"
                  />
                )}
              />
            </Grid>

            {/* BANT Scoring */}
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                Calificación BANT
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="budget"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Presupuesto"
                    type="number"
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">$</InputAdornment>
                      )
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="authority_level"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Nivel de Autoridad</InputLabel>
                    <Select {...field} label="Nivel de Autoridad">
                      <MenuItem value="">Seleccionar</MenuItem>
                      <MenuItem value="decision_maker">Tomador de Decisión</MenuItem>
                      <MenuItem value="influencer">Influenciador</MenuItem>
                      <MenuItem value="user">Usuario</MenuItem>
                      <MenuItem value="other">Otro</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="need_description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Descripción de Necesidad"
                    multiline
                    rows={3}
                    fullWidth
                    helperText="Describe el problema o necesidad que tiene el lead"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="timeline"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Timeline</InputLabel>
                    <Select {...field} label="Timeline">
                      <MenuItem value="">Seleccionar</MenuItem>
                      <MenuItem value="immediate">Inmediato</MenuItem>
                      <MenuItem value="1_month">1 Mes</MenuItem>
                      <MenuItem value="3_months">3 Meses</MenuItem>
                      <MenuItem value="6_months">6 Meses</MenuItem>
                      <MenuItem value="1_year">1 Año</MenuItem>
                      <MenuItem value="unknown">Desconocido</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Estado</InputLabel>
                    <Select {...field} label="Estado">
                      <MenuItem value="new">Nuevo</MenuItem>
                      <MenuItem value="contacted">Contactado</MenuItem>
                      <MenuItem value="qualified">Calificado</MenuItem>
                      <MenuItem value="unqualified">No Calificado</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            {/* Additional Information */}
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                Información Adicional
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Notas / Descripción"
                    multiline
                    rows={4}
                    fullWidth
                    helperText="Información adicional sobre el lead"
                  />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!isValid || isLoading}
          >
            {isLoading ? 'Guardando...' : initialData ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};