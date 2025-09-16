import { Paper, Typography, Box, Grid, Card, CardContent, Button } from '@mui/material'

// Dashboard del módulo Workflows - Placeholder para MVP
function WorkflowDashboard() {
  // Datos hardcodeados para MVP
  const stats = {
    totalWorkflows: 0,
    activeWorkflows: 0,
    executionsToday: 0,
    successRate: '0%'
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Workflows - Automatización
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Automatiza procesos y tareas repetitivas
      </Typography>

      <Grid container spacing={3}>
        {/* Estadísticas */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Workflows
              </Typography>
              <Typography variant="h4">
                {stats.totalWorkflows}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Workflows Activos
              </Typography>
              <Typography variant="h4">
                {stats.activeWorkflows}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Ejecuciones Hoy
              </Typography>
              <Typography variant="h4">
                {stats.executionsToday}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Tasa de Éxito
              </Typography>
              <Typography variant="h4">
                {stats.successRate}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Área de workflows */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, minHeight: 400 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">
                Mis Workflows
              </Typography>
              <Button variant="contained" disabled>
                Crear Workflow
              </Button>
            </Box>
            
            <Typography variant="body2" color="text.secondary">
              No hay workflows creados todavía.
            </Typography>
            
            <Box sx={{ mt: 3 }}>
              <Typography variant="caption" color="text.secondary">
                TODO Nivel 2: Implementar constructor visual de workflows con drag & drop,
                triggers, condiciones, acciones, integraciones con APIs externas
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default WorkflowDashboard