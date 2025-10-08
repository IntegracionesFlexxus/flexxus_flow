/**
 * UserInviteDialog Component - Sprint 3
 * Siguiendo lineamientos nivel 2: Componente para invitar usuarios
 * SOLID: SRP (solo maneja invitaciones), Clean Code (funciones cortas y descriptivas)
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Stepper,
  Step,
  StepLabel,
  FormControlLabel,
  Checkbox,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { 
  Mail, 
  UserPlus, 
  Send, 
  X,
  AlertCircle,
  Plus,
  Upload,
  Download
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';

// Services
import { invitationService, SendInvitationData } from '@modules/auth/services/invitationService';
import type { Role } from '@/modules/roles/types';
import { roleService } from '@/modules/roles/services/roleService';

// Hooks
import { useAuthStore } from '@/shared/store/authStore';
import { useUIStore } from '@/shared/store/uiStore';

interface UserInviteDialogProps {
  open: boolean;
  onClose: () => void;
  companyId?: string;
  defaultRoleId?: string;
}

const validationSchema = Yup.object({
  email: Yup.string()
    .email('Email inválido')
    .required('Email es requerido'),
  firstName: Yup.string()
    .min(2, 'Mínimo 2 caracteres')
    .required('Nombre es requerido'),
  lastName: Yup.string()
    .min(2, 'Mínimo 2 caracteres')
    .required('Apellido es requerido'),
  roleId: Yup.string()
    .required('Rol es requerido'),
  department: Yup.string(),
  position: Yup.string(),
  welcomeMessage: Yup.string()
    .max(500, 'Máximo 500 caracteres'),
  expiryDays: Yup.number()
    .min(1, 'Mínimo 1 día')
    .max(30, 'Máximo 30 días')
});

interface FormData {
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  department: string;
  position: string;
  welcomeMessage: string;
  expiryDays: number;
}

export const UserInviteDialog: React.FC<UserInviteDialogProps> = ({
  open,
  onClose,
  companyId,
  defaultRoleId
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkEmails, setBulkEmails] = useState<string[]>([]);
  const [skipEmailNotification, setSkipEmailNotification] = useState(false);
  
  const { currentCompany } = useAuthStore();
  const { addNotification } = useUIStore();
  const queryClient = useQueryClient();
  
  const effectiveCompanyId = companyId || currentCompany?.id;

  // Fetch roles
  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ['roles', effectiveCompanyId],
    queryFn: () => roleService.getRoles(effectiveCompanyId ? { companyId: effectiveCompanyId } : undefined),
    enabled: open && !!effectiveCompanyId
  });
  const roles = rolesData?.roles || [];

  // Send invitation mutation
  const sendInvitationMutation = useMutation({
    mutationFn: (data: SendInvitationData) => 
      invitationService.sendInvitation(effectiveCompanyId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      addNotification({
        type: 'success',
        title: 'Invitación enviada',
        message: 'La invitación ha sido enviada exitosamente',
        autoClose: true
      });
      handleClose();
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Error al enviar invitación',
        message: error.response?.data?.message || 'No se pudo enviar la invitación',
        autoClose: true
      });
    }
  });

  // React Hook Form setup
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    getValues,
    trigger
  } = useForm<FormData>({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      roleId: defaultRoleId || '',
      department: '',
      position: '',
      welcomeMessage: '',
      expiryDays: 7
    }
  });

  const onSubmit = (values: FormData) => {
    sendInvitationMutation.mutate({
      ...values,
      skipEmailNotification
    });
  };

  useEffect(() => {
    if (defaultRoleId && open) {
      setValue('roleId', defaultRoleId);
    }
  }, [defaultRoleId, open, setValue]);

  const handleClose = () => {
    reset();
    setActiveStep(0);
    setBulkMode(false);
    setBulkEmails([]);
    setSkipEmailNotification(false);
    onClose();
  };

  const handleNext = async () => {
    if (activeStep === 0) {
      // Validate basic info
      const fieldsToValidate: (keyof FormData)[] = ['email', 'firstName', 'lastName', 'roleId'];
      const isValid = await trigger(fieldsToValidate);
      
      if (isValid) {
        setActiveStep(activeStep + 1);
      }
    } else {
      setActiveStep(activeStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(activeStep - 1);
  };

  const handleAddBulkEmail = () => {
    const email = getValues('email').trim();
    if (email && !bulkEmails.includes(email)) {
      setBulkEmails([...bulkEmails, email]);
      setValue('email', '');
    }
  };

  const handleRemoveBulkEmail = (email: string) => {
    setBulkEmails(bulkEmails.filter(e => e !== email));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const emails = text.split(/[\n,;]/)
          .map(email => email.trim())
          .filter(email => email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
        setBulkEmails([...new Set([...bulkEmails, ...emails])]);
      };
      reader.readAsText(file);
    }
  };

  const steps = ['Información básica', 'Configuración adicional', 'Revisar y enviar'];

  const renderBasicInfo = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {!bulkMode ? (
        <>
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Email"
                error={Boolean(errors.email)}
                helperText={errors.email?.message}
                autoFocus
              />
            )}
          />
          
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
                  />
                )}
              />
            </Grid>
          </Grid>
        </>
      ) : (
        <Box>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Agregar email"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddBulkEmail();
                    }
                  }}
                />
              )}
            />
            <Button
              variant="outlined"
              onClick={handleAddBulkEmail}
              startIcon={<Plus size={20} />}
            >
              Agregar
            </Button>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<Upload size={20} />}
            >
              Cargar CSV
              <input
                type="file"
                hidden
                accept=".csv,.txt"
                onChange={handleFileUpload}
              />
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<Download size={20} />}
              href="/templates/invitation-template.csv"
              download
            >
              Descargar plantilla
            </Button>
          </Box>
          
          {bulkEmails.length > 0 && (
            <Box sx={{ 
              border: '1px solid', 
              borderColor: 'divider', 
              borderRadius: 1, 
              p: 2,
              maxHeight: 200,
              overflowY: 'auto'
            }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {bulkEmails.length} emails agregados:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {bulkEmails.map((email) => (
                  <Chip
                    key={email}
                    label={email}
                    onDelete={() => handleRemoveBulkEmail(email)}
                    size="small"
                  />
                ))}
              </Box>
            </Box>
          )}
        </Box>
      )}

      <Controller
        name="roleId"
        control={control}
        render={({ field }) => (
          <FormControl fullWidth required error={Boolean(errors.roleId)}>
            <InputLabel>Rol</InputLabel>
            <Select {...field} label="Rol">
              {roles.map((role) => (
                <MenuItem key={role.id} value={role.id}>
                  <Box>
                    <Typography variant="body2">{role.displayName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {role.description}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
            {errors.roleId && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                {errors.roleId.message}
              </Typography>
            )}
          </FormControl>
        )}
      />

      {!bulkMode && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={bulkMode}
                onChange={(e) => setBulkMode(e.target.checked)}
              />
            }
            label="Invitar múltiples usuarios"
          />
        </Box>
      )}
    </Box>
  );

  const renderAdditionalConfig = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Controller
            name="department"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Departamento"
              />
            )}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Controller
            name="position"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Cargo"
              />
            )}
          />
        </Grid>
      </Grid>

      <Controller
        name="welcomeMessage"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            fullWidth
            label="Mensaje de bienvenida (opcional)"
            multiline
            rows={4}
            error={Boolean(errors.welcomeMessage)}
            helperText={
              errors.welcomeMessage?.message ||
              `${field.value?.length || 0}/500 caracteres`
            }
          />
        )}
      />

      <Controller
        name="expiryDays"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            fullWidth
            label="Días de validez"
            type="number"
            error={Boolean(errors.expiryDays)}
            helperText={
              errors.expiryDays?.message ||
              'La invitación expirará después de estos días'
            }
            InputProps={{
              inputProps: { min: 1, max: 30 }
            }}
          />
        )}
      />

      <FormControlLabel
        control={
          <Checkbox
            checked={skipEmailNotification}
            onChange={(e) => setSkipEmailNotification(e.target.checked)}
          />
        }
        label="No enviar email de notificación (el usuario deberá ser notificado manualmente)"
      />
    </Box>
  );

  const renderReview = () => {
    const values = getValues();
    const selectedRole = roles.find(r => r.id === values.roleId);
    
    return (
      <Box>
        <Alert severity="info" sx={{ mb: 3 }}>
          Revisa la información antes de enviar la invitación.
        </Alert>

        <List>
          {!bulkMode ? (
            <>
              <ListItem>
                <ListItemText
                  primary="Usuario"
                  secondary={`${values.firstName} ${values.lastName} (${values.email})`}
                />
              </ListItem>
            </>
          ) : (
            <ListItem>
              <ListItemText
                primary="Usuarios a invitar"
                secondary={`${bulkEmails.length} usuarios`}
              />
            </ListItem>
          )}
          
          <ListItem>
            <ListItemText
              primary="Rol asignado"
              secondary={selectedRole?.displayName || 'No seleccionado'}
            />
          </ListItem>
          
          {values.department && (
            <ListItem>
              <ListItemText
                primary="Departamento"
                secondary={values.department}
              />
            </ListItem>
          )}
          
          {values.position && (
            <ListItem>
              <ListItemText
                primary="Cargo"
                secondary={values.position}
              />
            </ListItem>
          )}
          
          <ListItem>
            <ListItemText
              primary="Validez"
              secondary={`${values.expiryDays} días`}
            />
          </ListItem>
          
          {values.welcomeMessage && (
            <ListItem>
              <ListItemText
                primary="Mensaje de bienvenida"
                secondary={values.welcomeMessage}
              />
            </ListItem>
          )}
          
          <ListItem>
            <ListItemText
              primary="Notificación por email"
              secondary={skipEmailNotification ? 'No' : 'Sí'}
            />
          </ListItem>
        </List>
      </Box>
    );
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return renderBasicInfo();
      case 1:
        return renderAdditionalConfig();
      case 2:
        return renderReview();
      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <UserPlus size={24} />
          <Typography variant="h6">
            Invitar {bulkMode ? 'Usuarios' : 'Usuario'}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {rolesLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          getStepContent(activeStep)
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={handleClose}>
          Cancelar
        </Button>
        
        {activeStep > 0 && (
          <Button onClick={handleBack}>
            Atrás
          </Button>
        )}
        
        {activeStep < steps.length - 1 ? (
          <Button variant="contained" onClick={handleNext}>
            Siguiente
          </Button>
        ) : (
          <LoadingButton
            variant="contained"
            loading={sendInvitationMutation.isPending}
            startIcon={<Send size={20} />}
            onClick={handleSubmit(onSubmit)}
          >
            Enviar Invitación
          </LoadingButton>
        )}
      </DialogActions>
    </Dialog>
  );
};