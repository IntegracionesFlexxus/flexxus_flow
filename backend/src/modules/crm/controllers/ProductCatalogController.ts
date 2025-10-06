/**
 * Product Catalog Controller - Sprint 19
 * REST API endpoints for product catalog management
 */

import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { Logger } from 'winston';
import Joi from 'joi';
import { ProductCatalogService } from '../services/ProductCatalogService';
import { CategoryRepository } from '../repositories/CategoryRepository';

// Validation schemas
const productSchema = Joi.object({
  name: Joi.string().required().max(200),
  sku: Joi.string().required().max(100),
  category_id: Joi.number().integer().positive(),
  product_type: Joi.string().valid('standard', 'variant', 'bundle', 'service').default('standard'),
  description: Joi.string().allow(''),
  base_price: Joi.number().positive().required(),
  currency_code: Joi.string().length(3).default('USD'),
  unit_of_measure: Joi.string().max(50),
  tax_rate: Joi.number().min(0).max(100).default(0),
  images: Joi.array().items(Joi.object({
    url: Joi.string().uri(),
    is_primary: Joi.boolean(),
    alt_text: Joi.string()
  })),
  attributes: Joi.object(),
  metadata: Joi.object(),
  tags: Joi.array().items(Joi.string()),
  is_active: Joi.boolean().default(true)
});

const variantSchema = Joi.object({
  sku: Joi.string().required().max(100),
  variant_name: Joi.string().required().max(200),
  attributes: Joi.object().required(),
  price_adjustment: Joi.number().default(0),
  weight: Joi.number().min(0),
  dimensions: Joi.object({
    length: Joi.number(),
    width: Joi.number(),
    height: Joi.number()
  }),
  inventory_count: Joi.number().integer().min(0)
});

const bundleItemSchema = Joi.object({
  product_id: Joi.number().integer().positive().required(),
  quantity: Joi.number().integer().positive().required(),
  discount_percentage: Joi.number().min(0).max(100).default(0),
  is_optional: Joi.boolean().default(false)
});

const inventoryMovementSchema = Joi.object({
  product_id: Joi.number().integer().positive().required(),
  variant_id: Joi.number().integer().positive(),
  location_id: Joi.number().integer().positive(),
  movement_type: Joi.string().valid('in', 'out', 'adjustment', 'transfer').required(),
  quantity: Joi.number().integer().required(),
  reference_type: Joi.string().max(50),
  reference_id: Joi.number().integer(),
  notes: Joi.string()
});

const searchSchema = Joi.object({
  query: Joi.string().allow(''),
  category_id: Joi.number().integer().positive(),
  price_min: Joi.number().min(0),
  price_max: Joi.number().min(0),
  attributes: Joi.object(),
  tags: Joi.array().items(Joi.string()),
  sort_by: Joi.string().valid('name', 'price', 'created_at', 'popularity'),
  sort_order: Joi.string().valid('asc', 'desc').default('asc'),
  include_facets: Joi.boolean().default(false),
  page: Joi.number().integer().min(1).default(1),
  page_size: Joi.number().integer().min(1).max(100).default(20)
});

const bulkImportSchema = Joi.object({
  products: Joi.array().items(productSchema).required(),
  update_existing: Joi.boolean().default(false),
  validate_only: Joi.boolean().default(false)
});

@injectable()
export class ProductCatalogController {
  constructor(
    @inject(TYPES.ProductCatalogService) private productService: ProductCatalogService,
    @inject(TYPES.CategoryRepository) private categoryRepository: CategoryRepository,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  /**
   * Get all products with pagination and filters
   * GET /api/crm/products
   */
  async getProducts(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;
      if (!company_id) {
        res.status(401).json({ error: 'Company ID not found in request' });
        return;
      }

      const filters = {
        category_id: req.query.category_id ? Number(req.query.category_id) : undefined,
        is_active: req.query.is_active === 'false' ? false : true,
        product_type: req.query.product_type as string,
        tags: req.query.tags ? String(req.query.tags).split(',') : undefined
      };

      const pagination = {
        page: Number(req.query.page) || 1,
        page_size: Number(req.query.page_size) || 20
      };

      const result = await this.productService.searchProducts({
          ...filters,
          company_id: company_id,
          page: pagination.page,
          limit: pagination.page_size
        });

      res.json({
        success: true,
        data: result.products,
        pagination: {
          page: pagination.page,
          page_size: pagination.page_size,
          total_count: result.total_count,
          total_pages: Math.ceil(result.total_count / pagination.page_size)
        }
      });

    } catch (error) {
      this.logger.error('Error getting products', { error });
      res.status(500).json({ error: 'Failed to get products' });
    }
  }

