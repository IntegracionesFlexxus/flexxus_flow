import { Paper, Typography, Box, Grid, Card, CardContent } from '@mui/material'

// Dashboard del módulo Omnicanalidad - Placeholder para MVP
// TODO: En Nivel 2 conectar con API real y mostrar datos dinámicos
function OmniDashboard() {
  // Datos hardcodeados para MVP
  // TODO: En Nivel 2 obtener de API
  const stats = {
    totalMessages: 0,
    activeConversations: 0,
    pendingMessages: 0,
    responseTime: '0 min'
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Omnicanalidad
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Gestión unificada de mensajes de todos los canales
      </Typography>

      <Grid container spacing={3}>
        {/* Estadísticas */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Mensajes Totales
              </Typography>
              <Typography variant="h4">
                {stats.totalMessages}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Conversaciones Activas
              </Typography>
              <Typography variant="h4">
                {stats.activeConversations}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Mensajes Pendientes
              </Typography>
              <Typography variant="h4">
                {stats.pendingMessages}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Tiempo de Respuesta
              </Typography>
              <Typography variant="h4">
                {stats.responseTime}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Área principal */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, minHeight: 400 }}>
            <Typography variant="h6" gutterBottom>
              Panel de Conversaciones
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Las conversaciones aparecerán aquí cuando se conecte con la API.
            </Typography>
            
            <Box sx={{ mt: 3 }}>
              <Typography variant="caption" color="text.secondary">
                TODO Nivel 2: Implementar lista de conversaciones, chat en tiempo real, 
                integración con WhatsApp, Facebook, Instagram, etc.
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default OmniDashboard