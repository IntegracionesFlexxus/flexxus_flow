import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { IPromotionService } from '../interfaces/IPromotionService';
import { AppError } from '../../../../../shared/errors/AppError';

@injectable()
export class PromotionController {
  constructor(
    @inject(TYPES.PromotionService)
    private promotionService: IPromotionService
  ) {}

  async create(req: Request, res: Response): Promise<Response> {
    try {
      const promotionData = {
        ...req.body,
        company_id: req.user?.companyId || 1,
        created_by: req.user?.id
      };

      const promotion = await this.promotionService.createPromotion(promotionData);

      return res.status(201).json({
        success: true,
        data: promotion,
        message: 'Promotion created successfully'
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
      const promotionData = {
        ...req.body,
        updated_by: req.user?.id
      };

      const promotion = await this.promotionService.updatePromotion(
        Number(id),
        promotionData
      );

      return res.status(200).json({
        success: true,
        data: promotion,
        message: 'Promotion updated successfully'
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

      await this.promotionService.deletePromotion(Number(id));

      return res.status(200).json({
        success: true,
        message: 'Promotion deleted successfully'
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

  async getById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      const promotion = await this.promotionService.getPromotionById(Number(id));

      if (!promotion) {
        return res.status(404).json({
          success: false,
          message: 'Promotion not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: promotion
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getByCode(req: Request, res: Response): Promise<Response> {
    try {
      const { code } = req.params;

      const promotion = await this.promotionService.getPromotionByCode(code);

      if (!promotion) {
        return res.status(404).json({
          success: false,
          message: 'Promotion not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: promotion
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getActive(req: Request, res: Response): Promise<Response> {
    try {
      const filters = {
        target_type: req.query.target_type as string,
        product_id: req.query.product_id ? Number(req.query.product_id) : undefined
      };

      const promotions = await this.promotionService.getActivePromotions(filters);

      return res.status(200).json({
        success: true,
        data: promotions,
        total: promotions.length
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async validate(req: Request, res: Response): Promise<Response> {
    try {
      const { code, context } = req.body;

      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Promotion code is required'
        });
      }

      const result = await this.promotionService.validatePromotion(code, context);

      return res.status(200).json({
        success: true,
        data: result
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

  async applyToQuote(req: Request, res: Response): Promise<Response> {
    try {
      const { quoteId } = req.params;
      const { promotionCode } = req.body;

      if (!promotionCode) {
        return res.status(400).json({
          success: false,
          message: 'Promotion code is required'
        });
      }

      const result = await this.promotionService.applyPromotionToQuote(
        Number(quoteId),
        promotionCode
      );

      return res.status(200).json({
        success: true,
        data: result,
        message: 'Promotion applied successfully'
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

  async getUsage(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      const usage = await this.promotionService.getPromotionUsage(Number(id));

      return res.status(200).json({
        success: true,
        data: usage
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}