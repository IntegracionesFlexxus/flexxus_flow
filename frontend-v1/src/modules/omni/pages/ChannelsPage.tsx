import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material'
import {
  WhatsApp as WhatsAppIcon,
  Email as EmailIcon,
  Message as MessageIcon,
  Facebook as FacebookIcon,
  Instagram as InstagramIcon,
  Phone as PhoneIcon,
  Settings as SettingsIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material'

// Página de Canales - Configuración de canales de comunicación
function ChannelsPage() {
  // Mock data para canales disponibles
  const channels = [
    {
      id: 'whatsapp',
      name: 'WhatsApp Business',
      icon: <WhatsAppIcon sx={{ fontSize: 40, color: '#25D366' }} />,
      description: 'Conecta tu cuenta de WhatsApp Business',
      status: 'connected',
      enabled: true,
      stats: {
        messages: 1234,
        contacts: 456
      }
    },
    {
      id: 'email',
      name: 'Email',
      icon: <EmailIcon sx={{ fontSize: 40, color: '#EA4335' }} />,
      description: 'Gestiona correos electrónicos',
      status: 'connected',
      enabled: true,
      stats: {
        messages: 567,
        contacts: 123
      }
    },
    {
      id: 'sms',
      name: 'SMS',
      icon: <MessageIcon sx={{ fontSize: 40, color: '#1976d2' }} />,
      description: 'Envía y recibe mensajes de texto',
      status: 'disconnected',
      enabled: false,
      stats: {
        messages: 0,
        contacts: 0
      }
    },
    {
      id: 'facebook',
      name: 'Facebook Messenger',
      icon: <FacebookIcon sx={{ fontSize: 40, color: '#1877F2' }} />,
      description: 'Conecta tu página de Facebook',
      status: 'disconnected',
      enabled: false,
      stats: {
        messages: 0,
        contacts: 0
      }
    },
    {
      id: 'instagram',
      name: 'Instagram Direct',
      icon: <InstagramIcon sx={{ fontSize: 40, color: '#E4405F' }} />,
      description: 'Conecta tu cuenta de Instagram Business',
      status: 'disconnected',
      enabled: false,
      stats: {
        messages: 0,
        contacts: 0
      }
    },
    {
      id: 'phone',
      name: 'Telefonía',
      icon: <PhoneIcon sx={{ fontSize: 40, color: '#34A853' }} />,
      description: 'Integración con sistema telefónico',
      status: 'disconnected',
      enabled: false,
      stats: {
        messages: 0,
        contacts: 0
      }
    }
  ]

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Canales de Comunicación
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configura y gestiona todos tus canales de comunicación
      </Typography>

      <Grid container spacing={3}>
        {channels.map((channel) => (
          <Grid item xs={12} sm={6} md={4} key={channel.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                border: channel.enabled ? '2px solid' : '1px solid',
                borderColor: channel.enabled ? 'primary.main' : 'divider'
              }}
            >
              <CardContent sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                  {channel.icon}
                  <Chip
                    icon={channel.status === 'connected' ? <CheckCircleIcon /> : <ErrorIcon />}
                    label={channel.status === 'connected' ? 'Conectado' : 'Desconectado'}
                    size="small"
                    color={channel.status === 'connected' ? 'success' : 'default'}
                  />
                </Box>

                <Typography variant="h6" gutterBottom>
                  {channel.name}
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {channel.description}
                </Typography>

                {channel.enabled && (
                  <List dense>
                    <ListItem disablePadding>
                      <ListItemText
                        primary="Mensajes enviados"
                        secondary={channel.stats.messages.toLocaleString()}
                      />
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemText
                        primary="Contactos"
                        secondary={channel.stats.contacts.toLocaleString()}
                      />
                    </ListItem>
                  </List>
                )}
              </CardContent>

              <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                <FormControlLabel
                  control={<Switch checked={channel.enabled} />}
                  label="Activo"
                />
                <Button
                  size="small"
                  startIcon={<SettingsIcon />}
                  variant={channel.enabled ? 'outlined' : 'contained'}
                >
                  {channel.status === 'connected' ? 'Configurar' : 'Conectar'}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Información adicional */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Configuración Global
        </Typography>

        <List>
          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon color="success" />
            </ListItemIcon>
            <ListItemText
              primary="Respuestas automáticas"
              secondary="Configura respuestas automáticas para cuando estés fuera de horario"
            />
            <ListItemSecondaryAction>
              <Button variant="outlined" size="small">Configurar</Button>
            </ListItemSecondaryAction>
          </ListItem>

          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon color="success" />
            </ListItemIcon>
            <ListItemText
              primary="Horarios de atención"
              secondary="Define los horarios en los que tu equipo está disponible"
            />
            <ListItemSecondaryAction>
              <Button variant="outlined" size="small">Configurar</Button>
            </ListItemSecondaryAction>
          </ListItem>

          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon color="success" />
            </ListItemIcon>
            <ListItemText
              primary="Asignación automática"
              secondary="Configura reglas para asignar conversaciones automáticamente"
            />
            <ListItemSecondaryAction>
              <Button variant="outlined" size="small">Configurar</Button>
            </ListItemSecondaryAction>
          </ListItem>
        </List>
      </Paper>
    </Box>
  )
}

export default ChannelsPage
