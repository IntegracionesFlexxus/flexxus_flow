/**
 * WebhookSetup Component
 * Componente para mostrar instrucciones de configuración de webhooks
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Alert,
  Chip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Link
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  ContentCopy as ContentCopyIcon,
  ExpandMore as ExpandMoreIcon,
  OpenInNew as OpenInNewIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { webhookService } from '../../services';
import { ChannelType } from '../../types';

interface WebhookSetupProps {
  config: {
    url: string;
    verifyToken: string;
    steps: string[];
    fields?: { label: string; value: string }[];
  };
  channelType: ChannelType;
  onComplete?: () => void;
}

export const WebhookSetup: React.FC<WebhookSetupProps> = ({
  config,
  channelType,
  onComplete
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  const handleCopy = async (value: string, label: string) => {
    const success = await webhookService.copyToClipboard(value);
    if (success) {
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const getChannelDocs = () => {
    switch (channelType) {
      case ChannelType.WHATSAPP:
        return 'https://developers.facebook.com/docs/whatsapp/webhooks';
      case ChannelType.FACEBOOK:
        return 'https://developers.facebook.com/docs/messenger-platform/webhooks';
      case ChannelType.INSTAGRAM:
        return 'https://developers.facebook.com/docs/instagram-api/webhooks';
      default:
        return null;
    }
  };

  const docsUrl = getChannelDocs();

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Configuración de Webhook
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          ¿Qué es un webhook?
        </Typography>
        <Typography variant="body2">
          Un webhook permite que {channelType} envíe mensajes entrantes a tu aplicación
          en tiempo real. Configúralo en el panel del proveedor siguiendo estos pasos.
        </Typography>
      </Alert>

      {/* Campos para copiar */}
      {config.fields && config.fields.length > 0 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Información del Webhook
          </Typography>
          <Typography variant="caption" color="text.secondary" paragraph>
            Copia estos valores y pégalos en la configuración del proveedor
          </Typography>

          {config.fields.map((field) => (
            <Box key={field.label} sx={{ mb: 2 }}>
              <TextField
                fullWidth
                label={field.label}
                value={field.value}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => handleCopy(field.value, field.label)}
                        edge="end"
                      >
                        <ContentCopyIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                  sx: {
                    fontFamily: 'monospace',
                    fontSize: '0.875rem'
                  }
                }}
                helperText={copiedField === field.label ? (
                  <Typography variant="caption" color="success.main">
                    Copiado al portapapeles
                  </Typography>
                ) : null}
                variant="outlined"
                size="small"
              />
            </Box>
          ))}
        </Paper>
      )}

      {/* Pasos de configuración */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Pasos de Configuración
        </Typography>
        <List>
          {config.steps.map((step, index) => (
            <ListItem key={index} alignItems="flex-start">
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Chip
                  label={index + 1}
                  size="small"
                  color={completed ? 'success' : 'default'}
                />
              </ListItemIcon>
              <ListItemText
                primary={step}
                primaryTypographyProps={{
                  variant: 'body2'
                }}
              />
            </ListItem>
          ))}
        </List>

        {docsUrl && (
          <Box sx={{ mt: 2 }}>
            <Button
              variant="text"
              size="small"
              startIcon={<OpenInNewIcon />}
              href={docsUrl}
              target="_blank"
              component={Link}
            >
              Ver documentación oficial
            </Button>
          </Box>
        )}
      </Paper>

      {/* FAQs */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">
            Preguntas Frecuentes
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            <Typography variant="body2" fontWeight="bold" gutterBottom>
              ¿Qué pasa si no configuro el webhook?
            </Typography>
            <Typography variant="body2" paragraph>
              No podrás recibir mensajes entrantes. Solo podrás enviar mensajes.
            </Typography>

            <Typography variant="body2" fontWeight="bold" gutterBottom>
              ¿Cómo verifico que el webhook funciona?
            </Typography>
            <Typography variant="body2" paragraph>
              Después de configurarlo, envía un mensaje de prueba. Deberías verlo
              aparecer en la sección de conversaciones.
            </Typography>

            <Typography variant="body2" fontWeight="bold" gutterBottom>
              ¿Es seguro compartir el Verify Token?
            </Typography>
            <Typography variant="body2">
              El Verify Token es solo para validar que los webhooks vienen del
              proveedor correcto. No da acceso a tu cuenta.
            </Typography>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Confirmación */}
      <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
        <Typography variant="body2" gutterBottom>
          <strong>Importante:</strong> Después de configurar el webhook en el panel del
          proveedor, marca esta casilla para confirmar:
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, gap: 2 }}>
          <input
            type="checkbox"
            checked={completed}
            onChange={(e) => setCompleted(e.target.checked)}
            style={{ width: 20, height: 20 }}
          />
          <Typography variant="body2">
            He configurado el webhook según las instrucciones
          </Typography>
        </Box>

        {completed && (
          <Alert
            severity="success"
            sx={{ mt: 2 }}
            icon={<CheckCircleIcon />}
          >
            Excelente! Puedes continuar con la configuración.
          </Alert>
        )}
      </Box>

      {/* Botón de continuar */}
      {onComplete && (
        <Box sx={{ mt: 3, textAlign: 'right' }}>
          <Button
            variant="contained"
            onClick={onComplete}
            disabled={!completed}
            startIcon={completed && <CheckCircleIcon />}
          >
            {completed ? 'Completar Configuración' : 'Marca la casilla para continuar'}
          </Button>
        </Box>
      )}
    </Box>
  );
};