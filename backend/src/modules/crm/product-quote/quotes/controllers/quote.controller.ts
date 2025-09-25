import { Request, Response } from 'express';
import { injectable, inject } from 'tsyringe';
import { IQuoteService } from '../interfaces/IQuoteService';
import { QuoteInput, QuoteFilters } from '../../../types/quote.types';
import { AppError } from '../../../../../shared/errors/AppError';

@injectable()
export class QuoteController {
  constructor(
    @inject('QuoteService')
    private quoteService: IQuoteService
  ) {}

  async create(req: Request, res: Response): Promise<Response> {
    try {
      const quoteData: QuoteInput = req.body;
      quoteData.company_id = req.user?.company_id || 1;
      quoteData.created_by = req.user?.user_id;
      quoteData.salesperson_id = req.user?.user_id;

      const quote = await this.quoteService.create(quoteData);
      
      return res.status(201).json({
        success: true,
        data: quote,
        message: 'Quote created successfully'
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
      const quoteData: Partial<QuoteInput> = req.body;
      quoteData.updated_by = req.user?.user_id;

      const quote = await this.quoteService.update(Number(id), quoteData);
      
      return res.status(200).json({
        success: true,
        data: quote,
        message: 'Quote updated successfully'
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
      
      await this.quoteService.delete(Number(id));
      
      return res.status(200).json({
        success: true,
        message: 'Quote deleted successfully'
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
      
      const quote = await this.quoteService.findById(Number(id));
      
      if (!quote) {
        return res.status(404).json({
          success: false,
          message: 'Quote not found'
        });
      }
      
      return res.status(200).json({
        success: true,
        data: quote
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

  async findByNumber(req: Request, res: Response): Promise<Response> {
    try {
      const { number } = req.params;
      
      const quote = await this.quoteService.findByNumber(number);
      
      if (!quote) {
        return res.status(404).json({
          success: false,
          message: 'Quote not found'
        });
      }
      
      return res.status(200).json({
        success: true,
        data: quote
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
      const filters: QuoteFilters = {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 10,
        search: req.query.search as string,
        customer_id: req.query.customer_id ? Number(req.query.customer_id) : undefined,
        status: req.query.status as string,
        date_from: req.query.date_from ? new Date(req.query.date_from as string) : undefined,
        date_to: req.query.date_to ? new Date(req.query.date_to as string) : undefined,
        sortBy: req.query.sortBy as string || 'created_at',
        sortOrder: req.query.sortOrder as 'ASC' | 'DESC' || 'DESC'
      };
      
      const result = await this.quoteService.findAll(filters);
      
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

  async addItem(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const itemData = req.body;
      
      const quote = await this.quoteService.addItem(Number(id), itemData);
      
      return res.status(200).json({
        success: true,
        data: quote,
        message: 'Item added successfully'
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

  async removeItem(req: Request, res: Response): Promise<Response> {
    try {
      const { id, itemId } = req.params;
      
      const quote = await this.quoteService.removeItem(Number(id), Number(itemId));
      
      return res.status(200).json({
        success: true,
        data: quote,
        message: 'Item removed successfully'
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

  async updateStatus(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const quote = await this.quoteService.updateStatus(Number(id), status);
      
      return res.status(200).json({
        success: true,
        data: quote,
        message: 'Status updated successfully'
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

  async convertToOrder(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      
      const order = await this.quoteService.convertToOrder(Number(id));
      
      return res.status(200).json({
        success: true,
        data: order,
        message: 'Quote converted to order successfully'
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

  async duplicate(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      
      const quote = await this.quoteService.duplicate(Number(id));
      
      return res.status(201).json({
        success: true,
        data: quote,
        message: 'Quote duplicated successfully'
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
      const { id } = req.params;
      const { promotionCode } = req.body;
      
      // Este método debería estar en el servicio de pricing
      // pero lo agregamos aquí para la funcionalidad completa
      const result = await this.quoteService.applyPromotion?.(Number(id), promotionCode);
      
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
}