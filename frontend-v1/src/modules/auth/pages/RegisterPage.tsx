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
  Grid
} from '@mui/material'
import { useAuthStore } from '@/shared/store'
import { authApi } from '@/shared/services/authApi'
import { useNotifications } from '@/shared/store/hooks'

// Página de registro - MVP con validación básica
// TODO: En Nivel 2 agregar validación avanzada, términos y condiciones
export const RegisterPage: React.FC = () => {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const { notify } = useNotifications()
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    firstName: '',
    lastName: '',
    companyName: '',
    phone: '',
    acceptTerms: false
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  
  // Validación básica del formulario
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    // Validar email
    if (!formData.email) {
      newErrors.email = 'El email es requerido'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido'
    }
    
    // Validar contraseña
    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Mínimo 6 caracteres'
    }
    
    // Validar confirmación
    if (formData.password !== formData.passwordConfirm) {
      newErrors.passwordConfirm = 'Las contraseñas no coinciden'
    }
    
    // Validar nombre
    if (!formData.firstName) {
      newErrors.firstName = 'El nombre es requerido'
    }
    
    if (!formData.lastName) {
      newErrors.lastName = 'El apellido es requerido'
    }
    
    // Validar términos
    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'Debes aceptar los términos'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  // Manejo del submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setLoading(true)
    
    try {
      // Llamar al API de registro
      const response = await authApi.register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        companyName: formData.companyName || undefined,
        phone: formData.phone || undefined,
        acceptTerms: formData.acceptTerms
      })
      
      // Actualizar store de auth
      login(response.user, response.token, response.companies)
      
      // Notificación de éxito
      notify.success('Tu cuenta ha sido creada correctamente', 'Registro exitoso')
      
      // Redirigir al dashboard
      navigate('/dashboard')
      
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al crear la cuenta'
      
      notify.error(message, 'Error de registro')
      
      // Si el email ya existe
      if (err.response?.status === 409) {
        setErrors({ email: 'Este email ya está registrado' })
      }
    } finally {
      setLoading(false)
    }
  }
  
  // Manejador de cambios
  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = field === 'acceptTerms' ? e.target.checked : e.target.value
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Limpiar error del campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }
  
  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 4,
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
            Crea tu cuenta
          </Typography>
          
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Nombre"
                  value={formData.firstName}
                  onChange={handleChange('firstName')}
                  error={!!errors.firstName}
                  helperText={errors.firstName}
                  disabled={loading}
                  autoFocus
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Apellido"
                  value={formData.lastName}
                  onChange={handleChange('lastName')}
                  error={!!errors.lastName}
                  helperText={errors.lastName}
                  disabled={loading}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange('email')}
                  error={!!errors.email}
                  helperText={errors.email}
                  autoComplete="email"
                  disabled={loading}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Contraseña"
                  type="password"
                  value={formData.password}
                  onChange={handleChange('password')}
                  error={!!errors.password}
                  helperText={errors.password}
                  autoComplete="new-password"
                  disabled={loading}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Confirmar contraseña"
                  type="password"
                  value={formData.passwordConfirm}
                  onChange={handleChange('passwordConfirm')}
                  error={!!errors.passwordConfirm}
                  helperText={errors.passwordConfirm}
                  disabled={loading}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Empresa (opcional)"
                  value={formData.companyName}
                  onChange={handleChange('companyName')}
                  disabled={loading}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Teléfono (opcional)"
                  value={formData.phone}
                  onChange={handleChange('phone')}
                  disabled={loading}
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.acceptTerms}
                      onChange={handleChange('acceptTerms')}
                      color="primary"
                      disabled={loading}
                    />
                  }
                  label={
                    <Typography variant="body2">
                      Acepto los{' '}
                      <Link to="/terms" style={{ color: 'inherit' }}>
                        términos y condiciones
                      </Link>
                    </Typography>
                  }
                />
                {errors.acceptTerms && (
                  <Typography variant="caption" color="error">
                    {errors.acceptTerms}
                  </Typography>
                )}
              </Grid>
            </Grid>
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
            </Button>
            
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                ¿Ya tienes cuenta?{' '}
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

export default RegisterPage

// TODO: En Nivel 2 agregar:
// - Validación de fuerza de contraseña
// - Verificación de email
// - Registro con OAuth
// - Campos adicionales de perfil
// - Upload de avatar