/**
 * Pipeline Service
 * Dedicated service for pipeline visualization and management
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { OpportunityRepository } from '../repositories/OpportunityRepository';
import { IDatabaseConnection } from '@/shared/database/interfaces/IDatabaseConnection';

interface PipelineStage {
  id: number;
  name: string;
  code: string;
  order_position: number;
  probability: number;
  is_won: boolean;
  is_lost: boolean;
}

interface PipelineData {
  stages: PipelineStage[];
  opportunities: any[];
  metrics: any;
}

@injectable()
export class PipelineService {
  constructor(
    @inject(TYPES.OpportunityRepository) private opportunityRepository: OpportunityRepository,
    @inject(TYPES.CrmConnection) private db: IDatabaseConnection,
    @inject(TYPES.Logger) private logger?: any
  ) {}

  /**
   * Get complete pipeline data including stages and opportunities
   */
  async getPipelineData(companyId: number, filters: any = {}): Promise<PipelineData> {
    try {
      // Get sales stages for the company
      const stagesQuery = `
        SELECT
          id,
          code,
          name,
          order_position,
          probability,
          is_won,
          is_lost
        FROM public.sales_stages
        WHERE company_id = $1 AND is_active = true
        ORDER BY order_position
      `;

      const stagesResult = await this.db.query(stagesQuery, [companyId]);
      const stages = stagesResult;

      // Get opportunities
      const opportunitiesQuery = `
        SELECT
          o.id,
          o.name,
          o.opportunity_number,
          o.amount,
          o.probability,
          o.stage_id,
          o.close_date,
          o.owner_id,
          o.account_id,
          o.status,
          a.name as account_name,
          u.name as owner_name
        FROM public.opportunities o
        LEFT JOIN public.accounts a ON o.account_id = a.id
        LEFT JOIN public.users u ON o.owner_id = u.id
        WHERE o.company_id = $1
          AND o.status = 'open'
          ${filters.owner_id ? 'AND o.owner_id = $2' : ''}
        ORDER BY o.stage_id, o.amount DESC
      `;

      const params = [companyId];
      if (filters.owner_id) {
        params.push(filters.owner_id);
      }

      const opportunitiesResult = await this.db.query(opportunitiesQuery, params);
      const opportunities = opportunitiesResult;

      // Get pipeline metrics
      const metrics = await this.opportunityRepository.getPipelineMetrics(companyId, filters.owner_id);

      return {
        stages,
        opportunities,
        metrics
      };
    } catch (error) {
      this.logger?.error('Error getting pipeline data', { error, companyId, filters });
      throw error;
    }
  }

  /**
   * Ensure default sales stages exist for a company
   */
  async ensureDefaultStages(companyId: number): Promise<void> {
    try {
      // Check if company has stages
      const checkQuery = `
        SELECT COUNT(*) as count
        FROM public.sales_stages
        WHERE company_id = $1
      `;

      const result = await this.db.query(checkQuery, [companyId]);
      const count = parseInt(result[0].count);

      if (count === 0) {
        // Insert default stages
        const insertQuery = `
          INSERT INTO public.sales_stages (company_id, code, name, order_position, probability, is_won, is_lost)
          VALUES
            ($1, 'PROSPECTING', 'Prospección', 1, 10, false, false),
            ($1, 'QUALIFICATION', 'Calificación', 2, 20, false, false),
            ($1, 'PROPOSAL', 'Propuesta', 3, 50, false, false),
            ($1, 'NEGOTIATION', 'Negociación', 4, 75, false, false),
            ($1, 'CLOSED_WON', 'Cerrado-Ganado', 5, 100, true, false),
            ($1, 'CLOSED_LOST', 'Cerrado-Perdido', 6, 0, false, true)
        `;

        await this.db.query(insertQuery, [companyId]);
        this.logger?.info('Default sales stages created for company', { companyId });
      }
    } catch (error) {
      this.logger?.error('Error ensuring default stages', { error, companyId });
      throw error;
    }
  }
}