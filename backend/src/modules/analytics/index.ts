/**
 * Analytics Module - MVP Mock Implementation
 * 
 * ESTADO: Mock funcional para desarrollo
 * VERSIÓN: 0.1 (Mock)
 * PRODUCCIÓN: Planeado para v1.5
 * 
 * ⚠️ IMPORTANTE: Este módulo es intencionalmente mock para el MVP.
 * Retorna métricas de ejemplo para desarrollo y demos.
 * 
 * Endpoints disponibles:
 * - GET /metrics - Métricas generales mock
 * - GET /reports/:type - Reportes por tipo mock
 * - GET /dashboard - Widgets de dashboard mock
 * 
 * Ver MODULE_STATUS.md para más detalles.
 */

import { Router } from 'express';
const router = Router();

// Rutas básicas de Analytics
router.get('/metrics', (req, res) => {
  // [MOCK DATA] - Métricas reales pendientes v1.5
  const now = new Date();
  res.json({
    success: true,
    data: {
      period: {
        start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
        end: now.toISOString()
      },
      messages: {
        total: 1543,
        byChannel: {
          whatsapp: 892,
          email: 451,
          webchat: 200
        },
        avgResponseTime: 138, // segundos
        firstResponseTime: 45 // segundos
      },
      contacts: {
        total: 287,
        active: 203,
        new: 34
      },
      workflows: {
        active: 12,
        completed: 89,
        failed: 3
      },
      satisfaction: {
        score: 4.5,
        responses: 145
      }
    },
    metadata: {
      isDemo: true,
      generatedAt: now.toISOString()
    }
  });
});
router.get('/reports/:type', (req, res) => {
  // [MOCK DATA] - Reportes reales pendientes v1.5
  const { type } = req.params;
  const { startDate, endDate } = req.query;
  res.json({
    success: true,
    data: {
      reportType: type,
      period: { startDate, endDate },
      summary: {
        totalInteractions: 450,
        resolvedCases: 420,
        resolutionRate: '93.3%'
      }
    }
  });
});
router.get('/dashboard', (req, res) => {
  // [MOCK DATA] - Dashboard real pendiente v1.5
  res.json({
    success: true,
    data: {
      widgets: [
        { id: '1', type: 'counter', title: 'Total Mensajes', value: 1543 },
        { id: '2', type: 'chart', title: 'Mensajes por Canal', data: [] },
        { id: '3', type: 'gauge', title: 'Satisfacción', value: 85 }
      ]
    }
  });
});
// Endpoint de status del módulo
router.get('/status', (req, res) => {
  res.json({ 
    module: 'analytics',
    status: 'active',
    message: 'Módulo Analytics funcionando'
  });
});
export default router;
