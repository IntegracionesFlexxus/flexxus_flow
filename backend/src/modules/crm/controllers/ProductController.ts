/**
 * @deprecated Sprint 19 - Usar implementación Sprint 20 en product-quote/
 * Este archivo será eliminado en futuras versiones
 * Ver: backend/src/modules/crm/product-quote/catalog/controllers/ProductController.ts
 *
 * Product Controller - Sprint 19
 * REST API endpoints for product catalog management
 */

import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { Logger } from 'winston';
import Joi from 'joi';
import { ProductCatalogService, ProductCategory, ProductBundle, ProductMedia, ProductSpecification } from '../services/ProductCatalogService';
import { ProductRepository, Product, ProductFilter } from '../repositories/ProductRepository';

// Validation schemas
const createProductSchema = Joi.object({
  category_id: Joi.number().optional(),
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(2000).optional(),
  short_description: Joi.string().max(500).optional(),
  product_code: Joi.string().min(1).max(100).required(),
  barcode: Joi.string().max(100).optional(),
  manufacturer_part_number: Joi.string().max(100).optional(),
  product_type: Joi.string().valid('simple', 'configurable', 'bundle', 'service', 'digital', 'subscription').required(),
  is_active: Joi.boolean().optional(),
  is_digital: Joi.boolean().optional(),
  is_subscription: Joi.boolean().optional(),
  requires_shipping: Joi.boolean().optional(),
  weight: Joi.number().positive().optional(),
  weight_unit: Joi.string().valid('kg', 'g', 'lb', 'oz').optional(),
  dimensions: Joi.object({
    length: Joi.number().positive(),
    width: Joi.number().positive(),
    height: Joi.number().positive(),
    unit: Joi.string().valid('cm', 'in', 'm')
  }).optional(),
  track_inventory: Joi.boolean().optional(),
  stock_quantity: Joi.number().min(0).optional(),
  low_stock_threshold: Joi.number().min(0).optional(),
  allow_backorders: Joi.boolean().optional(),
  max_order_quantity: Joi.number().positive().optional(),
  min_order_quantity: Joi.number().positive().optional(),
  base_price: Joi.number().positive().required(),
  cost_price: Joi.number().positive().optional(),
  markup_percentage: Joi.number().min(0).optional(),
  currency_code: Joi.string().length(3).optional(),
  tax_class: Joi.string().max(50).optional(),
  tax_rate: Joi.number().min(0).max(100).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  specifications: Joi.object().optional(),
  custom_fields: Joi.object().optional(),
  seo_title: Joi.string().max(255).optional(),
  seo_description: Joi.string().max(500).optional(),
  seo_keywords: Joi.string().max(255).optional(),
  launch_date: Joi.date().optional(),
  discontinue_date: Joi.date().optional()
});

const createCategorySchema = Joi.object({
  parent_category_id: Joi.number().optional(),
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(1000).optional(),
  image_url: Joi.string().uri().optional(),
  is_active: Joi.boolean().optional(),
  sort_order: Joi.number().min(0).optional(),
  metadata: Joi.object().optional()
});

const createBundleSchema = Joi.object({
  bundle_name: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(1000).optional(),
  bundle_type: Joi.string().valid('fixed', 'dynamic').required(),
  discount_type: Joi.string().valid('percentage', 'fixed').optional(),
  discount_value: Joi.number().min(0).optional(),
  is_active: Joi.boolean().optional(),
  items: Joi.array().items(
    Joi.object({
      product_id: Joi.number().required(),
      quantity: Joi.number().positive().required(),
      is_optional: Joi.boolean().optional(),
      sort_order: Joi.number().min(0).optional()
    })
  ).min(1).required()
});

