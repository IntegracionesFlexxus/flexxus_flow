import { Router } from 'express';
import { loginController } from './controllers/loginController';
import { userController } from './controllers/userController';

const router = Router();

// Rutas de autenticación
router.post('/login', loginController.login);
router.post('/logout', loginController.logout);

// Rutas de usuarios
router.get('/users', userController.getUsers);
router.get('/users/:id', userController.getUserById);
router.post('/users', userController.createUser);
router.put('/users/:id', userController.updateUser);

// Endpoint de prueba del módulo
router.get('/status', (req, res) => {
  res.json({ 
    module: 'auth', 
    status: 'active',
    message: 'Módulo de autenticación funcionando'
  });
});

export default router;