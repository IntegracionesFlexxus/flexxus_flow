import { Router } from 'express';
import { getDependencies } from '@shared/dependencies';
import { container } from '@/container/container';
import { TYPES } from '@/container/types';
import { NotificationService } from '@/modules/notifications/services/NotificationService';
const router = Router();
const { repositories, utils } = getDependencies();
// Obtener NotificationService del container
let notificationService: NotificationService;
try {
  notificationService = container.get<NotificationService>(TYPES.NotificationService);
} catch {
  // Si no está en el container, crear instancia temporal
  const logger = container.get<any>(TYPES.Logger);
  notificationService = new NotificationService(repositories.message, logger);
}
// Rutas básicas de omnicanalidad
router.get('/channels', (req, res) => {
  // TODO: Implementar listado de canales en Nivel 2
  const channels = [
    { id: '1', name: 'WhatsApp', status: 'active' },
    { id: '2', name: 'Email', status: 'active' },
    { id: '3', name: 'WebChat', status: 'inactive' }
  ];
  utils.logger.info('Listando canales disponibles');
  res.json(utils.apiResponse(true, channels));
});
router.post('/messages/send', async (req, res) => {
  try {
    const { channel, recipient, message } = req.body;
    // Validación básica
    if (!channel || !recipient || !message) {
      return res.status(400).json(
        utils.apiResponse(false, null, 'Faltan parámetros requeridos')
      );
    }
    // Enviar mensaje usando el servicio de notificaciones
    const result = await notificationService.sendMessage(channel, recipient, message);
    utils.logger.info(`Mensaje enviado: ${result.id}`);
    res.json(utils.apiResponse(true, result, 'Mensaje enviado exitosamente'));
  } catch (error) {
    utils.logger.error('Error enviando mensaje:', error);
    res.status(500).json(
      utils.apiResponse(false, null, 'Error al enviar mensaje')
    );
  }
});
// Endpoint de status del módulo
router.get('/status', (req, res) => {
  res.json({ 
    module: 'omni',
    status: 'active',
    message: 'Módulo omnicanalidad funcionando'
  });
});
export default router;
