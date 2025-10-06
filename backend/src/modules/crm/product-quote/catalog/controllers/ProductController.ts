/**
 * Product Controller - Sprint 20 Implementation
 * Conecta ProductRepository con ProductServiceImpl
 */

import 'reflect-metadata';
import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { body, param, query, validationResult } from 'express-validator';
import { ProductRepository } from '../repositories/ProductRepository';
import { ProductServiceImpl } from '../services/ProductServiceImpl';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductSearchParams,
  InventoryUpdate
} from '../../shared/interfaces/product.interfaces';

@injectable()
export class ProductController {
  constructor(
    @inject(TYPES.ProductRepository) private productRepository: ProductRepository,
    @inject(TYPES.ProductService) private productService: ProductServiceImpl,
    @inject(TYPES.Logger) private logger: any
  ) {}

  /**
   * Crear nuevo producto
   * POST /api/crm/products
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
        return;
      }

      const productData: CreateProductDto = req.body;
      productData.created_by = req.user?.id || 1;
      productData.updated_by = req.user?.id || 1;

      // Usar ProductService para lógica de negocio y validaciones
      const product = await this.productService.createProduct(productData);

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: product
      });
    } catch (error: any) {
      this.logger.error('Error creating product:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Obtener producto por ID
   * GET /api/crm/products/:id
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
        return;
      }

      const productId = parseInt(req.params.id);
      const product = await this.productService.getProductById(productId);

      if (!product) {
        res.status(404).json({
          success: false,
          message: 'Product not found'
        });
        return;
      }

      res.json({
        success: true,
        data: product
      });
    } catch (error: any) {
      this.logger.error('Error getting product:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Obtener producto por SKU
   * GET /api/crm/products/sku/:sku
   */
  async getBySku(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
        return;
      }

      const sku = req.params.sku;
      const product = await this.productService.getProductBySku(sku);

      if (!product) {
        res.status(404).json({
          success: false,
          message: 'Product not found'
        });
        return;
      }

