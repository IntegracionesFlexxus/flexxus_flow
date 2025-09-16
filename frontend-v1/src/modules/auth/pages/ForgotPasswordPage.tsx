import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress
} from '@mui/material'
import { ArrowBack } from '@mui/icons-material'
import { authApi } from '@/shared/services/authApi'
import { useNotifications } from '@/shared/store/hooks'

// Página de recuperación de contraseña - MVP básico
// TODO: En Nivel 2 agregar flujo completo con token y reset
export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate()
  const { notify } = useNotifications()
  
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  
  // Validación básica
  const validateEmail = (): boolean => {
    if (!email) {
      setError('El email es requerido')
      return false
    }
    
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Email inválido')
      return false
    }
    
    return true
  }
  
  // Manejo del submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!validateEmail()) return
    
    setLoading(true)
    
    try {
      // Llamar al API de recuperación
      await authApi.forgotPassword(email)
      
      // Mostrar éxito
      setSuccess(true)
      
      // Notificación de éxito
      notify.success('Revisa tu correo para restablecer tu contraseña', 'Email enviado')
      
      // Redirigir después de 3 segundos
      setTimeout(() => {
        navigate('/auth/login')
      }, 3000)
      
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al enviar el email'
      setError(message)
      
      notify.error(message, 'Error')
    } finally {
      setLoading(false)
    }
  }
  
  // Manejador de cambio
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    if (error) setError('')
  }
  
  // Si ya se envió el email, mostrar mensaje de éxito
  if (success) {
    return (
      <Container component="main" maxWidth="xs">
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                ¡Email enviado!
              </Typography>
              <Typography variant="body2">
                Hemos enviado las instrucciones para restablecer tu contraseña a {email}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Por favor, revisa tu bandeja de entrada y sigue las instrucciones.
              </Typography>
            </Alert>
            
            <Button
              fullWidth
              variant="contained"
              onClick={() => navigate('/auth/login')}
              sx={{ mt: 2 }}
            >
              Volver al login
            </Button>
          </Paper>
        </Box>
      </Container>
    )
  }
  
  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Button
              startIcon={<ArrowBack />}
              onClick={() => navigate('/auth/login')}
              sx={{ mr: 'auto' }}
            >
              Volver
            </Button>
          </Box>
          
          <Typography component="h1" variant="h5" align="center" fontWeight="bold" color="primary">
            Recuperar Contraseña
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1, mb: 3 }}>
            Te enviaremos un email con las instrucciones
          </Typography>
          
          <Box component="form" onSubmit={handleSubmit}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={handleChange}
              error={!!error}
              margin="normal"
              autoComplete="email"
              autoFocus
              disabled={loading}
              helperText="Ingresa el email asociado a tu cuenta"
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading || !email}
            >
              {loading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Enviando...
                </>
              ) : (
                'Enviar instrucciones'
              )}
            </Button>
            
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                ¿Recordaste tu contraseña?{' '}
                <Link to="/auth/login" style={{ color: 'inherit', fontWeight: 'bold' }}>
                  Inicia sesión
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  )
}

export default ForgotPasswordPage

// TODO: En Nivel 2 agregar:
// - Página de reset password con token
// - Validación de token
// - Expiración de links
// - Reenvío de email
// - Verificación por SMS