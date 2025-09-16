import React from 'react'
import {
  Box,
  Container,
  Paper,
  Typography,
  Grid,
  useTheme,
  useMediaQuery,
  Link,
  Stack
} from '@mui/material'
import { Outlet } from 'react-router-dom'

// AuthLayout - Layout especial para páginas de autenticación - MVP
// TODO: En Nivel 2 agregar animaciones y carousel de features

const AuthLayout: React.FC = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const currentYear = new Date().getFullYear()
  
  // Features para mostrar en el lado izquierdo
  const features = [
    '✨ Gestión Omnicanal Unificada',
    '🚀 Automatización de Workflows',
    '📊 Analytics en Tiempo Real',
    '👥 CRM Integrado',
    '🔒 Seguridad Empresarial'
  ]
  
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default'
      }}
    >
      <Grid container sx={{ flex: 1 }}>
        {/* Panel Izquierdo - Info/Branding */}
        {!isMobile && (
          <Grid
            item
            xs={false}
            md={5}
            lg={6}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              p: 4,
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'url("/pattern.svg")',
                opacity: 0.1,
                backgroundSize: '400px',
              }
            }}
          >
            <Container maxWidth="sm">
              <Box sx={{ textAlign: 'center', color: 'white', zIndex: 1 }}>
                {/* Logo */}
                <Typography
                  variant="h2"
                  sx={{
                    fontWeight: 700,
                    mb: 2,
                    textShadow: '2px 2px 4px rgba(0,0,0,0.2)'
                  }}
                >
                  Flexxus Flow
                </Typography>
                
                <Typography
                  variant="h5"
                  sx={{
                    mb: 4,
                    opacity: 0.95,
                    fontWeight: 300
                  }}
                >
                  Plataforma de Gestión Omnicanal
                </Typography>
                
                {/* Features List */}
                <Stack spacing={2} sx={{ mt: 6, textAlign: 'left' }}>
                  {features.map((feature, index) => (
                    <Typography
                      key={index}
                      variant="body1"
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        opacity: 0.95,
                        fontSize: '1.1rem'
                      }}
                    >
                      {feature}
                    </Typography>
                  ))}
                </Stack>
                
                {/* Testimonial o Quote */}
                <Box sx={{ mt: 6, p: 3, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                  <Typography variant="body1" sx={{ fontStyle: 'italic', mb: 2 }}>
                    "La mejor solución para gestionar todos tus canales de comunicación en un solo lugar"
                  </Typography>
                  <Typography variant="caption">
                    — Cliente Satisfecho
                  </Typography>
                </Box>
              </Box>
            </Container>
          </Grid>
        )}
        
        {/* Panel Derecho - Formulario Auth */}
        <Grid
          item
          xs={12}
          md={7}
          lg={6}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            p: { xs: 2, sm: 4 },
            bgcolor: isMobile ? 'background.default' : 'background.paper'
          }}
        >
          <Container maxWidth="sm">
            <Box sx={{ width: '100%' }}>
              {/* Mobile Logo */}
              {isMobile && (
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 700,
                      color: 'primary.main',
                      mb: 1
                    }}
                  >
                    Flexxus Flow
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Plataforma de Gestión Omnicanal
                  </Typography>
                </Box>
              )}
              
              {/* Auth Form Container */}
              <Paper
                elevation={isMobile ? 0 : 1}
                sx={{
                  p: { xs: 3, sm: 4 },
                  borderRadius: 2,
                  bgcolor: 'background.paper'
                }}
              >
                <Outlet />
              </Paper>
              
              {/* Footer Links */}
              <Box sx={{ mt: 4, textAlign: 'center' }}>
                <Stack
                  direction="row"
                  spacing={2}
                  justifyContent="center"
                  divider={
                    <Typography variant="body2" color="text.secondary">
                      •
                    </Typography>
                  }
                >
                  <Link
                    href="#"
                    variant="body2"
                    color="text.secondary"
                    underline="hover"
                  >
                    Términos de Servicio
                  </Link>
                  <Link
                    href="#"
                    variant="body2"
                    color="text.secondary"
                    underline="hover"
                  >
                    Privacidad
                  </Link>
                  <Link
                    href="#"
                    variant="body2"
                    color="text.secondary"
                    underline="hover"
                  >
                    Ayuda
                  </Link>
                </Stack>
                
                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                  © {currentYear} Flexxus Flow. Todos los derechos reservados.
                </Typography>
              </Box>
            </Box>
          </Container>
        </Grid>
      </Grid>
    </Box>
  )
}

export default AuthLayout