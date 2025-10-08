/**
 * SMSForm Component
 * Formulario de configuración para SMS
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
  Link,
  Collapse,
  Chip
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  OpenInNew as OpenInNewIcon,
  Phone as PhoneIcon
} from '@mui/icons-material';
import { SMSConfig, SMSProvider } from '../../../types';

interface SMSFormProps {
  onSubmit: (data: SMSConfig) => void;
  initialData?: SMSConfig;
  isLoading?: boolean;
}

export const SMSForm: React.FC<SMSFormProps> = ({
  onSubmit,
  initialData,
  isLoading = false
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [provider, setProvider] = useState<SMSProvider>(
    initialData?.provider || SMSProvider.TWILIO
  );

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<SMSConfig>({
    defaultValues: initialData || {
      provider: SMSProvider.TWILIO,
      phoneNumber: '',
      accountSid: '',
      authToken: '',
      apiKey: '',
      messagingServiceSid: '',
      countryCode: 'AR',
      capabilities: ['sms']
    }
  });

  const getProviderDocs = () => {
    switch (provider) {
      case SMSProvider.TWILIO:
        return 'https://www.twilio.com/console';
      case SMSProvider.MESSAGEBIRD:
        return 'https://dashboard.messagebird.com';
      case SMSProvider.VONAGE:
        return 'https://dashboard.nexmo.com';
      case SMSProvider.AWS_SNS:
        return 'https://console.aws.amazon.com/sns';
      default:
        return null;
    }
  };

  const getProviderInstructions = () => {
    switch (provider) {
      case SMSProvider.TWILIO:
        return (
          <Alert severity="info">
            <Typography variant="subtitle2" gutterBottom>
              Configuración de Twilio
            </Typography>
            <Typography variant="caption" paragraph>
              Necesitas una cuenta de Twilio con un número de teléfono habilitado para SMS.
            </Typography>
            <Button
              size="small"
              startIcon={<OpenInNewIcon />}
              href={getProviderDocs()}
              target="_blank"
              component={Link}
            >
              Ir a Twilio Console
            </Button>
          </Alert>
        );
      case SMSProvider.MESSAGEBIRD:
        return (
          <Alert severity="info">
            <Typography variant="subtitle2" gutterBottom>
              Configuración de MessageBird
            </Typography>
            <Typography variant="caption" paragraph>
              Requiere una API Key y un número de origen verificado.
            </Typography>
            <Button
              size="small"
              startIcon={<OpenInNewIcon />}
              href={getProviderDocs()}
              target="_blank"
              component={Link}
            >
              Ir a MessageBird Dashboard
            </Button>
          </Alert>
        );
      case SMSProvider.VONAGE:
        return (
          <Alert severity="info">
            <Typography variant="subtitle2" gutterBottom>
              Configuración de Vonage (Nexmo)
            </Typography>
            <Typography variant="caption" paragraph>
              Necesitas API Key, API Secret y un número virtual.
            </Typography>
            <Button
              size="small"
              startIcon={<OpenInNewIcon />}
              href={getProviderDocs()}
              target="_blank"
              component={Link}
            >
              Ir a Vonage Dashboard
            </Button>
          </Alert>
        );
      case SMSProvider.AWS_SNS:
        return (
          <Alert severity="info">
            <Typography variant="subtitle2" gutterBottom>
              Configuración de AWS SNS
            </Typography>
            <Typography variant="caption" paragraph>
              Requiere credenciales de AWS con permisos para SNS.
            </Typography>
            <Button
              size="small"
              startIcon={<OpenInNewIcon />}
              href={getProviderDocs()}
              target="_blank"
              component={Link}
            >
              Ir a AWS Console
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
          <InputLabel>Proveedor de SMS</InputLabel>
          <Select
            value={provider}
            label="Proveedor de SMS"
            {...register('provider')}
            onChange={(e) => setProvider(e.target.value as SMSProvider)}
          >
            <MenuItem value={SMSProvider.TWILIO}>Twilio</MenuItem>
            <MenuItem value={SMSProvider.MESSAGEBIRD}>MessageBird</MenuItem>
            <MenuItem value={SMSProvider.VONAGE}>Vonage (Nexmo)</MenuItem>
            <MenuItem value={SMSProvider.AWS_SNS}>AWS SNS</MenuItem>
          </Select>
        </FormControl>

        {/* Instrucciones del proveedor */}
        {getProviderInstructions()}

        {/* Número de teléfono */}
        <TextField
          fullWidth
          label="Número de Teléfono"
          placeholder="+5491112345678"
          {...register('phoneNumber', {
            required: 'El número de teléfono es requerido',
            pattern: {
              value: /^\+[1-9]\d{1,14}$/,
              message: 'Formato inválido. Incluye el código de país (ej: +5491112345678)'
            }
          })}
          error={!!errors.phoneNumber}
          helperText={errors.phoneNumber?.message || 'Número desde el cual se enviarán los SMS'}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PhoneIcon />
              </InputAdornment>
            )
          }}
        />

        {/* Código de país */}
        <TextField
          fullWidth
          label="Código de País"
          placeholder="AR"
          {...register('countryCode')}
          helperText="Código ISO del país (AR, US, MX, etc.)"
          inputProps={{ maxLength: 2 }}
        />

        {/* Campos Twilio */}
        <Collapse in={provider === SMSProvider.TWILIO}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Account SID"
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              {...register('accountSid', {
                required: provider === SMSProvider.TWILIO ? 'Account SID requerido' : false,
                pattern: {
                  value: /^AC[a-f0-9]{32}$/,
                  message: 'Formato inválido (debe empezar con AC)'
                }
              })}
              error={!!errors.accountSid}
              helperText={errors.accountSid?.message || 'Encuentralo en Twilio Console > Account Info'}
            />

            <TextField
              fullWidth
              label="Auth Token"
              type={showPassword ? 'text' : 'password'}
              {...register('authToken', {
                required: provider === SMSProvider.TWILIO ? 'Auth Token requerido' : false
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
              error={!!errors.authToken}
              helperText={errors.authToken?.message || 'Token de autenticación de Twilio'}
            />

            <TextField
              fullWidth
              label="Messaging Service SID (Opcional)"
              placeholder="MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              {...register('messagingServiceSid')}
              helperText="Si usas un Messaging Service en lugar de un número directo"
            />
          </Box>
        </Collapse>

        {/* Campos para otros proveedores */}
        <Collapse in={provider !== SMSProvider.TWILIO}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="API Key"
              type={showPassword ? 'text' : 'password'}
              {...register('apiKey', {
                required: provider !== SMSProvider.TWILIO ? 'API Key requerida' : false
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

            {provider === SMSProvider.VONAGE && (
              <TextField
                fullWidth
                label="API Secret"
                type={showPassword ? 'text' : 'password'}
                {...register('apiSecret')}
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
                helperText="API Secret de Vonage"
              />
            )}
          </Box>
        </Collapse>

        {/* Capacidades */}
        <Box>
          <Typography variant="body2" gutterBottom>
            Capacidades disponibles:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip label="SMS" color="primary" size="small" />
            <Chip label="MMS" color="default" size="small" />
            <Chip label="Voice" color="default" size="small" />
          </Box>
          <Typography variant="caption" color="text.secondary">
            Las capacidades dependen del proveedor y el plan contratado
          </Typography>
        </Box>

        {/* Información sobre costos */}
        <Alert severity="warning">
          <Typography variant="caption">
            <strong>Importante:</strong> El envío de SMS tiene costos por mensaje.
            Verifica las tarifas con tu proveedor según el país de destino.
          </Typography>
        </Alert>

        {/* Límites y restricciones */}
        <Alert severity="info">
          <Typography variant="caption">
            <strong>Límites típicos:</strong>
            <br />• Longitud máxima: 160 caracteres (1 SMS) o 70 caracteres con emojis
            <br />• Mensajes más largos se dividen y cobran como múltiples SMS
            <br />• Algunos países requieren registro previo del remitente
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