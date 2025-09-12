/**
 * Company Controller - Sprint 2
 * Siguiendo lineamientos nivel 2: controlador multi-tenant con gestión completa
 */

import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { TYPES } from '@/container/types';
import { ICompanyService } from '@/modules/companies/interfaces/ICompanyService';
import { IFeatureFlagService } from '@/modules/feature-flags/interfaces/IFeatureFlagService';
import { 
  CreateCompanyDto, 
  UpdateCompanyDto, 
  UpdateCompanySettingsDto,
  InviteUserDto,
  UpgradePlanDto,
  ToggleFeatureDto 
} from '@/shared/validators/company.validators';

@injectable()
export class CompanyController {
  constructor(
    @inject(TYPES.CompanyService) private companyService: ICompanyService,
    @inject(TYPES.FeatureFlagService) private featureFlagService: IFeatureFlagService,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  /**
   * Get all companies
   * GET /api/companies
   */
  getAllCompanies = async (req: Request, res: Response): Promise<void> => {
    try {
      // Only super admin can see all companies
      if (req.user?.role !== 'super_admin') {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
        return;
      }

      const companies = await this.companyService.getAllCompanies();

      res.status(200).json({
        success: true,
        data: companies
      });
    } catch (error) {
      this.logger.error('Get all companies error', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  /**
   * Get company by ID
   * GET /api/companies/:id
   */
  getCompanyById = async (req: Request, res: Response): Promise<void> => {
    try {
      const companyId = req.params.id;

      // Check permissions
      if (req.user?.companyId !== companyId && req.user?.role !== 'super_admin') {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
        return;
      }

      const company = await this.companyService.getCompanyById(companyId);

      if (!company) {
        res.status(404).json({
          success: false,
          message: 'Company not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: company
      });
    } catch (error) {
      this.logger.error('Get company by ID error', { 
        error: error.message,
        companyId: req.params.id 
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  /**
   * Create new company
   * POST /api/companies
   */
  createCompany = async (req: Request, res: Response): Promise<void> => {
    try {
      // Only super admin can create companies
      if (req.user?.role !== 'super_admin') {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
        return;
      }

      const company = await this.companyService.createCompany(req.body);

      this.logger.info('Company created', { 
        companyId: company.id,
        createdBy: req.user.id 
      });

      res.status(201).json({
        success: true,
        data: company
      });
    } catch (error) {
      this.logger.error('Create company error', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  /**
   * Delete company
   * DELETE /api/companies/:id
   */
  deleteCompany = async (req: Request, res: Response): Promise<void> => {
    try {
      // Only super admin can delete companies
      if (req.user?.role !== 'super_admin') {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
        return;
      }

      const companyId = req.params.id;
      await this.companyService.deleteCompany(companyId);

      this.logger.info('Company deleted', { 
        companyId,
        deletedBy: req.user.id 
      });

      res.status(200).json({
        success: true,
        message: 'Company deleted successfully'
      });
    } catch (error) {
      this.logger.error('Delete company error', { 
        error: error.message,
        companyId: req.params.id 
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  /**
   * Get current company info
   * GET /api/company
   */
  getCurrentCompany = async (req: Request, res: Response): Promise<void> => {
    try {
      // Require authentication
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      // Get company details
      const company = await this.companyService.getCompanyById(req.user.companyId);

      if (!company) {
        res.status(404).json({
          success: false,
          message: 'Company not found'
        });
        return;
      }

      // Get company statistics
      const stats = await this.companyService.getCompanyStats(req.user.companyId);

      res.status(200).json({
        success: true,
        data: {
          company: {
            id: company.id,
            name: company.name,
            description: company.description,
            plan: company.plan,
            website: company.website,
            phone: company.phone,
            address: company.address,
            features: company.features,
            settings: company.settings,
            isActive: company.isActive,
            createdAt: company.createdAt,
            updatedAt: company.updatedAt
          },
          stats: {
            totalUsers: stats.totalUsers,
            activeUsers: stats.activeUsers,
            totalSessions: stats.totalSessions,
            storageUsed: stats.storageUsed,
            planLimits: stats.planLimits
          },
          userRole: req.user.role
        }
      });

    } catch (error) {
      this.logger.error('Get current company error', {
        error: error.message,
        companyId: req.user?.companyId,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  /**
   * Update company information
   * PUT /api/company
   */
  updateCompany = async (req: Request, res: Response): Promise<void> => {
    try {
      // Require authentication and admin role
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      if (req.user.role !== 'admin') {
        res.status(403).json({
          success: false,
          message: 'Admin role required'
        });
        return;
      }

      // Validate input
      const updateCompanyDto = plainToInstance(UpdateCompanyDto, req.body);
      const errors = await validate(updateCompanyDto);

      if (errors.length > 0) {
        const errorMessages = errors.map(error => 
          Object.values(error.constraints || {}).join(', ')
        );

        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errorMessages
        });
        return;
      }

      // Update company
      const updatedCompany = await this.companyService.updateCompany(
        req.user.companyId,
        updateCompanyDto
      );

      if (!updatedCompany) {
        res.status(404).json({
          success: false,
          message: 'Company not found'
        });
        return;
      }

      this.logger.info('Company updated successfully', {
        companyId: req.user.companyId,
        updatedFields: Object.keys(updateCompanyDto),
        updatedBy: req.user.id
      });

      res.status(200).json({
        success: true,
        message: 'Company updated successfully',
        data: {
          company: {
            id: updatedCompany.id,
            name: updatedCompany.name,
            description: updatedCompany.description,
            plan: updatedCompany.plan,
            website: updatedCompany.website,
            phone: updatedCompany.phone,
            address: updatedCompany.address,
            features: updatedCompany.features,
            updatedAt: updatedCompany.updatedAt
          }
        }
      });

    } catch (error) {
      this.logger.error('Update company error', {
        error: error.message,
        companyId: req.user?.companyId,
        updatedBy: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  /**
   * Get company settings
   * GET /api/companies/:id/settings
   */
  getCompanySettings = async (req: Request, res: Response): Promise<void> => {
    try {
      const companyId = req.params.id;

      // Check permissions
      if (req.user?.companyId !== companyId && req.user?.role !== 'super_admin') {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
        return;
      }

      const settings = await this.companyService.getCompanySettings(companyId);

      res.status(200).json({
        success: true,
        data: settings
      });
    } catch (error) {
      this.logger.error('Get company settings error', { 
        error: error.message,
        companyId: req.params.id 
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  /**
   * Update company settings  
   * PUT /api/companies/:id/settings
   */
  updateCompanySettings = async (req: Request, res: Response): Promise<void> => {
    try {
      const companyId = req.params.id;

      // Check permissions - only company admin can update settings
      if (req.user?.companyId !== companyId || !['company_admin', 'super_admin'].includes(req.user?.role)) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
        return;
      }

      const settings = await this.companyService.updateCompanySettings(companyId, req.body);

      this.logger.info('Company settings updated', { 
        companyId,
        updatedBy: req.user.id 
      });

      res.status(200).json({
        success: true,
        data: settings
      });
    } catch (error) {
      this.logger.error('Update company settings error', { 
        error: error.message,
        companyId: req.params.id 
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  /**
   * Update company settings
   * PUT /api/company/settings
   */
  updateSettings = async (req: Request, res: Response): Promise<void> => {
    try {
      // Require authentication and admin/manager role
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      if (!['admin', 'manager'].includes(req.user.role)) {
        res.status(403).json({
          success: false,
          message: 'Admin or Manager role required'
        });
        return;
      }

      // Validate input
      const settingsDto = plainToInstance(UpdateCompanySettingsDto, req.body);
      const errors = await validate(settingsDto);

      if (errors.length > 0) {
        const errorMessages = errors.map(error => 
          Object.values(error.constraints || {}).join(', ')
        );

        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errorMessages
        });
        return;
      }

      // Update company settings
      const updatedSettings = await this.companyService.updateCompanySettings(
        req.user.companyId,
        settingsDto
      );

      this.logger.info('Company settings updated', {
        companyId: req.user.companyId,
        updatedSettings: Object.keys(settingsDto),
        updatedBy: req.user.id
      });

      res.status(200).json({
        success: true,
        message: 'Company settings updated successfully',
        data: {
          settings: updatedSettings
        }
      });

    } catch (error) {
      this.logger.error('Update company settings error', {
        error: error.message,
        companyId: req.user?.companyId,
        updatedBy: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  /**
   * Get company users
   * GET /api/company/users
   */
  getCompanyUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      // Require authentication
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      // Extract pagination params
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const role = req.query.role as string;
      const isActive = req.query.isActive === 'true' ? true : 
                      req.query.isActive === 'false' ? false : undefined;

      // Get company users
      const result = await this.companyService.getCompanyUsers(req.user.companyId, {
        page,
        limit,
        role,
        isActive
      });

      res.status(200).json({
        success: true,
        data: {
          users: result.users.map(user => ({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            avatar: user.avatar,
            isActive: user.isActive,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt
          })),
          pagination: {
            total: result.total,
            page,
            limit,
            totalPages: Math.ceil(result.total / limit)
          }
        }
      });

    } catch (error) {
      this.logger.error('Get company users error', {
        error: error.message,
        companyId: req.user?.companyId,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  /**
   * Invite user to company
   * POST /api/company/invite
   */
  inviteUser = async (req: Request, res: Response): Promise<void> => {
    try {
      // Require authentication and admin/manager role
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      if (!['admin', 'manager'].includes(req.user.role)) {
        res.status(403).json({
          success: false,
          message: 'Admin or Manager role required'
        });
        return;
      }

      // Validate input
      const inviteDto = plainToInstance(InviteUserDto, req.body);
      const errors = await validate(inviteDto);

      if (errors.length > 0) {
        const errorMessages = errors.map(error => 
          Object.values(error.constraints || {}).join(', ')
        );

        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errorMessages
        });
        return;
      }

      // Check if user already exists in company
      const existingUser = await this.companyService.getUserByEmailInCompany(
        inviteDto.email,
        req.user.companyId
      );

      if (existingUser) {
        res.status(400).json({
          success: false,
          message: 'User already exists in this company'
        });
        return;
      }

      // Create invitation
      const invitation = await this.companyService.inviteUser(req.user.companyId, {
        email: inviteDto.email,
        role: inviteDto.role,
        firstName: inviteDto.firstName,
        lastName: inviteDto.lastName,
        message: inviteDto.message,
        invitedBy: req.user.id
      });

      this.logger.info('User invitation created', {
        companyId: req.user.companyId,
        invitationId: invitation.id,
        invitedEmail: inviteDto.email,
        role: inviteDto.role,
        invitedBy: req.user.id
      });

      res.status(201).json({
        success: true,
        message: 'Invitation sent successfully',
        data: {
          invitation: {
            id: invitation.id,
            email: inviteDto.email,
            role: inviteDto.role,
            status: invitation.status,
            expiresAt: invitation.expiresAt,
            createdAt: invitation.createdAt
          }
        }
      });

    } catch (error) {
      this.logger.error('Invite user error', {
        error: error.message,
        companyId: req.user?.companyId,
        email: req.body?.email,
        invitedBy: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  /**
   * Get company invitations
   * GET /api/company/invitations
   */
  getInvitations = async (req: Request, res: Response): Promise<void> => {
    try {
      // Require authentication and admin/manager role
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      if (!['admin', 'manager'].includes(req.user.role)) {
        res.status(403).json({
          success: false,
          message: 'Admin or Manager role required'
        });
        return;
      }

      const status = req.query.status as string;

      // Get invitations
      const invitations = await this.companyService.getCompanyInvitations(req.user.companyId, {
        status
      });

      res.status(200).json({
        success: true,
        data: {
          invitations: invitations.map(invitation => ({
            id: invitation.id,
            email: invitation.email,
            role: invitation.role,
            firstName: invitation.firstName,
            lastName: invitation.lastName,
            status: invitation.status,
            message: invitation.message,
            invitedBy: invitation.invitedBy,
            expiresAt: invitation.expiresAt,
            createdAt: invitation.createdAt,
            acceptedAt: invitation.acceptedAt
          }))
        }
      });

    } catch (error) {
      this.logger.error('Get invitations error', {
        error: error.message,
        companyId: req.user?.companyId,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  /**
   * Revoke invitation
   * DELETE /api/company/invitations/:id
   */
  revokeInvitation = async (req: Request, res: Response): Promise<void> => {
    try {
      // Require authentication and admin/manager role
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      if (!['admin', 'manager'].includes(req.user.role)) {
        res.status(403).json({
          success: false,
          message: 'Admin or Manager role required'
        });
        return;
      }

      const invitationId = req.params.id;

      // Revoke invitation
      const revoked = await this.companyService.revokeInvitation(
        invitationId,
        req.user.companyId
      );

      if (!revoked) {
        res.status(404).json({
          success: false,
          message: 'Invitation not found'
        });
        return;
      }

      this.logger.info('Invitation revoked', {
        invitationId,
        companyId: req.user.companyId,
        revokedBy: req.user.id
      });

      res.status(200).json({
        success: true,
        message: 'Invitation revoked successfully'
      });

    } catch (error) {
      this.logger.error('Revoke invitation error', {
        error: error.message,
        invitationId: req.params.id,
        companyId: req.user?.companyId,
        revokedBy: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  /**
   * Get company feature flags
   * GET /api/company/features
   */
  getCompanyFeatures = async (req: Request, res: Response): Promise<void> => {
    try {
      // Require authentication
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      // Get all feature flags for the company
      const features = await this.featureFlagService.getAllFlags(
        req.user.companyId,
        'production',
        {
          userId: req.user.id,
          userRole: req.user.role
        }
      );

      res.status(200).json({
        success: true,
        data: {
          features,
          userContext: {
            id: req.user.id,
            role: req.user.role,
            companyId: req.user.companyId
          }
        }
      });

    } catch (error) {
      this.logger.error('Get company features error', {
        error: error.message,
        companyId: req.user?.companyId,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  /**
   * Get company usage statistics
   * GET /api/company/usage
   */
  getUsageStats = async (req: Request, res: Response): Promise<void> => {
    try {
      // Require authentication and admin/manager role
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      if (!['admin', 'manager'].includes(req.user.role)) {
        res.status(403).json({
          success: false,
          message: 'Admin or Manager role required'
        });
        return;
      }

      const period = req.query.period as string || '30d';

      // Get usage statistics
      const usage = await this.companyService.getUsageStats(req.user.companyId, period);

      res.status(200).json({
        success: true,
        data: {
          usage: {
            period,
            totalRequests: usage.totalRequests,
            totalUsers: usage.totalUsers,
            activeUsers: usage.activeUsers,
            storageUsed: usage.storageUsed,
            bandwidthUsed: usage.bandwidthUsed,
            planLimits: usage.planLimits,
            breakdown: usage.breakdown
          }
        }
      });

    } catch (error) {
      this.logger.error('Get usage stats error', {
        error: error.message,
        companyId: req.user?.companyId,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  /**
   * Upgrade company plan
   * POST /api/company/upgrade
   */
  upgradePlan = async (req: Request, res: Response): Promise<void> => {
    try {
      // Require authentication and admin role
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      if (req.user.role !== 'admin') {
        res.status(403).json({
          success: false,
          message: 'Admin role required'
        });
        return;
      }

      // Validate input
      const upgradeDto = plainToInstance(UpgradePlanDto, req.body);
      const errors = await validate(upgradeDto);

      if (errors.length > 0) {
        const errorMessages = errors.map(error => 
          Object.values(error.constraints || {}).join(', ')
        );

        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errorMessages
        });
        return;
      }

      // Process plan upgrade
      const upgrade = await this.companyService.upgradePlan(req.user.companyId, {
        newPlan: upgradeDto.newPlan,
        paymentMethod: upgradeDto.paymentMethod,
        annualBilling: upgradeDto.annualBilling,
        upgradedBy: req.user.id
      });

      this.logger.info('Company plan upgraded', {
        companyId: req.user.companyId,
        newPlan: upgradeDto.newPlan,
        previousPlan: upgrade.previousPlan,
        upgradedBy: req.user.id
      });

      res.status(200).json({
        success: true,
        message: 'Plan upgraded successfully',
        data: {
          upgrade: {
            newPlan: upgrade.newPlan,
            previousPlan: upgrade.previousPlan,
            effectiveDate: upgrade.effectiveDate,
            newFeatures: upgrade.newFeatures
          }
        }
      });

    } catch (error) {
      this.logger.error('Upgrade plan error', {
        error: error.message,
        companyId: req.user?.companyId,
        newPlan: req.body?.newPlan,
        upgradedBy: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  /**
   * Add user to company
   * POST /api/companies/:id/users
   */
  addUserToCompany = async (req: Request, res: Response): Promise<void> => {
    try {
      const companyId = req.params.id;
      const { userId, role } = req.body;

      // Check permissions
      if (req.user?.companyId !== companyId || !['company_admin', 'super_admin'].includes(req.user?.role)) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
        return;
      }

      await this.companyService.addUserToCompany(companyId, userId, role);

      this.logger.info('User added to company', { 
        companyId,
        userId,
        role,
        addedBy: req.user.id 
      });

      res.status(200).json({
        success: true,
        message: 'User added to company successfully'
      });
    } catch (error) {
      this.logger.error('Add user to company error', { 
        error: error.message,
        companyId: req.params.id 
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  /**
   * Remove user from company
   * DELETE /api/companies/:id/users/:userId
   */
  removeUserFromCompany = async (req: Request, res: Response): Promise<void> => {
    try {
      const companyId = req.params.id;
      const userId = req.params.userId;

      // Check permissions
      if (req.user?.companyId !== companyId || !['company_admin', 'super_admin'].includes(req.user?.role)) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
        return;
      }

      await this.companyService.removeUserFromCompany(companyId, userId);

      this.logger.info('User removed from company', { 
        companyId,
        userId,
        removedBy: req.user.id 
      });

      res.status(200).json({
        success: true,
        message: 'User removed from company successfully'
      });
    } catch (error) {
      this.logger.error('Remove user from company error', { 
        error: error.message,
        companyId: req.params.id,
        userId: req.params.userId 
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
}
