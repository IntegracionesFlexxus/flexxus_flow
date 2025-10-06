/**
 * Activity Repository
 * Manages activity (tasks, calls, meetings, emails) data operations with CRM database
 */

import { injectable, inject } from 'inversify';
import { CRMBaseRepository } from './CRMBaseRepository';
// TODO: Create missing types file
// import {
//   Activity,
//   ActivityCreateDTO,
//   ActivityUpdateDTO,
//   ActivityFilter,
//   ActivityWithDetails,
//   ActivityMetrics
// } from '../types/activity.types';
import { TYPES } from '@/container/types';

@injectable()
export class ActivityRepository extends CRMBaseRepository<any> {
  constructor(
    @inject(TYPES.CRMDatabaseConnection) db: any,
    @inject(TYPES.Logger) logger?: any
  ) {
    super('activities', db, logger);

    // Define allowed fields for this entity
    this.allowedFields = new Set([
      'id', 'company_id', 'type', 'subject', 'description', 'status',
      'priority', 'due_date', 'reminder_date', 'account_id', 'contact_id',
      'opportunity_id', 'lead_id', 'assigned_to', 'duration_minutes',
      'location', 'outcome', 'follow_up_required', 'tags', 'custom_fields',
      'created_at', 'updated_at', 'created_by', 'updated_by', 'completed_at'
    ]);
  }

  /**
   * Get activity with all details
   */
  async getActivityWithDetails(id: number, companyId: number): Promise<any | null> {
    const query = `
      SELECT
        a.*,
        acc.name as account_name,
        c.first_name || ' ' || c.last_name as contact_name,
        o.name as opportunity_name,
        l.first_name || ' ' || l.last_name as lead_name,
        u.name as assigned_to_name
      FROM ${this.getFullTableName()} a
      LEFT JOIN public.accounts acc ON a.account_id = acc.id
      LEFT JOIN public.contacts c ON a.contact_id = c.id
      LEFT JOIN public.opportunities o ON a.opportunity_id = o.id
      LEFT JOIN public.leads l ON a.lead_id = l.id
      LEFT JOIN public.users u ON a.assigned_to = u.id
      WHERE a.id = $1 AND a.company_id = $2
    `;

    try {
      const result = await this.db.query(query, [id, companyId]);
      return result.rows[0] || null;
    } catch (error) {
      this.logger?.error('Error getting activity details', { error, id, companyId });
      throw error;
    }
  }

  /**
   * Find activities with filters
   */
  async findWithFilters(companyId: number, filters: any): Promise<any[]> {
    let query = `
      SELECT a.* FROM ${this.getFullTableName()} a
      WHERE a.company_id = $1
    `;

    const params: any[] = [companyId];
    let paramIndex = 2;

    // Apply filters
    if (filters.type) {
      query += ` AND a.type = $${paramIndex}`;
      params.push(filters.type);
      paramIndex++;
    }

    if (filters.status) {
      query += ` AND a.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.priority) {
      query += ` AND a.priority = $${paramIndex}`;
      params.push(filters.priority);
      paramIndex++;
    }

    if (filters.assigned_to) {
      query += ` AND a.assigned_to = $${paramIndex}`;
      params.push(filters.assigned_to);
      paramIndex++;
    }

    if (filters.account_id) {
      query += ` AND a.account_id = $${paramIndex}`;
      params.push(filters.account_id);
      paramIndex++;
    }

    if (filters.contact_id) {
      query += ` AND a.contact_id = $${paramIndex}`;
      params.push(filters.contact_id);
      paramIndex++;
    }

    if (filters.opportunity_id) {
      query += ` AND a.opportunity_id = $${paramIndex}`;
      params.push(filters.opportunity_id);
      paramIndex++;
    }

    if (filters.lead_id) {
      query += ` AND a.lead_id = $${paramIndex}`;
      params.push(filters.lead_id);
      paramIndex++;
    }

    // Date range filters
    if (filters.dueDateRange) {
      if (filters.dueDateRange.start) {
        query += ` AND a.due_date >= $${paramIndex}`;
        params.push(filters.dueDateRange.start);
        paramIndex++;
      }
      if (filters.dueDateRange.end) {
        query += ` AND a.due_date <= $${paramIndex}`;
        params.push(filters.dueDateRange.end);
        paramIndex++;
      }
    }

    if (filters.overdue) {
      query += ` AND a.due_date < CURRENT_DATE AND a.status != 'completed'`;
    }

    if (filters.today) {
      query += ` AND DATE(a.due_date) = CURRENT_DATE`;
    }

    if (filters.thisWeek) {
      query += ` AND a.due_date >= DATE_TRUNC('week', CURRENT_DATE)
                 AND a.due_date < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 week'`;
    }

    // Search
    if (filters.search) {
      query += ` AND (
        a.subject ILIKE $${paramIndex} OR
        a.description ILIKE $${paramIndex}
      )`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      query += ` AND a.tags && $${paramIndex}::text[]`;
      params.push(filters.tags);
      paramIndex++;
    }

    // Ordering
    const orderBy = filters.orderBy || 'due_date';
    const orderDirection = filters.orderDirection || 'ASC';
    query += ` ORDER BY a.${orderBy} ${orderDirection} NULLS LAST`;

    // Pagination
    if (filters.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
      paramIndex++;

      if (filters.page && filters.page > 1) {
        const offset = (filters.page - 1) * filters.limit;
        query += ` OFFSET $${paramIndex}`;
        params.push(offset);
      }
    }

    try {
      const result = await this.db.query(query, params);
      return result.rows;
    } catch (error) {
      this.logger?.error('Error finding activities with filters', { error, companyId, filters });
      throw error;
    }
  }

