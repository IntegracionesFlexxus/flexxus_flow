/**
 * Workflow Module - MVP Mock Implementation
 * 
 * ESTADO: Mock funcional para desarrollo
 * VERSIÓN: 0.1 (Mock)
 * PRODUCCIÓN: Planeado para v2.0
 * 
 * ⚠️ IMPORTANTE: Este módulo es intencionalmente mock para el MVP.
 * Permite desarrollo frontend sin bloqueos.
 * 
 * Endpoints disponibles:
 * - GET /workflows - Lista workflows de ejemplo
 * - POST /workflows/:id/execute - Simula ejecución
 * - GET /executions/:id/status - Retorna status mock
 * 
 * Ver MODULE_STATUS.md para más detalles.
 */

import { Router } from 'express';
const router = Router();

// Rutas básicas de Workflow
router.get('/workflows', (req, res) => {
  // [MOCK DATA] - Implementación real pendiente v2.0
  res.json({
    success: true,
    data: [
      { id: '1', name: 'Onboarding Cliente', status: 'active', steps: 5 },
      { id: '2', name: 'Atención Reclamo', status: 'active', steps: 8 },
      { id: '3', name: 'Venta Producto', status: 'draft', steps: 6 }
    ]
  });
});
router.post('/workflows/:id/execute', (req, res) => {
  // [MOCK DATA] - Ejecución real pendiente v2.0
  const { id } = req.params;
  const { data } = req.body;
  res.json({
    success: true,
    message: 'Workflow iniciado (mock)',
    data: {
      executionId: 'exec_' + Date.now(),
      workflowId: id,
      status: 'running',
      startedAt: new Date().toISOString()
    }
  });
});
router.get('/executions/:id/status', (req, res) => {
  // [MOCK DATA] - Seguimiento real pendiente v2.0
  const { id } = req.params;
  res.json({
    success: true,
    data: {
      executionId: id,
      status: 'completed',
      progress: 100,
      completedAt: new Date().toISOString()
    }
  });
});
// Endpoint de status del módulo
router.get('/status', (req, res) => {
  res.json({ 
    module: 'workflow',
    status: 'active',
    message: 'Módulo Workflow funcionando'
  });
});
export default router;
