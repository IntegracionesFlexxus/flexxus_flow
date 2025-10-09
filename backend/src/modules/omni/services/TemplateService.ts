/**
 * Template Service - Sprint 05
 * Business logic for managing message templates
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { TemplateRepository } from '../repositories/TemplateRepository';
import { ITemplate, ITemplateCreate, ITemplateUpdate } from '../interfaces/ITemplate';
import { ChannelType } from '../types/channel.types';
import winston from 'winston';

@injectable()
export class TemplateService {
  constructor(
    @inject(TYPES.OmniTemplateRepository) private templateRepository: TemplateRepository,
    @inject(TYPES.Logger) private logger: winston.Logger
  ) {}

  /**
   * Create a new template
   */
  async createTemplate(data: ITemplateCreate, companyId: string): Promise<ITemplate> {
    try {
      this.logger.info('Creating new template', {
        name: data.name,
        channelType: data.channel_type,
        companyId
      });

      // Validate template name is unique for the channel type
      const existing = await this.templateRepository.findByName(
        data.name,
        data.channel_type,
        companyId
      );

      if (existing) {
        throw new Error(`Template with name '${data.name}' already exists for ${data.channel_type}`);
      }

      // Validate template content based on channel type
      this.validateTemplateContent(data.channel_type, data.content);

      // Create template
      const template = await this.templateRepository.create(data, companyId);

      this.logger.info('Template created successfully', {
        templateId: template.id,
        name: template.name
      });

      return template;
    } catch (error) {
      this.logger.error('Failed to create template', { error, data });
      throw error;
    }
  }

  /**
   * Get templates by channel type
   */
  async getTemplatesByChannel(channelType: string, companyId: string): Promise<ITemplate[]> {
    try {
      const templates = await this.templateRepository.findByChannelType(
        channelType as ChannelType,
        companyId
      );
      return templates || [];
    } catch (error) {
      this.logger.error('Failed to get templates by channel', { error, channelType, companyId });
      return [];
    }
  }

  /**
   * Get template by ID
   */
  async getTemplateById(templateId: string, companyId: string): Promise<ITemplate | null> {
    try {
      const template = await this.templateRepository.findById(templateId, companyId);
      return template;
    } catch (error) {
      this.logger.error('Failed to get template by ID', { error, templateId, companyId });
      throw error;
    }
  }

  /**
   * Update template
   */
  async updateTemplate(
    templateId: string,
    data: ITemplateUpdate,
    companyId: string
  ): Promise<ITemplate | null> {
    try {
      this.logger.info('Updating template', { templateId, companyId });

      // Get existing template
      const existingTemplate = await this.templateRepository.findById(templateId, companyId);
      if (!existingTemplate) {
        return null;
      }

      // If name is being updated, check for duplicates
      if (data.name && data.name !== existingTemplate.name) {
        const duplicate = await this.templateRepository.findByName(
          data.name,
          existingTemplate.channel_type,
          companyId
        );

        if (duplicate && duplicate.id !== templateId) {
          throw new Error(`Template with name '${data.name}' already exists`);
        }
      }

      // If content is being updated, validate it
      if (data.content) {
        this.validateTemplateContent(existingTemplate.channel_type, data.content);
      }

      // Update template
      const updated = await this.templateRepository.update(templateId, data, companyId);

      if (updated) {
        const template = await this.templateRepository.findById(templateId, companyId);
        this.logger.info('Template updated successfully', { templateId });
        return template;
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to update template', { error, templateId });
      throw error;
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId: string, companyId: string): Promise<boolean> {
    try {
      this.logger.info('Deleting template', { templateId, companyId });

      const deleted = await this.templateRepository.delete(templateId, companyId);

      if (deleted) {
        this.logger.info('Template deleted successfully', { templateId });
      }

      return deleted;
    } catch (error) {
      this.logger.error('Failed to delete template', { error, templateId });
      throw error;
    }
  }

  /**
   * Get most used templates
   */
  async getMostUsedTemplates(companyId: string, limit: number = 10): Promise<ITemplate[]> {
    try {
      const templates = await this.templateRepository.findMostUsed(companyId, limit);
      return templates || [];
    } catch (error) {
      this.logger.error('Failed to get most used templates', { error, companyId });
      return [];
    }
  }

  /**
   * Search templates
   */
  async searchTemplates(
    searchTerm: string,
    companyId: string,
    channelType?: string
  ): Promise<ITemplate[]> {
    try {
      this.logger.info('Searching templates', { searchTerm, channelType, companyId });

      const templates = await this.templateRepository.search(
        searchTerm,
        companyId,
        channelType as ChannelType
      );

      return templates || [];
    } catch (error) {
      this.logger.error('Failed to search templates', { error, searchTerm });
      return [];
    }
  }

  /**
   * Duplicate a template
   */
  async duplicateTemplate(
    templateId: string,
    newName: string,
    companyId: string
  ): Promise<ITemplate> {
    try {
      this.logger.info('Duplicating template', { templateId, newName, companyId });

      // Get original template
      const original = await this.templateRepository.findById(templateId, companyId);
      if (!original) {
        throw new Error('Template not found');
      }

      // Check if new name already exists
      const existing = await this.templateRepository.findByName(
        newName,
        original.channel_type,
        companyId
      );

      if (existing) {
        throw new Error(`Template with name '${newName}' already exists`);
      }

      // Create duplicate
      const duplicateData: ITemplateCreate = {
        name: newName,
        description: `Copy of ${original.description || original.name}`,
        channel_type: original.channel_type,
        content: { ...original.content },
        variables: [...(original.variables || [])],
        category: original.category,
        tags: [...(original.tags || [])],
        is_active: true,
        metadata: {
          ...original.metadata,
          duplicated_from: templateId,
          duplicated_at: new Date().toISOString()
        }
      };

      const duplicate = await this.templateRepository.create(duplicateData, companyId);

      this.logger.info('Template duplicated successfully', {
        originalId: templateId,
        duplicateId: duplicate.id
      });

      return duplicate;
    } catch (error) {
      this.logger.error('Failed to duplicate template', { error, templateId, newName });
      throw error;
    }
  }

  /**
   * Render template with variables
   */
  async renderTemplate(
    templateId: string,
    variables: Record<string, any>,
    companyId: string
  ): Promise<string> {
    try {
      const template = await this.templateRepository.findById(templateId, companyId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Get template text based on channel type
      let templateText = '';
      if (typeof template.content === 'string') {
        templateText = template.content;
      } else if (template.content.text) {
        templateText = template.content.text;
      } else if (template.content.body) {
        templateText = template.content.body;
      }

      // Replace variables in template
      let renderedText = templateText;
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        renderedText = renderedText.replace(regex, String(value));
      }

      // Check for any unreplaced variables
      const unreplacedMatches = renderedText.match(/{{[^}]+}}/g);
      if (unreplacedMatches) {
        this.logger.warn('Template has unreplaced variables', {
          templateId,
          unreplaced: unreplacedMatches
        });
      }

      // Increment usage count
      await this.templateRepository.incrementUsageCount(templateId, companyId);

      return renderedText;
    } catch (error) {
      this.logger.error('Failed to render template', { error, templateId, variables });
      throw error;
    }
  }

  /**
   * Validate template content based on channel type
   */
  private validateTemplateContent(channelType: ChannelType, content: any): void {
    if (!content) {
      throw new Error('Template content is required');
    }

    switch (channelType) {
      case ChannelType.WHATSAPP:
        if (typeof content === 'object') {
          if (!content.body && !content.text) {
            throw new Error('WhatsApp template must have body or text');
          }
          // WhatsApp has strict template rules
          if (content.body && content.body.length > 1024) {
            throw new Error('WhatsApp template body cannot exceed 1024 characters');
          }
        }
        break;

      case ChannelType.EMAIL:
        if (typeof content === 'object') {
          if (!content.subject) {
            throw new Error('Email template must have a subject');
          }
          if (!content.body && !content.html && !content.text) {
            throw new Error('Email template must have body, html, or text content');
          }
        }
        break;

      case ChannelType.SMS:
        if (typeof content === 'string' && content.length > 160) {
          this.logger.warn('SMS template exceeds 160 characters, will be sent as multiple messages');
        }
        if (typeof content === 'object' && content.text && content.text.length > 160) {
          this.logger.warn('SMS template exceeds 160 characters, will be sent as multiple messages');
        }
        break;

      case ChannelType.INSTAGRAM:
      case ChannelType.FACEBOOK:
        // Facebook/Instagram have similar requirements
        if (typeof content === 'object' && !content.text && !content.body) {
          throw new Error(`${channelType} template must have text or body`);
        }
        break;

      default:
        // Basic validation for unknown channel types
        if (typeof content === 'object' && !content.text && !content.body) {
          throw new Error('Template must have text or body content');
        }
    }
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(category: string, companyId: string): Promise<ITemplate[]> {
    try {
      const templates = await this.templateRepository.findByCategory(category, companyId);
      return templates || [];
    } catch (error) {
      this.logger.error('Failed to get templates by category', { error, category, companyId });
      return [];
    }
  }

  /**
   * Get template categories
   */
  async getTemplateCategories(companyId: string): Promise<string[]> {
    try {
      const categories = await this.templateRepository.getCategories(companyId);
      return categories || [];
    } catch (error) {
      this.logger.error('Failed to get template categories', { error, companyId });
      return [];
    }
  }

  /**
   * Archive template (soft delete)
   */
  async archiveTemplate(templateId: string, companyId: string): Promise<boolean> {
    try {
      this.logger.info('Archiving template', { templateId, companyId });

      const updated = await this.templateRepository.update(
        templateId,
        { is_active: false },
        companyId
      );

      if (updated) {
        this.logger.info('Template archived successfully', { templateId });
      }

      return updated;
    } catch (error) {
      this.logger.error('Failed to archive template', { error, templateId });
      throw error;
    }
  }

  /**
   * Restore archived template
   */
  async restoreTemplate(templateId: string, companyId: string): Promise<boolean> {
    try {
      this.logger.info('Restoring template', { templateId, companyId });

      const updated = await this.templateRepository.update(
        templateId,
        { is_active: true },
        companyId
      );

      if (updated) {
        this.logger.info('Template restored successfully', { templateId });
      }

      return updated;
    } catch (error) {
      this.logger.error('Failed to restore template', { error, templateId });
      throw error;
    }
  }
}