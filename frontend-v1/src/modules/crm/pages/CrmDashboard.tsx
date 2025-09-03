import { Paper, Typography, Box, Grid, Card, CardContent, List, ListItem, ListItemText } from '@mui/material'

// Dashboard del módulo CRM - Placeholder para MVP
// TODO: En Nivel 2 conectar con API real
function CrmDashboard() {
  // Datos hardcodeados para MVP
  const stats = {
    totalContacts: 0,
    activeDeals: 0,
    revenue: '$0',
    conversionRate: '0%'
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        CRM - Gestión de Clientes
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Administra tus contactos, empresas y oportunidades de negocio
      </Typography>

      <Grid container spacing={3}>
        {/* Métricas */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Contactos
              </Typography>
              <Typography variant="h4">
                {stats.totalContacts}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Negocios Activos
              </Typography>
              <Typography variant="h4">
                {stats.activeDeals}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Ingresos
              </Typography>
              <Typography variant="h4">
                {stats.revenue}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Tasa de Conversión
              </Typography>
              <Typography variant="h4">
                {stats.conversionRate}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Lista de contactos */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Últimos Contactos
            </Typography>
            <List>
              <ListItem>
                <ListItemText 
                  primary="Sin contactos" 
                  secondary="Los contactos aparecerán aquí cuando se agreguen"
                />
              </ListItem>
            </List>
            <Typography variant="caption" color="text.secondary">
              TODO Nivel 2: Implementar CRUD de contactos
            </Typography>
          </Paper>
        </Grid>

        {/* Pipeline de ventas */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Pipeline de Ventas
            </Typography>
            <Typography variant="body2" color="text.secondary">
              El pipeline de ventas se mostrará aquí
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                TODO Nivel 2: Implementar pipeline con drag & drop
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default CrmDashboard