/**
 * Account Controller
 * HTTP endpoints for account management
 */

import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'inversify';
import { IAccountService } from '../interfaces/IAccountService';
import { TYPES } from '@/container/types';
import { AppError, ErrorCode } from '@/shared/errors/AppError';
import { AccountHierarchyService } from '../services/AccountHierarchyService';
import { TerritoryManagementService } from '../services/TerritoryManagementService';
import { AccountHealthScoringService } from '../services/AccountHealthScoringService';

@injectable()
export class AccountController {
  constructor(
    @inject(TYPES.AccountService) private accountService: IAccountService,
    @inject(TYPES.AccountHierarchyService) private hierarchyService: AccountHierarchyService,
    @inject(TYPES.TerritoryManagementService) private territoryService: TerritoryManagementService,
    @inject(TYPES.AccountHealthScoringService) private healthService: AccountHealthScoringService,
    @inject(TYPES.Logger) private logger?: any
  ) {}

  /**
   * Create a new account
   * POST /api/crm/accounts
   */
  async createAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const companyId = (req as any).user.companyId;

      const accountData = {
        ...req.body,
        company_id: companyId
      };

      const account = await this.accountService.createAccount(accountData, userId);

      res.status(201).json({
        success: true,
        data: account,
        message: 'Account created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all accounts with filters
   * GET /api/crm/accounts
   */
  async getAccounts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const filters = {
        ...req.query,
        page: parseInt(req.query.page as string || '1', 10),
        limit: parseInt(req.query.limit as string || '20', 10)
      };

      const result = await this.accountService.listAccounts(companyId, filters);

      res.json({
        success: true,
        data: result.data,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get account by ID
   * GET /api/crm/accounts/:id
   */
  async getAccountById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const accountId = parseInt(req.params.id);

      const account = await this.accountService.getAccountById(accountId, companyId);

      if (!account) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Account not found', 404);
      }

      res.json({
        success: true,
        data: account
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update account
   * PUT /api/crm/accounts/:id
   */
  async updateAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const companyId = (req as any).user.companyId;
      const accountId = parseInt(req.params.id);

      const account = await this.accountService.updateAccount(accountId, companyId, req.body, userId);

      if (!account) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Account not found', 404);
      }

      res.json({
        success: true,
        data: account,
        message: 'Account updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete account
   * DELETE /api/crm/accounts/:id
   */
  async deleteAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const companyId = (req as any).user.companyId;
      const accountId = parseInt(req.params.id);

      const deleted = await this.accountService.deleteAccount(accountId, companyId, userId);

      if (!deleted) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Account not found', 404);
      }

      res.json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get account hierarchy
   * GET /api/crm/accounts/:id/hierarchy
   */
  async getAccountHierarchy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const accountId = parseInt(req.params.id);

      const hierarchy = await this.accountService.getAccountHierarchy(accountId, companyId);

      if (!hierarchy) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Account not found', 404);
      }

      res.json({
        success: true,
        data: hierarchy
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get account metrics
   * GET /api/crm/accounts/metrics
   */
  async getAccountMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;

      const metrics = await this.accountService.getAccountMetrics(companyId);

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Find duplicate accounts
   * GET /api/crm/accounts/duplicates
   */
  async findDuplicates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const { name, cuit } = req.query;

      if (!name) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'Account name is required to find duplicates', 400);
      }

      const duplicates = await this.accountService.findDuplicates(
        name as string,
        cuit as string || null,
        companyId
      );

      res.json({
        success: true,
        data: duplicates
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Merge accounts
   * POST /api/crm/accounts/merge
   */
  async mergeAccounts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const companyId = (req as any).user.companyId;
      const { primaryAccountId, duplicateAccountIds } = req.body;

      if (!primaryAccountId || !duplicateAccountIds || !Array.isArray(duplicateAccountIds)) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'Primary account ID and duplicate account IDs are required', 400);
      }

      const account = await this.accountService.mergeAccounts(
        primaryAccountId,
        duplicateAccountIds,
        companyId,
        userId
      );

      res.json({
        success: true,
        data: account,
        message: 'Accounts merged successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update account rating
   * PUT /api/crm/accounts/:id/rating
   */
  async updateAccountRating(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const companyId = (req as any).user.companyId;
      const accountId = parseInt(req.params.id);
      const { rating } = req.body;

      if (!rating || !['hot', 'warm', 'cold'].includes(rating)) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'Valid rating is required (hot, warm, cold)', 400);
      }

      const account = await this.accountService.updateAccountRating(
        accountId,
        companyId,
        rating,
        userId
      );

      res.json({
        success: true,
        data: account,
        message: 'Account rating updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get top accounts
   * GET /api/crm/accounts/top
   */
  async getTopAccounts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const limit = parseInt(req.query.limit as string || '10', 10);

      const accounts = await this.accountService.getTopAccounts(companyId, limit);

      res.json({
        success: true,
        data: accounts
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Sprint 17 Endpoints ====================

  /**
   * Create account hierarchy relationship
   * POST /api/crm/accounts/hierarchy
   */
  async createHierarchy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const userId = (req as any).user.id;

      const hierarchy = await this.hierarchyService.createHierarchy(
        companyId,
        { ...req.body, created_by: userId }
      );

      res.status(201).json({
        success: true,
        data: hierarchy,
        message: 'Account hierarchy created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get full hierarchy for an account
   * GET /api/crm/accounts/:id/hierarchy/full
   */
  async getFullHierarchy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const accountId = parseInt(req.params.id);
      const depth = parseInt(req.query.depth as string) || 3;

      const hierarchy = await this.hierarchyService.getHierarchyTree(
        companyId,
        accountId,
        depth
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
   * Get account health score
   * GET /api/crm/accounts/:id/health
   */
  async getAccountHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const accountId = parseInt(req.params.id);

      const health = await this.healthService.calculateHealthScore(
        companyId,
        accountId
      );

      res.json({
        success: true,
        data: health
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get account health history
   * GET /api/crm/accounts/:id/health/history
   */
  async getHealthHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const accountId = parseInt(req.params.id);
      const startDate = req.query.start_date ? new Date(req.query.start_date as string) : undefined;
      const endDate = req.query.end_date ? new Date(req.query.end_date as string) : undefined;

      const history = await this.healthService.getHealthHistory(
        companyId,
        accountId,
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
   * Get health alerts for accounts
   * GET /api/crm/accounts/health/alerts
   */
  async getHealthAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const severity = req.query.severity as string;
      const status = req.query.status as string;

      const alerts = await this.healthService.getHealthAlerts(
        companyId,
        { severity, status } as any
      );

      res.json({
        success: true,
        data: alerts
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get account territory
   * GET /api/crm/accounts/:id/territory
   */
  async getAccountTerritory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const accountId = parseInt(req.params.id);

      const territory = await this.territoryService.getAccountTerritory(
        companyId,
        accountId
      );

      res.json({
        success: true,
        data: territory
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Assign account to territory
   * POST /api/crm/accounts/:id/territory
   */
  async assignToTerritory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const userId = (req as any).user.id;
      const accountId = parseInt(req.params.id);
      const { territory_id, reason } = req.body;

      // TODO: Implement assignAccountToTerritory in TerritoryService
      // const assignment = await this.territoryService.assignAccountToTerritory(
      //   companyId,
      //   {
      //     account_id: accountId,
      //     territory_id,
      //     assigned_by: userId,
      //     reason
      //   }
      // );

      res.status(501).json({
        success: false,
        message: 'assignAccountToTerritory method not yet implemented'
        // data: assignment,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get rollup metrics for account hierarchy
   * GET /api/crm/accounts/:id/hierarchy/metrics
   */
  async getHierarchyMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const accountId = parseInt(req.params.id);

      const metrics = await this.hierarchyService.calculateRollupMetrics(
        companyId,
        accountId
      );

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk update account health scores
   * POST /api/crm/accounts/health/bulk-calculate
   */
  async bulkCalculateHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const { account_ids } = req.body;

      const results = await this.healthService.bulkCalculateHealthScores(
        companyId,
        account_ids || []
      );

      res.json({
        success: true,
        data: results,
        message: 'Health scores calculated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get territory performance for accounts
   * GET /api/crm/accounts/territory/:territoryId/performance
   */
  async getTerritoryPerformance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const territoryId = parseInt(req.params.territoryId);

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
   * Remove hierarchy relationship between accounts
   * DELETE /api/crm/accounts/:parentId/hierarchy/:childId
   */
  async removeHierarchy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const parentId = parseInt(req.params.parentId);
      const childId = parseInt(req.params.childId);

      await this.hierarchyService.removeHierarchyRelationship(
        companyId,
        parentId,
        childId
      );

      res.json({
        success: true,
        message: 'Hierarchy relationship removed successfully'
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
      const { active, assignedOnly } = req.query;

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
   * Advanced search for accounts
   * POST /api/crm/accounts/search/advanced
   */
  async advancedSearch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const {
        query,
        filters,
        sorting,
        pagination
      } = req.body;

      const results = await this.accountService.advancedSearch(
        companyId,
        {
          query: query || '',
          filters: filters || {},
          sorting: sorting || { field: 'name', order: 'asc' },
          pagination: pagination || { page: 1, limit: 20 }
        }
      );

      res.json({
        success: true,
        data: results.data,
        pagination: results.pagination
      });
    } catch (error) {
      next(error);
    }
  }
}