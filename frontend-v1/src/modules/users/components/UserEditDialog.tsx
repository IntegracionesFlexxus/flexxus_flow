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
  Autocomplete
} from '@mui/material';
import { Close as CloseIcon, Save as SaveIcon } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import { useAuthGuard } from '@/shared/hooks/useAuth';

interface UserEditDialogProps {
  open: boolean;
  onClose: () => void;
  user?: any;
  onSave?: (userData: any) => Promise<void>;
  roles?: Array<{ id: string; name: string; description: string }>;
  companies?: Array<{ id: string; name: string }>;
  mode?: 'create' | 'edit';
  companyId?: string;
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
  companyId
}) => {
  // Debug logs para edición y permisos
  console.log('📝 [UserEditDialog] Dialog abierto:', { open, mode });
  console.log('👤 [UserEditDialog] Usuario recibido:', user);
  console.log('🔑 [UserEditDialog] Propiedades del usuario:', user ? Object.keys(user) : 'No user');
  console.log('🏭 [UserEditDialog] Company ID:', companyId);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);

  // Hook para verificar permisos
  const { hasPermission, hasRole } = useAuthGuard();

  // Super Admin siempre puede gestionar empresas + permisos específicos
  const canManageUserCompanies =
    hasRole('super_admin') ||
    hasRole('Super Admin') ||
    hasRole('super admin') ||
    hasRole('superadmin') ||
    hasPermission('admin.users.companies.manage') ||
    hasPermission('admin.companies.view');

  // Debug logs para permisos
  console.log('🔐 [UserEditDialog] Permission check:', {
    hasRoleSuperAdmin: hasRole('super_admin'),
    hasRoleSuperAdminSpace: hasRole('Super Admin'),
    hasRoleSuperAdminLower: hasRole('super admin'),
    hasRoleSuperAdminNospace: hasRole('superadmin'),
    hasPermissionUsersCompanies: hasPermission('admin.users.companies.manage'),
    hasPermissionCompaniesView: hasPermission('admin.companies.view'),
    finalResult: canManageUserCompanies
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(getValidationSchema(mode)),
    defaultValues: {
      email: user?.email || '',
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      role: user?.roleId || '',  // Usar roleId (UUID) para el formulario
      status: user?.status || 'active',
      password: '',
      confirmPassword: '',
      phone: user?.phone || '',
      emailVerified: user?.emailVerified || false
    }
  });

  // Effect para resetear el formulario cuando se abre el dialog o cambia el usuario
  useEffect(() => {
    // console.log('🔄 [UserEditDialog.useEffect] Estado cambió:', { open, mode, hasUser: !!user });

    if (open) {
      if (user && mode === 'edit') {
        // console.log('📋 [UserEditDialog.useEffect] Modo edición - Reseteando con datos del usuario:', {
        //   email: user.email,
        //   firstName: user.firstName,
        //   lastName: user.lastName,
        //   role: user.role,
        //   status: user.status
        // });

        // Resetear el formulario con los datos del usuario
        reset({
          email: user.email || '',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          role: user.roleId || '',  // Usar roleId (UUID) para el formulario
          status: user.status || 'active',
          password: '',
          confirmPassword: '',
          phone: user.phone || '',
          emailVerified: user.emailVerified || false
        });

        // Establecer las empresas seleccionadas
        // Si no hay empresas en el usuario, usar la empresa actual
        // console.log('🏭 [UserEditDialog.useEffect] User companies:', user.companies);
        // console.log('🆔 [UserEditDialog.useEffect] CompanyId prop:', companyId);

        if (user.companies?.length > 0) {
          // console.log('✅ [UserEditDialog.useEffect] Setting user companies:', user.companies.map((c: any) => c.id));
          setSelectedCompanies(user.companies.map((c: any) => c.id));
        } else if (companyId) {
          // console.log('✅ [UserEditDialog.useEffect] Setting current company:', [companyId]);
          setSelectedCompanies([companyId]);
        } else {
          // console.log('⚠️ [UserEditDialog.useEffect] No companies to set');
          setSelectedCompanies([]);
        }
      } else if (mode === 'create') {
        // console.log('📋 [UserEditDialog.useEffect] Modo creación - Reseteando formulario vacío');

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

        setSelectedCompanies([]);
      }
    }
  }, [user, open, mode, reset]);

  const onSubmit = async (values: FormData) => {
    setLoading(true);
    setError(null);
    try {
      // console.log('🎯 [UserEditDialog] Original form values:', values);
      // console.log('🎯 [UserEditDialog] Role value (UUID):', values.role);
      // console.log('🎯 [UserEditDialog] Available roles:', roles);

      const userData = {
        ...values,
        role: values.role, // Send role UUID directly to backend
        companies: selectedCompanies,
        mode
      };
      
      // console.log('🎯 [UserEditDialog] Final userData before removing passwords:', userData);
      
      // Remove password fields if not set
      if (!userData.password) {
        delete userData.password;
        delete userData.confirmPassword;
      }
      
      // console.log('🎯 [UserEditDialog] Final userData to send:', userData);
      
      if (onSave) {
        await onSave(userData);
        handleClose();
      } else {
        // console.error('onSave callback not provided');
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
            {canManageUserCompanies && <Tab label="Empresas y Roles" />}
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
          {canManageUserCompanies && (
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
                {(() => {
                  // console.log('🏢 [Autocomplete] Available companies:', companies);
                  // console.log('📋 [Autocomplete] Selected company IDs:', selectedCompanies);
                  // console.log('✅ [Autocomplete] Filtered companies:', companies.filter(c => selectedCompanies.includes(c.id)));
                  return null;
                })()}
                <Autocomplete
                  multiple
                  id="companies"
                  options={companies}
                  getOptionLabel={(option) => option.name}
                  value={companies.filter(c => selectedCompanies.includes(c.id))}
                  onChange={(event, newValue) => {
                    // console.log('🔄 [Autocomplete] onChange - New value:', newValue);
                    setSelectedCompanies(newValue.map(v => v.id));
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Empresas Asignadas"
                      placeholder="Seleccionar empresas"
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={option.name}
                        {...getTagProps({ index })}
                        key={option.id}
                      />
                    ))
                  }
                  disabled={loading}
                />
              </Grid>
            </Grid>
            </TabPanel>
          )}
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