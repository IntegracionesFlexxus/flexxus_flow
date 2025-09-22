// routes/channelRoutes.ts
import { Router } from 'express';
import { ChannelController } from '../controllers/ChannelController';
import { OMNI_TYPES } from '../types/omni.types';

// Función para crear las rutas de canales
export function createChannelRoutes(channelController: ChannelController): Router {
  const router = Router();

  // GET /api/omni/channels - Obtener todos los canales
  router.get('/', channelController.getChannels.bind(channelController));

  // GET /api/omni/channels/stats - Obtener estadísticas de canales
  router.get('/stats', channelController.getChannelStats.bind(channelController));

  // POST /api/omni/channels - Crear nuevo canal
  router.post('/', channelController.createChannel.bind(channelController));

  // GET /api/omni/channels/:id - Obtener canal específico
  router.get('/:id', channelController.getChannel.bind(channelController));

  // PUT /api/omni/channels/:id - Actualizar canal
  router.put('/:id', channelController.updateChannel.bind(channelController));

  // DELETE /api/omni/channels/:id - Eliminar canal
  router.delete('/:id', channelController.deleteChannel.bind(channelController));

  // POST /api/omni/channels/:id/toggle - Activar/Desactivar canal
  router.post('/:id/toggle', channelController.toggleChannelStatus.bind(channelController));

  // POST /api/omni/channels/:id/health - Verificar salud del canal
  router.post('/:id/health', channelController.checkChannelHealth.bind(channelController));

  return router;
}