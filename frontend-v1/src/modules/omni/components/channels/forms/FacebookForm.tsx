/**
 * FacebookForm Component
 * Formulario de configuración para Facebook Messenger
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
  Chip,
  Divider
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  OpenInNew as OpenInNewIcon,
  CheckCircle as CheckIcon,
  Facebook as FacebookIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { FacebookConfig } from '../../../types';
import { configService } from '../../../services';

interface FacebookFormProps {
  onSubmit: (data: FacebookConfig) => void;
  initialData?: FacebookConfig;
  isLoading?: boolean;
}

export const FacebookForm: React.FC<FacebookFormProps> = ({
  onSubmit,
  initialData,
  isLoading = false
}) => {
  const [showToken, setShowToken] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [generatedToken, setGeneratedToken] = useState(initialData?.webhookVerifyToken || '');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<FacebookConfig>({
    defaultValues: initialData || {
      pageId: '',
      pageName: '',
      pageAccessToken: '',
      appId: '',
      appSecret: '',
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
            <FacebookIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            Requisitos para Facebook Messenger:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon><CheckIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="Página de Facebook (no perfil personal)" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="App en Meta for Developers" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="Acceso de administrador a la página" />
            </ListItem>
          </List>
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Button
              size="small"
              startIcon={<OpenInNewIcon />}
              href="https://developers.facebook.com/apps"
              target="_blank"
              component={Link}
            >
              Meta for Developers
            </Button>
            <Button
              size="small"
              startIcon={<OpenInNewIcon />}
              href="https://business.facebook.com"
              target="_blank"
              component={Link}
            >
              Business Manager
            </Button>
          </Box>
        </Alert>

        {/* Campos del formulario */}
        <TextField
          fullWidth
          label="ID de Página"
          placeholder="123456789012345"
          {...register('pageId', {
            required: 'El ID de página es requerido',
            pattern: {
              value: /^\d{15,}$/,
              message: 'El ID debe ser numérico con al menos 15 dígitos'
            }
          })}
          error={!!errors.pageId}
          helperText={errors.pageId?.message || 'ID numérico de tu página de Facebook'}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <FacebookIcon />
              </InputAdornment>
            )
          }}
        />

        <TextField
          fullWidth
          label="Nombre de la Página"
          placeholder="Mi Empresa"
          {...register('pageName')}
          helperText="Nombre de tu página en Facebook (opcional)"
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
          helperText={errors.pageAccessToken?.message || 'Token de larga duración con permisos de página'}
        />

        <Divider />

        <Typography variant="subtitle2">
          Configuración de la App (Opcional)
        </Typography>

        <TextField
          fullWidth
          label="App ID"
          placeholder="1234567890123456"
          {...register('appId')}
          helperText="ID de tu aplicación en Meta for Developers"
        />

        <TextField
          fullWidth
          label="App Secret"
          type={showSecret ? 'text' : 'password'}
          {...register('appSecret')}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowSecret(!showSecret)}
                  edge="end"
                >
                  {showSecret ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </IconButton>
              </InputAdornment>
            )
          }}
          helperText="Secret de tu aplicación (mantener seguro)"
        />

        <TextField
          fullWidth
          label="Webhook Verify Token"
          value={generatedToken}
          {...register('webhookVerifyToken')}
          InputProps={{
            readOnly: true
          }}
          helperText="Token generado para verificar webhooks"
        />

        <TextField
          fullWidth
          label="Versión de API"
          {...register('apiVersion')}
          defaultValue="v18.0"
          helperText="Versión de Facebook Graph API"
        />

        {/* Permisos necesarios */}
        <Alert severity="warning">
          <Typography variant="subtitle2" gutterBottom>
            Permisos necesarios de la App:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
            <Chip label="pages_messaging" size="small" />
            <Chip label="pages_messaging_subscriptions" size="small" />
            <Chip label="pages_manage_metadata" size="small" />
            <Chip label="pages_read_engagement" size="small" />
          </Box>
        </Alert>

        {/* Pasos para obtener el token */}
        <Alert severity="info">
          <Typography variant="subtitle2" gutterBottom>
            Cómo obtener el Token de Acceso:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText
                primary="1. Ve a Graph API Explorer"
                secondary="developers.facebook.com/tools/explorer"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="2. Selecciona tu aplicación"
                secondary="En el dropdown superior derecho"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="3. Genera token de usuario"
                secondary="Con permisos de páginas"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="4. Intercambia por token de página"
                secondary="GET /me/accounts para obtener el token de tu página"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="5. Extiende el token"
                secondary="Convierte a token de larga duración (60+ días)"
              />
            </ListItem>
          </List>
        </Alert>

        {/* Características y limitaciones */}
        <Alert severity="warning" icon={<WarningIcon />}>
          <Typography variant="subtitle2" gutterBottom>
            Limitaciones importantes:
          </Typography>
          <Typography variant="caption">
            • <strong>Ventana de 24 horas:</strong> Solo puedes responder dentro de 24 horas del último mensaje del usuario
            <br />
            • <strong>Mensajes proactivos:</strong> Requieren plantillas pre-aprobadas por Facebook
            <br />
            • <strong>Límites de tasa:</strong> 200 llamadas por hora por usuario
            <br />
            • <strong>Contenido multimedia:</strong> Máximo 25MB por archivo
            <br />
            • <strong>No spam:</strong> Facebook puede bloquear la página por envíos masivos no solicitados
          </Typography>
        </Alert>

        {/* Dónde encontrar el ID de página */}
        <Alert severity="info">
          <Typography variant="caption">
            <strong>¿Dónde encuentro el ID de mi página?</strong>
            <br />
            1. Ve a tu página de Facebook
            <br />
            2. Click en "Información" o "About"
            <br />
            3. Desplázate hasta "ID de la página"
            <br />
            O usa: facebook.com/pg/TU_PAGINA/about
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