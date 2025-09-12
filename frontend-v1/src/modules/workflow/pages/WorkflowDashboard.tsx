import { Paper, Typography, Box, Grid, Card, CardContent, Button, Chip, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, CircularProgress } from '@mui/material'
import { PlayArrow, Info } from '@mui/icons-material'
import { useEffect, useState } from 'react'
import { workflowService, type Workflow } from '../services/workflowService'

// Dashboard del módulo Workflows - Conectado con endpoints mock
function WorkflowDashboard() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Cargar workflows al montar el componente
  useEffect(() => {
    loadWorkflows()
  }, [])
  
  const loadWorkflows = async () => {
    try {
      setLoading(true)
      const result = await workflowService.getWorkflows()
      if (result.success && result.data) {
        setWorkflows(result.data)
      }
    } catch (err) {
      setError('Error cargando workflows')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }
  
  const handleExecuteWorkflow = async (workflowId: string) => {
    try {
      const result = await workflowService.executeWorkflow(workflowId, {
        timestamp: new Date().toISOString()
      })
      if (result.success) {
        alert(`Workflow ejecutado: ${result.message}`)
      }
    } catch (err) {
      console.error('Error ejecutando workflow:', err)
    }
  }
  
  // Calcular estadísticas basadas en los datos mock
  const stats = {
    totalWorkflows: workflows.length,
    activeWorkflows: workflows.filter(w => w.status === 'active').length,
    executionsToday: Math.floor(Math.random() * 20), // Mock
    successRate: '93%' // Mock
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
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Typography color="error">{error}</Typography>
            ) : workflows.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No hay workflows disponibles.
              </Typography>
            ) : (
              <List>
                {workflows.map((workflow) => (
                  <ListItem key={workflow.id} divider>
                    <ListItemText
                      primary={workflow.name}
                      secondary={`${workflow.steps} pasos`}
                    />
                    <Chip 
                      label={workflow.status}
                      color={workflow.status === 'active' ? 'success' : 'default'}
                      size="small"
                      sx={{ mr: 2 }}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => handleExecuteWorkflow(workflow.id)}
                        disabled={workflow.status !== 'active'}
                        color="primary"
                      >
                        <PlayArrow />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
            
            <Box sx={{ mt: 3 }}>
              <Typography variant="caption" color="text.secondary">
                ℹ️ Los datos mostrados son mock para desarrollo. 
                Implementación completa planeada para v2.0
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default WorkflowDashboard