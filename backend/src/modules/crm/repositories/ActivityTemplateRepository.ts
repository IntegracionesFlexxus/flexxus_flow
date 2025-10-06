/**
 * Activity Template Repository
 * Manages activity template data operations for reusable activity patterns
 */

import { injectable, inject } from 'inversify';
import { CRMBaseRepository } from './CRMBaseRepository';
import { TYPES } from '@/container/types';

export interface ActivityTemplate {
  id?: number;
  company_id: number;
  name: string;
  description?: string;
  type: string;
  default_subject?: string;
  default_description?: string;
  default_duration_minutes?: number;
  default_priority?: string;
  default_reminder_minutes?: number;
  custom_fields_template?: any;
  tags?: string[];
  category?: string;
  is_active?: boolean;
  usage_count?: number;
  created_by?: number;
  created_at?: Date;
  updated_at?: Date;
}

@injectable()
export class ActivityTemplateRepository extends CRMBaseRepository<ActivityTemplate> {
  constructor(
    @inject(TYPES.CRMDatabaseConnection) db: any,
    @inject(TYPES.Logger) logger?: any
  ) {
    super('activity_templates', db, logger);

    // Define allowed fields for this entity
    this.allowedFields = new Set([
      'id', 'company_id', 'name', 'description', 'type',
      'default_subject', 'default_description', 'default_duration_minutes',
      'default_priority', 'default_reminder_minutes', 'custom_fields_template',
      'tags', 'category', 'is_active', 'usage_count',
      'created_by', 'created_at', 'updated_at'
    ]);
  }

  /**
   * Get all active templates for a company
   */
  async getActiveTemplates(companyId: number): Promise<ActivityTemplate[]> {
    return this.findMany({
      company_id: companyId,
      is_active: true
    }, {
      orderBy: 'usage_count DESC, name ASC'
    });
  }

  /**
   * Get templates by type
   */
  async getTemplatesByType(companyId: number, type: string): Promise<ActivityTemplate[]> {
    return this.findMany({
      company_id: companyId,
      type: type,
      is_active: true
    });
  }

  /**
   * Increment usage count when template is used
   */
  async incrementUsageCount(templateId: number): Promise<void> {
    const query = `
      UPDATE ${this.getFullTableName()}
      SET usage_count = COALESCE(usage_count, 0) + 1,
          updated_at = NOW()
      WHERE id = $1
    `;

    try {
      await this.db.query(query, [templateId]);
      this.logger?.debug(`Incremented usage count for template ${templateId}`);
    } catch (error) {
      this.logger?.error('Error incrementing template usage count:', error);
      throw error;
    }
  }

  /**
   * Get popular templates based on usage
   */
  async getPopularTemplates(companyId: number, limit: number = 5): Promise<ActivityTemplate[]> {
    const query = `
      SELECT *
      FROM ${this.getFullTableName()}
      WHERE company_id = $1
        AND is_active = true
        AND usage_count > 0
      ORDER BY usage_count DESC
      LIMIT $2
    `;

    const result = await this.db.query(query, [companyId, limit]);
    return result.rows;
  }

  /**
   * Clone a template
   */
  async cloneTemplate(templateId: number, newName: string, userId: number, companyId: string): Promise<ActivityTemplate> {
    const original = await this.findById(templateId, companyId);
    if (!original) {
      throw new Error('Template not found');
    }

    const cloned = {
      ...original,
      id: undefined,
      name: newName,
      usage_count: 0,
      created_by: userId,
      created_at: undefined,
      updated_at: undefined
    };

    return this.create(cloned);
  }
}