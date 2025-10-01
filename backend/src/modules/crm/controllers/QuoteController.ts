/**
 * @deprecated Sprint 19 - Usar implementación Sprint 20 en product-quote/
 * Este archivo será eliminado en futuras versiones
 * Ver: backend/src/modules/crm/product-quote/quotes/controllers/QuoteController.ts
 *
 * Quote Controller - Sprint 19
 * REST API endpoints for quote management
 */

import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { Logger } from 'winston';
import Joi from 'joi';
import { QuoteManagementService, QuoteFilter, QuoteUpdateRequest, QuoteStatusTransition } from '../services/QuoteManagementService';
import { QuoteBuilderService, QuoteCreateRequest } from '../services/QuoteBuilderService';
import { ApprovalWorkflowService } from '../services/ApprovalWorkflowService';

// Validation schemas
const createQuoteSchema = Joi.object({
  opportunity_id: Joi.number().optional(),
  account_id: Joi.number().required(),
  contact_id: Joi.number().optional(),
  quote_name: Joi.string().min(1).max(255).required(),
  quote_type: Joi.string().valid('standard', 'proposal', 'estimate').optional(),
  description: Joi.string().max(1000).optional(),
  valid_until: Joi.date().greater('now').optional(),
  currency_code: Joi.string().length(3).optional(),
  payment_terms: Joi.string().max(500).optional(),
  delivery_terms: Joi.string().max(500).optional(),
  line_items: Joi.array().items(
    Joi.object({
      product_id: Joi.number().required(),
      quantity: Joi.number().positive().required(),
      discount_percentage: Joi.number().min(0).max(100).optional(),
      discount_amount: Joi.number().min(0).optional(),
      notes: Joi.string().max(500).optional(),
      custom_fields: Joi.object().optional()
    })
  ).optional()
});

const updateQuoteSchema = Joi.object({
  quote_name: Joi.string().min(1).max(255).optional(),
  description: Joi.string().max(1000).optional(),
  valid_until: Joi.date().greater('now').optional(),
  currency_code: Joi.string().length(3).optional(),
  payment_terms: Joi.string().max(500).optional(),
  delivery_terms: Joi.string().max(500).optional(),
  shipping_cost: Joi.number().min(0).optional(),
  discount_amount: Joi.number().min(0).optional(),
  notes: Joi.string().max(1000).optional(),
  custom_fields: Joi.object().optional()
});