@injectable()
export class ProductController {
  constructor(
    @inject(TYPES.ProductCatalogService) private catalogService: ProductCatalogService,
    @inject(TYPES.ProductRepository) private productRepository: ProductRepository,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  /**
   * POST /api/crm/products
   * Create a new product
   */
  async createProduct(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = createProductSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const company_id = req.user?.company_id;
      const created_by = req.user?.user_id;

      if (!company_id) {
        res.status(400).json({ error: 'Company ID is required' });
        return;
      }

      const product: Product = {
        ...value,
        company_id,
        created_by,
        updated_by: created_by
      };

      const specifications = req.body.specifications_list as ProductSpecification[];
      const media = req.body.media_list as ProductMedia[];

      const createdProduct = await this.catalogService.createProductComplete(
        product,
        specifications,
        media
      );

      res.status(201).json({
        success: true,
        data: createdProduct,
        message: 'Product created successfully'
      });

    } catch (error) {
      this.logger.error('Error creating product', { error, body: req.body });
      res.status(500).json({
        error: 'Failed to create product',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/crm/products/:id
   * Get product by ID with all details
   */
  async getProduct(req: Request, res: Response): Promise<void> {
    try {
      const product_id = parseInt(req.params.id);

      if (!product_id || isNaN(product_id)) {
        res.status(400).json({ error: 'Invalid product ID' });
        return;
      }

      const product = await this.catalogService.getProductDetails(product_id);

      if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      res.status(200).json({
        success: true,
        data: product,
        message: 'Product retrieved successfully'
      });

    } catch (error) {
      this.logger.error('Error getting product', { error, product_id: req.params.id });
      res.status(500).json({
        error: 'Failed to get product',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * PUT /api/crm/products/:id
   * Update product
   */
  async updateProduct(req: Request, res: Response): Promise<void> {
    try {
      const product_id = parseInt(req.params.id);

      if (!product_id || isNaN(product_id)) {
        res.status(400).json({ error: 'Invalid product ID' });
        return;
      }

      const updated_by = req.user?.user_id;
      const updates = {
        ...req.body,
        updated_by
      };

      const product = await this.productRepository.update(product_id, updates);

      res.status(200).json({
        success: true,
        data: product,
        message: 'Product updated successfully'
      });

    } catch (error) {
      this.logger.error('Error updating product', { error, product_id: req.params.id });
      res.status(500).json({
        error: 'Failed to update product',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/crm/products
   * Search products with filters
   */
  async searchProducts(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.company_id;
      if (!company_id) {
        res.status(400).json({ error: 'Company ID is required' });
        return;
      }

      const filter: ProductFilter & {
        specifications?: Record<string, string>;
        has_media?: boolean;
        bundle_only?: boolean;
      } = {
        company_id,
        category_id: req.query.category_id ? parseInt(req.query.category_id as string) : undefined,
        is_active: req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined,
        product_type: req.query.product_type as string,
        search: req.query.search as string,
        min_price: req.query.min_price ? parseFloat(req.query.min_price as string) : undefined,
        max_price: req.query.max_price ? parseFloat(req.query.max_price as string) : undefined,
        in_stock: req.query.in_stock === 'true',
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
        sort_by: req.query.sort_by as string || 'name',
        sort_order: req.query.sort_order as 'ASC' | 'DESC' || 'ASC',
        has_media: req.query.has_media === 'true',
        bundle_only: req.query.bundle_only === 'true'
      };

      // Parse specifications filter
      if (req.query.specifications) {
        try {
          filter.specifications = JSON.parse(req.query.specifications as string);
        } catch (e) {
          res.status(400).json({ error: 'Invalid specifications format' });
          return;
        }
      }

      const result = await this.catalogService.searchProducts(filter);

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: {
          total: result.total,
          limit: filter.limit,
          offset: filter.offset,
          pages: Math.ceil(result.total / (filter.limit || 20))
        },
        message: 'Products retrieved successfully'
      });

    } catch (error) {
      this.logger.error('Error searching products', { error, query: req.query });
      res.status(500).json({
        error: 'Failed to search products',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /api/crm/products/:id/inventory
   * Update product inventory
   */
  async updateInventory(req: Request, res: Response): Promise<void> {
    try {
      const product_id = parseInt(req.params.id);

      if (!product_id || isNaN(product_id)) {
        res.status(400).json({ error: 'Invalid product ID' });
        return;
      }

      const { quantity_change, movement_type, reference_type, reference_id, notes } = req.body;

      if (!quantity_change || !movement_type) {
        res.status(400).json({ error: 'quantity_change and movement_type are required' });
        return;
      }

      await this.catalogService.updateInventory(product_id, quantity_change, {
        company_id: req.user?.company_id!,
        movement_type,
        reference_type,
        reference_id,
        notes,
        created_by: req.user?.user_id
      });

      res.status(200).json({
        success: true,
        message: 'Inventory updated successfully'
      });

    } catch (error) {
      this.logger.error('Error updating inventory', { error, product_id: req.params.id });
      res.status(500).json({
        error: 'Failed to update inventory',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/crm/products/:id/inventory/movements
   * Get inventory movements for product
   */
  async getInventoryMovements(req: Request, res: Response): Promise<void> {
    try {
      const product_id = parseInt(req.params.id);

      if (!product_id || isNaN(product_id)) {
        res.status(400).json({ error: 'Invalid product ID' });
        return;
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      const movements = await this.catalogService.getInventoryMovements(
        req.user?.company_id!,
        product_id,
        limit
      );

      res.status(200).json({
        success: true,
        data: movements,
        message: 'Inventory movements retrieved successfully'
      });

    } catch (error) {
      this.logger.error('Error getting inventory movements', { error, product_id: req.params.id });
      res.status(500).json({
        error: 'Failed to get inventory movements',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /api/crm/products/:id/specifications
   * Add product specification
   */
  async addSpecification(req: Request, res: Response): Promise<void> {
    try {
      const product_id = parseInt(req.params.id);

      if (!product_id || isNaN(product_id)) {
        res.status(400).json({ error: 'Invalid product ID' });
        return;
      }

      const spec: ProductSpecification = {
        company_id: req.user?.company_id!,
        product_id,
        spec_name: req.body.spec_name,
        spec_value: req.body.spec_value,
        spec_group: req.body.spec_group,
        is_searchable: req.body.is_searchable || false,
        sort_order: req.body.sort_order || 0
      };

      const createdSpec = await this.catalogService.addSpecification(spec);

      res.status(201).json({
        success: true,
        data: createdSpec,
        message: 'Specification added successfully'
      });

    } catch (error) {
      this.logger.error('Error adding specification', { error, product_id: req.params.id });
      res.status(500).json({
        error: 'Failed to add specification',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /api/crm/products/:id/media
   * Add product media
   */
  async addMedia(req: Request, res: Response): Promise<void> {
    try {
      const product_id = parseInt(req.params.id);

      if (!product_id || isNaN(product_id)) {
        res.status(400).json({ error: 'Invalid product ID' });
        return;
      }

      const media: ProductMedia = {
        company_id: req.user?.company_id!,
        product_id,
        media_type: req.body.media_type,
        media_url: req.body.media_url,
        title: req.body.title,
        alt_text: req.body.alt_text,
        is_primary: req.body.is_primary || false,
        sort_order: req.body.sort_order || 0
      };

      const createdMedia = await this.catalogService.addMedia(media);

      res.status(201).json({
        success: true,
        data: createdMedia,
        message: 'Media added successfully'
      });

    } catch (error) {
      this.logger.error('Error adding media', { error, product_id: req.params.id });
      res.status(500).json({
        error: 'Failed to add media',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * DELETE /api/crm/products/:id
   * Delete product
   */
  async deleteProduct(req: Request, res: Response): Promise<void> {
    try {
      const product_id = parseInt(req.params.id);

      if (!product_id || isNaN(product_id)) {
        res.status(400).json({ error: 'Invalid product ID' });
        return;
      }

      const deleted = await this.productRepository.delete(product_id);

      if (!deleted) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Product deleted successfully'
      });

    } catch (error) {
      this.logger.error('Error deleting product', { error, product_id: req.params.id });
      res.status(500).json({
        error: 'Failed to delete product',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/crm/products/categories
   * Get category tree
   */
  async getCategoryTree(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.company_id;
      if (!company_id) {
        res.status(400).json({ error: 'Company ID is required' });
        return;
      }

      const include_counts = req.query.include_counts === 'true';

      const tree = await this.catalogService.getCategoryTree(company_id, include_counts);

      res.status(200).json({
        success: true,
        data: tree,
        message: 'Category tree retrieved successfully'
      });

    } catch (error) {
      this.logger.error('Error getting category tree', { error });
      res.status(500).json({
        error: 'Failed to get category tree',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /api/crm/products/categories
   * Create product category
   */
  async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = createCategorySchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const category: ProductCategory = {
        ...value,
        company_id: req.user?.company_id!,
        is_active: value.is_active !== false,
        sort_order: value.sort_order || 0
      };

      const createdCategory = await this.catalogService.createCategory(category);

      res.status(201).json({
        success: true,
        data: createdCategory,
        message: 'Category created successfully'
      });

    } catch (error) {
      this.logger.error('Error creating category', { error, body: req.body });
      res.status(500).json({
        error: 'Failed to create category',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /api/crm/products/bundles
   * Create product bundle
   */
  async createBundle(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = createBundleSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const bundle: ProductBundle = {
        ...value,
        company_id: req.user?.company_id!,
        is_active: value.is_active !== false
      };

      const createdBundle = await this.catalogService.createBundle(bundle);

      res.status(201).json({
        success: true,
        data: createdBundle,
        message: 'Bundle created successfully'
      });

    } catch (error) {
      this.logger.error('Error creating bundle', { error, body: req.body });
      res.status(500).json({
        error: 'Failed to create bundle',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/crm/products/bundles/:id
   * Get bundle with items
   */
  async getBundle(req: Request, res: Response): Promise<void> {
    try {
      const bundle_id = parseInt(req.params.id);

      if (!bundle_id || isNaN(bundle_id)) {
        res.status(400).json({ error: 'Invalid bundle ID' });
        return;
      }

      const bundle = await this.catalogService.getBundleWithItems(bundle_id);

      if (!bundle) {
        res.status(404).json({ error: 'Bundle not found' });
        return;
      }

      res.status(200).json({
        success: true,
        data: bundle,
        message: 'Bundle retrieved successfully'
      });

    } catch (error) {
      this.logger.error('Error getting bundle', { error, bundle_id: req.params.id });
      res.status(500).json({
        error: 'Failed to get bundle',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/crm/products/low-stock
   * Get low stock products
   */
  async getLowStockProducts(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.company_id;
      if (!company_id) {
        res.status(400).json({ error: 'Company ID is required' });
        return;
      }

      const products = await this.productRepository.getLowStockProducts(company_id);

      res.status(200).json({
        success: true,
        data: products,
        message: 'Low stock products retrieved successfully'
      });

    } catch (error) {
      this.logger.error('Error getting low stock products', { error });
      res.status(500).json({
        error: 'Failed to get low stock products',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}