  /**
   * Get overdue activities
   */
  async getOverdueActivities(companyId: number, assignedTo?: number): Promise<any[]> {
    let query = `
      SELECT * FROM ${this.getFullTableName()}
      WHERE company_id = $1
        AND due_date < CURRENT_DATE
        AND status != 'completed'
    `;

    const params: any[] = [companyId];

    if (assignedTo) {
      query += ` AND assigned_to = $2`;
      params.push(assignedTo);
    }

    query += ` ORDER BY due_date ASC, priority DESC`;

    try {
      const result = await this.db.query(query, params);
      return result.rows;
    } catch (error) {
      this.logger?.error('Error getting overdue activities', { error, companyId, assignedTo });
      throw error;
    }
  }

  /**
   * Get activities with reminders
   */
  async getActivitiesWithReminders(companyId: number): Promise<any[]> {
    const query = `
      SELECT * FROM ${this.getFullTableName()}
      WHERE company_id = $1
        AND reminder_date IS NOT NULL
        AND reminder_date <= NOW()
        AND status != 'completed'
      ORDER BY reminder_date ASC
    `;

    try {
      const result = await this.db.query(query, [companyId]);
      return result.rows;
    } catch (error) {
      this.logger?.error('Error getting activities with reminders', { error, companyId });
      throw error;
    }
  }

  /**
   * Complete activity
   */
  async completeActivity(
    activityId: number,
    companyId: number,
    outcome: string,
    userId?: number
  ): Promise<boolean> {
    const query = `
      UPDATE ${this.getFullTableName()}
      SET status = 'completed',
          outcome = $3,
          completed_at = NOW(),
          updated_at = NOW(),
          updated_by = $4
      WHERE id = $1 AND company_id = $2
    `;

    try {
      const result = await this.db.query(query, [activityId, companyId, outcome, userId]);
      return result.rowCount > 0;
    } catch (error) {
      this.logger?.error('Error completing activity', { error, activityId, companyId });
      throw error;
    }
  }

  /**
   * Reschedule activity
   */
  async rescheduleActivity(
    activityId: number,
    companyId: number,
    newDueDate: Date,
    newReminderDate?: Date,
    userId?: number
  ): Promise<boolean> {
    const query = `
      UPDATE ${this.getFullTableName()}
      SET due_date = $3,
          reminder_date = $4,
          updated_at = NOW(),
          updated_by = $5
      WHERE id = $1 AND company_id = $2
    `;

    try {
      const result = await this.db.query(query, [
        activityId,
        companyId,
        newDueDate,
        newReminderDate,
        userId
      ]);
      return result.rowCount > 0;
    } catch (error) {
      this.logger?.error('Error rescheduling activity', { error, activityId, companyId });
      throw error;
    }
  }

