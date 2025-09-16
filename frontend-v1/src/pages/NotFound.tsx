import { Box, Typography, Button, Container } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { Home, ArrowBack } from '@mui/icons-material'

// Página 404 - MVP con diseño básico
// TODO: En Nivel 2 mejorar diseño y agregar sugerencias de páginas

function NotFound() {
  const navigate = useNavigate()
  
  return (
    <Container maxWidth="sm">
      <Box 
        sx={{ 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          textAlign: 'center'
        }}
      >
        {/* Número 404 grande */}
        <Typography 
          variant="h1" 
          sx={{ 
            fontSize: { xs: '6rem', sm: '8rem', md: '10rem' },
            fontWeight: 'bold',
            color: 'primary.main',
            opacity: 0.3,
            lineHeight: 1
          }}
        >
          404
        </Typography>
        
        {/* Mensaje principal */}
        <Typography 
          variant="h4" 
          gutterBottom 
          sx={{ mt: 2, mb: 1 }}
        >
          Página no encontrada
        </Typography>
        
        {/* Descripción */}
        <Typography 
          variant="body1" 
          color="text.secondary" 
          sx={{ mb: 4 }}
        >
          Lo sentimos, la página que buscas no existe o ha sido movida.
        </Typography>
        
        {/* Botones de acción */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button
            variant="contained"
            startIcon={<Home />}
            onClick={() => navigate('/')}
            size="large"
          >
            Ir al inicio
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => navigate(-1)}
            size="large"
          >
            Volver atrás
          </Button>
        </Box>
        
        {/* Información adicional */}
        <Typography 
          variant="caption" 
          color="text.secondary" 
          sx={{ mt: 4 }}
        >
          Si crees que esto es un error, por favor contacta a soporte.
        </Typography>
      </Box>
    </Container>
  )
}

export default NotFound