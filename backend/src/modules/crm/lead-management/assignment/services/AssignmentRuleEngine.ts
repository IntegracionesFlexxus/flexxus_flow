/**
 * Assignment Rule Engine Service
 * Manages lead assignment rules and automatic distribution
 * Works independently without external dependencies
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { Pool } from 'pg';
import { LeadRepository } from '../../../repositories/LeadRepository';
import { EventEmitter } from 'events';

export interface IAssignmentRule {
  id: number;
  name: string;
  priority: number;
  criteria: any;
  assignment_type: 'round_robin' | 'load_balance' | 'territory' | 'manual';
  assignee_pool: number[];
  is_active: boolean;
}

export interface IAssignmentResult {
  leadId: number;
  assignedTo: number;
  assignmentType: string;
  ruleName: string;
  slaHours: number;
  reason: string;
}

@injectable()
export class AssignmentRuleEngine {
  private roundRobinIndex: Map<number, number> = new Map();

  constructor(
    @inject(TYPES.LeadRepository) private leadRepo: LeadRepository,
    @inject(TYPES.DatabasePool) private db: Pool,
    @inject(TYPES.EventEmitter) private eventBus: EventEmitter
  ) {}

  /**
   * Assign lead based on rules
   */
  async assignLead(leadId: number, companyId: number, manualAssignee?: number): Promise<IAssignmentResult> {
    const lead = await this.leadRepo.findById(leadId);
    if (!lead) throw new Error('Lead not found');

    // Manual assignment takes precedence
    if (manualAssignee) {
      return this.performManualAssignment(leadId, manualAssignee, companyId);
    }

    // Get applicable rules
    const rules = await this.getApplicableRules(lead, companyId);

    if (rules.length === 0) {
      // Default assignment if no rules match
      return this.performDefaultAssignment(leadId, companyId);
    }

    // Apply the highest priority rule
    const rule = rules[0];
    return this.applyAssignmentRule(lead, rule, companyId);
  }

  /**
   * Auto-assign unassigned leads
   */
  async autoAssignUnassignedLeads(companyId: number, limit: number = 100): Promise<IAssignmentResult[]> {
    const query = `
      SELECT id FROM public.leads
      WHERE company_id = $1
        AND assigned_to IS NULL
        AND status != 'converted'
      LIMIT $2
    `;

    const result = await this.db.query(query, [companyId, limit]);
    const results: IAssignmentResult[] = [];

    for (const row of result.rows) {
      try {
        const assignmentResult = await this.assignLead(row.id, companyId);
        results.push(assignmentResult);
      } catch (error) {
        console.error(`Error assigning lead ${row.id}:`, error);
      }
    }

    this.eventBus.emit('leads.bulk_assigned', {
      companyId,
      count: results.length,
      timestamp: new Date()
    });

    return results;
  }

  /**
   * Get applicable rules for a lead
   */
  private async getApplicableRules(lead: any, companyId: number): Promise<IAssignmentRule[]> {
    const query = `
      SELECT * FROM public.assignment_rules
      WHERE company_id = $1
        AND is_active = true
      ORDER BY priority DESC, created_at ASC
    `;

    const result = await this.db.query(query, [companyId]);
    const rules = result.rows;

    // Filter rules based on criteria
    return rules.filter(rule => this.matchesCriteria(lead, rule.criteria));
  }

  /**
   * Check if lead matches rule criteria
   */
  private matchesCriteria(lead: any, criteria: any): boolean {
    if (!criteria) return true;

    // Score-based criteria
    if (criteria.minScore && lead.score < criteria.minScore) return false;
    if (criteria.maxScore && lead.score > criteria.maxScore) return false;

    // Status criteria
    if (criteria.status && lead.status !== criteria.status) return false;

    // Source criteria
    if (criteria.sourceId && lead.source_id !== criteria.sourceId) return false;

    // Budget criteria
    if (criteria.minBudget && (!lead.budget || lead.budget < criteria.minBudget)) return false;
    if (criteria.maxBudget && lead.budget > criteria.maxBudget) return false;

    // Authority level
    if (criteria.authorityLevel && lead.authority_level !== criteria.authorityLevel) return false;

    // Timeline
    if (criteria.timeline && lead.timeline !== criteria.timeline) return false;

    // Geographic criteria
    if (criteria.cityId && lead.city_id !== criteria.cityId) return false;
    if (criteria.regionId) {
      // Would need to join with cities table to check region
      // For now, skip region check
    }

    // Industry criteria
    if (criteria.industryId && lead.industry_id !== criteria.industryId) return false;

    // Company size criteria
    if (criteria.minEmployees && (!lead.employee_count || lead.employee_count < criteria.minEmployees)) {
      return false;
    }
    if (criteria.maxEmployees && lead.employee_count > criteria.maxEmployees) {
      return false;
    }

    return true;
  }

  /**
   * Apply assignment rule to lead
   */
  private async applyAssignmentRule(
    lead: any,
    rule: IAssignmentRule,
    companyId: number
  ): Promise<IAssignmentResult> {
    let assigneeId: number;

    switch (rule.assignment_type) {
      case 'round_robin':
        assigneeId = await this.getRoundRobinAssignee(rule, companyId);
        break;
      case 'load_balance':
        assigneeId = await this.getLoadBalancedAssignee(rule, companyId);
        break;
      case 'territory':
        assigneeId = await this.getTerritoryAssignee(lead, rule, companyId);
        break;
      default:
        throw new Error(`Unknown assignment type: ${rule.assignment_type}`);
    }

    // Perform the assignment
    await this.performAssignment(lead.id, assigneeId, rule.id, companyId);

    // Calculate SLA
    const slaHours = this.calculateSLA(lead, rule);

    const result: IAssignmentResult = {
      leadId: lead.id,
      assignedTo: assigneeId,
      assignmentType: rule.assignment_type,
      ruleName: rule.name,
      slaHours,
      reason: `Assigned by rule: ${rule.name}`
    };

    // Emit assignment event
    this.eventBus.emit('lead.assigned', {
      ...result,
      companyId,
      timestamp: new Date()
    });

    return result;
  }

  /**
   * Get next assignee using round-robin
   */
  private async getRoundRobinAssignee(rule: IAssignmentRule, companyId: number): Promise<number> {
    const pool = await this.getActiveAssigneePool(rule.assignee_pool);
    if (pool.length === 0) {
      throw new Error('No active assignees in pool');
    }

    // Get current index for this rule
    const key = `${companyId}-${rule.id}`;
    let currentIndex = this.roundRobinIndex.get(key) || 0;

    // Get next assignee
    const assigneeId = pool[currentIndex % pool.length];

    // Update index for next time
    this.roundRobinIndex.set(key, (currentIndex + 1) % pool.length);

    return assigneeId;
  }

  /**
   * Get assignee with lowest current load
   */
  private async getLoadBalancedAssignee(rule: IAssignmentRule, companyId: number): Promise<number> {
    const pool = await this.getActiveAssigneePool(rule.assignee_pool);
    if (pool.length === 0) {
      throw new Error('No active assignees in pool');
    }

    // Get current lead counts for each assignee
    const query = `
      SELECT assigned_to, COUNT(*) as lead_count
      FROM public.leads
      WHERE company_id = $1
        AND assigned_to = ANY($2::int[])
        AND status NOT IN ('converted', 'disqualified')
      GROUP BY assigned_to
    `;

    const result = await this.db.query(query, [companyId, pool]);

    // Create map of assignee loads
    const loads = new Map<number, number>();
    pool.forEach(id => loads.set(id, 0));
    result.rows.forEach(row => {
      loads.set(parseInt(row.assigned_to), parseInt(row.lead_count));
    });

    // Find assignee with minimum load
    let minLoad = Number.MAX_VALUE;
    let selectedAssignee = pool[0];

    for (const [assigneeId, load] of loads.entries()) {
      if (load < minLoad) {
        minLoad = load;
        selectedAssignee = assigneeId;
      }
    }

    return selectedAssignee;
  }

  /**
   * Get territory-based assignee
   */
  private async getTerritoryAssignee(lead: any, rule: IAssignmentRule, companyId: number): Promise<number> {
    // Territory assignment based on geographic or other criteria
    // For now, use load balancing within the territory pool
    const territoryPool = await this.getTerritorySalesReps(lead, rule.assignee_pool);

    if (territoryPool.length === 0) {
      // Fallback to general pool
      return this.getLoadBalancedAssignee(rule, companyId);
    }

    // Use load balancing within territory
    const modifiedRule = { ...rule, assignee_pool: territoryPool };
    return this.getLoadBalancedAssignee(modifiedRule, companyId);
  }

  /**
   * Get sales reps for a territory
   */
  private async getTerritorySalesReps(lead: any, pool: number[]): Promise<number[]> {
    // This would normally check territory assignments
    // For now, return the original pool
    return pool;
  }

  /**
   * Get active users from assignee pool
   */
  private async getActiveAssigneePool(pool: number[]): Promise<number[]> {
    if (!pool || pool.length === 0) return [];

    const query = `
      SELECT id FROM public.users
      WHERE id = ANY($1::int[])
        AND is_active = true
    `;

    const result = await this.db.query(query, [pool]);
    return result.rows.map(row => row.id);
  }

  /**
   * Perform the actual assignment
   */
  private async performAssignment(
    leadId: number,
    assigneeId: number,
    ruleId: number,
    companyId: number
  ): Promise<void> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Update lead
      await client.query(
        `UPDATE public.leads
         SET assigned_to = $1,
             assigned_at = NOW(),
             updated_at = NOW()
         WHERE id = $2 AND company_id = $3`,
        [assigneeId, leadId, companyId]
      );

      // Log assignment
      await client.query(
        `INSERT INTO public.lead_assignment_logs
         (lead_id, assigned_to, assignment_rule_id, assigned_at, company_id)
         VALUES ($1, $2, $3, NOW(), $4)`,
        [leadId, assigneeId, ruleId, companyId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Manual assignment
   */
  private async performManualAssignment(
    leadId: number,
    assigneeId: number,
    companyId: number
  ): Promise<IAssignmentResult> {
    await this.performAssignment(leadId, assigneeId, null, companyId);

    const result: IAssignmentResult = {
      leadId,
      assignedTo: assigneeId,
      assignmentType: 'manual',
      ruleName: 'Manual Assignment',
      slaHours: 24, // Default SLA for manual assignments
      reason: 'Manually assigned'
    };

    this.eventBus.emit('lead.assigned', {
      ...result,
      companyId,
      timestamp: new Date()
    });

    return result;
  }

  /**
   * Default assignment when no rules match
   */
  private async performDefaultAssignment(leadId: number, companyId: number): Promise<IAssignmentResult> {
    // Get any active sales rep
    const query = `
      SELECT u.id
      FROM public.users u
      JOIN public.user_roles ur ON u.id = ur.user_id
      JOIN public.roles r ON ur.role_id = r.id
      WHERE u.company_id = $1
        AND u.is_active = true
        AND r.name IN ('sales', 'admin')
      ORDER BY (
        SELECT COUNT(*) FROM public.leads
        WHERE assigned_to = u.id
          AND status NOT IN ('converted', 'disqualified')
      ) ASC
      LIMIT 1
    `;

    const result = await this.db.query(query, [companyId]);

    if (result.rows.length === 0) {
      throw new Error('No active users available for assignment');
    }

    const assigneeId = result.rows[0].id;
    await this.performAssignment(leadId, assigneeId, null, companyId);

    return {
      leadId,
      assignedTo: assigneeId,
      assignmentType: 'default',
      ruleName: 'Default Assignment',
      slaHours: 24,
      reason: 'No matching rules - assigned to available rep'
    };
  }

  /**
   * Calculate SLA based on lead priority
   */
  private calculateSLA(lead: any, rule: IAssignmentRule): number {
    // Hot leads get shorter SLA
    if (lead.score >= 80 || lead.timeline === 'immediate') {
      return 4; // 4 hours
    }

    // Warm leads
    if (lead.score >= 50 || lead.timeline === '1_month') {
      return 8; // 8 hours
    }

    // Cool leads
    if (lead.score >= 30) {
      return 24; // 24 hours
    }

    // Cold leads
    return 48; // 48 hours
  }

  /**
   * Create assignment rule
   */
  async createAssignmentRule(rule: Partial<IAssignmentRule>, companyId: number): Promise<IAssignmentRule> {
    const query = `
      INSERT INTO public.assignment_rules
      (company_id, name, priority, criteria, assignment_type, assignee_pool, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      companyId,
      rule.name,
      rule.priority || 0,
      JSON.stringify(rule.criteria || {}),
      rule.assignment_type,
      rule.assignee_pool || [],
      rule.is_active !== false
    ]);

    return result.rows[0];
  }

  /**
   * Update assignment rule
   */
  async updateAssignmentRule(
    ruleId: number,
    updates: Partial<IAssignmentRule>,
    companyId: number
  ): Promise<IAssignmentRule> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }

    if (updates.priority !== undefined) {
      fields.push(`priority = $${paramIndex++}`);
      values.push(updates.priority);
    }

    if (updates.criteria !== undefined) {
      fields.push(`criteria = $${paramIndex++}`);
      values.push(JSON.stringify(updates.criteria));
    }

    if (updates.assignment_type !== undefined) {
      fields.push(`assignment_type = $${paramIndex++}`);
      values.push(updates.assignment_type);
    }

    if (updates.assignee_pool !== undefined) {
      fields.push(`assignee_pool = $${paramIndex++}`);
      values.push(updates.assignee_pool);
    }

    if (updates.is_active !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      values.push(updates.is_active);
    }

    fields.push(`updated_at = NOW()`);

    const query = `
      UPDATE public.assignment_rules
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex} AND company_id = $${paramIndex + 1}
      RETURNING *
    `;

    values.push(ruleId, companyId);

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Get assignment rules
   */
  async getAssignmentRules(companyId: number): Promise<IAssignmentRule[]> {
    const query = `
      SELECT * FROM public.assignment_rules
      WHERE company_id = $1
      ORDER BY priority DESC, created_at ASC
    `;

    const result = await this.db.query(query, [companyId]);
    return result.rows;
  }

  /**
   * Check SLA compliance
   */
  async checkSLACompliance(companyId: number): Promise<any> {
    const query = `
      SELECT
        l.id,
        l.first_name,
        l.last_name,
        l.assigned_to,
        l.assigned_at,
        u.name as assignee_name,
        EXTRACT(EPOCH FROM (NOW() - l.assigned_at)) / 3600 as hours_since_assignment,
        CASE
          WHEN l.score >= 80 THEN 4
          WHEN l.score >= 50 THEN 8
          WHEN l.score >= 30 THEN 24
          ELSE 48
        END as sla_hours
      FROM public.leads l
      LEFT JOIN public.users u ON l.assigned_to = u.id
      WHERE l.company_id = $1
        AND l.assigned_to IS NOT NULL
        AND l.status = 'new'
        AND l.assigned_at IS NOT NULL
    `;

    const result = await this.db.query(query, [companyId]);

    const violations = result.rows.filter(row =>
      parseFloat(row.hours_since_assignment) > parseFloat(row.sla_hours)
    );

    return {
      total: result.rows.length,
      violations: violations.length,
      details: violations
    };
  }
}