  /**
   * Get activity metrics
   */
  async getActivityMetrics(companyId: number, dateRange?: { start: Date; end: Date }): Promise<any> {
    let dateCondition = '';
    const params: any[] = [companyId];

    if (dateRange) {
      dateCondition = ` AND created_at BETWEEN $2 AND $3`;
      params.push(dateRange.start, dateRange.end);
    }

    const metricsQuery = `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN type = 'task' THEN 1 END) as task_count,
        COUNT(CASE WHEN type = 'call' THEN 1 END) as call_count,
        COUNT(CASE WHEN type = 'meeting' THEN 1 END) as meeting_count,
        COUNT(CASE WHEN type = 'email' THEN 1 END) as email_count,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_count,
        COUNT(CASE WHEN due_date < CURRENT_DATE AND status != 'completed' THEN 1 END) as overdue_count,
        AVG(CASE
          WHEN status = 'completed' AND completed_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400
        END) as avg_completion_time_days
      FROM ${this.getFullTableName()}
      WHERE company_id = $1 ${dateCondition}
    `;

    const userPerformanceQuery = `
      SELECT
        assigned_to,
        u.name as user_name,
        COUNT(*) as total_activities,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_activities,
        COUNT(CASE WHEN due_date < CURRENT_DATE AND status != 'completed' THEN 1 END) as overdue_activities
      FROM ${this.getFullTableName()} a
      LEFT JOIN public.users u ON a.assigned_to = u.id
      WHERE a.company_id = $1 ${dateCondition}
      GROUP BY assigned_to, u.name
      ORDER BY completed_activities DESC
      LIMIT 10
    `;

    try {
      const [metricsResult, performanceResult] = await Promise.all([
        this.db.query(metricsQuery, params),
        this.db.query(userPerformanceQuery, params)
      ]);

      const metrics = metricsResult.rows[0];
      const total = parseInt(metrics.total) || 0;
      const completed = parseInt(metrics.completed_count) || 0;

      return {
        total,
        byType: {
          task: parseInt(metrics.task_count) || 0,
          call: parseInt(metrics.call_count) || 0,
          meeting: parseInt(metrics.meeting_count) || 0,
          email: parseInt(metrics.email_count) || 0
        },
        byStatus: {
          completed: completed,
          pending: parseInt(metrics.pending_count) || 0,
          in_progress: parseInt(metrics.in_progress_count) || 0
        },
        overdueCount: parseInt(metrics.overdue_count) || 0,
        completionRate: total > 0 ? (completed / total) * 100 : 0,
        avgCompletionTime: parseFloat(metrics.avg_completion_time_days) || 0,
        topPerformers: performanceResult.rows.map(p => ({
          user_id: p.assigned_to,
          user_name: p.user_name || 'Unknown',
          total_activities: parseInt(p.total_activities),
          completed_activities: parseInt(p.completed_activities),
          completion_rate: p.total_activities > 0
            ? (p.completed_activities / p.total_activities) * 100
            : 0
        }))
      };
    } catch (error) {
      this.logger?.error('Error getting activity metrics', { error, companyId, dateRange });
      throw error;
    }
  }

  /**
   * Bulk update activities
   */
  async bulkUpdateStatus(
    activityIds: number[],
    companyId: number,
    status: string,
    userId?: number
  ): Promise<number> {
    const query = `
      UPDATE ${this.getFullTableName()}
      SET status = $3,
          updated_at = NOW(),
          updated_by = $4
          ${status === 'completed' ? ', completed_at = NOW()' : ''}
      WHERE company_id = $1
        AND id = ANY($2::int[])
    `;

    try {
      const result = await this.db.query(query, [companyId, activityIds, status, userId]);
      return result.rowCount;
    } catch (error) {
      this.logger?.error('Error bulk updating activities', { error, activityIds, companyId });
      throw error;
    }
  }

  /**
   * Get activity timeline for an entity
   */
  async getEntityTimeline(
    companyId: number,
    entityType: 'account' | 'contact' | 'opportunity' | 'lead',
    entityId: number
  ): Promise<any[]> {
    const entityColumn = `${entityType}_id`;

    const query = `
      SELECT * FROM ${this.getFullTableName()}
      WHERE company_id = $1 AND ${entityColumn} = $2
      ORDER BY
        CASE
          WHEN due_date IS NOT NULL THEN due_date
          ELSE created_at
        END DESC
      LIMIT 50
    `;

    try {
      const result = await this.db.query(query, [companyId, entityId]);
      return result.rows;
    } catch (error) {
      this.logger?.error('Error getting entity timeline', { error, companyId, entityType, entityId });
      throw error;
    }
  }
}