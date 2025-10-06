/**
 * Document Controller - Sprint 19
 * REST API endpoints for document template and generation management
 */

import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { Logger } from 'winston';
import Joi from 'joi';
import { DocumentTemplateRepository } from '../repositories/DocumentTemplateRepository';
import { QuoteBuilderService } from '../services/QuoteBuilderService';

// Validation schemas
const templateSchema = Joi.object({
  template_name: Joi.string().required().max(100),
  template_type: Joi.string().valid(
    'quote', 'invoice', 'contract', 'proposal', 'report', 'email'
  ).required(),
  description: Joi.string().max(500),
  template_content: Joi.string().required(),
  template_engine: Joi.string().valid('handlebars', 'mustache', 'ejs').default('handlebars'),
  output_format: Joi.string().valid('pdf', 'html', 'docx', 'xlsx').default('pdf'),
  header_content: Joi.string(),
  footer_content: Joi.string(),
  styles: Joi.string(),
  page_settings: Joi.object({
    orientation: Joi.string().valid('portrait', 'landscape').default('portrait'),
    format: Joi.string().default('A4'),
    margins: Joi.object({
      top: Joi.number().default(20),
      right: Joi.number().default(20),
      bottom: Joi.number().default(20),
      left: Joi.number().default(20)
    })
  }),
  variables: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    type: Joi.string().valid('string', 'number', 'date', 'boolean', 'array', 'object'),
    required: Joi.boolean().default(false),
    default_value: Joi.any(),
    description: Joi.string()
  })),
  is_active: Joi.boolean().default(true),
  metadata: Joi.object()
});

const generateDocumentSchema = Joi.object({
  template_id: Joi.number().integer().positive().required(),
  entity_type: Joi.string().valid('quote', 'invoice', 'contract', 'order').required(),
  entity_id: Joi.number().integer().positive().required(),
  data: Joi.object(),
  output_format: Joi.string().valid('pdf', 'html', 'docx', 'xlsx'),
  save_to_entity: Joi.boolean().default(true),
  send_email: Joi.boolean().default(false),
  email_recipients: Joi.array().items(Joi.string().email()),
  include_attachments: Joi.boolean().default(true)
});

const bulkGenerateSchema = Joi.object({
  template_id: Joi.number().integer().positive().required(),
  entity_type: Joi.string().required(),
  entity_ids: Joi.array().items(Joi.number().integer().positive()).min(1).max(100).required(),
  output_format: Joi.string().valid('pdf', 'html', 'docx', 'xlsx'),
  merge_documents: Joi.boolean().default(false)
});

const revenueScheduleSchema = Joi.object({
  entity_type: Joi.string().valid('quote', 'contract', 'order').required(),
  entity_id: Joi.number().integer().positive().required(),
  recognition_method: Joi.string().valid(
    'point_in_time', 'over_time', 'milestone', 'percentage_completion'
  ).required(),
  start_date: Joi.date().required(),
  end_date: Joi.date(),
  milestones: Joi.array().items(Joi.object({
    milestone_name: Joi.string().required(),
    milestone_date: Joi.date().required(),
    percentage: Joi.number().min(0).max(100).required(),
    amount: Joi.number().min(0)
  })),
  allocation_rules: Joi.object({
    method: Joi.string().valid('straight_line', 'accelerated', 'custom'),
    custom_allocations: Joi.array().items(Joi.object({
      period_date: Joi.date().required(),
      amount: Joi.number().min(0).required()
    }))
  }),
  performance_obligations: Joi.array().items(Joi.object({
    description: Joi.string().required(),
    amount: Joi.number().min(0).required(),
    recognition_pattern: Joi.string()
  }))
});

@injectable()
export class DocumentController {
  constructor(
    @inject(TYPES.DocumentTemplateRepository) private documentRepository: DocumentTemplateRepository,
    @inject(TYPES.QuoteBuilderService) private quoteService: QuoteBuilderService,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  /**
   * Get all document templates
   * GET /api/crm/documents/templates
   */
  async getTemplates(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;

      if (!company_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const template_type = req.query.template_type as string;
      const is_active = req.query.is_active === 'false' ? false : true;

      const templates = await this.documentRepository.getTemplates(company_id, {
        template_type,
        is_active
      });

      res.json({
        success: true,
        data: templates
      });

    } catch (error) {
      this.logger.error('Error getting templates', { error });
      res.status(500).json({ error: 'Failed to get templates' });
    }
  }

  /**
   * Get template by ID
   * GET /api/crm/documents/templates/:id
   */
  async getTemplateById(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;
      const template_id = Number(req.params.id);

      if (!company_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const template = await this.documentRepository.getTemplateById(
        template_id,
        company_id
      );

      if (!template) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }

      res.json({
        success: true,
        data: template
      });

    } catch (error) {
      this.logger.error('Error getting template', { error });
      res.status(500).json({ error: 'Failed to get template' });
    }
  }

