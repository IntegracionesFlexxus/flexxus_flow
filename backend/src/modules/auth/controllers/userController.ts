import { Request, Response } from 'express';
import { userService } from '../services/userService';

// Controlador mínimo para usuarios
export const userController = {
  // Obtener todos los usuarios
  async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const users = await userService.getAllUsers();
      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener usuarios'
      });
    }
  },
  
  // Obtener usuario por ID
  async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = await userService.getUserById(id);
      
      if (user) {
        res.json({
          success: true,
          data: user
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }
    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener usuario'
      });
    }
  },
  
  // Crear usuario
  async createUser(req: Request, res: Response): Promise<void> {
    try {
      const userData = req.body;
      
      // Validación básica
      if (!userData.email || !userData.name) {
        res.status(400).json({
          success: false,
          message: 'Email y nombre son requeridos'
        });
        return;
      }
      
      const newUser = await userService.createUser(userData);
      res.status(201).json({
        success: true,
        data: newUser
      });
    } catch (error) {
      console.error('Error creando usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear usuario'
      });
    }
  },
  
  // Actualizar usuario
  async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const updatedUser = await userService.updateUser(id, updateData);
      
      if (updatedUser) {
        res.json({
          success: true,
          data: updatedUser
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar usuario'
      });
    }
  }
};