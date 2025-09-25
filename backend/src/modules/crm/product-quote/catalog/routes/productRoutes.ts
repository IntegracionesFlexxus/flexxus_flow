/**
 * Product Routes - Sprint 20 Implementation
 * Rutas API para gestión de productos
 */

import { Router } from 'express';
import { Container } from 'inversify';
import { TYPES } from '@/container/types';
import { productValidators } from '../controllers/ProductController';
import { authenticateToken, requirePermission } from '@/shared/middleware/auth';

export function createProductRoutes(container: Container): Router {
  const router = Router();
  const productController = container.get<any>(TYPES.ProductController);

  // Middleware de autenticación para todas las rutas
  router.use(authenticateToken);

/**
 * @route   POST /api/crm/products
 * @desc    Crear nuevo producto
 * @access  Private (Requires: product:create)
 */
router.post(
  '/',
  requirePermission('product:create'),
  productValidators.create,
  (req, res) => productController.create(req, res)
);

/**
 * @route   GET /api/crm/products/search
 * @desc    Búsqueda de productos con filtros
 * @access  Private (Requires: product:read)
 */
router.get(
  '/search',
  requirePermission('product:read'),
  (req, res) => productController.search(req, res)
);

/**
 * @route   GET /api/crm/products/stats
 * @desc    Obtener estadísticas de productos
 * @access  Private (Requires: product:read)
 */
router.get(
  '/stats',
  requirePermission('product:read'),
  (req, res) => productController.getStats(req, res)
);

/**
 * @route   GET /api/crm/products/export
 * @desc    Exportar productos
 * @access  Private (Requires: product:export)
 */
router.get(
  '/export',
  requirePermission('product:export'),
  (req, res) => productController.export(req, res)
);

/**
 * @route   GET /api/crm/products/availability
 * @desc    Obtener disponibilidad de productos
 * @access  Private (Requires: product:read)
 */
router.get(
  '/availability',
  requirePermission('product:read'),
  (req, res) => productController.getAvailability(req, res)
);

/**
 * @route   POST /api/crm/products/inventory/update
 * @desc    Actualizar inventario
 * @access  Private (Requires: product:inventory)
 */
router.post(
  '/inventory/update',
  requirePermission('product:inventory'),
  productValidators.updateInventory,
  (req, res) => productController.updateInventory(req, res)
);

/**
 * @route   PUT /api/crm/products/bulk-update
 * @desc    Actualización masiva de productos
 * @access  Private (Requires: product:update)
 */
router.put(
  '/bulk-update',
  requirePermission('product:update'),
  productValidators.bulkUpdate,
  (req, res) => productController.bulkUpdate(req, res)
);

/**
 * @route   GET /api/crm/products/sku/:sku
 * @desc    Obtener producto por SKU
 * @access  Private (Requires: product:read)
 */
router.get(
  '/sku/:sku',
  requirePermission('product:read'),
  productValidators.getBySku,
  (req, res) => productController.getBySku(req, res)
);

/**
 * @route   GET /api/crm/products/:id
 * @desc    Obtener producto por ID
 * @access  Private (Requires: product:read)
 */
router.get(
  '/:id',
  requirePermission('product:read'),
  productValidators.getById,
  (req, res) => productController.getById(req, res)
);

/**
 * @route   PUT /api/crm/products/:id
 * @desc    Actualizar producto
 * @access  Private (Requires: product:update)
 */
router.put(
  '/:id',
  requirePermission('product:update'),
  productValidators.update,
  (req, res) => productController.update(req, res)
);

/**
 * @route   DELETE /api/crm/products/:id
 * @desc    Eliminar producto (soft delete)
 * @access  Private (Requires: product:delete)
 */
router.delete(
  '/:id',
  requirePermission('product:delete'),
  productValidators.delete,
  (req, res) => productController.delete(req, res)
);

  return router;
}

export default createProductRoutes;