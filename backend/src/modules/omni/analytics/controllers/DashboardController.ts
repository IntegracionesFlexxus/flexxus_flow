/**
 * DashboardController - Sprint 13
 */

import { injectable, inject } from 'inversify';
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { TYPES } from '@/container/types';

@injectable()
export class DashboardController {
  constructor(
    @inject(TYPES.OmniAnalyticsDashboardService) private dashboardService: DashboardService,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  async createDashboard(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const companyId = Number(req.user?.companyId);
      const userId = Number(req.user?.id);

      const dashboard = await this.dashboardService.createDashboard(req.body, companyId, userId);

      res.status(201).json({ success: true, data: dashboard });
    } catch (error) {
      this.logger.error('Error creating dashboard', { error });
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const companyId = Number(req.user?.companyId);
      const withData = req.query.withData === 'true';

      const result = withData
        ? await this.dashboardService.getDashboardData(id, companyId)
        : await this.dashboardService.getDashboard(id, companyId);

      if (!result) {
        res.status(404).json({ success: false, error: 'Dashboard not found' });
        return;
      }

      res.json({ success: true, data: result });
    } catch (error) {
      this.logger.error('Error getting dashboard', { error });
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getDashboards(req: Request, res: Response): Promise<void> {
    try {
      const companyId = Number(req.user?.companyId);
      const userId = Number(req.user?.id);

      const dashboards = await this.dashboardService.getDashboardsByCompany(companyId, userId);

      res.json({ success: true, data: dashboards });
    } catch (error) {
      this.logger.error('Error getting dashboards', { error });
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateDashboard(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const id = parseInt(req.params.id, 10);
      const companyId = Number(req.user?.companyId);

      const dashboard = await this.dashboardService.updateDashboard(id, req.body, companyId);

      res.json({ success: true, data: dashboard });
    } catch (error) {
      this.logger.error('Error updating dashboard', { error });
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async deleteDashboard(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const companyId = Number(req.user?.companyId);

      await this.dashboardService.deleteDashboard(id, companyId);

      res.json({ success: true, message: 'Dashboard deleted' });
    } catch (error) {
      this.logger.error('Error deleting dashboard', { error });
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async addWidget(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const dashboardId = parseInt(req.params.id, 10);
      const companyId = Number(req.user?.companyId);

      const widget = await this.dashboardService.addWidget(dashboardId, req.body, companyId);

      res.status(201).json({ success: true, data: widget });
    } catch (error) {
      this.logger.error('Error adding widget', { error });
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateWidget(req: Request, res: Response): Promise<void> {
    try {
      const widgetId = parseInt(req.params.widgetId, 10);
      const companyId = Number(req.user?.companyId);

      const widget = await this.dashboardService.updateWidget(widgetId, req.body, companyId);

      res.json({ success: true, data: widget });
    } catch (error) {
      this.logger.error('Error updating widget', { error });
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async deleteWidget(req: Request, res: Response): Promise<void> {
    try {
      const widgetId = parseInt(req.params.widgetId, 10);
      const companyId = Number(req.user?.companyId);

      await this.dashboardService.deleteWidget(widgetId, companyId);

      res.json({ success: true, message: 'Widget deleted' });
    } catch (error) {
      this.logger.error('Error deleting widget', { error });
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

interface DashboardService {
  createDashboard(data: any, companyId: number, userId: number): Promise<any>;
  getDashboard(id: number, companyId: number): Promise<any>;
  getDashboardData(id: number, companyId: number): Promise<any>;
  getDashboardsByCompany(companyId: number, userId: number): Promise<any[]>;
  updateDashboard(id: number, data: any, companyId: number): Promise<any>;
  deleteDashboard(id: number, companyId: number): Promise<void>;
  addWidget(dashboardId: number, data: any, companyId: number): Promise<any>;
  updateWidget(id: number, data: any, companyId: number): Promise<any>;
  deleteWidget(id: number, companyId: number): Promise<void>;
}

interface Logger {
  error(message: string, meta?: any): void;
}
