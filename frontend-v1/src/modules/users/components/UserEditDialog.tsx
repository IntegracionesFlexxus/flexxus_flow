import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Autocomplete,
  Tooltip
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Info as InfoIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';

interface UserEditDialogProps {
  open: boolean;
  onClose: () => void;
  user?: any;
  onSave?: (userData: any) => Promise<void>;
  roles?: Array<{ id: string; name: string; description: string }>;
  companies?: Array<{ id: string; name: string }>;
  mode?: 'create' | 'edit';
  companyId?: string;
  isSuperAdmin?: boolean;
}

interface FormData {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  password?: string;
  confirmPassword?: string;
  phone: string;
  emailVerified: boolean;
}

const getValidationSchema = (mode: 'create' | 'edit') => Yup.object({
  email: Yup.string()
    .email('Email inválido')
    .required('Email es requerido'),
  firstName: Yup.string()
    .min(2, 'Mínimo 2 caracteres')
    .required('Nombre es requerido'),
  lastName: Yup.string()
    .min(2, 'Mínimo 2 caracteres')
    .required('Apellido es requerido'),
  role: Yup.string().required('Rol es requerido'),
  status: Yup.string().required('Estado es requerido'),
  phone: Yup.string().notRequired(),
  emailVerified: Yup.boolean().default(false),
  password: mode === 'create'
    ? Yup.string()
        .min(8, 'Mínimo 8 caracteres')
        .matches(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/,
          'Debe contener mayúsculas, minúsculas, números y al menos un carácter especial (@$!%*?&#)'
        )
        .test('no-weak-patterns', 'No debe contener patrones débiles (123, abc, qwerty, etc.)',
          (value) => {
            if (!value) return true;
            const weakPatterns = ['123', '234', '345', 'abc', 'qwerty', 'password', '111', '000'];
            const lowerValue = value.toLowerCase();
            return !weakPatterns.some(pattern => lowerValue.includes(pattern));
          }
        )
        .required('Contraseña es requerida')
    : Yup.string().notRequired(),
  confirmPassword: Yup.string().when('password', {
    is: (val: string) => val && val.length > 0,
    then: (schema) => schema
      .oneOf([Yup.ref('password')], 'Las contraseñas no coinciden')
      .required('Confirmar contraseña es requerido'),
    otherwise: (schema) => schema.notRequired()
  })
});

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`user-tabpanel-${index}`}
      aria-labelledby={`user-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

export const UserEditDialog: React.FC<UserEditDialogProps> = ({
  open,
  onClose,
  user,
  onSave,
  roles = [],
  companies = [],
  mode = 'create',
  companyId,
  isSuperAdmin = false
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
    setValue
  } = useForm<FormData>({
    resolver: yupResolver(getValidationSchema(mode)),
    defaultValues: {
      email: user?.email || '',
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      role: user?.roleId || user?.role || '',  // Usar roleId si está disponible
      status: user?.status || 'active',
      password: '',
      confirmPassword: '',
      phone: user?.phone || '',
      emailVerified: user?.emailVerified || false
    }
  });

  // Effect para resetear el formulario cuando se abre el dialog o cambia el usuario
  useEffect(() => {
    if (open) {
      if (user && mode === 'edit') {
        // Resetear el formulario con los datos del usuario
        reset({
          email: user.email || '',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          role: user.roleId || user.role || '',
          status: user.status || 'active',
          password: '',
          confirmPassword: '',
          phone: user.phone || '',
          emailVerified: user.emailVerified || false
        });

        // Establecer las empresas seleccionadas
        if (user.companies?.length > 0) {
          setSelectedCompanies(user.companies.map((c: any) => c.id));
        } else if (companyId) {
          setSelectedCompanies([companyId]);
        } else {
          setSelectedCompanies([]);
        }
      } else if (mode === 'create') {
        // Resetear con valores por defecto para crear nuevo usuario
        reset({
          email: '',
          firstName: '',
          lastName: '',
          role: '',
          status: 'active',
          password: '',
          confirmPassword: '',
          phone: '',
          emailVerified: false
        });

        // Pre-selección automática para usuarios no-Super-Admin
        if (!isSuperAdmin && companyId) {
          // Si no es Super Admin, pre-seleccionar su empresa automáticamente
          setSelectedCompanies([companyId]);
        } else {
          setSelectedCompanies([]);
        }
      }
    }
  }, [user, open, mode, reset, companyId, isSuperAdmin]);

  const onSubmit = async (values: FormData) => {
    setLoading(true);
    setError(null);
    try {
      // Enviar roleId directamente como UUID (no convertir a name)
      const userData = {
        ...values,
        roleId: values.role,  // Enviar UUID directamente
        companies: selectedCompanies,
        mode
      };

      // Eliminar el campo 'role' para evitar confusión
      delete (userData as any).role;

      // Remove password fields if not set
      if (!userData.password) {
        delete userData.password;
        delete userData.confirmPassword;
      }

      if (onSave) {
        await onSave(userData);
        handleClose();
      } else {
        setError('Error: Función de guardado no configurada');
      }
    } catch (err: any) {
      setError(err.message || 'Error al guardar usuario');
    } finally {
      setLoading(false);
    }
  };


  const handleClose = () => {
    reset();
    setError(null);
    setTabValue(0);
    setSelectedCompanies([]);
    onClose();
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '60vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">
            {mode === 'create' ? 'Crear Nuevo Usuario' : 'Editar Usuario'}
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
            <Tab label="Información Básica" />
            <Tab label="Seguridad" />
            <Tab label="Empresas y Roles" />
          </Tabs>

          {/* Información Básica */}
          <TabPanel value={tabValue} index={0}>
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
                      disabled={loading}
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
                      disabled={loading}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Email"
                      type="email"
                      error={Boolean(errors.email)}
                      helperText={errors.email?.message}
                      disabled={loading || mode === 'edit'}
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
                      fullWidth
                      label="Teléfono"
                      disabled={loading}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={Boolean(errors.status)}>
                      <InputLabel>Estado</InputLabel>
                      <Select
                        {...field}
                        label="Estado"
                        disabled={loading}
                      >
                        <MenuItem value="active">Activo</MenuItem>
                        <MenuItem value="inactive">Inactivo</MenuItem>
                        <MenuItem value="suspended">Suspendido</MenuItem>
                      </Select>
                      {errors.status && (
                        <FormHelperText>{errors.status.message}</FormHelperText>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="emailVerified"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          {...field}
                          checked={field.value}
                          disabled={loading}
                        />
                      }
                      label="Email Verificado"
                    />
                  )}
                />
              </Grid>
            </Grid>
          </TabPanel>

          {/* Seguridad */}
          <TabPanel value={tabValue} index={1}>
            <Grid container spacing={2}>
              {(mode === 'create' || mode === 'edit') && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      {mode === 'edit' ? 'Dejar en blanco para mantener la contraseña actual' : 'Contraseña requerida para nuevo usuario'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="password"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          id="password"
                          label={mode === 'create' ? 'Contraseña' : 'Nueva Contraseña (opcional)'}
                          type="password"
                          error={Boolean(errors.password)}
                          helperText={errors.password?.message || (mode === 'create' && !errors.password ? 
                            'Mín. 8 caracteres, mayúsculas, minúsculas, números y un carácter especial. Evitar: 123, abc, qwerty' : '')}
                          disabled={loading}
                          required={mode === 'create'}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="confirmPassword"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          id="confirmPassword"
                          label="Confirmar Contraseña"
                          type="password"
                          error={Boolean(errors.confirmPassword)}
                          helperText={errors.confirmPassword?.message}
                          disabled={loading}
                          required={mode === 'create'}
                        />
                      )}
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </TabPanel>

          {/* Empresas y Roles */}
          <TabPanel value={tabValue} index={2}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Controller
                  name="role"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={Boolean(errors.role)}>
                      <InputLabel>Rol Principal</InputLabel>
                      <Select
                        {...field}
                        id="role"
                        label="Rol Principal"
                        disabled={loading}
                      >
                        {roles.map((role) => (
                          <MenuItem key={role.id} value={role.id}>
                            <Box>
                              <Typography variant="body2">{role.name}</Typography>
                              <Typography variant="caption" color="textSecondary">
                                {role.description}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.role && <FormHelperText>{errors.role.message}</FormHelperText>}
                    </FormControl>
                  )}
                />
              </Grid>
              
              <Grid item xs={12}>
                {/* Badge de restricción */}
                {!isSuperAdmin && (
                  <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      icon={<InfoIcon />}
                      label="Solo tu empresa"
                      size="small"
                      color="info"
                      variant="outlined"
                      sx={{
                        borderStyle: 'dashed',
                        fontWeight: 500
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      Como administrador de empresa, solo puedes gestionar usuarios de tu organización
                    </Typography>
                  </Box>
                )}

                <Autocomplete
                  multiple
                  id="companies"
                  options={
                    isSuperAdmin
                      ? companies
                      : companies.filter(c => c.id === companyId)
                  }
                  getOptionLabel={(option) => option.name}
                  value={companies.filter(c => selectedCompanies.includes(c.id))}
                  onChange={(event, newValue) => {
                    if (!isSuperAdmin) {
                      // Solo permitir la empresa del usuario
                      const validCompanies = newValue.filter(company => company.id === companyId);
                      setSelectedCompanies(validCompanies.map(v => v.id));
                    } else {
                      setSelectedCompanies(newValue.map(v => v.id));
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          Empresas Asignadas
                          {!isSuperAdmin && (
                            <Tooltip
                              title="Solo puedes asignar usuarios a tu empresa. Los Super Administradores pueden gestionar múltiples empresas."
                              arrow
                              placement="top"
                            >
                              <InfoIcon
                                sx={{
                                  fontSize: 16,
                                  color: 'action.active',
                                  cursor: 'help'
                                }}
                              />
                            </Tooltip>
                          )}
                        </Box>
                      }
                      placeholder="Seleccionar empresas"
                      helperText={
                        !isSuperAdmin ? (
                          <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <InfoIcon sx={{ fontSize: 14, color: 'info.main' }} />
                            <span style={{ color: '#0288d1', fontWeight: 500 }}>
                              Como administrador de empresa, solo puedes asignar usuarios a tu empresa actual
                            </span>
                          </Box>
                        ) : (
                          "Puedes asignar el usuario a una o más empresas"
                        )
                      }
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => {
                      const isUserCompany = option.id === companyId;

                      return (
                        <Chip
                          variant={isUserCompany ? "filled" : "outlined"}
                          label={option.name}
                          icon={isUserCompany ? <BusinessIcon /> : undefined}
                          color={isUserCompany ? "primary" : "default"}
                          {...getTagProps({ index })}
                          key={option.id}
                          sx={{
                            fontWeight: isUserCompany ? 600 : 400,
                            ...(isUserCompany && {
                              borderWidth: 2,
                              borderStyle: 'solid'
                            })
                          }}
                        />
                      );
                    })
                  }
                  disabled={loading || !isSuperAdmin}
                />
              </Grid>
            </Grid>
          </TabPanel>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
            disabled={loading}
          >
            {loading ? 'Guardando...' : mode === 'create' ? 'Crear Usuario' : 'Guardar Cambios'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};