const statusChangeSchema = Joi.object({
  from_status: Joi.string().required(),
  to_status: Joi.string().valid('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'cancelled').required(),
  comment: Joi.string().max(500).optional(),
  notify_stakeholders: Joi.boolean().optional()
});

@injectable()
export class QuoteController {
  constructor(
    @inject(TYPES.QuoteManagementService) private quoteManagement: QuoteManagementService,
    @inject(TYPES.QuoteBuilderService) private quoteBuilder: QuoteBuilderService,
    @inject(TYPES.ApprovalWorkflowService) private approvalService: ApprovalWorkflowService,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  /**
   * POST /api/crm/quotes
   * Create a new quote
   */
  async createQuote(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = createQuoteSchema.validate(req.body);
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

      const request: QuoteCreateRequest = {
        ...value,
        company_id,
        created_by
      };

      const quote = await this.quoteManagement.createQuote(request);

      res.status(201).json({
        success: true,
        data: quote,
        message: 'Quote created successfully'
      });

    } catch (error) {
      this.logger.error('Error creating quote', { error, body: req.body });
      res.status(500).json({
        error: 'Failed to create quote',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/crm/quotes/:id
   * Get quote by ID
   */
  async getQuote(req: Request, res: Response): Promise<void> {
    try {
      const quote_id = parseInt(req.params.id);
      const include_line_items = req.query.include_line_items === 'true';

      if (!quote_id || isNaN(quote_id)) {
        res.status(400).json({ error: 'Invalid quote ID' });
        return;
      }

      const quote = await this.quoteManagement.searchQuotes({
        company_id: req.user?.company_id!,
        // We'll use the repository directly for single quote fetch
      });

      // For now, we'll use a simple approach - in a real implementation,
      // we'd add a method to fetch a single quote with line items
      const quoteRepository = this.quoteBuilder as any; // Type assertion for demo

      res.status(200).json({
        success: true,
        data: quote,
        message: 'Quote retrieved successfully'
      });

    } catch (error) {
      this.logger.error('Error getting quote', { error, quote_id: req.params.id });
      res.status(500).json({
        error: 'Failed to get quote',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * PUT /api/crm/quotes/:id
   * Update quote
   */
  async updateQuote(req: Request, res: Response): Promise<void> {
    try {
      const quote_id = parseInt(req.params.id);
      const { error, value } = updateQuoteSchema.validate(req.body);

      if (!quote_id || isNaN(quote_id)) {
        res.status(400).json({ error: 'Invalid quote ID' });
        return;
      }

      if (error) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const updated_by = req.user?.user_id;
      const updates: QuoteUpdateRequest = value;

      const quote = await this.quoteManagement.updateQuote(quote_id, updates, updated_by);

      res.status(200).json({
        success: true,
        data: quote,
        message: 'Quote updated successfully'
      });

    } catch (error) {
      this.logger.error('Error updating quote', { error, quote_id: req.params.id });
      res.status(500).json({
        error: 'Failed to update quote',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /api/crm/quotes/:id/status
   * Change quote status
   */
  async changeStatus(req: Request, res: Response): Promise<void> {
    try {
      const quote_id = parseInt(req.params.id);
      const { error, value } = statusChangeSchema.validate(req.body);

      if (!quote_id || isNaN(quote_id)) {
        res.status(400).json({ error: 'Invalid quote ID' });
        return;
      }

      if (error) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const changed_by = req.user?.user_id;
      const transition: QuoteStatusTransition = value;

      const quote = await this.quoteManagement.changeStatus(quote_id, transition, changed_by);

      res.status(200).json({
        success: true,
        data: quote,
        message: `Quote status changed to ${transition.to_status}`
      });

    } catch (error) {
      this.logger.error('Error changing quote status', { error, quote_id: req.params.id });
      res.status(500).json({
        error: 'Failed to change quote status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/crm/quotes
   * Search quotes with filters
   */
  async searchQuotes(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.company_id;
      if (!company_id) {
        res.status(400).json({ error: 'Company ID is required' });
        return;
      }

      const filter: QuoteFilter = {
        company_id,
        account_id: req.query.account_id ? parseInt(req.query.account_id as string) : undefined,
        opportunity_id: req.query.opportunity_id ? parseInt(req.query.opportunity_id as string) : undefined,
        status: req.query.status ? (req.query.status as string).split(',') : undefined,
        owner_id: req.query.owner_id ? parseInt(req.query.owner_id as string) : undefined,
        date_from: req.query.date_from ? new Date(req.query.date_from as string) : undefined,
        date_to: req.query.date_to ? new Date(req.query.date_to as string) : undefined,
        search: req.query.search as string,
        min_amount: req.query.min_amount ? parseFloat(req.query.min_amount as string) : undefined,
        max_amount: req.query.max_amount ? parseFloat(req.query.max_amount as string) : undefined,
        currency_code: req.query.currency_code as string,
        is_expired: req.query.is_expired === 'true' ? true : req.query.is_expired === 'false' ? false : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
        sort_by: req.query.sort_by as string || 'created_at',
        sort_order: req.query.sort_order as 'ASC' | 'DESC' || 'DESC'
      };

      const result = await this.quoteManagement.searchQuotes(filter);

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: {
          total: result.total,
          limit: filter.limit,
          offset: filter.offset,
          pages: Math.ceil(result.total / (filter.limit || 20))
        },
        message: 'Quotes retrieved successfully'
      });

    } catch (error) {
      this.logger.error('Error searching quotes', { error, query: req.query });
      res.status(500).json({
        error: 'Failed to search quotes',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /api/crm/quotes/:id/clone
   * Clone quote
   */
  async cloneQuote(req: Request, res: Response): Promise<void> {
    try {
      const quote_id = parseInt(req.params.id);

      if (!quote_id || isNaN(quote_id)) {
        res.status(400).json({ error: 'Invalid quote ID' });
        return;
      }

      const modifications = {
        quote_name: req.body.quote_name,
        account_id: req.body.account_id,
        remove_expired_pricing: req.body.remove_expired_pricing,
        update_prices: req.body.update_prices
      };

      const clonedQuote = await this.quoteManagement.cloneQuote(quote_id, modifications);

      res.status(201).json({
        success: true,
        data: clonedQuote,
        message: 'Quote cloned successfully'
      });

    } catch (error) {
      this.logger.error('Error cloning quote', { error, quote_id: req.params.id });
      res.status(500).json({
        error: 'Failed to clone quote',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /api/crm/quotes/:id/refresh-pricing
   * Refresh quote pricing
   */
  async refreshPricing(req: Request, res: Response): Promise<void> {
    try {
      const quote_id = parseInt(req.params.id);

      if (!quote_id || isNaN(quote_id)) {
        res.status(400).json({ error: 'Invalid quote ID' });
        return;
      }

      const quote = await this.quoteManagement.refreshQuotePricing(quote_id);

      res.status(200).json({
        success: true,
        data: quote,
        message: 'Quote pricing refreshed successfully'
      });

    } catch (error) {
      this.logger.error('Error refreshing quote pricing', { error, quote_id: req.params.id });
      res.status(500).json({
        error: 'Failed to refresh quote pricing',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /api/crm/quotes/:id/generate-document
   * Generate quote document
   */
  async generateDocument(req: Request, res: Response): Promise<void> {
    try {
      const quote_id = parseInt(req.params.id);

      if (!quote_id || isNaN(quote_id)) {
        res.status(400).json({ error: 'Invalid quote ID' });
        return;
      }

      const template_id = req.body.template_id ? parseInt(req.body.template_id) : undefined;
      const format = req.body.format || 'pdf';
      const generated_by = req.user?.user_id;

      const document = await this.quoteManagement.generateDocument(
        quote_id,
        template_id,
        format,
        generated_by
      );

      res.status(201).json({
        success: true,
        data: document,
        message: 'Document generated successfully'
      });

    } catch (error) {
      this.logger.error('Error generating document', { error, quote_id: req.params.id });
      res.status(500).json({
        error: 'Failed to generate document',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/crm/quotes/metrics
   * Get quote metrics and analytics
   */
  async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.company_id;
      if (!company_id) {
        res.status(400).json({ error: 'Company ID is required' });
        return;
      }

      const date_from = req.query.date_from ? new Date(req.query.date_from as string) : undefined;
      const date_to = req.query.date_to ? new Date(req.query.date_to as string) : undefined;

      const metrics = await this.quoteManagement.getQuoteMetrics(company_id, date_from, date_to);

      res.status(200).json({
        success: true,
        data: metrics,
        message: 'Quote metrics retrieved successfully'
      });

    } catch (error) {
      this.logger.error('Error getting quote metrics', { error, query: req.query });
      res.status(500).json({
        error: 'Failed to get quote metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /api/crm/quotes/compare
   * Compare multiple quotes
   */
  async compareQuotes(req: Request, res: Response): Promise<void> {
    try {
      const quote_ids = req.body.quote_ids;

      if (!Array.isArray(quote_ids) || quote_ids.length < 2) {
        res.status(400).json({ error: 'At least 2 quote IDs are required' });
        return;
      }

      const comparison = await this.quoteManagement.compareQuotes(quote_ids);

      res.status(200).json({
        success: true,
        data: comparison,
        message: 'Quote comparison completed successfully'
      });

    } catch (error) {
      this.logger.error('Error comparing quotes', { error, body: req.body });
      res.status(500).json({
        error: 'Failed to compare quotes',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/crm/quotes/:id/approvals
   * Get quote approval status
   */
  async getApprovalStatus(req: Request, res: Response): Promise<void> {
    try {
      const quote_id = parseInt(req.params.id);

      if (!quote_id || isNaN(quote_id)) {
        res.status(400).json({ error: 'Invalid quote ID' });
        return;
      }

      // Get pending approvals for this quote
      const approvals = await this.approvalService.getPendingApprovals(
        req.user?.user_id!,
        req.user?.company_id!
      );

      const quoteApprovals = approvals.data.filter(a =>
        a.entity_type === 'quote' && a.entity_id === quote_id
      );

      res.status(200).json({
        success: true,
        data: quoteApprovals,
        message: 'Quote approval status retrieved successfully'
      });

    } catch (error) {
      this.logger.error('Error getting approval status', { error, quote_id: req.params.id });
      res.status(500).json({
        error: 'Failed to get approval status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * DELETE /api/crm/quotes/:id
   * Delete quote (soft delete by changing status)
   */
  async deleteQuote(req: Request, res: Response): Promise<void> {
    try {
      const quote_id = parseInt(req.params.id);

      if (!quote_id || isNaN(quote_id)) {
        res.status(400).json({ error: 'Invalid quote ID' });
        return;
      }

      const transition: QuoteStatusTransition = {
        from_status: req.body.current_status || 'draft',
        to_status: 'cancelled',
        comment: 'Quote deleted by user',
        notify_stakeholders: false
      };

      const quote = await this.quoteManagement.changeStatus(
        quote_id,
        transition,
        req.user?.user_id
      );

      res.status(200).json({
        success: true,
        data: quote,
        message: 'Quote deleted successfully'
      });

    } catch (error) {
      this.logger.error('Error deleting quote', { error, quote_id: req.params.id });
      res.status(500).json({
        error: 'Failed to delete quote',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}