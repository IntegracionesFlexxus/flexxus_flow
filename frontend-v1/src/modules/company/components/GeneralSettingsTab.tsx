/**
 * General Settings Tab Component - Sprint 3
 * Tab de información general de la empresa
 * Principio SRP: Responsabilidad única para configuración general
 */

import React, { useCallback, useState } from 'react';
import {
  Box,
  Grid,
  TextField,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Avatar,
  IconButton,
  Divider,
  Alert,
  Paper,
  Chip,
  Stack
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import {
  Upload,
  X,
  Building,
  Globe,
  Mail,
  Phone,
  MapPin,
  Save,
  Camera
} from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

// Types
import type { Company, Address, CompanySize, UpdateCompanyRequest } from '@modules/company/types';

interface GeneralSettingsTabProps {
  data: { company: Company };
  onChange: (data: any) => void;
  onSave: () => void;
  isLoading?: boolean;
  hasChanges?: boolean;
}

// Validation schema
const companySchema = yup.object({
  name: yup.string().required('El nombre de la empresa es requerido'),
  legalName: yup.string(),
  email: yup.string().required('El email es requerido').email('Email inválido'),
  phone: yup.string().matches(
    /^[\d\s\-\+\(\)]+$/,
    'Formato de teléfono inválido'
  ),
  website: yup.string().url('URL inválida'),
  industry: yup.string(),
  size: yup.string(),
  taxId: yup.string(),
  address: yup.object({
    street: yup.string(),
    city: yup.string(),
    state: yup.string(),
    country: yup.string().required('El país es requerido'),
    postalCode: yup.string()
  })
});

// Industries list
const INDUSTRIES = [
  'Tecnología',
  'Finanzas',
  'Salud',
  'Educación',
  'Comercio',
  'Manufactura',
  'Servicios',
  'Construcción',
  'Transporte',
  'Energía',
  'Agricultura',
  'Entretenimiento',
  'Otro'
];

/**
 * GeneralSettingsTab Component
 * Clean Code: Componente enfocado en una única responsabilidad
 */
export const GeneralSettingsTab: React.FC<GeneralSettingsTabProps> = ({
  data,
  onChange,
  onSave,
  isLoading = false,
  hasChanges = false
}) => {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
    setValue
  } = useForm<UpdateCompanyRequest>({
    resolver: yupResolver(companySchema),
    defaultValues: {
      name: data.company.name,
      legalName: data.company.legalName,
      email: data.company.email,
      phone: data.company.phone,
      website: data.company.website,
      industry: data.company.industry,
      size: data.company.size,
      taxId: data.company.taxId,
      address: data.company.address || {
        street: '',
        city: '',
        state: '',
        country: '',
        postalCode: ''
      }
    }
  });
  
  // Watch form changes
  const formValues = watch();
  
  // Update parent state when form changes
  React.useEffect(() => {
    if (isDirty) {
      onChange({
        ...data,
        company: {
          ...data.company,
          ...formValues
        }
      });
    }
  }, [formValues, isDirty]);
  
  // Handle logo upload
  const handleLogoUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validar tamaño y tipo
    if (file.size > 5 * 1024 * 1024) { // 5MB
      alert('El archivo no debe superar 5MB');
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      alert('Solo se permiten archivos de imagen');
      return;
    }
    
    setUploadingLogo(true);
    
    // Preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    // TODO: Implementar upload real
    setTimeout(() => {
      setUploadingLogo(false);
      onChange({
        ...data,
        company: {
          ...data.company,
          logo: URL.createObjectURL(file)
        }
      });
    }, 1000);
  }, [data, onChange]);
  
  const handleRemoveLogo = useCallback(() => {
    setLogoPreview(null);
    onChange({
      ...data,
      company: {
        ...data.company,
        logo: undefined
      }
    });
  }, [data, onChange]);
  
  const onSubmitForm = handleSubmit((formData) => {
    onChange({
      ...data,
      company: {
        ...data.company,
        ...formData
      }
    });
    onSave();
  });
  
  return (
    <Box component="form" onSubmit={onSubmitForm} sx={{ p: 4 }}>
      {/* Logo Section */}
      <Paper elevation={0} sx={{ p: 3, mb: 4, bgcolor: 'background.default' }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Camera size={20} />
          Logo de la Empresa
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mt: 2 }}>
          <Avatar
            src={logoPreview || data.company.logo}
            sx={{ width: 100, height: 100 }}
          >
            <Building size={40} />
          </Avatar>
          
          <Stack spacing={1}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<Upload size={18} />}
              disabled={uploadingLogo}
            >
              {uploadingLogo ? 'Subiendo...' : 'Cambiar Logo'}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={handleLogoUpload}
              />
            </Button>
            {(logoPreview || data.company.logo) && (
              <Button
                variant="text"
                color="error"
                size="small"
                onClick={handleRemoveLogo}
                startIcon={<X size={16} />}
              >
                Eliminar
              </Button>
            )}
            <Typography variant="caption" color="text.secondary">
              JPG, PNG o SVG. Máximo 5MB. Recomendado: 200x200px
            </Typography>
          </Stack>
        </Box>
      </Paper>
      
      {/* Basic Information */}
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <Building size={20} />
        Información Básica
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Nombre de la Empresa"
                fullWidth
                required
                error={!!errors.name}
                helperText={errors.name?.message}
              />
            )}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Controller
            name="legalName"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Razón Social"
                fullWidth
                error={!!errors.legalName}
                helperText={errors.legalName?.message || 'Nombre legal de la empresa'}
              />
            )}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Controller
            name="industry"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth>
                <InputLabel>Industria</InputLabel>
                <Select {...field} label="Industria">
                  <MenuItem value="">
                    <em>Seleccionar</em>
                  </MenuItem>
                  {INDUSTRIES.map(industry => (
                    <MenuItem key={industry} value={industry}>
                      {industry}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Controller
            name="size"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth>
                <InputLabel>Tamaño de la Empresa</InputLabel>
                <Select {...field} label="Tamaño de la Empresa">
                  <MenuItem value="">
                    <em>Seleccionar</em>
                  </MenuItem>
                  <MenuItem value={CompanySize.STARTUP}>1-10 empleados</MenuItem>
                  <MenuItem value={CompanySize.SMALL}>11-50 empleados</MenuItem>
                  <MenuItem value={CompanySize.MEDIUM}>51-200 empleados</MenuItem>
                  <MenuItem value={CompanySize.LARGE}>201-1000 empleados</MenuItem>
                  <MenuItem value={CompanySize.ENTERPRISE}>Más de 1000 empleados</MenuItem>
                </Select>
              </FormControl>
            )}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Controller
            name="taxId"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="ID Fiscal / CUIT"
                fullWidth
                error={!!errors.taxId}
                helperText={errors.taxId?.message}
              />
            )}
          />
        </Grid>
      </Grid>
      
      <Divider sx={{ my: 4 }} />
      
      {/* Contact Information */}
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <Phone size={20} />
        Información de Contacto
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Email Corporativo"
                type="email"
                fullWidth
                required
                error={!!errors.email}
                helperText={errors.email?.message}
                InputProps={{
                  startAdornment: <Mail size={18} style={{ marginRight: 8 }} />
                }}
              />
            )}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Teléfono"
                fullWidth
                error={!!errors.phone}
                helperText={errors.phone?.message}
                InputProps={{
                  startAdornment: <Phone size={18} style={{ marginRight: 8 }} />
                }}
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
                error={!!errors.website}
                helperText={errors.website?.message}
                placeholder="https://www.ejemplo.com"
                InputProps={{
                  startAdornment: <Globe size={18} style={{ marginRight: 8 }} />
                }}
              />
            )}
          />
        </Grid>
      </Grid>
      
      <Divider sx={{ my: 4 }} />
      
      {/* Address */}
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <MapPin size={20} />
        Dirección
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Controller
            name="address.street"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Calle y Número"
                fullWidth
                error={!!errors.address?.street}
                helperText={errors.address?.street?.message}
              />
            )}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Controller
            name="address.city"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Ciudad"
                fullWidth
                error={!!errors.address?.city}
                helperText={errors.address?.city?.message}
              />
            )}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Controller
            name="address.state"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Provincia/Estado"
                fullWidth
                error={!!errors.address?.state}
                helperText={errors.address?.state?.message}
              />
            )}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Controller
            name="address.country"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="País"
                fullWidth
                required
                error={!!errors.address?.country}
                helperText={errors.address?.country?.message}
              />
            )}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Controller
            name="address.postalCode"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Código Postal"
                fullWidth
                error={!!errors.address?.postalCode}
                helperText={errors.address?.postalCode?.message}
              />
            )}
          />
        </Grid>
      </Grid>
      
      {/* Status Indicator */}
      {data.company.status && (
        <Alert severity={data.company.status === 'active' ? 'success' : 'warning'} sx={{ mb: 3 }}>
          Estado de la cuenta: <strong>{data.company.status.toUpperCase()}</strong>
        </Alert>
      )}
      
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
          type="submit"
          variant="contained"
          loading={isLoading}
          loadingPosition="start"
          startIcon={<Save size={20} />}
          disabled={!isDirty}
        >
          Guardar Cambios
        </LoadingButton>
      </Box>
    </Box>
  );
};