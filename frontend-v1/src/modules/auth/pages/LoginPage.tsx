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
  FormControlLabel,
  Checkbox,
  Divider
} from '@mui/material'
import { useAuthStore } from '@/shared/store'
import { authApi } from '@/shared/services/authApi'
import { useNotifications } from '@/shared/store/hooks'

// Página de login del módulo Auth - MVP con funcionalidad mínima
// TODO: En Nivel 2 agregar OAuth, 2FA, captcha
export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const { notify } = useNotifications()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Llamar al API de login
      const response = await authApi.login({ 
        email, 
        password,
        rememberMe 
      })
      
      // Actualizar store de auth
      login(response.user, response.token, response.companies)
      
      // Notificación de éxito
      notify.success(`Hola ${response.user.firstName}!`, 'Bienvenido')
      
      // Redirigir al dashboard
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Credenciales incorrectas')
    } finally {
      setLoading(false)
    }
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
          <Typography component="h1" variant="h5" align="center" fontWeight="bold" color="primary">
            Flexxus Flow
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
            Ingresa a tu cuenta
          </Typography>
          
          {/* Credenciales de demo para desarrollo */}
          {import.meta.env.DEV && (
            <Alert severity="info" sx={{ mt: 2, mb: 1 }}>
              Demo: admin@test.com / admin123
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Contraseña"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  color="primary"
                  disabled={loading}
                />
              }
              label="Recordarme"
              sx={{ mt: 1 }}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 2, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>
            
            <Divider sx={{ my: 2 }}>O</Divider>
            
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                ¿Olvidaste tu contraseña?{' '}
                <Link to="/auth/forgot-password" style={{ color: 'inherit' }}>
                  Recupérala aquí
                </Link>
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                ¿No tienes cuenta?{' '}
                <Link to="/auth/register" style={{ color: 'inherit', fontWeight: 'bold' }}>
                  Regístrate
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  )
}

export default LoginPage

// TODO: En Nivel 2 agregar:
// - Login con Google, Facebook, Microsoft
// - Autenticación de dos factores (2FA)
// - Captcha para prevenir bots
// - Remember device
// - Magic links por email