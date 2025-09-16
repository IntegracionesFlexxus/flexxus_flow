import React from 'react'
import {
  Box,
  Container,
  Typography,
  Link,
  Stack,
  Divider,
  IconButton
} from '@mui/material'
import {
  GitHub as GitHubIcon,
  LinkedIn as LinkedInIcon,
  Twitter as TwitterIcon,
  Email as EmailIcon
} from '@mui/icons-material'

// Footer component - MVP con información básica
// TODO: En Nivel 2 agregar más links y contenido dinámico

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear()
  
  return (
    <Box
      component="footer"
      sx={{
        bgcolor: 'background.paper',
        borderTop: '1px solid',
        borderColor: 'divider',
        mt: 'auto',
        py: 3
      }}
    >
      <Container maxWidth="lg">
        <Stack spacing={2}>
          {/* Main Footer Content */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'center', sm: 'flex-start' }}
            spacing={3}
          >
            {/* Company Info */}
            <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
              <Typography variant="h6" gutterBottom>
                Flexxus Flow
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Plataforma de gestión omnicanal
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Versión 1.0.0 (MVP)
              </Typography>
            </Box>
            
            {/* Quick Links */}
            <Stack 
              direction="row" 
              spacing={3}
              sx={{ display: { xs: 'none', md: 'flex' } }}
            >
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Producto
                </Typography>
                <Stack spacing={0.5}>
                  <Link
                    href="#"
                    variant="body2"
                    color="text.secondary"
                    underline="hover"
                  >
                    Características
                  </Link>
                  <Link
                    href="#"
                    variant="body2"
                    color="text.secondary"
                    underline="hover"
                  >
                    Precios
                  </Link>
                  <Link
                    href="#"
                    variant="body2"
                    color="text.secondary"
                    underline="hover"
                  >
                    Roadmap
                  </Link>
                </Stack>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Recursos
                </Typography>
                <Stack spacing={0.5}>
                  <Link
                    href="#"
                    variant="body2"
                    color="text.secondary"
                    underline="hover"
                  >
                    Documentación
                  </Link>
                  <Link
                    href="#"
                    variant="body2"
                    color="text.secondary"
                    underline="hover"
                  >
                    API
                  </Link>
                  <Link
                    href="#"
                    variant="body2"
                    color="text.secondary"
                    underline="hover"
                  >
                    Blog
                  </Link>
                </Stack>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Soporte
                </Typography>
                <Stack spacing={0.5}>
                  <Link
                    href="#"
                    variant="body2"
                    color="text.secondary"
                    underline="hover"
                  >
                    Centro de Ayuda
                  </Link>
                  <Link
                    href="#"
                    variant="body2"
                    color="text.secondary"
                    underline="hover"
                  >
                    Contacto
                  </Link>
                  <Link
                    href="#"
                    variant="body2"
                    color="text.secondary"
                    underline="hover"
                  >
                    Estado del Sistema
                  </Link>
                </Stack>
              </Box>
            </Stack>
            
            {/* Social Links */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Síguenos
              </Typography>
              <Stack direction="row" spacing={1}>
                <IconButton size="small" aria-label="GitHub">
                  <GitHubIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" aria-label="LinkedIn">
                  <LinkedInIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" aria-label="Twitter">
                  <TwitterIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" aria-label="Email">
                  <EmailIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Box>
          </Stack>
          
          <Divider />
          
          {/* Bottom Footer */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems="center"
            spacing={2}
          >
            <Typography variant="caption" color="text.secondary">
              © {currentYear} Flexxus Flow. Todos los derechos reservados.
            </Typography>
            
            <Stack 
              direction="row" 
              spacing={2}
              divider={<Divider orientation="vertical" flexItem />}
            >
              <Link
                href="#"
                variant="caption"
                color="text.secondary"
                underline="hover"
              >
                Términos de Servicio
              </Link>
              <Link
                href="#"
                variant="caption"
                color="text.secondary"
                underline="hover"
              >
                Política de Privacidad
              </Link>
              <Link
                href="#"
                variant="caption"
                color="text.secondary"
                underline="hover"
              >
                Cookies
              </Link>
            </Stack>
          </Stack>
        </Stack>
      </Container>
    </Box>
  )
}

export default Footer