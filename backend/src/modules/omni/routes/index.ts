// routes/index.ts
import { Router } from 'express';
import { Container } from 'inversify';
import { createChannelRoutes } from './channelRoutes';
import { createConversationRoutes } from './conversationRoutes';
import { ChannelController } from '../controllers/ChannelController';
import { ConversationController } from '../controllers/ConversationController';
import { OMNI_TYPES } from '../types/omni.types';

export function createOmniRoutes(container: Container): Router {
  const router = Router();

  // Obtener controladores del container
  const channelController = container.get<ChannelController>(OMNI_TYPES.ChannelController);
  const conversationController = container.get<ConversationController>(OMNI_TYPES.ConversationController);

  // Montar rutas
  router.use('/channels', createChannelRoutes(channelController));
  router.use('/conversations', createConversationRoutes(conversationController));

  // Ruta de salud del módulo
  router.get('/health', (req, res) => {
    res.json({
      success: true,
      module: 'omni',
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  });

  return router;
}