import React, { useState } from 'react'
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Stack,
  Divider,
  Box,
  Chip,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Paper
} from '@mui/material'
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  Sync as SyncIcon,
  Person as PersonIcon
} from '@mui/icons-material'
import {
  useAuth,
  useNotifications,
  useLoading,
  useModal,
  useSidebar,
  useAppInit,
  useContacts,
  useSettings,
  mockLogin,
  useUIStore,
  useAppStore
} from '@/shared/store'

// Página demo de State Management - MVP
// TODO: En Nivel 2 convertir en herramienta de desarrollo

function StateManagementDemo() {
  const auth = useAuth()
  const notifications = useNotifications()
  const globalLoading = useLoading()
  const taskLoading = useLoading('demo-task')
  const sidebar = useSidebar()
  const contacts = useContacts()
  const settings = useSettings()
  const appInitialized = useAppInit()
  
  // Modal demo
  const demoModal = useModal('demo-modal')
  
  // Estado local para formularios
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  
  // Acceso directo a stores para demo
  const { syncData } = useAppStore()
  const { setGlobalLoading } = useUIStore()
  
  // Handler para agregar contacto
  const handleAddContact = () => {
    if (!contactName || !contactEmail) {
      notifications.notify.warning('Por favor completa todos los campos')
      return
    }
    
    const newContact = {
      id: Date.now().toString(),
      name: contactName,
      email: contactEmail,
      tags: ['demo'],
      phone: '',
      company: ''
    }
    
    contacts.addContact(newContact)
    notifications.notify.success(`Contacto ${contactName} agregado`)
    setContactName('')
    setContactEmail('')
  }
  
  // Handler para sincronización
  const handleSync = async () => {
    globalLoading.start('Sincronizando datos...')
    await syncData()
    globalLoading.stop()
    notifications.notify.success('Sincronización completada')
  }
  
  // Handler para tarea con loading
  const handleTaskWithLoading = async () => {
    taskLoading.start()
    notifications.notify.info('Procesando tarea...')
    
    // Simular tarea
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    taskLoading.stop()
    notifications.notify.success('Tarea completada')
  }
  
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" gutterBottom>
        State Management Demo
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Demostración del sistema de estado global con Zustand
      </Typography>
      
      <Divider sx={{ my: 4 }} />
      
      {/* Auth State */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Auth Store
              </Typography>
              
              {auth.isAuthenticated ? (
                <Box>
                  <Stack spacing={2}>
                    <Box>
                      <Chip
                        icon={<PersonIcon />}
                        label={auth.user?.email}
                        color="primary"
                      />
                    </Box>
                    <Typography variant="body2">
                      Rol: {auth.user?.role || 'N/A'}
                    </Typography>
                    <Typography variant="body2">
                      Empresa: {auth.currentCompany?.name || 'N/A'}
                    </Typography>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => auth.logout()}
                    >
                      Cerrar Sesión
                    </Button>
                  </Stack>
                </Box>
              ) : (
                <Stack spacing={2}>
                  <Typography variant="body2" color="text.secondary">
                    No autenticado
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={() => mockLogin()}
                  >
                    Login Mock
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => auth.login('admin@test.com', 'admin123')}
                  >
                    Login con Hook
                  </Button>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        {/* UI State */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                UI Store
              </Typography>
              
              <Stack spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={sidebar.isOpen}
                      onChange={() => sidebar.toggle()}
                    />
                  }
                  label="Sidebar abierto"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.settings.darkMode}
                      onChange={(e) => settings.updatePreferences({ darkMode: e.target.checked })}
                    />
                  }
                  label="Modo oscuro (demo)"
                />
                
                <Box>
                  <Typography variant="body2" gutterBottom>
                    Loading States:
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Chip
                      label={`Global: ${globalLoading.isLoading ? 'ON' : 'OFF'}`}
                      color={globalLoading.isLoading ? 'warning' : 'default'}
                      size="small"
                    />
                    <Chip
                      label={`Task: ${taskLoading.isLoading ? 'ON' : 'OFF'}`}
                      color={taskLoading.isLoading ? 'warning' : 'default'}
                      size="small"
                    />
                  </Stack>
                </Box>
                
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setGlobalLoading(true, 'Cargando...')}
                  >
                    Start Global
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setGlobalLoading(false)}
                  >
                    Stop Global
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleTaskWithLoading}
                    disabled={taskLoading.isLoading}
                  >
                    Run Task
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Notifications */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Notificaciones
              </Typography>
              
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Button
                  variant="contained"
                  color="success"
                  onClick={() => notifications.notify.success('Operación exitosa')}
                >
                  Success
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  onClick={() => notifications.notify.error('Ha ocurrido un error')}
                >
                  Error
                </Button>
                <Button
                  variant="contained"
                  color="warning"
                  onClick={() => notifications.notify.warning('Advertencia importante')}
                >
                  Warning
                </Button>
                <Button
                  variant="contained"
                  color="info"
                  onClick={() => notifications.notify.info('Información relevante')}
                >
                  Info
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => notifications.clear()}
                >
                  Limpiar todas
                </Button>
              </Stack>
              
              {notifications.notifications.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Notificaciones activas: {notifications.notifications.length}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        {/* App State - Contacts */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                App Store - Contactos
              </Typography>
              
              <Stack spacing={2}>
                <Box>
                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <TextField
                      size="small"
                      placeholder="Nombre"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                    />
                    <TextField
                      size="small"
                      placeholder="Email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                    />
                    <IconButton
                      color="primary"
                      onClick={handleAddContact}
                    >
                      <AddIcon />
                    </IconButton>
                  </Stack>
                </Box>
                
                <List dense>
                  {contacts.contacts.length === 0 ? (
                    <ListItem>
                      <ListItemText
                        primary="No hay contactos"
                        secondary="Agrega uno usando el formulario"
                      />
                    </ListItem>
                  ) : (
                    contacts.contacts.map(contact => (
                      <ListItem
                        key={contact.id}
                        secondaryAction={
                          <IconButton
                            edge="end"
                            aria-label="delete"
                            onClick={() => {
                              contacts.deleteContact(contact.id)
                              notifications.notify.info('Contacto eliminado')
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        }
                      >
                        <ListItemText
                          primary={contact.name}
                          secondary={contact.email}
                        />
                      </ListItem>
                    ))
                  )}
                </List>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        
        {/* App State - Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                App Store - Configuración
              </Typography>
              
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Idioma: {settings.settings.language}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Zona horaria: {settings.settings.timezone}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Moneda: {settings.settings.currency}
                  </Typography>
                </Box>
                
                <Divider />
                
                <Box>
                  <Typography variant="body2" gutterBottom>
                    App State:
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Chip
                      label={`Inicializado: ${appInitialized ? 'SÍ' : 'NO'}`}
                      color={appInitialized ? 'success' : 'default'}
                      size="small"
                    />
                  </Stack>
                </Box>
                
                <Button
                  variant="outlined"
                  startIcon={<SyncIcon />}
                  onClick={handleSync}
                >
                  Sincronizar Datos
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Modal Demo */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Modal State
              </Typography>
              
              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  onClick={() => demoModal.open({ message: 'Datos del modal' })}
                >
                  Abrir Modal Demo
                </Button>
                
                {demoModal.isOpen && (
                  <Paper elevation={3} sx={{ p: 2 }}>
                    <Typography variant="body2">
                      Modal abierto con datos: {JSON.stringify(demoModal.data)}
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => demoModal.close()}
                      sx={{ mt: 1 }}
                    >
                      Cerrar
                    </Button>
                  </Paper>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  )
}

export default StateManagementDemo