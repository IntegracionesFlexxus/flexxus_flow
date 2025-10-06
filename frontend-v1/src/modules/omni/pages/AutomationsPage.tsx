import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material'
import {
  Add as AddIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Edit as EditIcon,
  Timeline as TimelineIcon,
  Schedule as ScheduleIcon,
  Bolt as BoltIcon,
  Verified as VerifiedIcon
} from '@mui/icons-material'

// Página de Automatizaciones
function AutomationsPage() {
  // Mock data para automatizaciones
  const automations = [
    {
      id: '1',
      name: 'Bienvenida Automática',
      description: 'Envía un mensaje de bienvenida cuando un nuevo contacto escribe por primera vez',
      trigger: 'Nuevo mensaje de contacto desconocido',
      actions: ['Enviar plantilla "Bienvenida Cliente"', 'Asignar a agente disponible'],
      status: 'active',
      executions: 234,
      successRate: 98
    },
    {
      id: '2',
      name: 'Recordatorio de Citas',
      description: 'Envía recordatorios automáticos 24 horas antes de cada cita',
      trigger: 'Cita programada en CRM',
      actions: ['Enviar plantilla "Recordatorio de Cita"', 'Marcar como recordatorio enviado'],
      status: 'active',
      executions: 156,
      successRate: 95
    },
    {
      id: '3',
      name: 'Seguimiento Post-Venta',
      description: 'Envía encuesta de satisfacción 3 días después de cerrar una venta',
      trigger: 'Oportunidad cerrada como ganada',
      actions: ['Esperar 3 días', 'Enviar plantilla "Seguimiento Post-Venta"'],
      status: 'active',
      executions: 89,
      successRate: 92
    },
    {
      id: '4',
      name: 'Escalamiento por Tiempo',
      description: 'Escala conversaciones sin respuesta después de 2 horas',
      trigger: 'Mensaje sin responder por 2 horas',
      actions: ['Notificar a supervisor', 'Reasignar a agente senior'],
      status: 'paused',
      executions: 45,
      successRate: 88
    }
  ]

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Automatizaciones
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Crea flujos automatizados para optimizar tus conversaciones
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />}>
          Nueva Automatización
        </Button>
      </Box>

      {/* Estadísticas generales */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <BoltIcon color="primary" />
                <Typography variant="h4">{automations.length}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Automatizaciones Activas
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <TimelineIcon color="success" />
                <Typography variant="h4">
                  {automations.reduce((acc, auto) => acc + auto.executions, 0)}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Ejecuciones Este Mes
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <VerifiedIcon color="info" />
                <Typography variant="h4">
                  {Math.round(
                    automations.reduce((acc, auto) => acc + auto.successRate, 0) / automations.length
                  )}%
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Tasa de Éxito Promedio
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <ScheduleIcon color="warning" />
                <Typography variant="h4">2.5h</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Tiempo Ahorrado/Día
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Lista de Automatizaciones */}
      <Grid container spacing={3}>
        {automations.map((automation) => (
          <Grid item xs={12} md={6} key={automation.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" gutterBottom>
                      {automation.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {automation.description}
                    </Typography>
                  </Box>
                  <FormControlLabel
                    control={<Switch checked={automation.status === 'active'} />}
                    label=""
                  />
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    DISPARADOR
                  </Typography>
                  <Chip
                    icon={<BoltIcon />}
                    label={automation.trigger}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    ACCIONES
                  </Typography>
                  <List dense>
                    {automation.actions.map((action, index) => (
                      <ListItem key={index} disablePadding>
                        <ListItemText
                          primary={`${index + 1}. ${action}`}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Ejecuciones
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {automation.executions}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Tasa de Éxito
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color="success.main">
                      {automation.successRate}%
                    </Typography>
                  </Box>
                </Box>
              </CardContent>

              <CardActions>
                <Button size="small" startIcon={<EditIcon />}>
                  Editar
                </Button>
                <Button
                  size="small"
                  startIcon={automation.status === 'active' ? <StopIcon /> : <PlayIcon />}
                  color={automation.status === 'active' ? 'error' : 'success'}
                >
                  {automation.status === 'active' ? 'Pausar' : 'Activar'}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Información de ayuda */}
      <Paper sx={{ p: 3, mt: 3, bgcolor: 'info.lighter' }}>
        <Typography variant="h6" gutterBottom>
          💡 Ideas para automatizaciones
        </Typography>
        <Typography variant="body2" component="div">
          <ul>
            <li><strong>Bienvenida:</strong> Saluda automáticamente a nuevos contactos</li>
            <li><strong>Fuera de horario:</strong> Responde cuando tu equipo no está disponible</li>
            <li><strong>Calificación de leads:</strong> Asigna puntuación basada en interacciones</li>
            <li><strong>Seguimiento:</strong> Envía mensajes de seguimiento programados</li>
            <li><strong>Escalamiento:</strong> Notifica a supervisores en casos específicos</li>
          </ul>
        </Typography>
      </Paper>
    </Box>
  )
}

export default AutomationsPage
