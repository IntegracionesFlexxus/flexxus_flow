// routes/conversationRoutes.ts
import { Router } from 'express';
import { ConversationController } from '../controllers/ConversationController';

// Función para crear las rutas de conversaciones
export function createConversationRoutes(conversationController: ConversationController): Router {
  const router = Router();

  // GET /api/omni/conversations - Obtener todas las conversaciones
  router.get('/', conversationController.getConversations.bind(conversationController));

  // GET /api/omni/conversations/stats - Obtener estadísticas de conversaciones
  router.get('/stats', conversationController.getConversationStats.bind(conversationController));

  // POST /api/omni/conversations - Crear nueva conversación
  router.post('/', conversationController.createConversation.bind(conversationController));

  // GET /api/omni/conversations/:id - Obtener conversación específica
  router.get('/:id', conversationController.getConversation.bind(conversationController));

  // POST /api/omni/conversations/:id/assign - Asignar conversación
  router.post('/:id/assign', conversationController.assignConversation.bind(conversationController));

  // PUT /api/omni/conversations/:id/status - Actualizar estado de conversación
  router.put('/:id/status', conversationController.updateConversationStatus.bind(conversationController));

  // POST /api/omni/conversations/:id/resolve - Resolver conversación
  router.post('/:id/resolve', conversationController.resolveConversation.bind(conversationController));

  // POST /api/omni/conversations/:id/reopen - Reabrir conversación
  router.post('/:id/reopen', conversationController.reopenConversation.bind(conversationController));

  // PUT /api/omni/conversations/:id/priority - Actualizar prioridad
  router.put('/:id/priority', conversationController.updateConversationPriority.bind(conversationController));

  // POST /api/omni/conversations/:id/tags - Agregar tags
  router.post('/:id/tags', conversationController.addTags.bind(conversationController));

  // DELETE /api/omni/conversations/:id/tags - Remover tags
  router.delete('/:id/tags', conversationController.removeTags.bind(conversationController));

  return router;
}