  /**
   * Create document template
   * POST /api/crm/documents/templates
   */
  async createTemplate(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;
      const user_id = req.user?.id;

      if (!company_id || !user_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { error, value } = templateSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const template = await this.documentRepository.createTemplate({
        ...value,
        company_id,
        created_by: user_id
      });

      res.status(201).json({
        success: true,
        data: template,
        message: 'Template created successfully'
      });

    } catch (error: any) {
      this.logger.error('Error creating template', { error });

      if (error.message?.includes('duplicate')) {
        res.status(409).json({ error: 'Template with this name already exists' });
      } else {
        res.status(500).json({ error: 'Failed to create template' });
      }
    }
  }

  /**
   * Update document template
   * PUT /api/crm/documents/templates/:id
   */
  async updateTemplate(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;
      const template_id = Number(req.params.id);

      if (!company_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { error, value } = templateSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const template = await this.documentRepository.updateTemplate(
        template_id,
        value,
        company_id
      );

      res.json({
        success: true,
        data: template,
        message: 'Template updated successfully'
      });

    } catch (error: any) {
      this.logger.error('Error updating template', { error });

      if (error.message?.includes('not found')) {
        res.status(404).json({ error: 'Template not found' });
      } else {
        res.status(500).json({ error: 'Failed to update template' });
      }
    }
  }

  /**
   * Delete document template
   * DELETE /api/crm/documents/templates/:id
   */
  async deleteTemplate(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;
      const template_id = Number(req.params.id);

      if (!company_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      await this.documentRepository.deleteTemplate(template_id, company_id);

      res.json({
        success: true,
        message: 'Template deleted successfully'
      });

    } catch (error) {
      this.logger.error('Error deleting template', { error });
      res.status(500).json({ error: 'Failed to delete template' });
    }
  }

  /**
   * Clone template
   * POST /api/crm/documents/templates/:id/clone
   */
  async cloneTemplate(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;
      const user_id = req.user?.id;
      const template_id = Number(req.params.id);

      if (!company_id || !user_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const cloneSchema = Joi.object({
        new_name: Joi.string().required().max(100)
      });

      const { error, value } = cloneSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const clonedTemplate = await this.documentRepository.cloneTemplate(
        template_id,
        value.new_name,
        user_id
      );

      res.status(201).json({
        success: true,
        data: clonedTemplate,
        message: 'Template cloned successfully'
      });

    } catch (error: any) {
      this.logger.error('Error cloning template', { error });

      if (error.message?.includes('not found')) {
        res.status(404).json({ error: 'Template not found' });
      } else if (error.message?.includes('duplicate')) {
        res.status(409).json({ error: 'Template with this name already exists' });
      } else {
        res.status(500).json({ error: 'Failed to clone template' });
      }
    }
  }

