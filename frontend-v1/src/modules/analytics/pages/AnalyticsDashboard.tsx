import { Paper, Typography, Box, Grid, Card, CardContent } from '@mui/material'

// Dashboard del módulo Analytics - Placeholder para MVP
function AnalyticsDashboard() {
  // Datos hardcodeados para MVP
  const metrics = {
    totalUsers: 0,
    activeUsers: 0,
    totalRevenue: '$0',
    growthRate: '0%'
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Analytics - Métricas y Reportes
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Visualiza el rendimiento y métricas clave del negocio
      </Typography>

      <Grid container spacing={3}>
        {/* KPIs principales */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Usuarios Totales
              </Typography>
              <Typography variant="h4">
                {metrics.totalUsers}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Usuarios Activos
              </Typography>
              <Typography variant="h4">
                {metrics.activeUsers}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Ingresos Totales
              </Typography>
              <Typography variant="h4">
                {metrics.totalRevenue}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Crecimiento
              </Typography>
              <Typography variant="h4">
                {metrics.growthRate}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Área de gráficos */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, minHeight: 400 }}>
            <Typography variant="h6" gutterBottom>
              Tendencias
            </Typography>
            <Box sx={{ 
              height: 300, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              border: '2px dashed #ccc',
              borderRadius: 1
            }}>
              <Typography variant="body2" color="text.secondary">
                Área de gráficos - Se implementará en Nivel 2
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
              TODO Nivel 2: Integrar librería de gráficos (Chart.js o Recharts)
            </Typography>
          </Paper>
        </Grid>

        {/* Panel de reportes */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, minHeight: 400 }}>
            <Typography variant="h6" gutterBottom>
              Reportes Recientes
            </Typography>
            <Typography variant="body2" color="text.secondary">
              No hay reportes generados
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                TODO Nivel 2: Sistema de generación de reportes PDF/Excel
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default AnalyticsDashboard