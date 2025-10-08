/**
 * ChannelConfigModal Component
 * Modal principal para configuración de canales
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  Alert,
  LinearProgress,
  CircularProgress,
  Tabs,
  Tab
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { channelService, configService, webhookService } from '../../services';
import { Channel, ChannelType } from '../../types';
import { WhatsAppForm } from './forms/WhatsAppForm';
import { EmailForm } from './forms/EmailForm';
import { SMSForm } from './forms/SMSForm';
import { InstagramForm } from './forms/InstagramForm';
import { FacebookForm } from './forms/FacebookForm';
import { WebhookSetup } from './WebhookSetup';
import { useAuthStore } from '@/shared/store/authStore';
import { useUIStore } from '@/shared/store/uiStore';

interface ChannelConfigModalProps {
  open: boolean;
  channel: Channel | null;
  isNewChannel?: boolean;
  channelType?: ChannelType;
  onClose: () => void;
  onSave?: (channel: Channel) => void;
}

const steps = ['Configuración', 'Validación', 'Webhooks'];

export const ChannelConfigModal: React.FC<ChannelConfigModalProps> = ({
  open,
  channel,
  isNewChannel = false,
  channelType,
  onClose,
  onSave
}) => {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuthStore();
  const { addNotification } = useUIStore();
  const [activeStep, setActiveStep] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [webhookConfig, setWebhookConfig] = useState<any>(null);

  // Resetear estado cuando se abre el modal
  useEffect(() => {
    if (open) {
      setActiveStep(0);
      setActiveTab(0);
      setValidationErrors([]);

      // Inicializar formData con configuración existente o por defecto
      if (channel) {
        setFormData({
          name: channel.name,
          description: channel.description,
          configuration: channel.configuration
        });
      } else if (channelType) {
        const defaultConfig = configService.getDefaultConfig(channelType);
        setFormData({
          name: '',
          description: '',
          configuration: defaultConfig
        });
      }
    }
  }, [open, channel, channelType]);

  // Obtener el tipo de canal actual
  const currentChannelType = channel?.channel_type || channelType;

  // Mutation para crear canal
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const channelData = {
        channel_type: currentChannelType!,
        name: data.name,
        description: data.description,
        configuration: configService.sanitizeConfig(data.configuration)
      };
      return channelService.createChannel(channelData);
    },
    onSuccess: (newChannel) => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      if (onSave) onSave(newChannel);
      handleClose();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Error al crear el canal';
      setValidationErrors([errorMessage]);
      addNotification({
        type: 'error',
        title: 'Error al crear canal',
        message: errorMessage
      });
    }
  });

  // Mutation para actualizar canal
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!channel) return;
      const updateData = {
        name: data.name,
        description: data.description,
        configuration: configService.sanitizeConfig(data.configuration)
      };
      return channelService.updateChannel(channel.id, updateData);
    },
    onSuccess: (updatedChannel) => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      if (onSave) onSave(updatedChannel);
      handleClose();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Error al actualizar el canal';
      setValidationErrors([errorMessage]);
      addNotification({
        type: 'error',
        title: 'Error al actualizar canal',
        message: errorMessage
      });
    }
  });

  // Mutation para validar credenciales
  const validateMutation = useMutation({
    mutationFn: async (config: any) => {
      if (!currentChannelType) throw new Error('Tipo de canal no definido');
      return channelService.validateCredentials(currentChannelType, config);
    },
    onSuccess: (result) => {
      if (result.valid) {
        setActiveStep(2); // Ir a configuración de webhooks
        // Generar configuración de webhook
        const webhookInstructions = webhookService.getWebhookSetupInstructions(
          currentChannelType!,
          channel?.id || 'new',
          formData.configuration.webhookVerifyToken
        );
        setWebhookConfig(webhookInstructions);
      } else {
        setValidationErrors(result.errors || ['Credenciales inválidas']);
      }
    },
    onError: (error: any) => {
      setValidationErrors([error.message || 'Error al validar credenciales']);
    }
  });

  // Handlers
  const handleFormSubmit = (data: any) => {
    setFormData({ ...formData, configuration: data });

    // Validar configuración localmente primero
    const validation = configService.validateConfig(currentChannelType!, data);
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      return;
    }

    // Pasar al siguiente paso (validación)
    setActiveStep(1);
    // Iniciar validación con el backend
    validateMutation.mutate(data);
  };

  const handleNameDescriptionSubmit = (data: { name: string; description?: string }) => {
    setFormData({ ...formData, ...data });
    setActiveTab(1); // Ir a la pestaña de configuración
  };

  const handleSave = () => {
    if (!formData) return;

    if (isNewChannel) {
      createMutation.mutate(formData);
    } else {
      updateMutation.mutate(formData);
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setActiveTab(0);
    setFormData(null);
    setValidationErrors([]);
    setWebhookConfig(null);
    onClose();
  };

  // Renderizar formulario según el tipo de canal
  const renderChannelForm = () => {
    if (!currentChannelType) return null;

    const props = {
      onSubmit: handleFormSubmit,
      initialData: formData?.configuration,
      isLoading: validateMutation.isPending
    };

    switch (currentChannelType) {
      case ChannelType.WHATSAPP:
        return <WhatsAppForm {...props} />;
      case ChannelType.EMAIL:
        return <EmailForm {...props} />;
      case ChannelType.SMS:
        return <SMSForm {...props} />;
      case ChannelType.INSTAGRAM:
        return <InstagramForm {...props} />;
      case ChannelType.FACEBOOK:
        return <FacebookForm {...props} />;
      default:
        return <Alert severity="error">Tipo de canal no soportado</Alert>;
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending || validateMutation.isPending;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: 400 }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">
            {isNewChannel ? 'Nuevo Canal' : `Configurar ${channel?.name}`}
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Stepper de progreso */}
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label, index) => {
            const stepProps: { completed?: boolean; error?: boolean } = {};

            if (index === 1 && validationErrors.length > 0) {
              stepProps.error = true;
            }
            if (index < activeStep) {
              stepProps.completed = true;
            }

            return (
              <Step key={label} {...stepProps}>
                <StepLabel>{label}</StepLabel>
              </Step>
            );
          })}
        </Stepper>

        {/* Barra de progreso durante operaciones */}
        {isLoading && <LinearProgress sx={{ mb: 2 }} />}

        {/* Errores de validación */}
        {validationErrors.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setValidationErrors([])}>
            <Typography variant="subtitle2" gutterBottom>
              Errores de validación:
            </Typography>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </Alert>
        )}

        {/* Contenido según el paso activo */}
        {activeStep === 0 && (
          <Box>
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
              <Tab label="Información General" />
              <Tab label="Configuración" disabled={!formData?.name} />
            </Tabs>

            {activeTab === 0 && (
              <Box sx={{ pt: 2 }}>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleNameDescriptionSubmit({
                    name: formData.get('name') as string,
                    description: formData.get('description') as string
                  });
                }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <input
                      name="name"
                      type="text"
                      placeholder="Nombre del canal"
                      defaultValue={formData?.name}
                      required
                      style={{
                        padding: '12px',
                        fontSize: '16px',
                        border: '1px solid #ccc',
                        borderRadius: '4px'
                      }}
                    />
                    <textarea
                      name="description"
                      placeholder="Descripción (opcional)"
                      defaultValue={formData?.description}
                      rows={3}
                      style={{
                        padding: '12px',
                        fontSize: '14px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        resize: 'vertical'
                      }}
                    />
                    <Button type="submit" variant="contained">
                      Siguiente
                    </Button>
                  </Box>
                </form>
              </Box>
            )}

            {activeTab === 1 && (
              <Box sx={{ pt: 2 }}>
                {renderChannelForm()}
              </Box>
            )}
          </Box>
        )}

        {activeStep === 1 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            {validateMutation.isPending && (
              <>
                <CircularProgress sx={{ mb: 2 }} />
                <Typography>Validando credenciales...</Typography>
              </>
            )}
            {validateMutation.isSuccess && !validationErrors.length && (
              <>
                <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Credenciales válidas
                </Typography>
                <Typography color="text.secondary">
                  La configuración ha sido validada exitosamente
                </Typography>
              </>
            )}
            {validationErrors.length > 0 && (
              <>
                <ErrorIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Error en la validación
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setActiveStep(0);
                    setValidationErrors([]);
                  }}
                  sx={{ mt: 2 }}
                >
                  Volver a configuración
                </Button>
              </>
            )}
          </Box>
        )}

        {activeStep === 2 && webhookConfig && (
          <WebhookSetup
            config={webhookConfig}
            channelType={currentChannelType!}
            onComplete={() => handleSave()}
          />
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>
          Cancelar
        </Button>
        {activeStep === 2 && (
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={isLoading}
          >
            {isLoading ? 'Guardando...' : 'Guardar Canal'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};