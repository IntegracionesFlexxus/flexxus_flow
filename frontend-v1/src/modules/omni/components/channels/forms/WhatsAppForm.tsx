/**
 * WhatsAppForm Component
 * Formulario de configuración para WhatsApp Business con validación Yup integrada
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  TextField,
  Button,
  Alert,
  Link,
  Box,
  Typography,
  InputAdornment,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tabs,
  Tab,
  Divider
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  OpenInNew as OpenInNewIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { WhatsAppConfig, ChannelType } from '../../../types';
import { configService } from '../../../services';
import { whatsappSchema } from '../validation/channelValidation';
import { ChannelVerification } from '../ChannelVerification';

interface WhatsAppFormProps {
  onSubmit: (data: WhatsAppConfig) => void;
  initialData?: WhatsAppConfig;
  isLoading?: boolean;
}

export const WhatsAppForm: React.FC<WhatsAppFormProps> = ({
  onSubmit,
  initialData,
  isLoading = false
}) => {
  const [showToken, setShowToken] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<any>(null);
  const [generatedToken, setGeneratedToken] = useState(initialData?.webhookVerifyToken || '');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid }
  } = useForm<WhatsAppConfig>({
    resolver: yupResolver(whatsappSchema) as any,
    mode: 'onChange',
    defaultValues: initialData || {
      phoneNumber: '',
      phoneNumberId: '',
      businessAccountId: '',
      accessToken: '',
      webhookVerifyToken: generatedToken,
      apiVersion: 'v18.0'
    }
  });

  const formValues = watch();

  const generateNewToken = () => {
    const token = configService.generateToken();
    setGeneratedToken(token);
    setValue('webhookVerifyToken', token);
  };

  // Si no hay token generado, generar uno
  React.useEffect(() => {
    if (!generatedToken) {
      generateNewToken();
    }
  }, []);

  const handleVerificationComplete = (status: any) => {
    setVerificationStatus(status);
    if (status.valid && status.errors.length === 0) {
      // Auto-submit si la verificación es exitosa
      handleSubmit(onSubmit)();
    }
  };

  return (
    <Box>
      {/* Tabs para organizar el contenido */}
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
        <Tab icon={<SettingsIcon />} label="Configuración" />
        <Tab
          icon={<SecurityIcon />}
          label="Verificación"
          disabled={!isValid}
        />
      </Tabs>

      <Divider sx={{ mb: 2 }} />

      {/* Tab de Configuración */}
      {activeTab === 0 && (
        <form onSubmit={handleSubmit(onSubmit)}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Instrucciones */}
            <Alert severity="info">
              <Typography variant="subtitle2" gutterBottom>
                Requisitos para configurar WhatsApp Business:
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon><CheckIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Una cuenta de WhatsApp Business verificada" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Acceso a Meta Business Manager" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Un número de teléfono no usado en WhatsApp personal" />
                </ListItem>
              </List>
              <Button
                size="small"
                startIcon={<OpenInNewIcon />}
                href="https://business.whatsapp.com/developers/developer-hub"
                target="_blank"
                component={Link}
                sx={{ mt: 1 }}
              >
                Obtener credenciales en Meta Business
              </Button>
            </Alert>

            {/* Campos del formulario */}
            <TextField
              fullWidth
              label="Número de Teléfono"
              placeholder="+5491112345678"
              {...register('phoneNumber')}
              error={!!errors.phoneNumber}
              helperText={errors.phoneNumber?.message || 'Número con código de país'}
            />

            <TextField
              fullWidth
              label="Phone Number ID"
              placeholder="1234567890123456"
              {...register('phoneNumberId')}
              error={!!errors.phoneNumberId}
              helperText={errors.phoneNumberId?.message || 'Obténlo desde Meta Business Manager > WhatsApp Accounts'}
            />

            <TextField
              fullWidth
              label="Business Account ID"
              placeholder="1234567890123456"
              {...register('businessAccountId')}
              helperText="ID de tu cuenta de WhatsApp Business (opcional)"
            />

            <TextField
              fullWidth
              label="Access Token"
              type={showToken ? 'text' : 'password'}
              {...register('accessToken')}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowToken(!showToken)}
                      edge="end"
                    >
                      {showToken ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
              error={!!errors.accessToken}
              helperText={errors.accessToken?.message || 'Token de acceso permanente de Meta API'}
            />

            <TextField
              fullWidth
              label="Webhook Verify Token"
              {...register('webhookVerifyToken')}
              error={!!errors.webhookVerifyToken}
              helperText={errors.webhookVerifyToken?.message || "Token para verificar webhooks (puedes editarlo o generar uno nuevo)"}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={generateNewToken}
                      edge="end"
                      title="Generar nuevo token"
                    >
                      <RefreshIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            <TextField
              fullWidth
              label="Versión de API"
              {...register('apiVersion')}
              defaultValue="v18.0"
              helperText="Versión de la API de WhatsApp Business (v17.0, v18.0, etc.)"
            />

            {/* Mostrar errores de validación si hay */}
            {Object.keys(errors).length > 0 && (
              <Alert severity="error">
                <Typography variant="subtitle2" gutterBottom>
                  Por favor corrige los siguientes errores:
                </Typography>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {Object.entries(errors).map(([field, error]) => (
                    <li key={field}>{(error as any)?.message}</li>
                  ))}
                </ul>
              </Alert>
            )}

            {/* Guías adicionales */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">
                  ¿Dónde encuentro estas credenciales?
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box>
                  <Typography variant="body2" paragraph>
                    <strong>1. Phone Number ID:</strong>
                  </Typography>
                  <Typography variant="caption" paragraph>
                    Meta Business Manager → WhatsApp Accounts → Tu cuenta → Settings → Phone numbers
                  </Typography>

                  <Typography variant="body2" paragraph>
                    <strong>2. Access Token:</strong>
                  </Typography>
                  <Typography variant="caption" paragraph>
                    Meta for Developers → Tu App → WhatsApp → Getting Started → Temporary access token
                    (O genera uno permanente en Business Manager)
                  </Typography>

                  <Typography variant="body2" paragraph>
                    <strong>3. Business Account ID:</strong>
                  </Typography>
                  <Typography variant="caption">
                    Meta Business Manager → Business Settings → Accounts → WhatsApp Business Accounts
                  </Typography>
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* Botones de acción */}
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => setActiveTab(1)}
                disabled={!isValid}
              >
                Verificar Seguridad
              </Button>
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={isLoading || !isValid}
              >
                {isLoading ? 'Validando...' : 'Validar Configuración'}
              </Button>
            </Box>
          </Box>
        </form>
      )}

      {/* Tab de Verificación */}
      {activeTab === 1 && (
        <Box>
          <ChannelVerification
            channelType={ChannelType.WHATSAPP}
            configuration={formValues}
            onVerify={handleVerificationComplete}
            autoVerify={false}
          />

          {/* Mostrar estado de verificación */}
          {verificationStatus && verificationStatus.valid && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="success">
                <Typography variant="subtitle2">
                  ✅ Verificación exitosa
                </Typography>
                <Typography variant="caption">
                  La configuración ha sido validada correctamente. Puedes proceder a guardar el canal.
                </Typography>
              </Alert>

              <Button
                variant="contained"
                fullWidth
                onClick={() => handleSubmit(onSubmit)()}
                disabled={isLoading}
                sx={{ mt: 2 }}
              >
                Continuar con la Configuración
              </Button>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};