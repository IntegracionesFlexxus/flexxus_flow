import { Grid, Paper, Typography, Box, Card, CardContent, Skeleton } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { userService } from '@modules/users/services/userService'
import { useAuthStore } from '@/shared/store/authStore'

// Dashboard principal - MVP Nivel 1
// TODO: En Nivel 2 conectar con datos reales y widgets dinámicos
function Dashboard() {
  const navigate = useNavigate()
  const { currentCompany } = useAuthStore()

  // Query para obtener el conteo real de usuarios
  const { data: usersData, isLoading: isLoadingUsers, error: usersError } = useQuery({
    queryKey: ['users', currentCompany?.id],
    queryFn: () => userService.getCompanyUsers(currentCompany!.id),
    enabled: !!currentCompany?.id,
    staleTime: 30000 // 30 segundos
  })


  // La respuesta del backend es { success: true, data: { users: [...], total: number } }
  // El servicio retorna response.data.data que ya es { users: [...], total: number }
  // Por lo tanto accedemos directamente a usersData.total
  const userCount = usersData?.total || 0

  // Cards de módulos con navegación
  const modules = [
    {
      title: 'Usuarios',
      description: 'Gestión de usuarios del sistema',
      value: isLoadingUsers ? null : userCount.toString(),
      label: 'Usuarios activos',
      path: '/users',
      color: '#0288d1',
      isLoading: isLoadingUsers
    },
    { 
      title: 'Roles',
      description: 'Administración de roles y permisos',
      value: '3',
      label: 'Roles configurados',
      path: '/roles',
      color: '#00796b'
    },
    { 
      title: 'Empresas',
      description: 'Gestión multi-empresa',
      value: '1',
      label: 'Empresas activas',
      path: '/companies',
      color: '#5e35b1'
    },
    { 
      title: 'Feature Flags',
      description: 'Control de funcionalidades',
      value: '5',
      label: 'Flags activos',
      path: '/feature-flags',
      color: '#d32f2f'
    },
    { 
      title: 'Omnicanalidad',
      description: 'Gestiona todos tus canales de comunicación',
      value: '0',
      label: 'Mensajes pendientes',
      path: '/omni',
      color: '#1976d2'
    },
    { 
      title: 'CRM',
      description: 'Administra tus contactos y ventas',
      value: '0',
      label: 'Contactos activos',
      path: '/crm',
      color: '#388e3c'
    },
    { 
      title: 'Workflows',
      description: 'Automatiza tus procesos',
      value: '0',
      label: 'Workflows activos',
      path: '/workflow',
      color: '#f57c00'
    },
    { 
      title: 'Analytics',
      description: 'Analiza el rendimiento',
      value: '0%',
      label: 'Tasa de conversión',
      path: '/analytics',
      color: '#7b1fa2'
    }
  ]

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard Principal
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Vista general del sistema - Selecciona un módulo para comenzar
      </Typography>

      <Grid container spacing={3}>
        {/* Cards de módulos */}
        {modules.map((module) => (
          <Grid item xs={12} sm={6} md={3} key={module.title}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3
                }
              }}
              onClick={() => {
                navigate(module.path)
              }}
            >
              <CardContent>
                <Typography 
                  variant="h6" 
                  gutterBottom
                  sx={{ color: module.color }}
                >
                  {module.title}
                </Typography>
                {module.isLoading ? (
                  <Skeleton variant="text" width={60} height={48} sx={{ fontSize: '3rem' }} />
                ) : (
                  <Typography variant="h3" gutterBottom>
                    {module.value}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  {module.label}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {module.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}

        {/* Panel de actividad reciente */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Actividad Reciente
            </Typography>
            <Typography variant="body2" color="text.secondary">
              No hay actividad reciente para mostrar
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                TODO Nivel 2: Implementar feed de actividad en tiempo real, 
                notificaciones, y widgets personalizables
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default Dashboard