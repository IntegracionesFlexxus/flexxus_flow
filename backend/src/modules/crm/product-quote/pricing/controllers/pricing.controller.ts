import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { PricingServiceImpl } from '../services/PricingServiceImpl';
import { AppError } from '../../../../../shared/errors/AppError';

@injectable()
export class PricingController {
  constructor(
    @inject(TYPES.PricingService) private pricingService: PricingServiceImpl,
    @inject(TYPES.Logger) private logger: any
  ) {}

  async calculateItemPrice(req: Request, res: Response): Promise<Response> {
    try {
      const { productId, quantity, customerId, options } = req.body;

      if (!productId || !quantity) {
        return res.status(400).json({
          success: false,
          message: 'Product ID and quantity are required'
        });
      }

      const result = await this.pricingService.calculateItemPrice(
        productId,
        quantity,
        customerId,
        options
      );

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

  async getBestPrice(req: Request, res: Response): Promise<Response> {
    try {
      const { productId, customerId, quantity } = req.query;

      if (!productId || !customerId || !quantity) {
        return res.status(400).json({
          success: false,
          message: 'Product ID, customer ID, and quantity are required'
        });
      }

      const price = await this.pricingService.getBestPrice(
        Number(productId),
        Number(customerId),
        Number(quantity)
      );

      return res.status(200).json({
        success: true,
        data: {
          product_id: productId,
          customer_id: customerId,
          quantity: quantity,
          best_price: price
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

  async applyPromotion(req: Request, res: Response): Promise<Response> {
    try {
      const { quoteId } = req.params;
      const { promotionCode } = req.body;

      if (!promotionCode) {
        return res.status(400).json({
          success: false,
          message: 'Promotion code is required'
        });
      }

      const result = await this.pricingService.applyPromotion(
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

  async validatePricing(req: Request, res: Response): Promise<Response> {
    try {
      const { quoteId } = req.params;

      const isValid = await this.pricingService.validatePricing(Number(quoteId));

      return res.status(200).json({
        success: true,
        data: {
          quote_id: quoteId,
          is_valid: isValid
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

  async bulkCalculatePrices(req: Request, res: Response): Promise<Response> {
    try {
      const { items, customerId } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Items array is required'
        });
      }

      const results = await Promise.all(
        items.map(item =>
          this.pricingService.calculateItemPrice(
            item.productId,
            item.quantity,
            customerId
          )
        )
      );

      return res.status(200).json({
        success: true,
        data: results
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