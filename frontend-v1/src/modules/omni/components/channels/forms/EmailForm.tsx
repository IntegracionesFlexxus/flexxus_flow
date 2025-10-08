/**
 * EmailForm Component
 * Formulario de configuración para Email
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  TextField,
  Button,
  Alert,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  IconButton,
  Switch,
  FormControlLabel,
  Collapse,
  Link,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Info as InfoIcon,
  OpenInNew as OpenInNewIcon
} from '@mui/icons-material';
import { EmailConfig, EmailProvider } from '../../../types';

interface EmailFormProps {
  onSubmit: (data: EmailConfig) => void;
  initialData?: EmailConfig;
  isLoading?: boolean;
}

export const EmailForm: React.FC<EmailFormProps> = ({
  onSubmit,
  initialData,
  isLoading = false
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [provider, setProvider] = useState<EmailProvider>(
    initialData?.provider || EmailProvider.SMTP
  );

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<EmailConfig>({
    defaultValues: initialData || {
      provider: EmailProvider.SMTP,
      fromEmail: '',
      fromName: '',
      replyToEmail: '',
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpPassword: '',
      smtpSecure: false,
      apiKey: '',
      trackOpens: true,
      trackClicks: true
    }
  });

  const getProviderInstructions = () => {
    switch (provider) {
      case EmailProvider.SMTP:
        return (
          <Alert severity="info">
            <Typography variant="subtitle2" gutterBottom>
              Configuración SMTP
            </Typography>
            <Typography variant="caption">
              Para Gmail: Usa smtp.gmail.com:587 y genera una contraseña de aplicación.
              Para Outlook: Usa smtp-mail.outlook.com:587
            </Typography>
          </Alert>
        );
      case EmailProvider.SENDGRID:
        return (
          <Alert severity="info">
            <Typography variant="subtitle2" gutterBottom>
              SendGrid API
            </Typography>
            <Typography variant="caption" paragraph>
              Necesitas una cuenta de SendGrid y una API Key con permisos de envío.
            </Typography>
            <Button
              size="small"
              startIcon={<OpenInNewIcon />}
              href="https://app.sendgrid.com/settings/api_keys"
              target="_blank"
              component={Link}
            >
              Obtener API Key
            </Button>
          </Alert>
        );
      case EmailProvider.SES:
        return (
          <Alert severity="info">
            <Typography variant="subtitle2" gutterBottom>
              Amazon SES
            </Typography>
            <Typography variant="caption" paragraph>
              Requiere verificar el dominio o email en AWS SES.
            </Typography>
            <Button
              size="small"
              startIcon={<OpenInNewIcon />}
              href="https://console.aws.amazon.com/ses/"
              target="_blank"
              component={Link}
            >
              Configurar en AWS
            </Button>
          </Alert>
        );
      case EmailProvider.MAILGUN:
        return (
          <Alert severity="info">
            <Typography variant="subtitle2" gutterBottom>
              Mailgun API
            </Typography>
            <Typography variant="caption" paragraph>
              Necesitas un dominio verificado en Mailgun y una API Key.
            </Typography>
            <Button
              size="small"
              startIcon={<OpenInNewIcon />}
              href="https://app.mailgun.com/app/account/security/api_keys"
              target="_blank"
              component={Link}
            >
              Obtener API Key
            </Button>
          </Alert>
        );
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Selector de proveedor */}
        <FormControl fullWidth>
          <InputLabel>Proveedor de Email</InputLabel>
          <Select
            value={provider}
            label="Proveedor de Email"
            {...register('provider')}
            onChange={(e) => setProvider(e.target.value as EmailProvider)}
          >
            <MenuItem value={EmailProvider.SMTP}>SMTP (Gmail, Outlook, etc.)</MenuItem>
            <MenuItem value={EmailProvider.SENDGRID}>SendGrid</MenuItem>
            <MenuItem value={EmailProvider.SES}>Amazon SES</MenuItem>
            <MenuItem value={EmailProvider.MAILGUN}>Mailgun</MenuItem>
          </Select>
        </FormControl>

        {/* Instrucciones del proveedor */}
        {getProviderInstructions()}

        {/* Campos comunes */}
        <TextField
          fullWidth
          label="Email de Envío"
          type="email"
          placeholder="noreply@tuempresa.com"
          {...register('fromEmail', {
            required: 'El email de envío es requerido',
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Email inválido'
            }
          })}
          error={!!errors.fromEmail}
          helperText={errors.fromEmail?.message || 'Email desde el cual se enviarán los mensajes'}
        />

        <TextField
          fullWidth
          label="Nombre del Remitente"
          placeholder="Mi Empresa"
          {...register('fromName')}
          helperText="Nombre que verán los destinatarios (opcional)"
        />

        <TextField
          fullWidth
          label="Email de Respuesta"
          type="email"
          placeholder="soporte@tuempresa.com"
          {...register('replyToEmail', {
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Email inválido'
            }
          })}
          error={!!errors.replyToEmail}
          helperText={errors.replyToEmail?.message || 'Email para respuestas (opcional)'}
        />

        {/* Campos SMTP */}
        <Collapse in={provider === EmailProvider.SMTP}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Host SMTP"
              placeholder="smtp.gmail.com"
              {...register('smtpHost', {
                required: provider === EmailProvider.SMTP ? 'Host SMTP requerido' : false
              })}
              error={!!errors.smtpHost}
              helperText={errors.smtpHost?.message || 'Servidor SMTP'}
            />

            <TextField
              fullWidth
              label="Puerto SMTP"
              type="number"
              defaultValue={587}
              {...register('smtpPort', {
                required: provider === EmailProvider.SMTP ? 'Puerto requerido' : false,
                min: { value: 1, message: 'Puerto inválido' },
                max: { value: 65535, message: 'Puerto inválido' }
              })}
              error={!!errors.smtpPort}
              helperText={errors.smtpPort?.message || 'Puerto: 587 (TLS), 465 (SSL), 25 (sin cifrado)'}
            />

            <TextField
              fullWidth
              label="Usuario SMTP"
              {...register('smtpUser', {
                required: provider === EmailProvider.SMTP ? 'Usuario requerido' : false
              })}
              error={!!errors.smtpUser}
              helperText={errors.smtpUser?.message || 'Generalmente tu email completo'}
            />

            <TextField
              fullWidth
              label="Contraseña SMTP"
              type={showPassword ? 'text' : 'password'}
              {...register('smtpPassword', {
                required: provider === EmailProvider.SMTP ? 'Contraseña requerida' : false
              })}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
              error={!!errors.smtpPassword}
              helperText={errors.smtpPassword?.message || 'Para Gmail: usa contraseña de aplicación'}
            />

            <FormControlLabel
              control={<Switch {...register('smtpSecure')} />}
              label="Usar SSL/TLS"
            />
          </Box>
        </Collapse>

        {/* Campos API (para proveedores no-SMTP) */}
        <Collapse in={provider !== EmailProvider.SMTP}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="API Key"
              type={showPassword ? 'text' : 'password'}
              {...register('apiKey', {
                required: provider !== EmailProvider.SMTP ? 'API Key requerida' : false
              })}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
              error={!!errors.apiKey}
              helperText={errors.apiKey?.message || `API Key de ${provider}`}
            />

            {provider === EmailProvider.SES && (
              <TextField
                fullWidth
                label="Región AWS"
                placeholder="us-east-1"
                {...register('region')}
                helperText="Región de AWS donde está configurado SES"
              />
            )}

            {provider === EmailProvider.MAILGUN && (
              <TextField
                fullWidth
                label="Dominio"
                placeholder="mg.tudominio.com"
                {...register('domain')}
                helperText="Dominio verificado en Mailgun"
              />
            )}
          </Box>
        </Collapse>

        {/* Opciones de tracking */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControlLabel
            control={<Switch {...register('trackOpens')} defaultChecked />}
            label="Rastrear aperturas"
          />
          <FormControlLabel
            control={<Switch {...register('trackClicks')} defaultChecked />}
            label="Rastrear clicks"
          />
        </Box>

        {/* Tips adicionales */}
        {provider === EmailProvider.SMTP && (
          <Alert severity="warning">
            <Typography variant="caption">
              <strong>Importante para Gmail:</strong>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="• Activa la verificación en dos pasos"
                    primaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="• Genera una contraseña de aplicación en: myaccount.google.com/apppasswords"
                    primaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="• Usa esa contraseña en lugar de tu contraseña normal"
                    primaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
              </List>
            </Typography>
          </Alert>
        )}

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