/**
 * KpiService - Sprint 13
 * Service for KPI management and calculation
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import type {
  KpiDefinition,
  KpiValue,
  CreateKpiDto,
  UpdateKpiDto,
  DateRange
} from '../types/analytics.types';

@injectable()
export class KpiService {
  constructor(
    @inject(TYPES.KpiRepository) private kpiRepo: KpiRepository,
    @inject(TYPES.CalculationEngine) private calculator: CalculationEngine,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  async createKpi(data: CreateKpiDto, companyId: number): Promise<KpiDefinition> {
    try {
      this.logger.info('Creating KPI', { name: data.name, companyId });
      return await this.kpiRepo.createDefinition(data, companyId);
    } catch (error) {
      this.logger.error('Error creating KPI', { error });
      throw new Error(`Failed to create KPI: ${error.message}`);
    }
  }

  async getKpisByCategory(category: string, companyId: number): Promise<KpiDefinition[]> {
    try {
      return await this.kpiRepo.getDefinitions(companyId, category);
    } catch (error) {
      this.logger.error('Error getting KPIs by category', { error, category });
      throw new Error(`Failed to get KPIs: ${error.message}`);
    }
  }

  async calculateKpi(kpiId: number, companyId: number): Promise<number> {
    try {
      this.logger.info('Calculating KPI', { kpiId, companyId });

      const kpi = await this.kpiRepo.getDefinitionById(kpiId, companyId);

      if (!kpi) {
        throw new Error('KPI not found');
      }

      // Calculate value based on formula
      const value = await this.executeKpiFormula(kpi);

      // Save calculated value
      await this.kpiRepo.insertValue(kpiId, companyId, value);

      return value;
    } catch (error) {
      this.logger.error('Error calculating KPI', { error, kpiId });
      throw new Error(`Failed to calculate KPI: ${error.message}`);
    }
  }

  async getKpiTrend(
    kpiId: number,
    companyId: number,
    dateRange: DateRange
  ): Promise<KpiValue[]> {
    try {
      return await this.kpiRepo.getValues(kpiId, companyId, dateRange);
    } catch (error) {
      this.logger.error('Error getting KPI trend', { error, kpiId });
      throw new Error(`Failed to get KPI trend: ${error.message}`);
    }
  }

  async updateKpi(id: number, data: UpdateKpiDto, companyId: number): Promise<KpiDefinition> {
    try {
      const kpi = await this.kpiRepo.updateDefinition(id, data, companyId);
      if (!kpi) throw new Error('KPI not found');
      return kpi;
    } catch (error) {
      this.logger.error('Error updating KPI', { error, id });
      throw new Error(`Failed to update KPI: ${error.message}`);
    }
  }

  private async executeKpiFormula(kpi: KpiDefinition): Promise<number> {
    // Simplified - in production would parse and execute formula
    return 0;
  }
}

interface KpiRepository {
  createDefinition(data: CreateKpiDto, companyId: number): Promise<KpiDefinition>;
  getDefinitions(companyId: number, category?: string): Promise<KpiDefinition[]>;
  getDefinitionById(id: number, companyId: number): Promise<KpiDefinition | null>;
  updateDefinition(id: number, data: UpdateKpiDto, companyId: number): Promise<KpiDefinition | null>;
  insertValue(kpiId: number, companyId: number, value: number, dimensions?: Record<string, any>): Promise<void>;
  getValues(kpiId: number, companyId: number, dateRange: DateRange): Promise<KpiValue[]>;
}

interface CalculationEngine {
  calculateAverage(values: number[]): number;
  calculateSum(values: number[]): number;
}

interface Logger {
  error(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
}
