/**
 * Quote Controller - Sprint 20 Implementation
 * Conecta QuoteRepository con QuoteServiceImpl
 */

import 'reflect-metadata';
import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { body, param, query, validationResult } from 'express-validator';
import { QuoteRepository } from '../repositories/QuoteRepository';
import { QuoteServiceImpl } from '../services/QuoteServiceImpl';
import {
  CreateQuoteDto,
  UpdateQuoteDto,
  QuoteSearchParams
} from '../../shared/interfaces/quote.interfaces';

@injectable()
export class QuoteController {
  constructor(
    @inject(TYPES.QuoteRepository) private quoteRepository: QuoteRepository,
    @inject(TYPES.QuoteService) private quoteService: QuoteServiceImpl,
    @inject(TYPES.Logger) private logger: any
  ) {}

  /**
   * Crear nueva cotización
   * POST /api/crm/quotes
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

      const quoteData: CreateQuoteDto = req.body;
      quoteData.created_by = req.user?.id || 1;
      quoteData.updated_by = req.user?.id || 1;

      // Usar QuoteService para lógica de negocio y cálculos
      const quote = await this.quoteService.createQuote(quoteData as any);

      res.status(201).json({
        success: true,
        message: 'Quote created successfully',
        data: quote
      });
    } catch (error: any) {
      this.logger.error('Error creating quote:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Obtener cotización por ID
   * GET /api/crm/quotes/:id
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

      const quoteId = parseInt(req.params.id);
      const quote = await this.quoteService.getQuoteById(quoteId);

      if (!quote) {
        res.status(404).json({
          success: false,
          message: 'Quote not found'
        });
        return;
      }

      res.json({
        success: true,
        data: quote
      });
    } catch (error: any) {
      this.logger.error('Error getting quote:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Obtener cotización por número
   * GET /api/crm/quotes/number/:number
   */
  async getByNumber(req: Request, res: Response): Promise<void> {
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

      const quoteNumber = req.params.number;
      const quote = await this.quoteService.getQuoteByNumber(quoteNumber);

      if (!quote) {
        res.status(404).json({
          success: false,
          message: 'Quote not found'
        });
        return;
      }

      res.json({
        success: true,
        data: quote
      });
    } catch (error: any) {
      this.logger.error('Error getting quote by number:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Búsqueda de cotizaciones con filtros
   * GET /api/crm/quotes/search
   */
  async search(req: Request, res: Response): Promise<void> {
    try {
      const searchParams: QuoteSearchParams = {
        query: req.query.q as string,
        customerId: req.query.customerId ? parseInt(req.query.customerId as string) : undefined,
        opportunityId: req.query.opportunityId ? parseInt(req.query.opportunityId as string) : undefined,
        status: req.query.status ? (req.query.status as string).split(',') : undefined,
        type: req.query.type ? (req.query.type as string).split(',') : undefined,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        validUntilFrom: req.query.validUntilFrom as string,
        validUntilTo: req.query.validUntilTo as string,
        minAmount: req.query.minAmount ? parseFloat(req.query.minAmount as string) : undefined,
        maxAmount: req.query.maxAmount ? parseFloat(req.query.maxAmount as string) : undefined,
        createdBy: req.query.createdBy ? parseInt(req.query.createdBy as string) : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        sortBy: req.query.sortBy as string || 'created_at',
        sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'desc'
      };

      const result = await this.quoteService.searchQuotes(searchParams);

      res.json({
        success: true,
        data: result.quotes,
        meta: {
          total: result.total,
          page: searchParams.page,
          limit: searchParams.limit,
          totalPages: Math.ceil(result.total / searchParams.limit),
          statistics: result.statistics
        }
      });
    } catch (error: any) {
      this.logger.error('Error searching quotes:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Actualizar cotización
   * PUT /api/crm/quotes/:id
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

      const quoteId = parseInt(req.params.id);
      const updateData: UpdateQuoteDto = req.body;
      updateData.updated_by = req.user?.id || 1;

      const quote = await this.quoteService.updateQuote(quoteId, updateData);

      res.json({
        success: true,
        message: 'Quote updated successfully',
        data: quote
      });
    } catch (error: any) {
      this.logger.error('Error updating quote:', error);

      if (error.message === 'Quote not found') {
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
   * Eliminar cotización
   * DELETE /api/crm/quotes/:id
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

      const quoteId = parseInt(req.params.id);
      const deleted = await this.quoteService.deleteQuote(quoteId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Quote not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Quote deleted successfully'
      });
    } catch (error: any) {
      this.logger.error('Error deleting quote:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Duplicar cotización
   * POST /api/crm/quotes/:id/duplicate
   */
  async duplicate(req: Request, res: Response): Promise<void> {
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

      const quoteId = parseInt(req.params.id);
      const { quote_number } = req.body;
      const userId = req.user?.id || 1;

      const duplicatedQuote = await this.quoteService.duplicateQuote(quoteId, quote_number, userId);

      res.status(201).json({
        success: true,
        message: 'Quote duplicated successfully',
        data: duplicatedQuote
      });
    } catch (error: any) {
      this.logger.error('Error duplicating quote:', error);

      if (error.message === 'Quote not found') {
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
   * Calcular totales de cotización
   * POST /api/crm/quotes/calculate
   */
  async calculate(req: Request, res: Response): Promise<void> {
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

      const { quote_id } = req.body;
      const calculations = await this.quoteService.calculateQuoteTotals(quote_id);

      res.json({
        success: true,
        data: calculations
      });
    } catch (error: any) {
      this.logger.error('Error calculating quote:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Generar PDF de cotización
   * GET /api/crm/quotes/:id/pdf
   */
  async generatePdf(req: Request, res: Response): Promise<void> {
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

      const quoteId = parseInt(req.params.id);
      const template = req.query.template as string || 'standard';

      const pdfBuffer = await this.quoteService.generateQuotePDF(quoteId, template);

      // Configurar headers para descarga PDF
      const quote = await this.quoteService.getQuoteById(quoteId);
      const filename = `quote_${quote?.quote_number || quoteId}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      res.send(pdfBuffer);
    } catch (error: any) {
      this.logger.error('Error generating PDF:', error);

      if (error.message === 'Quote not found') {
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
   * Enviar cotización por email
   * POST /api/crm/quotes/:id/send
   */
  async sendEmail(req: Request, res: Response): Promise<void> {
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

      const quoteId = parseInt(req.params.id);
      const { recipients, subject, message, include_pdf } = req.body;

      await this.quoteService.sendQuoteEmail(quoteId, {
        recipients,
        subject,
        message,
        include_pdf: include_pdf !== false
      });

      res.json({
        success: true,
        message: 'Quote sent successfully'
      });
    } catch (error: any) {
      this.logger.error('Error sending quote:', error);

      if (error.message === 'Quote not found') {
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
   * Obtener historial de versiones
   * GET /api/crm/quotes/:id/versions
   */
  async getVersionHistory(req: Request, res: Response): Promise<void> {
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

      const quoteId = parseInt(req.params.id);
      const versions = await this.quoteRepository.getVersionHistory(quoteId);

      res.json({
        success: true,
        data: versions
      });
    } catch (error: any) {
      this.logger.error('Error getting version history:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Solicitar aprobación
   * POST /api/crm/quotes/:id/approval
   */
  async requestApproval(req: Request, res: Response): Promise<void> {
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

      const quoteId = parseInt(req.params.id);
      const { workflow_id, reason, comments } = req.body;
      const userId = req.user?.id || 1;

      const approvalRequest = await this.quoteService.requestApproval(quoteId, {
        workflow_id,
        reason,
        comments,
        requested_by: userId
      });

      res.status(201).json({
        success: true,
        message: 'Approval request created successfully',
        data: approvalRequest
      });
    } catch (error: any) {
      this.logger.error('Error requesting approval:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Procesar aprobación
   * POST /api/crm/quotes/:id/approval/:approvalId/respond
   */
  async processApproval(req: Request, res: Response): Promise<void> {
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

      const quoteId = parseInt(req.params.id);
      const approvalId = parseInt(req.params.approvalId);
      const { status, comments } = req.body;
      const userId = req.user?.id || 1;

      await this.quoteService.processApproval(approvalId, {
        status,
        comments,
        approved_by: userId
      });

      res.json({
        success: true,
        message: 'Approval processed successfully'
      });
    } catch (error: any) {
      this.logger.error('Error processing approval:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Obtener estadísticas de cotizaciones
   * GET /api/crm/quotes/stats
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const dateFrom = req.query.dateFrom as string;
      const dateTo = req.query.dateTo as string;
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;

      const stats = await this.quoteService.getQuoteStatistics({
        dateFrom,
        dateTo,
        userId
      });

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      this.logger.error('Error getting quote stats:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Exportar cotizaciones
   * GET /api/crm/quotes/export
   */
  async export(req: Request, res: Response): Promise<void> {
    try {
      const format = req.query.format as string || 'csv';
      const filters: QuoteSearchParams = {
        status: req.query.status ? (req.query.status as string).split(',') : undefined,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        customerId: req.query.customerId ? parseInt(req.query.customerId as string) : undefined
      };

      const exportData = await this.quoteService.exportQuotes(filters, format);

      // Configurar headers para descarga
      const filename = `quotes_export_${new Date().toISOString().split('T')[0]}.${format}`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');

      res.send(exportData);
    } catch (error: any) {
      this.logger.error('Error exporting quotes:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }
}

/**
 * Validadores para las rutas de cotizaciones
 */
export const quoteValidators = {
  create: [
    body('quote_number')
      .notEmpty()
      .withMessage('Quote number is required')
      .isLength({ min: 2, max: 50 })
      .withMessage('Quote number must be between 2 and 50 characters'),
    body('customer_id')
      .isInt({ min: 1 })
      .withMessage('Customer ID must be a positive integer'),
    body('currency')
      .optional()
      .isLength({ min: 3, max: 3 })
      .withMessage('Currency must be 3 characters'),
    body('type')
      .optional()
      .isIn(['standard', 'custom', 'proposal'])
      .withMessage('Type must be standard, custom, or proposal'),
    body('status')
      .optional()
      .isIn(['draft', 'pending', 'sent', 'approved', 'rejected', 'expired', 'cancelled'])
      .withMessage('Invalid status'),
    body('items')
      .optional()
      .isArray()
      .withMessage('Items must be an array'),
    body('items.*.product_id')
      .if(body('items').exists())
      .isInt({ min: 1 })
      .withMessage('Product ID must be a positive integer'),
    body('items.*.quantity')
      .if(body('items').exists())
      .isFloat({ min: 0.01 })
      .withMessage('Quantity must be greater than 0'),
    body('items.*.unit_price')
      .if(body('items').exists())
      .isFloat({ min: 0 })
      .withMessage('Unit price must be non-negative')
  ],

  update: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Quote ID must be a positive integer'),
    body('status')
      .optional()
      .isIn(['draft', 'pending', 'sent', 'approved', 'rejected', 'expired', 'cancelled'])
      .withMessage('Invalid status')
  ],

  getById: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Quote ID must be a positive integer')
  ],

  getByNumber: [
    param('number')
      .notEmpty()
      .withMessage('Quote number is required')
      .isLength({ min: 2, max: 50 })
      .withMessage('Quote number must be between 2 and 50 characters')
  ],

  delete: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Quote ID must be a positive integer')
  ],

  duplicate: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Quote ID must be a positive integer'),
    body('quote_number')
      .notEmpty()
      .withMessage('New quote number is required')
      .isLength({ min: 2, max: 50 })
      .withMessage('Quote number must be between 2 and 50 characters')
  ],

  calculate: [
    body('items')
      .isArray({ min: 1 })
      .withMessage('Items array is required'),
    body('items.*.product_id')
      .isInt({ min: 1 })
      .withMessage('Product ID must be a positive integer'),
    body('items.*.quantity')
      .isFloat({ min: 0.01 })
      .withMessage('Quantity must be greater than 0'),
    body('customer_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Customer ID must be a positive integer'),
    body('currency')
      .optional()
      .isLength({ min: 3, max: 3 })
      .withMessage('Currency must be 3 characters')
  ],

  sendEmail: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Quote ID must be a positive integer'),
    body('recipients')
      .isArray({ min: 1 })
      .withMessage('Recipients array is required'),
    body('recipients.*')
      .isEmail()
      .withMessage('Each recipient must be a valid email'),
    body('subject')
      .notEmpty()
      .withMessage('Subject is required')
      .isLength({ max: 255 })
      .withMessage('Subject must be less than 255 characters'),
    body('message')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('Message must be less than 2000 characters')
  ],

  requestApproval: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Quote ID must be a positive integer'),
    body('workflow_id')
      .isInt({ min: 1 })
      .withMessage('Workflow ID must be a positive integer'),
    body('reason')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Reason must be less than 500 characters')
  ],

  processApproval: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Quote ID must be a positive integer'),
    param('approvalId')
      .isInt({ min: 1 })
      .withMessage('Approval ID must be a positive integer'),
    body('status')
      .isIn(['approved', 'rejected'])
      .withMessage('Status must be approved or rejected'),
    body('comments')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Comments must be less than 1000 characters')
  ]
};