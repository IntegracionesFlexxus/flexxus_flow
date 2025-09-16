import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'

// Módulo de Autenticación - MVP con funcionalidad básica
// Maneja login, registro y recuperación de contraseña
export function AuthModule() {
  return (
    <Routes>
      {/* Rutas de autenticación */}
      <Route path="login" element={<LoginPage />} />
      <Route path="register" element={<RegisterPage />} />
      <Route path="forgot-password" element={<ForgotPasswordPage />} />
      
      {/* TODO: Nivel 2 - Agregar más rutas
      <Route path="reset-password/:token" element={<ResetPasswordPage />} />
      <Route path="verify-email/:token" element={<VerifyEmailPage />} />
      <Route path="two-factor" element={<TwoFactorPage />} />
      */}
      
      {/* Ruta por defecto */}
      <Route path="*" element={<Navigate to="login" replace />} />
    </Routes>
  )
}

export default AuthModule