  /**
   * Get single product by ID
   * GET /api/crm/products/:id
   */
  async getProductById(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;
      const product_id = Number(req.params.id);

      if (!company_id) {
        res.status(401).json({ error: 'Company ID not found' });
        return;
      }

      const product = await this.productService.getProductWithDetails(
        company_id,
        product_id
      );

      if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      res.json({
        success: true,
        data: product
      });

    } catch (error) {
      this.logger.error('Error getting product', { error });
      res.status(500).json({ error: 'Failed to get product' });
    }
  }

  /**
   * Create new product
   * POST /api/crm/products
   */
  async createProduct(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;
      const user_id = req.user?.id;

      if (!company_id || !user_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Validate request body
      const { error, value } = productSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const product = await this.productService.createProduct(company_id, {
        ...value,
        created_by: user_id
      });

      res.status(201).json({
        success: true,
        data: product,
        message: 'Product created successfully'
      });

    } catch (error: any) {
      this.logger.error('Error creating product', { error });

      if (error.message?.includes('duplicate')) {
        res.status(409).json({ error: 'Product with this SKU already exists' });
      } else {
        res.status(500).json({ error: 'Failed to create product' });
      }
    }
  }

  /**
   * Update product
   * PUT /api/crm/products/:id
   */
  async updateProduct(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;
      const user_id = req.user?.id;
      const product_id = Number(req.params.id);

      if (!company_id || !user_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { error, value } = productSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const product = await this.productService.updateProduct(product_id, {
        ...value,
        updated_by: user_id
      });

      res.json({
        success: true,
        data: product,
        message: 'Product updated successfully'
      });

    } catch (error: any) {
      this.logger.error('Error updating product', { error });

      if (error.message?.includes('not found')) {
        res.status(404).json({ error: 'Product not found' });
      } else {
        res.status(500).json({ error: 'Failed to update product' });
      }
    }
  }

  /**
   * Delete product
   * DELETE /api/crm/products/:id
   */
  async deleteProduct(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;
      const product_id = Number(req.params.id);

      if (!company_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Soft delete by setting is_active to false
      await this.productService.updateProduct(product_id, {
        is_active: false,
        deleted_at: new Date()
      });

      res.json({
        success: true,
        message: 'Product deleted successfully'
      });

    } catch (error) {
      this.logger.error('Error deleting product', { error });
      res.status(500).json({ error: 'Failed to delete product' });
    }
  }

  /**
   * Advanced product search
   * POST /api/crm/products/search
   */
  async searchProducts(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;

      if (!company_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { error, value } = searchSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const result = await this.productService.searchProducts({
        ...value,
        company_id: company_id
      });

      res.json({
        success: true,
        data: result.products,
        facets: result.facets,
        pagination: {
          page: value.page,
          page_size: value.page_size,
          total_count: result.total_count,
          total_pages: Math.ceil(result.total_count / value.page_size)
        }
      });

    } catch (error) {
      this.logger.error('Error searching products', { error });
      res.status(500).json({ error: 'Failed to search products' });
    }
  }

  /**
   * Create product variant
   * POST /api/crm/products/:id/variants
   */
  async createVariant(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;
      const product_id = Number(req.params.id);

      if (!company_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { error, value } = variantSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const variant = await this.productService.createVariant(
        company_id,
        product_id,
        value
      );

      res.status(201).json({
        success: true,
        data: variant,
        message: 'Variant created successfully'
      });

    } catch (error) {
      this.logger.error('Error creating variant', { error });
      res.status(500).json({ error: 'Failed to create variant' });
    }
  }

  /**
   * Create product bundle
   * POST /api/crm/bundles
   */
  async createBundle(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;
      const user_id = req.user?.id;

      if (!company_id || !user_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const bundleSchema = Joi.object({
        bundle_name: Joi.string().required().max(200),
        bundle_sku: Joi.string().required().max(100),
        description: Joi.string(),
        discount_percentage: Joi.number().min(0).max(100).default(0),
        items: Joi.array().items(bundleItemSchema).min(2).required(),
        is_active: Joi.boolean().default(true)
      });

      const { error, value } = bundleSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const bundle = await this.productService.createBundle({
        ...value,
        company_id: company_id,
        created_by: user_id
      });

      res.status(201).json({
        success: true,
        data: bundle,
        message: 'Bundle created successfully'
      });

    } catch (error) {
      this.logger.error('Error creating bundle', { error });
      res.status(500).json({ error: 'Failed to create bundle' });
    }
  }

  /**
   * Record inventory movement
   * POST /api/crm/inventory/movements
   */
  async recordInventoryMovement(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;
      const user_id = req.user?.id;

      if (!company_id || !user_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { error, value } = inventoryMovementSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const movement = await this.productService.recordInventoryMovement({
        ...value,
        company_id,
        created_by: user_id
      });

      res.status(201).json({
        success: true,
        data: movement,
        message: 'Inventory movement recorded successfully'
      });

    } catch (error) {
      this.logger.error('Error recording inventory movement', { error });
      res.status(500).json({ error: 'Failed to record inventory movement' });
    }
  }

  /**
   * Get inventory levels
   * GET /api/crm/inventory/levels
   */
  async getInventoryLevels(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;

      if (!company_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const location_id = req.query.location_id ? Number(req.query.location_id) : undefined;
      const product_ids = req.query.product_ids ?
        String(req.query.product_ids).split(',').map(Number) : undefined;

      const levels = await this.productService.getInventoryLevels(
        company_id,
        location_id,
        product_ids
      );

      res.json({
        success: true,
        data: levels
      });

    } catch (error) {
      this.logger.error('Error getting inventory levels', { error });
      res.status(500).json({ error: 'Failed to get inventory levels' });
    }
  }

  /**
   * Bulk import products
   * POST /api/crm/products/bulk-import
   */
  async bulkImportProducts(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;
      const user_id = req.user?.id;

      if (!company_id || !user_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { error, value } = bulkImportSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          details: error.details.map(d => d.message)
        });
        return;
      }

      // Add company_id and created_by to each product
      const products = value.products.map((p: any) => ({
        ...p,
        company_id,
        created_by: user_id
      }));

      const result = await this.productService.bulkImport(
        products,
        value.update_existing,
        value.validate_only
      );

      res.json({
        success: true,
        data: result,
        message: value.validate_only ?
          'Validation completed' :
          'Products imported successfully'
      });

    } catch (error) {
      this.logger.error('Error importing products', { error });
      res.status(500).json({ error: 'Failed to import products' });
    }
  }

  /**
   * Export products
   * GET /api/crm/products/export
   */
  async exportProducts(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;

      if (!company_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const format = ((req.query.format as string) || 'csv') as 'json' | 'csv';
      const filters = {
        category_id: req.query.category_id ? Number(req.query.category_id) : undefined,
        is_active: req.query.is_active === 'false' ? false : true
      };

      const result = await this.productService.exportProducts(
        company_id,
        format,
        filters as any
      );

      // Set appropriate headers based on format
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="products.csv"');
      } else if (format === 'excel') {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="products.xlsx"');
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="products.json"');
      }

      res.send(result.data);

    } catch (error) {
      this.logger.error('Error exporting products', { error });
      res.status(500).json({ error: 'Failed to export products' });
    }
  }

  /**
   * Get all categories
   * GET /api/crm/categories
   */
  async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;

      if (!company_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const parent_id = req.query.parent_id ? Number(req.query.parent_id) : undefined;

      const categories = await this.categoryRepository.getCategories(
        company_id,
        parent_id
      );

      res.json({
        success: true,
        data: categories
      });

    } catch (error) {
      this.logger.error('Error getting categories', { error });
      res.status(500).json({ error: 'Failed to get categories' });
    }
  }

  /**
   * Create category
   * POST /api/crm/categories
   */
  async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;
      const user_id = req.user?.id;

      if (!company_id || !user_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const categorySchema = Joi.object({
        name: Joi.string().required().max(100),
        parent_id: Joi.number().integer().positive().allow(null),
        description: Joi.string().allow(''),
        metadata: Joi.object()
      });

      const { error, value } = categorySchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const category = await this.categoryRepository.createCategory({
        ...value,
        company_id,
        created_by: user_id
      });

      res.status(201).json({
        success: true,
        data: category,
        message: 'Category created successfully'
      });

    } catch (error) {
      this.logger.error('Error creating category', { error });
      res.status(500).json({ error: 'Failed to create category' });
    }
  }

  /**
   * Move category
   * PUT /api/crm/categories/:id/move
   */
  async moveCategory(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;
      const category_id = Number(req.params.id);
      const { new_parent_id } = req.body;

      if (!company_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      await this.categoryRepository.moveCategory(
        category_id,
        new_parent_id,
        company_id
      );

      res.json({
        success: true,
        message: 'Category moved successfully'
      });

    } catch (error) {
      this.logger.error('Error moving category', { error });
      res.status(500).json({ error: 'Failed to move category' });
    }
  }

  /**
   * Delete category
   * DELETE /api/crm/categories/:id
   */
  async deleteCategory(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;
      const category_id = Number(req.params.id);

      if (!company_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      await this.categoryRepository.deleteCategory(category_id, company_id);

      res.json({
        success: true,
        message: 'Category deleted successfully'
      });

    } catch (error) {
      this.logger.error('Error deleting category', { error });
      res.status(500).json({ error: 'Failed to delete category' });
    }
  }
}