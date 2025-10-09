/**
 * ChannelConfigModal Component
 * Modal principal para configuración de canales con flujos diferenciados
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

// Funciones helper para determinar el flujo según el tipo de canal
const getStepsForChannel = (channelType: ChannelType | undefined) => {
  if (!channelType) return ['Configuración', 'Validación'];

  // Canales que requieren webhook obligatorio
  const webhookRequiredChannels = [
    ChannelType.WHATSAPP,
    ChannelType.FACEBOOK,
    ChannelType.INSTAGRAM
  ];

  // Canales con webhook opcional
  const webhookOptionalChannels = [
    ChannelType.EMAIL,
    ChannelType.SMS
  ];

  if (webhookRequiredChannels.includes(channelType)) {
    return ['Configuración', 'Validación', 'Webhooks'];
  } else if (webhookOptionalChannels.includes(channelType)) {
    return ['Configuración', 'Validación', 'Webhooks (Opcional)'];
  }

  return ['Configuración', 'Validación'];
};

const isWebhookRequired = (channelType: ChannelType | undefined) => {
  if (!channelType) return false;
  return [ChannelType.WHATSAPP, ChannelType.FACEBOOK, ChannelType.INSTAGRAM]
    .includes(channelType);
};

const isWebhookOptional = (channelType: ChannelType | undefined) => {
  if (!channelType) return false;
  return [ChannelType.EMAIL, ChannelType.SMS].includes(channelType);
};

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
  const [showOptionalWebhook, setShowOptionalWebhook] = useState(false);

  // Resetear estado cuando se abre el modal
  useEffect(() => {
    if (open) {
      setActiveStep(0);
      setActiveTab(0);
      setValidationErrors([]);
      setShowOptionalWebhook(false);

      // Inicializar formData con configuración existente o por defecto
      if (channel) {
        // IMPORTANTE: Desencriptar la configuración antes de cargarla en el formulario
        // para evitar doble encriptación al guardar
        const decryptedConfig = configService.decryptConfig(channel.configuration);
        console.log('🔓 [ChannelConfigModal] Cargando canal existente con config desencriptada:', {
          channelId: channel.id,
          channelName: channel.name
        });

        setFormData({
          name: channel.name,
          description: channel.description,
          configuration: decryptedConfig
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
      console.log('🆕 [CreateMutation] Iniciando creación de canal:', data);
      const channelData = {
        channel_type: currentChannelType!,
        name: data.name,
        description: data.description,
        configuration: configService.sanitizeConfig(data.configuration)
      };
      console.log('📤 [CreateMutation] Enviando al backend:', channelData);
      const result = await channelService.createChannel(channelData);
      console.log('✅ [CreateMutation] Canal creado exitosamente:', result);
      return result;
    },
    onSuccess: (newChannel) => {
      console.log('🎉 [CreateMutation] onSuccess ejecutado:', newChannel);
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      if (onSave) onSave(newChannel);

      // Notificación de éxito
      addNotification({
        type: 'success',
        title: 'Canal creado exitosamente',
        message: `El canal ${newChannel.name} ha sido configurado correctamente`
      });

      handleClose();
    },
    onError: (error: any) => {
      console.error('❌ [CreateMutation] Error al crear canal:', error);
      console.error('❌ [CreateMutation] Error details:', {
        message: error.message,
        response: error.response,
        status: error.response?.status,
        data: error.response?.data
      });
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

      // Notificación de éxito
      addNotification({
        type: 'success',
        title: 'Canal actualizado',
        message: `El canal ${updatedChannel.name} ha sido actualizado correctamente`
      });

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

  // Mutation para validar credenciales con lógica diferenciada
  const validateMutation = useMutation({
    mutationFn: async (config: any) => {
      console.log('🔍 [ChannelConfigModal] Iniciando validación de credenciales:', {
        channelType: currentChannelType,
        hasConfig: !!config
      });
      if (!currentChannelType) throw new Error('Tipo de canal no definido');
      return channelService.validateCredentials(currentChannelType, config);
    },
    onSuccess: async (result) => {
      console.log('✅ [ChannelConfigModal] Validación exitosa:', result);

      if (result.valid) {
        // Para canales con webhook opcional (Email, SMS), guardar inmediatamente
        if (isWebhookOptional(currentChannelType)) {
          console.log('📝 [ChannelConfigModal] Canal con webhook opcional, guardando automáticamente...');

          // Guardar el canal directamente
          const saveData = {
            ...formData,
            configuration: configService.sanitizeConfig(formData.configuration)
          };

          console.log('💾 [ChannelConfigModal] Datos a guardar:', saveData);

          if (isNewChannel) {
            console.log('🆕 [ChannelConfigModal] Creando nuevo canal...');
            createMutation.mutate(saveData);
          } else {
            console.log('✏️ [ChannelConfigModal] Actualizando canal existente...');
            updateMutation.mutate(saveData);
          }

          // Mostrar opción de configurar webhooks
          setShowOptionalWebhook(true);

          // Notificar éxito
          addNotification({
            type: 'success',
            title: 'Validación exitosa',
            message: 'Las credenciales han sido validadas. El canal se está guardando.'
          });

        } else if (isWebhookRequired(currentChannelType)) {
          // Para canales con webhook requerido, ir al paso 3
          setActiveStep(2);

          // Generar token si no existe
          const verifyToken = formData.configuration?.webhookVerifyToken ||
                            webhookService.generateVerifyToken();

          // Actualizar formData con el token
          setFormData({
            ...formData,
            configuration: {
              ...formData.configuration,
              webhookVerifyToken: verifyToken
            }
          });

          // Obtener instrucciones de webhook
          const webhookInstructions = webhookService.getWebhookSetupInstructions(
            currentChannelType!,
            channel?.id || 'new',
            verifyToken
          );
          setWebhookConfig(webhookInstructions);

        } else {
          // Para otros canales, guardar directamente
          handleSave();
        }
      } else {
        setValidationErrors(result.errors || ['Credenciales inválidas']);
      }
    },
    onError: (error: any) => {
      console.error('❌ [ChannelConfigModal] Error en validación:', error);
      console.error('❌ [ChannelConfigModal] Error details:', {
        message: error.message,
        response: error.response,
        status: error.response?.status,
        data: error.response?.data
      });
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
    setShowOptionalWebhook(false);
    onClose();
  };

  const handleOptionalWebhookSetup = () => {
    // Generar configuración de webhook opcional
    const verifyToken = webhookService.generateVerifyToken();
    const webhookInstructions = webhookService.getWebhookSetupInstructions(
      currentChannelType!,
      channel?.id || 'new',
      verifyToken
    );
    setWebhookConfig(webhookInstructions);
    setActiveStep(2);
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
  const steps = getStepsForChannel(currentChannelType);

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
        {/* Stepper de progreso dinámico */}
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label, index) => {
            const stepProps: { completed?: boolean; error?: boolean } = {};

            if (index === 1 && validationErrors.length > 0) {
              stepProps.error = true;
            }
            if (index < activeStep) {
              stepProps.completed = true;
            }

            // Marcar webhook como opcional visualmente
            const isOptionalStep = label.includes('Opcional');

            return (
              <Step key={label} {...stepProps}>
                <StepLabel
                  optional={isOptionalStep ?
                    <Typography variant="caption">Opcional</Typography> :
                    undefined
                  }
                >
                  {label.replace(' (Opcional)', '')}
                </StepLabel>
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
                <Typography color="text.secondary" paragraph>
                  La configuración ha sido validada exitosamente
                </Typography>

                {/* Mostrar mensaje según el tipo de canal */}
                {isWebhookOptional(currentChannelType) && (
                  <>
                    <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
                      <Typography variant="body2">
                        El canal se está guardando. Los webhooks son opcionales y puedes
                        configurarlos más tarde si deseas recibir notificaciones de eventos
                        {currentChannelType === ChannelType.EMAIL &&
                          ' como rebotes, aperturas y clicks.'}
                        {currentChannelType === ChannelType.SMS &&
                          ' como confirmaciones de entrega y respuestas.'}
                      </Typography>
                    </Alert>

                    {/* Opción de configurar webhook opcional */}
                    {showOptionalWebhook && !createMutation.isPending && !updateMutation.isPending && (
                      <Box sx={{ mt: 3 }}>
                        <Button
                          variant="outlined"
                          onClick={handleOptionalWebhookSetup}
                        >
                          Configurar Webhooks (Opcional)
                        </Button>
                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                          Configura webhooks para recibir notificaciones de eventos
                        </Typography>
                      </Box>
                    )}
                  </>
                )}

                {isWebhookRequired(currentChannelType) && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      Redirigiendo a configuración de webhooks (requerido)...
                    </Typography>
                  </Alert>
                )}
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
                    setActiveTab(1);
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
            onComplete={() => {
              if (isWebhookRequired(currentChannelType)) {
                // Para webhooks requeridos, guardar el canal
                handleSave();
              } else {
                // Para webhooks opcionales, solo cerrar
                handleClose();
                addNotification({
                  type: 'success',
                  title: 'Webhooks configurados',
                  message: 'Los webhooks han sido configurados correctamente'
                });
              }
            }}
          />
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>
          Cancelar
        </Button>

        {/* Botón para saltar webhooks opcionales */}
        {activeStep === 2 && isWebhookOptional(currentChannelType) && (
          <Button
            onClick={() => {
              handleClose();
              addNotification({
                type: 'info',
                title: 'Configuración completada',
                message: 'Puedes configurar webhooks más tarde desde la configuración del canal'
              });
            }}
          >
            Omitir Webhooks
          </Button>
        )}

        {/* Botón de guardar para webhooks requeridos */}
        {activeStep === 2 && isWebhookRequired(currentChannelType) && (
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={isLoading}
          >
            {isLoading ? 'Guardando...' : 'Guardar Canal'}
          </Button>
        )}

        {/* Botón para cerrar cuando el canal ya fue guardado (canales con webhook opcional) */}
        {activeStep === 1 && isWebhookOptional(currentChannelType) &&
         (createMutation.isSuccess || updateMutation.isSuccess) && (
          <Button
            onClick={handleClose}
            variant="contained"
          >
            Finalizar
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};