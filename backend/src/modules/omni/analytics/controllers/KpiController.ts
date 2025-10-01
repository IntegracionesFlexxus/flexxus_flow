/**
 * KpiController - Sprint 13
 */

import { injectable, inject } from 'inversify';
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { TYPES } from '@/container/types';

@injectable()
export class KpiController {
  constructor(
    @inject(TYPES.AnalyticsKpiService) private kpiService: KpiService,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  async createKpi(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const companyId = req.user?.companyId;

      const kpi = await this.kpiService.createKpi(req.body, companyId);

      res.status(201).json({ success: true, data: kpi });
    } catch (error) {
      this.logger.error('Error creating KPI', { error });
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getKpisByCategory(req: Request, res: Response): Promise<void> {
    try {
      const category = req.params.category;
      const companyId = req.user?.companyId;

      const kpis = await this.kpiService.getKpisByCategory(category, companyId);

      res.json({ success: true, data: kpis });
    } catch (error) {
      this.logger.error('Error getting KPIs by category', { error });
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async calculateKpi(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const companyId = req.user?.companyId;

      const value = await this.kpiService.calculateKpi(id, companyId);

      res.json({ success: true, data: { value } });
    } catch (error) {
      this.logger.error('Error calculating KPI', { error });
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getKpiTrend(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const companyId = req.user?.companyId;
      const dateRange = {
        startDate: new Date(req.query.startDate as string),
        endDate: new Date(req.query.endDate as string)
      };

      const trend = await this.kpiService.getKpiTrend(id, companyId, dateRange);

      res.json({ success: true, data: trend });
    } catch (error) {
      this.logger.error('Error getting KPI trend', { error });
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateKpi(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const id = parseInt(req.params.id);
      const companyId = req.user?.companyId;

      const kpi = await this.kpiService.updateKpi(id, req.body, companyId);

      res.json({ success: true, data: kpi });
    } catch (error) {
      this.logger.error('Error updating KPI', { error });
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

interface KpiService {
  createKpi(data: any, companyId: number): Promise<any>;
  getKpisByCategory(category: string, companyId: number): Promise<any[]>;
  calculateKpi(id: number, companyId: number): Promise<number>;
  getKpiTrend(id: number, companyId: number, dateRange: any): Promise<any[]>;
  updateKpi(id: number, data: any, companyId: number): Promise<any>;
}

interface Logger {
  error(message: string, meta?: any): void;
}