      res.json({
        success: true,
        data: product
      });
    } catch (error: any) {
      this.logger.error('Error getting product by SKU:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Búsqueda de productos con filtros
   * GET /api/crm/products/search
   */
  async search(req: Request, res: Response): Promise<void> {
    try {
      const searchParams: ProductSearchParams = {
        query: req.query.q as string,
        categoryId: req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined,
        status: req.query.status ? (req.query.status as string).split(',') : undefined,
        type: req.query.type ? (req.query.type as string).split(',') : undefined,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
        inStock: req.query.inStock === 'true',
        hasImages: req.query.hasImages === 'true',
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        sortBy: req.query.sortBy as string || 'created_at',
        sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'desc'
      };

      const result = await this.productService.searchProducts(searchParams);

      res.json({
        success: true,
        data: result.products,
        meta: {
          total: result.total,
          page: searchParams.page,
          limit: searchParams.limit,
          totalPages: Math.ceil(result.total / searchParams.limit),
          facets: result.facets
        }
      });
    } catch (error: any) {
      this.logger.error('Error searching products:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Actualizar producto
   * PUT /api/crm/products/:id
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
        return;
      }

      const productId = parseInt(req.params.id);
      const updateData: UpdateProductDto = req.body;
      updateData.updated_by = req.user?.id || 1;

      const product = await this.productService.updateProduct(productId, updateData);

      res.json({
        success: true,
        message: 'Product updated successfully',
        data: product
      });
    } catch (error: any) {
      this.logger.error('Error updating product:', error);

      if (error.message === 'Product not found') {
        res.status(404).json({
          success: false,
          message: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Eliminar producto
   * DELETE /api/crm/products/:id
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
        return;
      }

      const productId = parseInt(req.params.id);
      const deleted = await this.productService.deleteProduct(productId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Product not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Product deleted successfully'
      });
    } catch (error: any) {
      this.logger.error('Error deleting product:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Actualización masiva de productos
   * PUT /api/crm/products/bulk-update
   */
  async bulkUpdate(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
        return;
      }

      const { ids, updates } = req.body;
      updates.updated_by = req.user?.id || 1;

      const result = await this.productService.bulkUpdateProducts(ids, updates);

      res.json({
        success: true,
        message: 'Bulk update completed',
        data: result
      });
    } catch (error: any) {
      this.logger.error('Error in bulk update:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Obtener disponibilidad de productos
   * GET /api/crm/products/availability
   */
  async getAvailability(req: Request, res: Response): Promise<void> {
    try {
      const productIds = req.query.ids as string;
      if (!productIds) {
        res.status(400).json({
          success: false,
          message: 'Product IDs are required'
        });
        return;
      }

      const ids = productIds.split(',').map(id => parseInt(id.trim()));
      const availability = await this.productService.getProductAvailability(ids);

      // Convertir Map a Object para la respuesta JSON
      const availabilityObject: { [key: number]: any } = {};
      availability.forEach((value, key) => {
        availabilityObject[key] = value;
      });

      res.json({
        success: true,
        data: availabilityObject
      });
    } catch (error: any) {
      this.logger.error('Error getting availability:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Actualizar inventario
   * POST /api/crm/products/inventory/update
   */
  async updateInventory(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
        return;
      }

      const updates: InventoryUpdate[] = req.body.updates;
      await this.productService.updateInventory(updates as any);

      res.json({
        success: true,
        message: 'Inventory updated successfully'
      });
    } catch (error: any) {
      this.logger.error('Error updating inventory:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Exportar productos
   * GET /api/crm/products/export
   */
  async export(req: Request, res: Response): Promise<void> {
    try {
      const format = req.query.format as string || 'csv';
      const filters: ProductSearchParams = {
        categoryId: req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined,
        status: req.query.status ? (req.query.status as string).split(',') : undefined,
        type: req.query.type ? (req.query.type as string).split(',') : undefined
      };

      const exportData = await this.productService.exportProducts(filters, format);

      // Configurar headers para descarga
      const filename = `products_export_${new Date().toISOString().split('T')[0]}.${format}`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');

      res.send(exportData);
    } catch (error: any) {
      this.logger.error('Error exporting products:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Obtener estadísticas de productos
   * GET /api/crm/products/stats
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.productService.getProductStatistics();

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      this.logger.error('Error getting product stats:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }
}

/**
 * Validadores para las rutas de productos
 */
export const productValidators = {
  create: [
    body('sku')
      .notEmpty()
      .withMessage('SKU is required')
      .isLength({ min: 2, max: 50 })
      .withMessage('SKU must be between 2 and 50 characters'),
    body('name')
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ min: 2, max: 255 })
      .withMessage('Name must be between 2 and 255 characters'),
    body('description')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('Description must be less than 2000 characters'),
    body('category_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Category ID must be a positive integer'),
    body('base_price')
      .isFloat({ min: 0 })
      .withMessage('Base price must be a positive number'),
    body('cost')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Cost must be a positive number'),
    body('currency')
      .optional()
      .isLength({ min: 3, max: 3 })
      .withMessage('Currency must be 3 characters'),
    body('type')
      .optional()
      .isIn(['physical', 'digital', 'service'])
      .withMessage('Type must be physical, digital, or service'),
    body('status')
      .optional()
      .isIn(['draft', 'active', 'inactive', 'archived'])
      .withMessage('Status must be draft, active, inactive, or archived')
  ],

  update: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Product ID must be a positive integer'),
    body('name')
      .optional()
      .isLength({ min: 2, max: 255 })
      .withMessage('Name must be between 2 and 255 characters'),
    body('description')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('Description must be less than 2000 characters'),
    body('base_price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Base price must be a positive number')
  ],

  getById: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Product ID must be a positive integer')
  ],

  getBySku: [
    param('sku')
      .notEmpty()
      .withMessage('SKU is required')
      .isLength({ min: 2, max: 50 })
      .withMessage('SKU must be between 2 and 50 characters')
  ],

  delete: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Product ID must be a positive integer')
  ],

  bulkUpdate: [
    body('ids')
      .isArray({ min: 1 })
      .withMessage('IDs array is required'),
    body('ids.*')
      .isInt({ min: 1 })
      .withMessage('Each ID must be a positive integer'),
    body('updates')
      .isObject()
      .withMessage('Updates object is required')
  ],

  updateInventory: [
    body('updates')
      .isArray({ min: 1 })
      .withMessage('Updates array is required'),
    body('updates.*.product_id')
      .isInt({ min: 1 })
      .withMessage('Product ID must be a positive integer'),
    body('updates.*.operation')
      .isIn(['add', 'subtract', 'set'])
      .withMessage('Operation must be add, subtract, or set'),
    body('updates.*.quantity_change')
      .isInt({ min: 0 })
      .withMessage('Quantity change must be a non-negative integer')
  ]
};