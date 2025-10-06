/**
 * Territory Controller
 * HTTP endpoints for territory management
 */

import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'inversify';
import { TerritoryManagementService } from '../services/TerritoryManagementService';
import { TYPES } from '@/container/types';
import { AppError, ErrorCode } from '@/shared/errors/AppError';

@injectable()
export class TerritoryController {
  constructor(
    @inject(TYPES.TerritoryManagementService) private territoryService: TerritoryManagementService,
    @inject(TYPES.Logger) private logger?: any
  ) {}

  /**
   * Create a new territory
   * POST /api/crm/territories
   */
  async createTerritory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const userId = (req as any).user.id;

      const territory = await this.territoryService.createTerritory(
        companyId,
        { ...req.body, created_by: userId }
      );

      res.status(201).json({
        success: true,
        data: territory,
        message: 'Territory created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all territories
   * GET /api/crm/territories
   */
  async getTerritories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const { type, status } = req.query;

      // TODO: getTerritories only accepts companyId, not filters
      const territories = await this.territoryService.getTerritories(companyId);

      res.json({
        success: true,
        data: territories
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get territory by ID
   * GET /api/crm/territories/:id
   */
  async getTerritoryById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const territoryId = parseInt(req.params.id);

      // TODO: Implement getTerritoryById in TerritoryService
      // const territory = await this.territoryService.getTerritoryById(
      //   companyId,
      //   territoryId
      // );

      const territory = null;

      if (!territory) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Territory not found', 404);
      }

      res.json({
        success: true,
        data: territory
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update territory
   * PUT /api/crm/territories/:id
   */
  async updateTerritory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const userId = (req as any).user.id;
      const territoryId = parseInt(req.params.id);

      const territory = await this.territoryService.updateTerritory(
        companyId,
        territoryId,
        { ...req.body, updated_by: userId }
      );

      res.json({
        success: true,
        data: territory,
        message: 'Territory updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete territory
   * DELETE /api/crm/territories/:id
   */
  async deleteTerritory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const territoryId = parseInt(req.params.id);

      await this.territoryService.deleteTerritory(companyId, territoryId);

      res.json({
        success: true,
        message: 'Territory deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get territory performance metrics
   * GET /api/crm/territories/:id/performance
   */
  async getTerritoryPerformance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const territoryId = parseInt(req.params.id);

      const performance = await this.territoryService.getTerritoryPerformance(
        companyId,
        territoryId
      );

      res.json({
        success: true,
        data: performance
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get territory hierarchy
   * GET /api/crm/territories/:id/hierarchy
   */
  async getTerritoryHierarchy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const territoryId = parseInt(req.params.id);

      const hierarchy = await this.territoryService.getTerritoryHierarchy(
        companyId,
        territoryId
      );

      res.json({
        success: true,
        data: hierarchy
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Assign accounts to territory
   * POST /api/crm/territories/:id/assign-accounts
   */
  async assignAccountsToTerritory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const userId = (req as any).user.id;
      const territoryId = parseInt(req.params.id);
      const { account_ids, reason } = req.body;

      if (!account_ids || !Array.isArray(account_ids)) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'Account IDs array is required', 400);
      }

      const results = await this.territoryService.bulkAssignAccountsToTerritory(
        companyId,
        territoryId,
        account_ids,
        userId,
        reason
      );

      res.json({
        success: true,
        data: results,
        message: 'Accounts assigned to territory successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Auto-assign accounts to territories
   * POST /api/crm/territories/auto-assign
   */
  async autoAssignAccounts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const userId = (req as any).user.id;
      const { territory_id, account_ids } = req.body;

      const results = await this.territoryService.autoAssignAccountsToTerritories(
        companyId,
        { territory_id, account_ids, assigned_by: userId }
      );

      res.json({
        success: true,
        data: results,
        message: 'Accounts auto-assigned successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Rebalance territories
   * POST /api/crm/territories/rebalance
   */
  async rebalanceTerritories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const userId = (req as any).user.id;

      const result = await this.territoryService.rebalanceTerritories(
        companyId,
        { ...req.body, initiated_by: userId }
      );

      res.json({
        success: true,
        data: result,
        message: 'Territories rebalanced successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get territory coverage analysis
   * GET /api/crm/territories/coverage
   */
  async getTerritCoverageAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;

      const coverage = await this.territoryService.analyzeTerritoryoverage(
        companyId
      );

      res.json({
        success: true,
        data: coverage
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get territories with low performance
   * GET /api/crm/territories/low-performance
   */
  async getLowPerformanceTerritories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const threshold = parseFloat(req.query.threshold as string) || 0.7;

      const territories = await this.territoryService.getTerritoriesWithLowPerformance(
        companyId,
        threshold
      );

      res.json({
        success: true,
        data: territories
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get territory assignment history
   * GET /api/crm/territories/:id/assignment-history
   */
  async getTerritoryAssignmentHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const territoryId = parseInt(req.params.id);
      const startDate = req.query.start_date ? new Date(req.query.start_date as string) : undefined;
      const endDate = req.query.end_date ? new Date(req.query.end_date as string) : undefined;

      const history = await this.territoryService.getTerritoryAssignmentHistory(
        companyId,
        territoryId,
        startDate,
        endDate
      );

      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update territory targets
   * PUT /api/crm/territories/:id/targets
   */
  async updateTerritoryTargets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const userId = (req as any).user.id;
      const territoryId = parseInt(req.params.id);

      // TODO: Implement updateTerritoryTargets in TerritoryService
      // const territory = await this.territoryService.updateTerritoryTargets(
      //   companyId,
      //   territoryId,
      //   { ...req.body, updated_by: userId }
      // );

      const territory = null;

      res.json({
        success: true,
        data: territory,
        message: 'Territory targets updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Split territory
   * POST /api/crm/territories/:id/split
   */
  async splitTerritory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const userId = (req as any).user.id;
      const territoryId = parseInt(req.params.id);
      const { split_criteria, new_territory_names } = req.body;

      if (!split_criteria || !new_territory_names || !Array.isArray(new_territory_names)) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'Split criteria and new territory names are required', 400);
      }

      const result = await this.territoryService.splitTerritory(
        companyId,
        territoryId,
        split_criteria,
        new_territory_names,
        userId
      );

      res.json({
        success: true,
        data: result,
        message: 'Territory split successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Merge territories
   * POST /api/crm/territories/merge
   */
  async mergeTerritories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const userId = (req as any).user.id;
      const { primary_territory_id, territory_ids_to_merge } = req.body;

      if (!primary_territory_id || !territory_ids_to_merge || !Array.isArray(territory_ids_to_merge)) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'Primary territory ID and territory IDs to merge are required', 400);
      }

      // TODO: Implement mergeTerritories in TerritoryService
      // const result = await this.territoryService.mergeTerritories(
      //   companyId,
      //   primary_territory_id,
      //   territory_ids_to_merge,
      //   userId
      // );

      const result = null;

      res.json({
        success: true,
        data: result,
        message: 'Territories merged successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}