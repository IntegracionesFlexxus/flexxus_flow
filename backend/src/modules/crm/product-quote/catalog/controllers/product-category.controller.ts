import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { IProductCategoryService } from '../interfaces/IProductCategoryService';
import { AppError } from '../../../../../shared/errors/AppError';

@injectable()
export class ProductCategoryController {
  constructor(
    @inject(TYPES.ProductCategoryService)
    private categoryService: IProductCategoryService
  ) {}

  async create(req: Request, res: Response): Promise<Response> {
    try {
      const categoryData = {
        ...req.body,
        company_id: req.user?.company_id || 1,
        created_by: req.user?.user_id
      };

      const category = await this.categoryService.create(categoryData);

      return res.status(201).json({
        success: true,
        data: category,
        message: 'Category created successfully'
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
      const categoryData = {
        ...req.body,
        updated_by: req.user?.user_id
      };

      const category = await this.categoryService.update(Number(id), categoryData);

      return res.status(200).json({
        success: true,
        data: category,
        message: 'Category updated successfully'
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

      await this.categoryService.delete(Number(id));

      return res.status(200).json({
        success: true,
        message: 'Category deleted successfully'
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

      const category = await this.categoryService.findById(Number(id));

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: category
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async findAll(req: Request, res: Response): Promise<Response> {
    try {
      const includeInactive = req.query.include_inactive === 'true';

      const categories = await this.categoryService.findAll(includeInactive);

      return res.status(200).json({
        success: true,
        data: categories,
        total: categories.length
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getHierarchy(req: Request, res: Response): Promise<Response> {
    try {
      const hierarchy = await this.categoryService.getHierarchy();

      return res.status(200).json({
        success: true,
        data: hierarchy
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getChildren(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      const children = await this.categoryService.getChildren(Number(id));

      return res.status(200).json({
        success: true,
        data: children,
        total: children.length
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async moveCategory(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { newParentId } = req.body;

      const category = await this.categoryService.moveCategory(
        Number(id),
        newParentId ? Number(newParentId) : null
      );

      return res.status(200).json({
        success: true,
        data: category,
        message: 'Category moved successfully'
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