  /**
   * Generate document from template
   * POST /api/crm/documents/generate
   */
  async generateDocument(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;
      const user_id = req.user?.id;

      if (!company_id || !user_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { error, value } = generateDocumentSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          details: error.details.map(d => d.message)
        });
        return;
      }

      // Get entity data based on type
      let entityData: any = value.data || {};
      if (value.entity_type === 'quote') {
        const quote = await this.quoteService.getQuoteWithDetails(
          company_id,
          value.entity_id
        );
        if (!quote) {
          res.status(404).json({ error: 'Quote not found' });
          return;
        }
        entityData = { ...entityData, quote };
      }

      const document = await this.documentRepository.generateDocument({
        template_id: value.template_id,
        company_id: company_id,
        generated_by: user_id,
        entity_type: value.entity_type,
        entity_id: value.entity_id,
        output_format: value.output_format || 'pdf',
        data: entityData
      } as any);

      // Save document reference if requested
      if (value.save_to_entity) {
        await this.documentRepository.saveDocumentReference({
          company_id,
          entity_type: value.entity_type,
          entity_id: value.entity_id,
          document_name: document.document_name,
          document_url: document.file_url,
          document_type: document.output_format,
          file_size: document.file_size,
          generated_by: user_id
        });
      }

      // Send email if requested
      if (value.send_email && value.email_recipients?.length > 0) {
        // Email sending would be implemented here
        this.logger.info('Email sending requested', {
          recipients: value.email_recipients,
          document: document.document_name
        });
      }

      res.json({
        success: true,
        data: document,
        message: 'Document generated successfully'
      });

    } catch (error: any) {
      this.logger.error('Error generating document', { error });

      if (error.message?.includes('not found')) {
        res.status(404).json({ error: 'Template or entity not found' });
      } else {
        res.status(500).json({ error: 'Failed to generate document' });
      }
    }
  }

  /**
   * Bulk generate documents
   * POST /api/crm/documents/bulk-generate
   */
  async bulkGenerateDocuments(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;
      const user_id = req.user?.id;

      if (!company_id || !user_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { error, value } = bulkGenerateSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const results = [];
      const errors = [];

      for (const entity_id of value.entity_ids) {
        try {
          // Get entity data
          let entityData: any = {};
          if (value.entity_type === 'quote') {
            const quote = await this.quoteService.getQuoteWithDetails(company_id, entity_id);
            if (quote) {
              entityData = { quote };
            }
          }

          const document = await this.documentRepository.generateDocument({
            template_id: value.template_id,
            company_id: company_id,
            generated_by: user_id,
            entity_type: value.entity_type,
            entity_id: entity_id,
            output_format: value.output_format || 'pdf',
            data: entityData
          } as any);

          results.push({
            entity_id,
            success: true,
            document
          });

        } catch (err: any) {
          errors.push({
            entity_id,
            error: err.message
          });
        }
      }

      res.json({
        success: errors.length === 0,
        data: {
          successful: results,
          failed: errors
        },
        message: `Generated ${results.length} documents successfully, ${errors.length} failed`
      });

    } catch (error) {
      this.logger.error('Error bulk generating documents', { error });
      res.status(500).json({ error: 'Failed to generate documents' });
    }
  }

  /**
   * Preview document
   * POST /api/crm/documents/preview
   */
  async previewDocument(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;

      if (!company_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const previewSchema = Joi.object({
        template_id: Joi.number().integer().positive(),
        template_content: Joi.string(),
        data: Joi.object().required(),
        output_format: Joi.string().valid('html', 'pdf').default('html')
      }).or('template_id', 'template_content');

      const { error, value } = previewSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          details: error.details.map(d => d.message)
        });
        return;
      }

      let preview;
      if (value.template_id) {
        preview = await this.documentRepository.generateDocument({
          template_id: value.template_id,
          company_id: company_id,
          generated_by: req.user?.id,
          output_format: value.output_format || 'html',
          data: value.data
        } as any);
      } else {
        // Preview from raw template content
        preview = await this.documentRepository.previewTemplate(
          value.template_content,
          value.data,
          value.output_format
        );
      }

      res.json({
        success: true,
        data: preview
      });

    } catch (error) {
      this.logger.error('Error previewing document', { error });
      res.status(500).json({ error: 'Failed to preview document' });
    }
  }

  /**
   * Get generated documents
   * GET /api/crm/documents/generated
   */
  async getGeneratedDocuments(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;

      if (!company_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const entity_type = req.query.entity_type as string;
      const entity_id = req.query.entity_id ? Number(req.query.entity_id) : undefined;
      const document_type = req.query.document_type as string;
      const page = Number(req.query.page) || 1;
      const page_size = Number(req.query.page_size) || 20;

      // TODO: Implement getGeneratedDocuments in DocumentRepository
      // const documents = await this.documentRepository.getGeneratedDocuments(
      //   company_id,
      //   {
      //     entity_type,
      //     entity_id,
      //     document_type
      //   }
      // );

      const documents = [];

      // Pagination
      const start = (page - 1) * page_size;
      const end = start + page_size;
      const paginated = documents.slice(start, end);

      res.json({
        success: true,
        data: paginated,
        pagination: {
          page,
          page_size,
          total_count: documents.length,
          total_pages: Math.ceil(documents.length / page_size)
        }
      });

    } catch (error) {
      this.logger.error('Error getting generated documents', { error });
      res.status(500).json({ error: 'Failed to get generated documents' });
    }
  }

  /**
   * Create revenue schedule
   * POST /api/crm/documents/revenue-schedules
   */
  async createRevenueSchedule(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;
      const user_id = req.user?.id;

      if (!company_id || !user_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { error, value } = revenueScheduleSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const schedule = await this.documentRepository.createRevenueSchedule({
        ...value,
        company_id,
        created_by: user_id
      });

      res.status(201).json({
        success: true,
        data: schedule,
        message: 'Revenue schedule created successfully'
      });

    } catch (error) {
      this.logger.error('Error creating revenue schedule', { error });
      res.status(500).json({ error: 'Failed to create revenue schedule' });
    }
  }

  /**
   * Get revenue schedules
   * GET /api/crm/documents/revenue-schedules
   */
  async getRevenueSchedules(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;

      if (!company_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const entity_type = req.query.entity_type as string;
      const entity_id = req.query.entity_id ? Number(req.query.entity_id) : undefined;
      const status = req.query.status as string;

      const schedules = await this.documentRepository.getRevenueSchedules(
        company_id,
        {
          entity_type,
          entity_id,
          status
        }
      );

      res.json({
        success: true,
        data: schedules
      });

    } catch (error) {
      this.logger.error('Error getting revenue schedules', { error });
      res.status(500).json({ error: 'Failed to get revenue schedules' });
    }
  }

  /**
   * Update revenue recognition
   * POST /api/crm/documents/revenue-schedules/:id/recognize
   */
  async recognizeRevenue(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;
      const user_id = req.user?.id;
      const schedule_id = Number(req.params.id);

      if (!company_id || !user_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const recognitionSchema = Joi.object({
        recognition_date: Joi.date().required(),
        amount: Joi.number().positive().required(),
        notes: Joi.string().max(500)
      });

      const { error, value } = recognitionSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const result = await this.documentRepository.recognizeRevenue(
        schedule_id,
        value.recognition_date,
        value.amount,
        value.notes,
        user_id,
        company_id
      );

      res.json({
        success: true,
        data: result,
        message: 'Revenue recognized successfully'
      });

    } catch (error: any) {
      this.logger.error('Error recognizing revenue', { error });

      if (error.message?.includes('not found')) {
        res.status(404).json({ error: 'Revenue schedule not found' });
      } else if (error.message?.includes('exceeds')) {
        res.status(400).json({ error: 'Recognition amount exceeds remaining balance' });
      } else {
        res.status(500).json({ error: 'Failed to recognize revenue' });
      }
    }
  }

  /**
   * Get revenue recognition report
   * GET /api/crm/documents/revenue-reports
   */
  async getRevenueReport(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;

      if (!company_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const start_date = req.query.start_date ? new Date(req.query.start_date as string) : new Date();
      const end_date = req.query.end_date ? new Date(req.query.end_date as string) : new Date();
      const group_by = (req.query.group_by as 'month' | 'quarter' | 'year') || 'month';

      const report = await this.documentRepository.getRevenueRecognitionReport(
        company_id,
        start_date,
        end_date,
        group_by
      );

      res.json({
        success: true,
        data: report
      });

    } catch (error) {
      this.logger.error('Error getting revenue report', { error });
      res.status(500).json({ error: 'Failed to get revenue report' });
    }
  }

  /**
   * Export templates
   * GET /api/crm/documents/templates/export
   */
  async exportTemplates(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;

      if (!company_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const template_ids = req.query.template_ids ?
        String(req.query.template_ids).split(',').map(Number) : undefined;

      const exportData = await this.documentRepository.exportTemplates(
        company_id,
        template_ids
      );

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="templates.json"');
      res.json(exportData);

    } catch (error) {
      this.logger.error('Error exporting templates', { error });
      res.status(500).json({ error: 'Failed to export templates' });
    }
  }

  /**
   * Import templates
   * POST /api/crm/documents/templates/import
   */
  async importTemplates(req: Request, res: Response): Promise<void> {
    try {
      const company_id = req.user?.companyId;
      const user_id = req.user?.id;

      if (!company_id || !user_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const importSchema = Joi.object({
        templates: Joi.array().items(templateSchema).required(),
        overwrite_existing: Joi.boolean().default(false)
      });

      const { error, value } = importSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const results = await this.documentRepository.importTemplates(
        value.templates,
        company_id,
        user_id,
        value.overwrite_existing
      );

      res.json({
        success: true,
        data: results,
        message: `Imported ${results.imported} templates successfully`
      });

    } catch (error) {
      this.logger.error('Error importing templates', { error });
      res.status(500).json({ error: 'Failed to import templates' });
    }
  }
}