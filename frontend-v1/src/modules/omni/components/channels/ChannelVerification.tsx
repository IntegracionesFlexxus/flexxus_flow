/**
 * ChannelVerification Component
 * Verificación y validación de credenciales de canal en tiempo real
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  AlertTitle,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  IconButton,
  Chip,
  Divider
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  Wifi as WifiIcon,
  VpnKey as VpnKeyIcon,
  Shield as ShieldIcon
} from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';
import { channelService, webhookService } from '../../services';
import { Channel, ChannelType } from '../../types';
import {
  getChannelSchema,
  securityValidation,
  asyncValidations,
  validationMessages
} from './validation/channelValidation';

interface ChannelVerificationProps {
  channel?: Channel | null;
  channelType?: ChannelType;
  configuration: any;
  onVerify?: (status: VerificationStatus) => void;
  autoVerify?: boolean;
}

interface VerificationStatus {
  valid: boolean;
  errors: string[];
  warnings: string[];
  checks: VerificationCheck[];
  timestamp: Date;
}

interface VerificationCheck {
  name: string;
  status: 'pending' | 'checking' | 'success' | 'error' | 'warning';
  message: string;
  details?: string[];
}

export const ChannelVerification: React.FC<ChannelVerificationProps> = ({
  channel,
  channelType,
  configuration,
  onVerify,
  autoVerify = false
}) => {
  const [verifying, setVerifying] = useState(false);
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [expandedChecks, setExpandedChecks] = useState<Set<string>>(new Set());
  const [currentCheck, setCurrentCheck] = useState<string>('');

  const type = channel?.channel_type || channelType;

  // Mutation para validar credenciales
  const validateMutation = useMutation({
    mutationFn: async () => {
      if (!type) throw new Error('Tipo de canal no especificado');
      return channelService.validateCredentials(type, configuration);
    },
    onSuccess: (result) => {
      const newStatus: VerificationStatus = {
        valid: result.valid,
        errors: result.errors || [],
        warnings: result.warnings || [],
        checks: result.checks || [],
        timestamp: new Date()
      };
      setStatus(newStatus);
      if (onVerify) onVerify(newStatus);
    },
    onError: (error: any) => {
      const newStatus: VerificationStatus = {
        valid: false,
        errors: [error.message || 'Error al validar credenciales'],
        warnings: [],
        checks: [],
        timestamp: new Date()
      };
      setStatus(newStatus);
      if (onVerify) onVerify(newStatus);
    }
  });

  // Validación local con Yup
  const validateLocally = async (): Promise<VerificationStatus> => {
    const checks: VerificationCheck[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Validación de esquema
    setCurrentCheck('Validando formato de datos');
    checks.push({
      name: 'Formato de datos',
      status: 'checking',
      message: 'Verificando estructura y formato...',
      details: []
    });

    try {
      const schema = getChannelSchema(type!);
      await schema.validate(configuration, { abortEarly: false });

      checks[checks.length - 1] = {
        name: 'Formato de datos',
        status: 'success',
        message: 'Todos los campos tienen el formato correcto',
        details: ['Estructura válida', 'Tipos de datos correctos', 'Campos requeridos presentes']
      };
    } catch (err: any) {
      const validationErrors = err.errors || [err.message];
      errors.push(...validationErrors);
      checks[checks.length - 1] = {
        name: 'Formato de datos',
        status: 'error',
        message: 'Errores de validación encontrados',
        details: validationErrors
      };
    }

    // 2. Validación de seguridad
    setCurrentCheck('Verificando seguridad');
    const securityChecks: string[] = [];
    const securityWarnings: string[] = [];

    // Verificar tokens y contraseñas
    if (configuration.accessToken && !securityValidation.noWhitespace(configuration.accessToken)) {
      securityWarnings.push('El token contiene espacios en blanco');
    }

    if (configuration.apiKey && !securityValidation.noMaliciousChars(configuration.apiKey)) {
      errors.push('La API Key contiene caracteres no permitidos');
    }

    if (configuration.smtpPassword) {
      if (!securityValidation.isStrongPassword(configuration.smtpPassword)) {
        warnings.push('La contraseña SMTP no es suficientemente segura');
        securityWarnings.push('Usa al menos 8 caracteres, mayúsculas, minúsculas y números');
      }
    }

    checks.push({
      name: 'Seguridad de credenciales',
      status: securityWarnings.length > 0 ? 'warning' : 'success',
      message: securityWarnings.length > 0 ? 'Advertencias de seguridad' : 'Credenciales seguras',
      details: securityWarnings.length > 0 ? securityWarnings : ['Sin caracteres peligrosos', 'Formato seguro']
    });

    // 3. Verificaciones específicas por tipo
    setCurrentCheck('Verificando configuración específica');
    const specificChecks = await performSpecificChecks(type!, configuration);
    checks.push(...specificChecks.checks);
    errors.push(...specificChecks.errors);
    warnings.push(...specificChecks.warnings);

    // 4. Conectividad (simulada para validación local)
    setCurrentCheck('Verificando conectividad');
    checks.push({
      name: 'Conectividad',
      status: 'warning',
      message: 'Requiere verificación con el servidor',
      details: ['Validación local completada', 'Se requiere validación con el proveedor']
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      checks,
      timestamp: new Date()
    };
  };

  // Verificaciones específicas por tipo de canal
  const performSpecificChecks = async (
    channelType: ChannelType,
    config: any
  ): Promise<{ checks: VerificationCheck[], errors: string[], warnings: string[] }> => {
    const checks: VerificationCheck[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (channelType) {
      case ChannelType.WHATSAPP:
        // Verificar formato de número
        if (config.phoneNumber && !config.phoneNumber.startsWith('+')) {
          warnings.push('El número debe incluir el código de país con +');
        }

        // Verificar token de webhook
        if (!config.webhookVerifyToken || config.webhookVerifyToken.length < 20) {
          warnings.push('Token de verificación de webhook débil');
        }

        checks.push({
          name: 'Configuración WhatsApp Business',
          status: warnings.length > 0 ? 'warning' : 'success',
          message: 'Configuración verificada',
          details: [
            `Número: ${config.phoneNumber}`,
            `Token de acceso: ${config.accessToken ? '✓ Configurado' : '✗ Faltante'}`,
            `Webhook: ${config.webhookVerifyToken ? '✓ Token configurado' : '⚠ Sin token'}`
          ]
        });
        break;

      case ChannelType.EMAIL:
        // Verificación para SMTP
        if (config.provider === 'smtp') {
          if (!config.smtpSecure && config.smtpPort !== 587) {
            warnings.push('Conexión SMTP sin TLS/SSL puede no ser segura');
          }

          checks.push({
            name: 'Configuración SMTP',
            status: 'success',
            message: 'Servidor SMTP configurado',
            details: [
              `Host: ${config.smtpHost}`,
              `Puerto: ${config.smtpPort}`,
              `Seguridad: ${config.smtpSecure ? 'SSL/TLS' : 'STARTTLS'}`,
              `Usuario: ${config.smtpUser}`
            ]
          });
        } else {
          // Verificación para proveedores de API
          checks.push({
            name: `Configuración ${config.provider?.toUpperCase()}`,
            status: 'success',
            message: 'Proveedor de email configurado',
            details: [
              `Proveedor: ${config.provider}`,
              `API Key: ${config.apiKey ? '✓ Configurada' : '✗ Faltante'}`,
              `Email remitente: ${config.fromEmail}`
            ]
          });
        }
        break;

      case ChannelType.SMS:
        if (config.provider === 'twilio') {
          // Verificar formato de Account SID
          if (config.accountSid && !config.accountSid.startsWith('AC')) {
            errors.push('Account SID de Twilio inválido (debe comenzar con AC)');
          }

          checks.push({
            name: 'Configuración Twilio',
            status: errors.length > 0 ? 'error' : 'success',
            message: errors.length > 0 ? 'Configuración inválida' : 'Configuración válida',
            details: [
              `Account SID: ${config.accountSid?.substring(0, 10)}...`,
              `Número: ${config.phoneNumber}`,
              `Auth Token: ${config.authToken ? '✓ Configurado' : '✗ Faltante'}`
            ]
          });
        }
        break;

      case ChannelType.INSTAGRAM:
      case ChannelType.FACEBOOK:
        // Verificar tokens de Meta
        if (config.pageAccessToken && config.pageAccessToken.length < 100) {
          warnings.push('El token de acceso parece ser muy corto');
        }

        checks.push({
          name: `Configuración ${channelType === ChannelType.INSTAGRAM ? 'Instagram' : 'Facebook'}`,
          status: 'success',
          message: 'Configuración de Meta verificada',
          details: [
            `ID de página: ${config.pageId || config.instagramAccountId}`,
            `Token de página: ${config.pageAccessToken ? '✓ Configurado' : '✗ Faltante'}`,
            `Webhook: ${config.webhookVerifyToken ? '✓ Token configurado' : '⚠ Sin token'}`,
            `API Version: ${config.apiVersion || 'Por defecto'}`
          ]
        });
        break;
    }

    return { checks, errors, warnings };
  };

  // Ejecutar verificación completa
  const handleVerify = async () => {
    setVerifying(true);
    setStatus(null);
    setCurrentCheck('Iniciando verificación...');

    try {
      // Primero validación local
      const localStatus = await validateLocally();
      setStatus(localStatus);

      // Si la validación local pasa, validar con el backend
      if (localStatus.valid) {
        setCurrentCheck('Validando con el servidor...');
        await validateMutation.mutateAsync();
      } else {
        if (onVerify) onVerify(localStatus);
      }
    } catch (error) {
      console.error('Error durante la verificación:', error);
    } finally {
      setVerifying(false);
      setCurrentCheck('');
    }
  };

  // Auto-verificar si está habilitado
  useEffect(() => {
    if (autoVerify && configuration) {
      handleVerify();
    }
  }, [autoVerify, configuration]);

  // Toggle expandir checks
  const toggleCheckExpand = (checkName: string) => {
    const newExpanded = new Set(expandedChecks);
    if (newExpanded.has(checkName)) {
      newExpanded.delete(checkName);
    } else {
      newExpanded.add(checkName);
    }
    setExpandedChecks(newExpanded);
  };

  // Obtener icono según el estado
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'checking':
        return <LinearProgress sx={{ width: 20, height: 20 }} />;
      default:
        return <InfoIcon color="disabled" />;
    }
  };

  // Obtener color del chip según el estado
  const getChipColor = (status: string): any => {
    switch (status) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShieldIcon color="primary" />
            <Typography variant="h6">
              Verificación de Canal
            </Typography>
          </Box>

          <Button
            variant="contained"
            onClick={handleVerify}
            disabled={verifying || !configuration}
            startIcon={verifying ? null : <SecurityIcon />}
          >
            {verifying ? 'Verificando...' : 'Verificar Configuración'}
          </Button>
        </Box>

        {/* Información de Webhook para WhatsApp, Instagram y Facebook */}
        {(type === ChannelType.WHATSAPP || type === ChannelType.INSTAGRAM || type === ChannelType.FACEBOOK) && configuration && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <AlertTitle>Configuración de Webhooks en Meta Business Manager</AlertTitle>

            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                Callback URL (Webhook URL):
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography
                  variant="body2"
                  component="code"
                  sx={{
                    flex: 1,
                    p: 1,
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                    fontFamily: 'monospace',
                    wordBreak: 'break-all'
                  }}
                >
                  {`${window.location.origin}/api/omni/webhooks/${type === ChannelType.WHATSAPP ? 'whatsapp' : type === ChannelType.INSTAGRAM ? 'instagram' : 'facebook'}`}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    const url = `${window.location.origin}/api/omni/webhooks/${type === ChannelType.WHATSAPP ? 'whatsapp' : type === ChannelType.INSTAGRAM ? 'instagram' : 'facebook'}`;
                    navigator.clipboard.writeText(url);
                    alert('URL copiada al portapapeles');
                  }}
                >
                  Copiar
                </Button>
              </Box>

              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                Webhook Verify Token:
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  variant="body2"
                  component="code"
                  sx={{
                    flex: 1,
                    p: 1,
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                    fontFamily: 'monospace',
                    wordBreak: 'break-all'
                  }}
                >
                  {configuration.webhookVerifyToken || '(No configurado)'}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    if (configuration.webhookVerifyToken) {
                      navigator.clipboard.writeText(configuration.webhookVerifyToken);
                      alert('Token copiado al portapapeles');
                    }
                  }}
                  disabled={!configuration.webhookVerifyToken}
                >
                  Copiar
                </Button>
              </Box>

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                💡 Copia estos valores y configúralos en Meta Business Manager → {type === ChannelType.WHATSAPP ? 'WhatsApp' : type === ChannelType.INSTAGRAM ? 'Instagram' : 'Facebook'} → Configuración → Webhooks
              </Typography>

              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="caption">
                  ⚠️ Si necesitas editar el Webhook Verify Token, regresa al tab de <strong>Configuración</strong> (primer tab).
                </Typography>
              </Alert>

              {/* Advertencia sobre localhost */}
              {(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  <AlertTitle>⚠️ URL de Webhook No Accesible para Meta</AlertTitle>
                  <Typography variant="body2" paragraph>
                    La URL actual usa <code>localhost</code> que <strong>no es accesible</strong> desde los servidores de Meta Business Manager.
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Soluciones:
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      🔧 Para Desarrollo (usando ngrok):
                    </Typography>
                    <Box component="ol" sx={{ pl: 2, mb: 0 }}>
                      <li>
                        <Typography variant="body2">
                          Instala ngrok: <code>npm install -g ngrok</code>
                        </Typography>
                      </li>
                      <li>
                        <Typography variant="body2">
                          Ejecuta: <code>ngrok http 5000</code>
                        </Typography>
                      </li>
                      <li>
                        <Typography variant="body2">
                          Copia la URL HTTPS que genera ngrok (ej: <code>https://abc123.ngrok.io</code>)
                        </Typography>
                      </li>
                      <li>
                        <Typography variant="body2">
                          Agrega en tu archivo <code>.env</code>:
                        </Typography>
                        <Box
                          component="pre"
                          sx={{
                            mt: 1,
                            p: 1,
                            bgcolor: 'grey.900',
                            color: 'grey.100',
                            borderRadius: 1,
                            fontSize: '0.75rem',
                            overflow: 'auto'
                          }}
                        >
                          REACT_APP_WEBHOOK_BASE_URL=https://abc123.ngrok.io
                        </Box>
                      </li>
                      <li>
                        <Typography variant="body2">
                          Reinicia la aplicación frontend
                        </Typography>
                      </li>
                    </Box>
                  </Box>

                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      🌐 Para Producción:
                    </Typography>
                    <Box component="ol" sx={{ pl: 2, mb: 0 }}>
                      <li>
                        <Typography variant="body2">
                          Configura tu dominio público (ej: <code>https://api.tudominio.com</code>)
                        </Typography>
                      </li>
                      <li>
                        <Typography variant="body2">
                          Agrega en tu archivo <code>.env</code>:
                        </Typography>
                        <Box
                          component="pre"
                          sx={{
                            mt: 1,
                            p: 1,
                            bgcolor: 'grey.900',
                            color: 'grey.100',
                            borderRadius: 1,
                            fontSize: '0.75rem',
                            overflow: 'auto'
                          }}
                        >
                          REACT_APP_WEBHOOK_BASE_URL=https://api.tudominio.com
                        </Box>
                      </li>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="caption" color="text.secondary">
                    <InfoIcon sx={{ fontSize: 12, verticalAlign: 'middle', mr: 0.5 }} />
                    Después de configurar la variable de entorno, recarga esta página para ver la URL correcta.
                  </Typography>
                </Alert>
              )}
            </Box>
          </Alert>
        )}

        {/* Progreso de verificación */}
        {verifying && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <AlertTitle>Verificando...</AlertTitle>
            {currentCheck}
          </Alert>
        )}

        {/* Resultado de verificación */}
        {status && !verifying && (
          <>
            {/* Resumen general */}
            <Alert
              severity={status.valid ? 'success' : status.warnings.length > 0 ? 'warning' : 'error'}
              sx={{ mb: 2 }}
            >
              <AlertTitle>
                {status.valid ? 'Configuración Válida' : 'Requiere Atención'}
              </AlertTitle>
              {status.valid && status.warnings.length === 0 && (
                'La configuración del canal es válida y está lista para usar.'
              )}
              {status.errors.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: 1 }}>
                    Errores encontrados:
                  </Typography>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {status.errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </Box>
              )}
              {status.warnings.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: 1 }}>
                    Advertencias:
                  </Typography>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {status.warnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </Box>
              )}
            </Alert>

            <Divider sx={{ my: 2 }} />

            {/* Detalles de verificaciones */}
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
              Detalles de Verificación
            </Typography>

            <List>
              {status.checks.map((check, index) => (
                <React.Fragment key={index}>
                  <ListItem
                    button
                    onClick={() => toggleCheckExpand(check.name)}
                    sx={{
                      bgcolor: 'background.paper',
                      borderRadius: 1,
                      mb: 1,
                      border: '1px solid',
                      borderColor: 'divider'
                    }}
                  >
                    <ListItemIcon>
                      {getStatusIcon(check.status)}
                    </ListItemIcon>
                    <ListItemText
                      primary={check.name}
                      secondary={check.message}
                    />
                    <Chip
                      label={check.status}
                      size="small"
                      color={getChipColor(check.status)}
                      sx={{ mr: 1 }}
                    />
                    <IconButton size="small">
                      {expandedChecks.has(check.name) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </ListItem>

                  <Collapse in={expandedChecks.has(check.name)}>
                    <Box sx={{ pl: 7, pr: 2, pb: 2 }}>
                      {check.details && check.details.map((detail, idx) => (
                        <Typography
                          key={idx}
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 0.5 }}
                        >
                          • {detail}
                        </Typography>
                      ))}
                    </Box>
                  </Collapse>
                </React.Fragment>
              ))}
            </List>

            {/* Información adicional */}
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                <InfoIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                Última verificación: {status.timestamp.toLocaleString()}
              </Typography>
            </Box>
          </>
        )}

        {/* Estado inicial */}
        {!status && !verifying && (
          <Alert severity="info">
            <AlertTitle>Verificación Pendiente</AlertTitle>
            Haz clic en "Verificar Configuración" para validar las credenciales del canal.
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

// Export helper para verificación rápida
export const quickVerify = async (
  channelType: ChannelType,
  configuration: any
): Promise<boolean> => {
  try {
    const schema = getChannelSchema(channelType);
    await schema.validate(configuration, { abortEarly: false });

    // Verificaciones de seguridad básicas
    const hasSecurityIssues = Object.entries(configuration).some(([key, value]) => {
      if (typeof value === 'string' && (key.includes('token') || key.includes('key') || key.includes('password'))) {
        return !securityValidation.noMaliciousChars(value);
      }
      return false;
    });

    return !hasSecurityIssues;
  } catch {
    return false;
  }
};

export default ChannelVerification;