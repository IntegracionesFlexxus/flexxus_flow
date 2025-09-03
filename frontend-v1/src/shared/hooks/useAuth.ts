import { useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/shared/store'
import { authApi } from '@/shared/services/authApi'
import { useNotifications } from '@/shared/store/hooks'

// Hook de autenticación - MVP con funcionalidad básica
// TODO: En Nivel 2 agregar refresh token automático, session management

interface UseAuthOptions {
  redirectTo?: string
  onSuccess?: () => void
  onError?: (error: any) => void
}

export const useAuth = (options: UseAuthOptions = {}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { notify } = useNotifications()
  
  const {
    isAuthenticated,
    user,
    token,
    currentCompany,
    companies,
    login: setAuth,
    logout: clearAuth,
    switchCompany
  } = useAuthStore()
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Login
  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await authApi.login({ email, password, rememberMe })
      
      // Guardar en el store
      setAuth(response.user, response.token, response.companies)
      
      // Notificación de éxito
      notify.success(`Hola ${response.user.firstName}!`, 'Bienvenido')
      
      // Callback de éxito
      options.onSuccess?.()
      
      // Redirigir
      const from = location.state?.from || options.redirectTo || '/dashboard'
      navigate(from, { replace: true })
      
      return response
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al iniciar sesión'
      setError(message)
      
      notify.error(message, 'Error de autenticación')
      
      // Callback de error
      options.onError?.(err)
      
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [setAuth, notify, navigate, location, options])
  
  // Register
  const register = useCallback(async (data: {
    email: string
    password: string
    firstName: string
    lastName: string
    companyName?: string
    phone?: string
    acceptTerms: boolean
  }) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await authApi.register(data)
      
      // Guardar en el store
      setAuth(response.user, response.token, response.companies)
      
      // Notificación de éxito
      notify.success('Tu cuenta ha sido creada correctamente', 'Registro exitoso')
      
      // Callback de éxito
      options.onSuccess?.()
      
      // Redirigir
      navigate(options.redirectTo || '/dashboard')
      
      return response
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al crear la cuenta'
      setError(message)
      
      notify.error(message, 'Error de registro')
      
      // Callback de error
      options.onError?.(err)
      
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [setAuth, notify, navigate, options])
  
  // Logout
  const logout = useCallback(async () => {
    try {
      // Llamar al API para invalidar token en el backend
      await authApi.logout()
    } catch (error) {
      // Ignorar errores de logout
      console.error('Error al cerrar sesión:', error)
    } finally {
      // Siempre limpiar el estado local
      clearAuth()
      
      // Notificación
      notify.info('Has cerrado sesión correctamente', 'Sesión cerrada')
      
      // Redirigir al login
      navigate('/auth/login')
    }
  }, [clearAuth, notify, navigate])
  
  // Forgot Password
  const forgotPassword = useCallback(async (email: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await authApi.forgotPassword(email)
      
      notify.success('Revisa tu correo para restablecer tu contraseña', 'Email enviado')
      
      return response
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al enviar el email'
      setError(message)
      
      notify.error(message, 'Error')
      
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [notify])
  
  // Reset Password
  const resetPassword = useCallback(async (token: string, password: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await authApi.resetPassword({
        token,
        password,
        passwordConfirmation: password
      })
      
      notify.success('Tu contraseña ha sido actualizada correctamente', 'Contraseña actualizada')
      
      // Redirigir al login
      navigate('/auth/login')
      
      return response
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al restablecer la contraseña'
      setError(message)
      
      notify.error(message, 'Error')
      
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [notify, navigate])
  
  // Refresh Token
  const refreshToken = useCallback(async () => {
    try {
      const response = await authApi.refreshToken()
      
      // Actualizar token en el store
      useAuthStore.setState({ token: response.token })
      
      return response
    } catch (error) {
      // Si falla el refresh, hacer logout
      await logout()
      throw error
    }
  }, [logout])
  
  return {
    // Estado
    isAuthenticated,
    user,
    token,
    currentCompany,
    companies,
    isLoading,
    error,
    
    // Métodos
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    refreshToken,
    switchCompany,
    
    // Utilidades
    clearError: () => setError(null)
  }
}

export default useAuth

// TODO: En Nivel 2 agregar:
// - Auto refresh token con interceptor
// - Session timeout warning
// - Remember me persistente
// - Social login helpers
// - Biometric authentication