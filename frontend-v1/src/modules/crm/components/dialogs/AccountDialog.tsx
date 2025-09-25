/**
 * Account Dialog Component
 * Form for creating and editing accounts
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Box,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Business as BusinessIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Language as WebIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  Info as InfoIcon,
  LocationOn as LocationIcon,
  AttachMoney as MoneyIcon,
  AttachMoney,
  Group as GroupIcon
} from '@mui/icons-material';
import { Account, AccountFormData, AccountType, AccountRating, TaxCondition } from '../../types/account.types';
import { formatCUIT } from '../../utils/cuitValidator';

interface AccountDialogProps {
  open: boolean;
  onClose: () => void;
  account?: Account | null;
  onSave?: (data: AccountFormData) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div hidden={value !== index}>
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const AccountDialog: React.FC<AccountDialogProps> = ({
  open,
  onClose,
  account,
  onSave
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<AccountFormData>({
    name: '',
    type: 'prospect',
    website: undefined,
    phone: undefined,
    email: undefined,
    cuit: undefined,
    tax_condition: 'responsable_inscripto',
    industry_id: undefined,
    annual_revenue: undefined,
    employees_count: undefined,
    description: undefined,
    rating: undefined,
    ownership: undefined,
    owner_id: undefined,
    billing_street: undefined,
    billing_city: undefined,
    billing_state: undefined,
    billing_postal_code: undefined,
    billing_country: 'Argentina',
    shipping_street: undefined,
    shipping_city: undefined,
    shipping_state: undefined,
    shipping_postal_code: undefined,
    shipping_country: 'Argentina'
  });

  const accountTypes: AccountType[] = ['customer', 'prospect', 'partner', 'competitor', 'vendor', 'other'];
  const accountRatings: AccountRating[] = ['hot', 'warm', 'cold'];
  const taxConditions: TaxCondition[] = [
    'responsable_inscripto',
    'monotributo',
    'exento',
    'consumidor_final',
    'no_categorizado'
  ];

  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name,
        type: account.type,
        website: account.website || '',
        phone: account.phone || '',
        email: account.email || '',
        cuit: account.cuit || '',
        tax_condition: account.tax_condition || 'responsable_inscripto',
        industry_id: account.industry_id,
        annual_revenue: account.annual_revenue,
        employees_count: account.employees_count,
        description: account.description || '',
        rating: account.rating,
        ownership: account.ownership || '',
        owner_id: account.owner_id,
        billing_street: account.billing_street || '',
        billing_city: account.billing_city || '',
        billing_state: account.billing_state || '',
        billing_postal_code: account.billing_postal_code || '',
        billing_country: account.billing_country || 'Argentina',
        shipping_street: account.shipping_street || '',
        shipping_city: account.shipping_city || '',
        shipping_state: account.shipping_state || '',
        shipping_postal_code: account.shipping_postal_code || '',
        shipping_country: account.shipping_country || 'Argentina'
      });
    }
  }, [account]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'El nombre de la cuenta es requerido';
    }

    if (!formData.type) {
      newErrors.type = 'El tipo de cuenta es requerido';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (formData.cuit && formData.cuit.length > 0) {
      // Simple CUIT validation (11 digits)
      const cleanCuit = formData.cuit.replace(/[-\s]/g, '');
      if (!/^\d{11}$/.test(cleanCuit)) {
        newErrors.cuit = 'CUIT debe tener 11 dígitos';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    console.log('=== AccountDialog handleSubmit ===');
    console.log('FormData antes de validar:', formData);

    if (!validateForm()) {
      console.log('Validación falló, errores:', errors);
      setTabValue(0); // Switch to basic info tab if validation fails
      return;
    }

    console.log('Validación exitosa, enviando datos...');

    // Limpiar los datos antes de enviar
    const cleanedData = { ...formData };

    // Procesar cada campo para eliminar strings vacíos
    Object.keys(cleanedData).forEach(key => {
      const value = cleanedData[key];

      // Si es string vacío o solo espacios, eliminar el campo
      if (typeof value === 'string' && value.trim() === '') {
        delete cleanedData[key];
      }
      // Para el campo website específicamente, agregar protocolo si tiene valor
      else if (key === 'website' && value && typeof value === 'string') {
        const trimmedWebsite = value.trim();
        if (trimmedWebsite && !trimmedWebsite.match(/^https?:\/\//)) {
          cleanedData[key] = `https://${trimmedWebsite}`;
        }
      }
    });

    console.log('FormData limpio a enviar:', cleanedData);

    setLoading(true);
    try {
      await onSave?.(cleanedData);
      console.log('onSave ejecutado exitosamente');
      onClose();
      // Reset form after successful save
      setFormData({
        name: '',
        type: 'prospect',
        website: undefined,
        phone: undefined,
        email: undefined,
        cuit: undefined,
        tax_condition: 'responsable_inscripto',
        industry_id: undefined,
        annual_revenue: undefined,
        employees_count: undefined,
        description: undefined,
        rating: undefined,
        ownership: undefined,
        owner_id: undefined,
        billing_street: undefined,
        billing_city: undefined,
        billing_state: undefined,
        billing_postal_code: undefined,
        billing_country: 'Argentina',
        shipping_street: undefined,
        shipping_city: undefined,
        shipping_state: undefined,
        shipping_postal_code: undefined,
        shipping_country: 'Argentina'
      });
      setErrors({});
    } catch (error) {
      console.error('Error saving account:', error);
      setErrors({ submit: 'Error al guardar la cuenta' });
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    // Convertir string vacío a undefined para campos opcionales
    const cleanValue = value === '' ? undefined : value;

    setFormData(prev => ({
      ...prev,
      [field]: cleanValue
    }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleCopyBillingToShipping = () => {
    setFormData(prev => ({
      ...prev,
      shipping_street: prev.billing_street,
      shipping_city: prev.billing_city,
      shipping_state: prev.billing_state,
      shipping_postal_code: prev.billing_postal_code,
      shipping_country: prev.billing_country
    }));
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<AccountType, string> = {
      customer: 'Cliente',
      prospect: 'Prospecto',
      partner: 'Socio',
      competitor: 'Competidor',
      vendor: 'Proveedor',
      other: 'Otro'
    };
    return labels[type as AccountType] || type;
  };

  const getRatingLabel = (rating: string) => {
    const labels: Record<AccountRating, string> = {
      hot: '🔥 Caliente',
      warm: '☀️ Tibio',
      cold: '❄️ Frío'
    };
    return labels[rating as AccountRating] || rating;
  };

  const getTaxConditionLabel = (condition: string) => {
    const labels: Record<TaxCondition, string> = {
      responsable_inscripto: 'Responsable Inscripto',
      monotributo: 'Monotributo',
      exento: 'Exento',
      consumidor_final: 'Consumidor Final',
      no_categorizado: 'No Categorizado'
    };
    return labels[condition as TaxCondition] || condition;
  };

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
      <DialogTitle sx={{ m: 0, p: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <BusinessIcon color="primary" />
            <Typography variant="h6">
              {account ? 'Editar Cuenta' : 'Nueva Cuenta'}
            </Typography>
          </Box>
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{ color: (theme) => theme.palette.grey[500] }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label="Información Básica" icon={<InfoIcon />} iconPosition="start" />
            <Tab label="Dirección" icon={<LocationIcon />} iconPosition="start" />
            <Tab label="Detalles del Negocio" icon={<MoneyIcon />} iconPosition="start" />
          </Tabs>
        </Box>

        <Box sx={{ p: 3 }}>
          {errors.submit && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errors.submit}
            </Alert>
          )}

          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nombre de la Cuenta"
                  value={formData.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  error={!!errors.name}
                  helperText={errors.name}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <BusinessIcon />
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Tipo de Cuenta</InputLabel>
                  <Select
                    value={formData.type}
                    label="Tipo de Cuenta"
                    onChange={(e) => handleFieldChange('type', e.target.value)}
                    error={!!errors.type}
                  >
                    {accountTypes.map(type => (
                      <MenuItem key={type} value={type}>
                        {getTypeLabel(type)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="CUIT"
                  value={formData.cuit || ''}
                  onChange={(e) => handleFieldChange('cuit', e.target.value || undefined)}
                  error={!!errors.cuit}
                  helperText={errors.cuit || (formData.cuit && `Formato: ${formatCUIT(formData.cuit)}`)}
                  placeholder="XX-XXXXXXXX-X"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Condición Fiscal</InputLabel>
                  <Select
                    value={formData.tax_condition}
                    label="Condición Fiscal"
                    onChange={(e) => handleFieldChange('tax_condition', e.target.value)}
                  >
                    {taxConditions.map(condition => (
                      <MenuItem key={condition} value={condition}>
                        {getTaxConditionLabel(condition)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  error={!!errors.email}
                  helperText={errors.email}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon />
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Teléfono"
                  value={formData.phone || ''}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PhoneIcon />
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Sitio Web"
                  value={formData.website || ''}
                  onChange={(e) => handleFieldChange('website', e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <WebIcon />
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Clasificación</InputLabel>
                  <Select
                    value={formData.rating || ''}
                    label="Clasificación"
                    onChange={(e) => handleFieldChange('rating', e.target.value)}
                  >
                    <MenuItem value="">Sin clasificar</MenuItem>
                    {accountRatings.map(rating => (
                      <MenuItem key={rating} value={rating}>
                        {getRatingLabel(rating)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Descripción"
                  multiline
                  rows={3}
                  value={formData.description || ''}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                />
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  Dirección de Facturación
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Calle"
                  value={formData.billing_street || ''}
                  onChange={(e) => handleFieldChange('billing_street', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Ciudad"
                  value={formData.billing_city || ''}
                  onChange={(e) => handleFieldChange('billing_city', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Provincia"
                  value={formData.billing_state || ''}
                  onChange={(e) => handleFieldChange('billing_state', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Código Postal"
                  value={formData.billing_postal_code || ''}
                  onChange={(e) => handleFieldChange('billing_postal_code', e.target.value)}
                />
              </Grid>

              <Grid item xs={12}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle1" fontWeight="bold">
                    Dirección de Envío
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleCopyBillingToShipping}
                  >
                    Copiar de Facturación
                  </Button>
                </Box>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Calle"
                  value={formData.shipping_street || ''}
                  onChange={(e) => handleFieldChange('shipping_street', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Ciudad"
                  value={formData.shipping_city || ''}
                  onChange={(e) => handleFieldChange('shipping_city', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Provincia"
                  value={formData.shipping_state || ''}
                  onChange={(e) => handleFieldChange('shipping_state', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Código Postal"
                  value={formData.shipping_postal_code || ''}
                  onChange={(e) => handleFieldChange('shipping_postal_code', e.target.value)}
                />
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Ingresos Anuales"
                  type="number"
                  value={formData.annual_revenue || ''}
                  onChange={(e) => handleFieldChange('annual_revenue', e.target.value ? Number(e.target.value) : undefined)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AttachMoney />
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Cantidad de Empleados"
                  type="number"
                  value={formData.employees_count || ''}
                  onChange={(e) => handleFieldChange('employees_count', e.target.value ? Number(e.target.value) : undefined)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <GroupIcon />
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Propiedad"
                  value={formData.ownership || ''}
                  onChange={(e) => handleFieldChange('ownership', e.target.value)}
                  helperText="Ej: Pública, Privada, Subsidiaria, etc."
                />
              </Grid>
            </Grid>
          </TabPanel>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
        >
          {account ? 'Actualizar' : 'Crear'} Cuenta
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AccountDialog;