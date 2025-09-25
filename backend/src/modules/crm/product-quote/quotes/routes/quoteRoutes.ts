/**
 * Quote Routes - Sprint 20 Implementation
 * Rutas API para gestión de cotizaciones
 */

import { Router } from 'express';
import { Container } from 'inversify';
import { TYPES } from '@/container/types';
import { quoteValidators } from '../controllers/QuoteController';
import { authenticateToken, requirePermission } from '@/shared/middleware/auth';

export function createQuoteRoutes(container: Container): Router {
  const router = Router();
  const quoteController = container.get<any>(TYPES.QuoteController);

  // Middleware de autenticación para todas las rutas
  router.use(authenticateToken);

/**
 * @route   POST /api/crm/quotes
 * @desc    Crear nueva cotización
 * @access  Private (Requires: quote:create)
 */
router.post(
  '/',
  requirePermission('quote:create'),
  quoteValidators.create,
  (req, res) => quoteController.create(req, res)
);

/**
 * @route   GET /api/crm/quotes/search
 * @desc    Búsqueda de cotizaciones con filtros
 * @access  Private (Requires: quote:read)
 */
router.get(
  '/search',
  requirePermission('quote:read'),
  (req, res) => quoteController.search(req, res)
);

/**
 * @route   GET /api/crm/quotes/stats
 * @desc    Obtener estadísticas de cotizaciones
 * @access  Private (Requires: quote:read)
 */
router.get(
  '/stats',
  requirePermission('quote:read'),
  (req, res) => quoteController.getStats(req, res)
);

/**
 * @route   GET /api/crm/quotes/export
 * @desc    Exportar cotizaciones
 * @access  Private (Requires: quote:export)
 */
router.get(
  '/export',
  requirePermission('quote:export'),
  (req, res) => quoteController.export(req, res)
);

/**
 * @route   POST /api/crm/quotes/calculate
 * @desc    Calcular totales de cotización
 * @access  Private (Requires: quote:read)
 */
router.post(
  '/calculate',
  requirePermission('quote:read'),
  quoteValidators.calculate,
  (req, res) => quoteController.calculate(req, res)
);

/**
 * @route   GET /api/crm/quotes/number/:number
 * @desc    Obtener cotización por número
 * @access  Private (Requires: quote:read)
 */
router.get(
  '/number/:number',
  requirePermission('quote:read'),
  quoteValidators.getByNumber,
  (req, res) => quoteController.getByNumber(req, res)
);

/**
 * @route   POST /api/crm/quotes/:id/duplicate
 * @desc    Duplicar cotización
 * @access  Private (Requires: quote:create)
 */
router.post(
  '/:id/duplicate',
  requirePermission('quote:create'),
  quoteValidators.duplicate,
  (req, res) => quoteController.duplicate(req, res)
);

/**
 * @route   GET /api/crm/quotes/:id/pdf
 * @desc    Generar PDF de cotización
 * @access  Private (Requires: quote:read)
 */
router.get(
  '/:id/pdf',
  requirePermission('quote:read'),
  quoteValidators.getById,
  (req, res) => quoteController.generatePdf(req, res)
);

/**
 * @route   POST /api/crm/quotes/:id/send
 * @desc    Enviar cotización por email
 * @access  Private (Requires: quote:send)
 */
router.post(
  '/:id/send',
  requirePermission('quote:send'),
  quoteValidators.sendEmail,
  (req, res) => quoteController.sendEmail(req, res)
);

/**
 * @route   GET /api/crm/quotes/:id/versions
 * @desc    Obtener historial de versiones
 * @access  Private (Requires: quote:read)
 */
router.get(
  '/:id/versions',
  requirePermission('quote:read'),
  quoteValidators.getById,
  (req, res) => quoteController.getVersionHistory(req, res)
);

/**
 * @route   POST /api/crm/quotes/:id/approval
 * @desc    Solicitar aprobación
 * @access  Private (Requires: quote:approval)
 */
router.post(
  '/:id/approval',
  requirePermission('quote:approval'),
  quoteValidators.requestApproval,
  (req, res) => quoteController.requestApproval(req, res)
);

/**
 * @route   POST /api/crm/quotes/:id/approval/:approvalId/respond
 * @desc    Procesar aprobación
 * @access  Private (Requires: quote:approval:process)
 */
router.post(
  '/:id/approval/:approvalId/respond',
  requirePermission('quote:approval:process'),
  quoteValidators.processApproval,
  (req, res) => quoteController.processApproval(req, res)
);

/**
 * @route   GET /api/crm/quotes/:id
 * @desc    Obtener cotización por ID
 * @access  Private (Requires: quote:read)
 */
router.get(
  '/:id',
  requirePermission('quote:read'),
  quoteValidators.getById,
  (req, res) => quoteController.getById(req, res)
);

/**
 * @route   PUT /api/crm/quotes/:id
 * @desc    Actualizar cotización
 * @access  Private (Requires: quote:update)
 */
router.put(
  '/:id',
  requirePermission('quote:update'),
  quoteValidators.update,
  (req, res) => quoteController.update(req, res)
);

/**
 * @route   DELETE /api/crm/quotes/:id
 * @desc    Eliminar cotización (soft delete)
 * @access  Private (Requires: quote:delete)
 */
router.delete(
  '/:id',
  requirePermission('quote:delete'),
  quoteValidators.delete,
  (req, res) => quoteController.delete(req, res)
);

  return router;
}

export default createQuoteRoutes;