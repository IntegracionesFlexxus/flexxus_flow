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
  TextField,
  InputAdornment,
  IconButton,
  Menu,
  MenuItem
} from '@mui/material'
import {
  Add as AddIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material'
import { useState } from 'react'

// Página de Plantillas de Mensajes
function TemplatesPage() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  // Mock data para plantillas
  const templates = [
    {
      id: '1',
      name: 'Bienvenida Cliente',
      category: 'Bienvenida',
      channel: 'WhatsApp',
      content: 'Hola {nombre}, bienvenido a {empresa}. ¿En qué podemos ayudarte hoy?',
      variables: ['nombre', 'empresa'],
      used: 156
    },
    {
      id: '2',
      name: 'Confirmación de Cita',
      category: 'Citas',
      channel: 'SMS',
      content: 'Tu cita está confirmada para el {fecha} a las {hora}. Te esperamos!',
      variables: ['fecha', 'hora'],
      used: 89
    },
    {
      id: '3',
      name: 'Seguimiento Post-Venta',
      category: 'Ventas',
      channel: 'Email',
      content: 'Hola {nombre}, gracias por tu compra. ¿Cómo ha sido tu experiencia?',
      variables: ['nombre'],
      used: 234
    },
    {
      id: '4',
      name: 'Recordatorio de Pago',
      category: 'Cobranza',
      channel: 'WhatsApp',
      content: 'Hola {nombre}, te recordamos que tienes un pago pendiente de {monto} con vencimiento {fecha}.',
      variables: ['nombre', 'monto', 'fecha'],
      used: 45
    }
  ]

  const categories = ['Todas', 'Bienvenida', 'Citas', 'Ventas', 'Cobranza', 'Soporte']

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Plantillas de Mensajes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Crea y gestiona plantillas reutilizables para tus mensajes
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />}>
          Nueva Plantilla
        </Button>
      </Box>

      {/* Búsqueda y Filtros */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              placeholder="Buscar plantillas..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {categories.map((category) => (
                <Chip
                  key={category}
                  label={category}
                  variant={category === 'Todas' ? 'filled' : 'outlined'}
                  color={category === 'Todas' ? 'primary' : 'default'}
                  onClick={() => {}}
                />
              ))}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Lista de Plantillas */}
      <Grid container spacing={3}>
        {templates.map((template) => (
          <Grid item xs={12} md={6} lg={4} key={template.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {template.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <Chip label={template.category} size="small" color="primary" variant="outlined" />
                      <Chip label={template.channel} size="small" />
                    </Box>
                  </Box>
                  <IconButton size="small" onClick={handleMenuClick}>
                    <MoreVertIcon />
                  </IconButton>
                </Box>

                <Paper sx={{ p: 2, bgcolor: 'grey.50', mb: 2 }}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                    {template.content}
                  </Typography>
                </Paper>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                  {template.variables.map((variable) => (
                    <Chip
                      key={variable}
                      label={`{${variable}}`}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem' }}
                    />
                  ))}
                </Box>

                <Typography variant="caption" color="text.secondary">
                  Usado {template.used} veces
                </Typography>
              </CardContent>

              <CardActions>
                <Button size="small" startIcon={<EditIcon />}>
                  Editar
                </Button>
                <Button size="small" startIcon={<CopyIcon />}>
                  Duplicar
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Menú contextual */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleMenuClose}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Editar
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <CopyIcon fontSize="small" sx={{ mr: 1 }} />
          Duplicar
        </MenuItem>
        <MenuItem onClick={handleMenuClose} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Eliminar
        </MenuItem>
      </Menu>

      {/* Información de ayuda */}
      <Paper sx={{ p: 3, mt: 3, bgcolor: 'info.lighter' }}>
        <Typography variant="h6" gutterBottom>
          💡 Consejos para crear plantillas efectivas
        </Typography>
        <Typography variant="body2" component="div">
          <ul>
            <li>Usa variables para personalizar los mensajes (ejemplo: {'{nombre}'}, {'{fecha}'})</li>
            <li>Mantén los mensajes cortos y claros</li>
            <li>Incluye llamadas a la acción específicas</li>
            <li>Prueba tus plantillas antes de usarlas masivamente</li>
          </ul>
        </Typography>
      </Paper>
    </Box>
  )
}

export default TemplatesPage
