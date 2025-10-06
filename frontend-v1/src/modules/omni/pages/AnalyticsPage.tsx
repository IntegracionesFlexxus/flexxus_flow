import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar
} from '@mui/material'
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Message as MessageIcon,
  Timer as TimerIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon
} from '@mui/icons-material'

// Página de Analytics de Omnicanalidad
function AnalyticsPage() {
  // Mock data para analytics
  const stats = {
    totalMessages: 12543,
    messagesTrend: 12.5,
    activeConversations: 234,
    conversationsTrend: -3.2,
    avgResponseTime: '2.5 min',
    responseTrend: -8.5,
    satisfactionRate: 94,
    satisfactionTrend: 2.1
  }

  const channelStats = [
    { name: 'WhatsApp', messages: 7234, percentage: 57.6, color: '#25D366' },
    { name: 'Email', messages: 3421, percentage: 27.3, color: '#EA4335' },
    { name: 'SMS', messages: 1234, percentage: 9.8, color: '#1976d2' },
    { name: 'Facebook', messages: 654, percentage: 5.2, color: '#1877F2' }
  ]

  const topAgents = [
    { name: 'Ana García', conversations: 156, satisfaction: 98, avgTime: '1.8 min' },
    { name: 'Carlos López', conversations: 142, satisfaction: 96, avgTime: '2.1 min' },
    { name: 'María Rodríguez', conversations: 134, satisfaction: 95, avgTime: '2.3 min' },
    { name: 'Juan Pérez', conversations: 128, satisfaction: 94, avgTime: '2.5 min' }
  ]

  const peakHours = [
    { hour: '09:00', messages: 234 },
    { hour: '10:00', messages: 312 },
    { hour: '11:00', messages: 289 },
    { hour: '12:00', messages: 198 },
    { hour: '14:00', messages: 267 },
    { hour: '15:00', messages: 345 },
    { hour: '16:00', messages: 298 },
    { hour: '17:00', messages: 223 }
  ]

  const renderTrend = (value: number) => {
    const isPositive = value > 0
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {isPositive ? (
          <TrendingUpIcon fontSize="small" color="success" />
        ) : (
          <TrendingDownIcon fontSize="small" color="error" />
        )}
        <Typography variant="caption" color={isPositive ? 'success.main' : 'error.main'}>
          {Math.abs(value)}%
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Analytics de Omnicanalidad
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Analiza el rendimiento de tus canales de comunicación
          </Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Período</InputLabel>
          <Select value="week" label="Período">
            <MenuItem value="today">Hoy</MenuItem>
            <MenuItem value="week">Esta semana</MenuItem>
            <MenuItem value="month">Este mes</MenuItem>
            <MenuItem value="quarter">Este trimestre</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* KPIs Principales */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <MessageIcon color="primary" />
                <Typography variant="body2" color="text.secondary">
                  Mensajes Totales
                </Typography>
              </Box>
              <Typography variant="h4" gutterBottom>
                {stats.totalMessages.toLocaleString()}
              </Typography>
              {renderTrend(stats.messagesTrend)}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <MessageIcon color="info" />
                <Typography variant="body2" color="text.secondary">
                  Conversaciones Activas
                </Typography>
              </Box>
              <Typography variant="h4" gutterBottom>
                {stats.activeConversations}
              </Typography>
              {renderTrend(stats.conversationsTrend)}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <TimerIcon color="warning" />
                <Typography variant="body2" color="text.secondary">
                  Tiempo de Respuesta
                </Typography>
              </Box>
              <Typography variant="h4" gutterBottom>
                {stats.avgResponseTime}
              </Typography>
              {renderTrend(stats.responseTrend)}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CheckCircleIcon color="success" />
                <Typography variant="body2" color="text.secondary">
                  Satisfacción
                </Typography>
              </Box>
              <Typography variant="h4" gutterBottom>
                {stats.satisfactionRate}%
              </Typography>
              {renderTrend(stats.satisfactionTrend)}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Distribución por Canal */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Mensajes por Canal
            </Typography>
            <List>
              {channelStats.map((channel) => (
                <ListItem key={channel.name} disablePadding sx={{ mb: 2 }}>
                  <Box sx={{ width: '100%' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">{channel.name}</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {channel.messages.toLocaleString()} ({channel.percentage}%)
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={channel.percentage}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: 'grey.200',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: channel.color
                        }
                      }}
                    />
                  </Box>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Top Agentes */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Top Agentes
            </Typography>
            <List>
              {topAgents.map((agent, index) => (
                <ListItem key={agent.name} sx={{ px: 0 }}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      {index + 1}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={agent.name}
                    secondary={
                      <Box component="span" sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                        <Chip
                          label={`${agent.conversations} conv.`}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={`${agent.satisfaction}% satisf.`}
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                        <Chip
                          label={agent.avgTime}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Horarios Pico */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Horarios de Mayor Actividad
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
              {peakHours.map((hour) => (
                <Card
                  key={hour.hour}
                  sx={{
                    minWidth: 100,
                    textAlign: 'center',
                    bgcolor: hour.messages > 300 ? 'error.lighter' : 'background.default'
                  }}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography variant="caption" color="text.secondary">
                      {hour.hour}
                    </Typography>
                    <Typography variant="h6" fontWeight={600}>
                      {hour.messages}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      mensajes
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* Métricas Adicionales */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Tasa de Resolución
              </Typography>
              <Typography variant="h4" color="success.main">
                87%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={87}
                color="success"
                sx={{ mt: 1, height: 6, borderRadius: 3 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Mensajes Automatizados
              </Typography>
              <Typography variant="h4" color="info.main">
                42%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={42}
                color="info"
                sx={{ mt: 1, height: 6, borderRadius: 3 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                SLA Cumplido
              </Typography>
              <Typography variant="h4" color="warning.main">
                92%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={92}
                color="warning"
                sx={{ mt: 1, height: 6, borderRadius: 3 }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

export default AnalyticsPage
