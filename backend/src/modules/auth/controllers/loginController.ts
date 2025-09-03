import { Request, Response } from 'express';
import { getDependencies } from '@shared/dependencies';

// Obtener dependencias necesarias
const { services, utils } = getDependencies();

// Controlador mínimo para login/logout
export const loginController = {
  // Login básico
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      
      // Validación básica
      if (!email || !password) {
        res.status(400).json(
          utils.apiResponse(false, null, 'Email y contraseña son requeridos')
        );
        return;
      }
      
      // Validar formato de email
      if (!utils.validator.isEmail(email)) {
        res.status(400).json(
          utils.apiResponse(false, null, 'Email inválido')
        );
        return;
      }
      
      // Usar servicio de autenticación
      const result = await services.auth.login(email, password);
      
      if (result.success) {
        utils.logger.info(`Login exitoso para: ${email}`);
        res.json(utils.apiResponse(true, {
          token: result.token,
          user: result.user
        }));
      } else {
        utils.logger.warn(`Login fallido para: ${email}`);
        res.status(401).json(
          utils.apiResponse(false, null, result.message || 'Credenciales inválidas')
        );
      }
    } catch (error) {
      utils.logger.error('Error en login:', error);
      res.status(500).json(
        utils.apiResponse(false, null, 'Error al iniciar sesión')
      );
    }
  },
  
  // Logout básico
  async logout(req: Request, res: Response): Promise<void> {
    try {
      // TODO: Implementar invalidación de token en Nivel 2
      // Por ahora solo limpiar cache si existe token
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token) {
        utils.cache.delete(`token:${token}`);
      }
      
      utils.logger.info('Logout exitoso');
      res.json(
        utils.apiResponse(true, null, 'Sesión cerrada exitosamente')
      );
    } catch (error) {
      utils.logger.error('Error en logout:', error);
      res.status(500).json(
        utils.apiResponse(false, null, 'Error al cerrar sesión')
      );
    }
  }
};