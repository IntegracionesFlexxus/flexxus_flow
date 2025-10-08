/**
 * InstagramForm Component
 * Formulario de configuración para Instagram Direct
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  TextField,
  Button,
  Alert,
  Box,
  Typography,
  InputAdornment,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  OpenInNew as OpenInNewIcon,
  CheckCircle as CheckIcon,
  Instagram as InstagramIcon
} from '@mui/icons-material';
import { InstagramConfig } from '../../../types';
import { configService } from '../../../services';

interface InstagramFormProps {
  onSubmit: (data: InstagramConfig) => void;
  initialData?: InstagramConfig;
  isLoading?: boolean;
}

export const InstagramForm: React.FC<InstagramFormProps> = ({
  onSubmit,
  initialData,
  isLoading = false
}) => {
  const [showToken, setShowToken] = useState(false);
  const [generatedToken, setGeneratedToken] = useState(initialData?.webhookVerifyToken || '');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<InstagramConfig>({
    defaultValues: initialData || {
      instagramAccountId: '',
      instagramUsername: '',
      pageId: '',
      pageAccessToken: '',
      webhookVerifyToken: generatedToken,
      apiVersion: 'v18.0'
    }
  });

  // Generar token si no existe
  React.useEffect(() => {
    if (!generatedToken) {
      const token = configService.generateToken();
      setGeneratedToken(token);
      setValue('webhookVerifyToken', token);
    }
  }, []);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Instrucciones principales */}
        <Alert severity="info">
          <Typography variant="subtitle2" gutterBottom>
            <InstagramIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            Requisitos para Instagram Direct:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon><CheckIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="Cuenta de Instagram Business o Creator" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="Página de Facebook conectada" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="Acceso a Meta Business Manager" />
            </ListItem>
          </List>
          <Button
            size="small"
            startIcon={<OpenInNewIcon />}
            href="https://developers.facebook.com/docs/instagram-api"
            target="_blank"
            component={Link}
            sx={{ mt: 1 }}
          >
            Documentación de Instagram API
          </Button>
        </Alert>

        {/* Pasos de configuración previa */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Pasos previos en Instagram:
          </Typography>
          <Stepper orientation="vertical">
            <Step active={true}>
              <StepLabel>Convertir a cuenta Business/Creator</StepLabel>
              <StepContent>
                <Typography variant="caption">
                  Ve a Configuración → Cuenta → Cambiar a cuenta profesional
                </Typography>
              </StepContent>
            </Step>
            <Step active={true}>
              <StepLabel>Conectar con página de Facebook</StepLabel>
              <StepContent>
                <Typography variant="caption">
                  Configuración → Cuenta → Páginas conectadas
                </Typography>
              </StepContent>
            </Step>
            <Step active={true}>
              <StepLabel>Obtener permisos en Meta Business</StepLabel>
              <StepContent>
                <Typography variant="caption">
                  Solicita permisos: instagram_basic, instagram_manage_messages
                </Typography>
              </StepContent>
            </Step>
          </Stepper>
        </Box>

        {/* Campos del formulario */}
        <TextField
          fullWidth
          label="ID de Cuenta de Instagram"
          placeholder="17841400000000000"
          {...register('instagramAccountId', {
            required: 'El ID de cuenta es requerido',
            pattern: {
              value: /^\d{15,20}$/,
              message: 'El ID debe tener entre 15-20 dígitos'
            }
          })}
          error={!!errors.instagramAccountId}
          helperText={errors.instagramAccountId?.message || 'ID numérico de tu cuenta de Instagram Business'}
        />

        <TextField
          fullWidth
          label="Nombre de Usuario"
          placeholder="@miempresa"
          {...register('instagramUsername')}
          helperText="Tu nombre de usuario en Instagram (opcional)"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <InstagramIcon />
              </InputAdornment>
            )
          }}
        />

        <TextField
          fullWidth
          label="ID de Página de Facebook"
          placeholder="123456789012345"
          {...register('pageId', {
            pattern: {
              value: /^\d{15,}$/,
              message: 'El ID debe ser numérico con al menos 15 dígitos'
            }
          })}
          error={!!errors.pageId}
          helperText={errors.pageId?.message || 'ID de la página de Facebook conectada'}
        />

        <TextField
          fullWidth
          label="Token de Acceso de Página"
          type={showToken ? 'text' : 'password'}
          {...register('pageAccessToken', {
            required: 'El token de acceso es requerido',
            minLength: {
              value: 100,
              message: 'El token parece ser muy corto'
            }
          })}
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
          error={!!errors.pageAccessToken}
          helperText={errors.pageAccessToken?.message || 'Token de acceso con permisos de Instagram'}
        />

        <TextField
          fullWidth
          label="Webhook Verify Token"
          value={generatedToken}
          {...register('webhookVerifyToken')}
          InputProps={{
            readOnly: true
          }}
          helperText="Token generado automáticamente para webhooks"
        />

        <TextField
          fullWidth
          label="Versión de API"
          {...register('apiVersion')}
          defaultValue="v18.0"
          helperText="Versión de Instagram Graph API"
        />

        {/* Información sobre permisos */}
        <Alert severity="warning">
          <Typography variant="subtitle2" gutterBottom>
            Permisos necesarios en Meta:
          </Typography>
          <Typography variant="caption">
            • <strong>instagram_basic</strong>: Información básica del perfil
            <br />
            • <strong>instagram_manage_messages</strong>: Leer y responder mensajes
            <br />
            • <strong>pages_messaging</strong>: Gestionar mensajes de la página
            <br />
            • <strong>pages_manage_metadata</strong>: Acceder a metadata de la página
          </Typography>
        </Alert>

        {/* Cómo obtener las credenciales */}
        <Alert severity="info">
          <Typography variant="subtitle2" gutterBottom>
            ¿Dónde encuentro estas credenciales?
          </Typography>
          <Typography variant="caption">
            <strong>1. ID de Cuenta de Instagram:</strong>
            <br />
            Meta Business Manager → Configuración de negocio → Cuentas de Instagram
            <br /><br />
            <strong>2. ID de Página de Facebook:</strong>
            <br />
            Página de Facebook → Información → ID de la página
            <br /><br />
            <strong>3. Token de Acceso:</strong>
            <br />
            Graph API Explorer → Seleccionar tu app → Generar token con permisos de Instagram
          </Typography>
        </Alert>

        {/* Limitaciones */}
        <Alert severity="warning">
          <Typography variant="caption">
            <strong>Limitaciones:</strong>
            <br />
            • Solo funciona con cuentas Business o Creator
            <br />
            • Los mensajes deben iniciarse desde el usuario (no se puede enviar el primer mensaje)
            <br />
            • Ventana de 24 horas para responder después del último mensaje del usuario
            <br />
            • No se pueden enviar archivos adjuntos en la primera respuesta
          </Typography>
        </Alert>

        {/* Botón de envío */}
        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={isLoading}
          sx={{ mt: 2 }}
        >
          {isLoading ? 'Validando...' : 'Validar Configuración'}
        </Button>
      </Box>
    </form>
  );
};