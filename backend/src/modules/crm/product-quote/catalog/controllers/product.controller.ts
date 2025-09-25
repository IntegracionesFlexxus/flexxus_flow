import { Request, Response } from 'express';
import { injectable, inject } from 'tsyringe';
import { IProductService } from '../interfaces/IProductService';
import { ProductInput, ProductFilters } from '../../../types/product.types';
import { AppError } from '../../../../../shared/errors/AppError';

@injectable()
export class ProductController {
  constructor(
    @inject('ProductService')
    private productService: IProductService
  ) {}

  async create(req: Request, res: Response): Promise<Response> {
    try {
      const productData: ProductInput = req.body;
      productData.company_id = req.user?.company_id || 1;
      productData.created_by = req.user?.user_id;

      const product = await this.productService.create(productData);
      
      return res.status(201).json({
        success: true,
        data: product,
        message: 'Product created successfully'
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      }
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async update(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const productData: Partial<ProductInput> = req.body;
      productData.updated_by = req.user?.user_id;

      const product = await this.productService.update(Number(id), productData);
      
      return res.status(200).json({
        success: true,
        data: product,
        message: 'Product updated successfully'
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      }
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async delete(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      
      await this.productService.delete(Number(id));
      
      return res.status(200).json({
        success: true,
        message: 'Product deleted successfully'
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      }
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async findById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      
      const product = await this.productService.findById(Number(id));
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      return res.status(200).json({
        success: true,
        data: product
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      }
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async findBySKU(req: Request, res: Response): Promise<Response> {
    try {
      const { sku } = req.params;
      
      const product = await this.productService.findBySKU(sku);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      return res.status(200).json({
        success: true,
        data: product
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      }
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async findAll(req: Request, res: Response): Promise<Response> {
    try {
      const filters: ProductFilters = {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 10,
        search: req.query.search as string,
        category_id: req.query.category_id ? Number(req.query.category_id) : undefined,
        is_active: req.query.is_active === 'true',
        sortBy: req.query.sortBy as string || 'created_at',
        sortOrder: req.query.sortOrder as 'ASC' | 'DESC' || 'DESC'
      };
      
      const result = await this.productService.findAll(filters);
      
      return res.status(200).json({
        success: true,
        data: result.data,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      }
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async updateStock(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { quantity, operation } = req.body;
      
      if (!['add', 'subtract'].includes(operation)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid operation. Must be "add" or "subtract"'
        });
      }
      
      const product = await this.productService.updateStock(
        Number(id),
        Number(quantity),
        operation as 'add' | 'subtract'
      );
      
      return res.status(200).json({
        success: true,
        data: product,
        message: 'Stock updated successfully'
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      }
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async bulkUpdatePrices(req: Request, res: Response): Promise<Response> {
    try {
      const { updates } = req.body;
      
      if (!Array.isArray(updates)) {
        return res.status(400).json({
          success: false,
          message: 'Updates must be an array'
        });
      }
      
      await this.productService.bulkUpdatePrices(updates);
      
      return res.status(200).json({
        success: true,
        message: 'Prices updated successfully'
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      }
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getInventoryStatus(req: Request, res: Response): Promise<Response> {
    try {
      const status = await this.productService.getInventoryStatus();
      
      return res.status(200).json({
        success: true,
        data: status
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      }
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}