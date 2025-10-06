/**
 * Contact Controller
 * HTTP endpoints for contact management
 */

import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'inversify';
import { IContactService } from '../interfaces/IContactService';
import { TYPES } from '@/container/types';
import { AppError, ErrorCode } from '@/shared/errors/AppError';
import { ContactRoleManagementService } from '../services/ContactRoleManagementService';

@injectable()
export class ContactController {
  constructor(
    @inject(TYPES.ContactService) private contactService: IContactService,
    @inject(TYPES.ContactRoleManagementService) private roleService: ContactRoleManagementService,
    @inject(TYPES.Logger) private logger?: any
  ) {}

  /**
   * Create a new contact
   * POST /api/crm/contacts
   */
  async createContact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const companyId = (req as any).user.companyId;

      const contactData = {
        ...req.body,
        company_id: companyId
      };

      const contact = await this.contactService.createContact(contactData, userId);

      res.status(201).json({
        success: true,
        data: contact,
        message: 'Contact created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all contacts with filters
   * GET /api/crm/contacts
   */
  async getContacts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const filters = {
        ...req.query,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20
      };

      const result = await this.contactService.listContacts(companyId, filters);

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
   * Get contact by ID
   * GET /api/crm/contacts/:id
   */
  async getContactById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const contactId = parseInt(req.params.id);

      const contact = await this.contactService.getContactById(contactId, companyId);

      if (!contact) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Contact not found', 404);
      }

      res.json({
        success: true,
        data: contact
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update contact
   * PUT /api/crm/contacts/:id
   */
  async updateContact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const companyId = (req as any).user.companyId;
      const contactId = parseInt(req.params.id);

      const contact = await this.contactService.updateContact(contactId, companyId, req.body, userId);

      if (!contact) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Contact not found', 404);
      }

      res.json({
        success: true,
        data: contact,
        message: 'Contact updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete contact
   * DELETE /api/crm/contacts/:id
   */
  async deleteContact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const companyId = (req as any).user.companyId;
      const contactId = parseInt(req.params.id);

      const deleted = await this.contactService.deleteContact(contactId, companyId, userId);

      if (!deleted) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Contact not found', 404);
      }

      res.json({
        success: true,
        message: 'Contact deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get contacts by account
   * GET /api/crm/contacts/account/:accountId
   */
  async getContactsByAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const accountId = parseInt(req.params.accountId);

      const contacts = await this.contactService.getContactsByAccount(accountId, companyId);

      res.json({
        success: true,
        data: contacts
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Set primary contact
   * PUT /api/crm/contacts/:id/primary
   */
  async setPrimaryContact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const companyId = (req as any).user.companyId;
      const contactId = parseInt(req.params.id);
      const { accountId } = req.body;

      if (!accountId) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'Account ID is required', 400);
      }

      const result = await this.contactService.setPrimaryContact(
        contactId,
        accountId,
        companyId,
        userId
      );

      res.json({
        success: true,
        data: { isPrimary: result },
        message: 'Primary contact set successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get contact hierarchy
   * GET /api/crm/contacts/:id/hierarchy
   */
  async getContactHierarchy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const contactId = parseInt(req.params.id);

      const hierarchy = await this.contactService.getContactHierarchy(contactId, companyId);

      res.json({
        success: true,
        data: hierarchy
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Find duplicate contacts
   * GET /api/crm/contacts/duplicates
   */
  async findDuplicates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const { email } = req.query;

      if (!email) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'Email is required to find duplicates', 400);
      }

      const duplicates = await this.contactService.findDuplicates(email as string, companyId);

      res.json({
        success: true,
        data: duplicates
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Merge contacts
   * POST /api/crm/contacts/merge
   */
  async mergeContacts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const companyId = (req as any).user.companyId;
      const { primaryContactId, duplicateContactIds } = req.body;

      if (!primaryContactId || !duplicateContactIds || !Array.isArray(duplicateContactIds)) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'Primary contact ID and duplicate contact IDs are required', 400);
      }

      const contact = await this.contactService.mergeContacts(
        primaryContactId,
        duplicateContactIds,
        companyId,
        userId
      );

      res.json({
        success: true,
        data: contact,
        message: 'Contacts merged successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get birthday contacts
   * GET /api/crm/contacts/birthdays
   */
  async getBirthdayContacts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const daysAhead = parseInt(req.query.daysAhead as string) || 7;

      const contacts = await this.contactService.getBirthdayContacts(companyId, daysAhead);

      res.json({
        success: true,
        data: contacts
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Sprint 17 Endpoints ====================

  /**
   * Create contact role
   * POST /api/crm/contacts/:id/roles
   */
  async createContactRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const userId = (req as any).user.id;
      const contactId = parseInt(req.params.id);

      const role = await this.roleService.createContactRole(
        companyId,
        {
          ...req.body,
          contact_id: contactId,
          created_by: userId
        }
      );

      res.status(201).json({
        success: true,
        data: role,
        message: 'Contact role created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get contact roles
   * GET /api/crm/contacts/:id/roles
   */
  async getContactRoles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const contactId = parseInt(req.params.id);

      const roles = await this.roleService.getContactRoles(
        companyId,
        contactId
      );

      res.json({
        success: true,
        data: roles
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update contact role
   * PUT /api/crm/contacts/roles/:roleId
   */
  async updateContactRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const userId = (req as any).user.id;
      const roleId = parseInt(req.params.roleId);

      const role = await this.roleService.updateContactRole(
        companyId,
        roleId,
        { ...req.body, updated_by: userId }
      );

      res.json({
        success: true,
        data: role,
        message: 'Contact role updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create buying committee
   * POST /api/crm/contacts/buying-committees
   */
  async createBuyingCommittee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const userId = (req as any).user.id;

      const { accountId, committeeName, committeeType, decisionStage, opportunityId } = req.body;
      const committee = await this.roleService.createBuyingCommittee(
        companyId,
        accountId,
        committeeName,
        committeeType,
        decisionStage,
        opportunityId
      );

      res.status(201).json({
        success: true,
        data: committee,
        message: 'Buying committee created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get buying committee by opportunity
   * GET /api/crm/contacts/buying-committees/opportunity/:opportunityId
   */
  async getBuyingCommittee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const opportunityId = parseInt(req.params.opportunityId);

      const committee = await this.roleService.getBuyingCommitteeByOpportunity(
        companyId,
        opportunityId
      );

      res.json({
        success: true,
        data: committee
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add member to buying committee
   * POST /api/crm/contacts/buying-committees/:committeeId/members
   */
  async addCommitteeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const userId = (req as any).user.id;
      const committeeId = parseInt(req.params.committeeId);

      const { contactId, roleInCommittee, votingPower, stance, isChampion } = req.body;
      const member = await this.roleService.addMemberToBuyingCommittee(
        companyId,
        committeeId,
        contactId,
        roleInCommittee,
        votingPower,
        stance,
        isChampion
      );

      res.status(201).json({
        success: true,
        data: member,
        message: 'Member added to committee successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update committee member
   * PUT /api/crm/contacts/buying-committees/:committeeId/members/:memberId
   */
  async updateCommitteeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const userId = (req as any).user.id;
      const memberId = parseInt(req.params.memberId);

      const member = await this.roleService.updateCommitteeMember(
        companyId,
        memberId,
        { ...req.body, updated_by: userId }
      );

      res.json({
        success: true,
        data: member,
        message: 'Committee member updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get influence map for account
   * GET /api/crm/contacts/influence-map/:accountId
   */
  async getInfluenceMap(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const accountId = parseInt(req.params.accountId);

      const influenceMap = await this.roleService.getInfluenceMap(
        companyId,
        accountId
      );

      res.json({
        success: true,
        data: influenceMap
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Analyze contact influence
   * POST /api/crm/contacts/:id/analyze-influence
   */
  async analyzeContactInfluence(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const contactId = parseInt(req.params.id);

      const analysis = await this.roleService.analyzeContactInfluence(
        companyId,
        contactId
      );

      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get role effectiveness metrics
   * GET /api/crm/contacts/roles/effectiveness
   */
  async getRoleEffectiveness(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const startDate = req.query.start_date ? new Date(req.query.start_date as string) : undefined;
      const endDate = req.query.end_date ? new Date(req.query.end_date as string) : undefined;

      const metrics = await this.roleService.getRoleEffectivenessMetrics(
        companyId,
        startDate,
        endDate
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
   * Remove member from committee
   * DELETE /api/crm/contacts/buying-committees/:committeeId/members/:memberId
   */
  async removeCommitteeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const committeeId = parseInt(req.params.committeeId);
      const memberId = parseInt(req.params.memberId);

      await this.roleService.removeMemberFromCommittee(
        companyId,
        committeeId,
        memberId
      );

      res.json({
        success: true,
        message: 'Member removed from committee successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Assign role to contact in an account
   * POST /api/crm/accounts/:accountId/contacts/:contactId/role
   */
  async assignContactRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const accountId = parseInt(req.params.accountId);
      const contactId = parseInt(req.params.contactId);
      const { roleId, isPrimary, influenceScore } = req.body;

      if (!roleId) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'Role ID is required', 400);
      }

      const assignment = await this.roleService.assignRoleToContact(
        companyId,
        accountId,
        contactId,
        roleId,
        isPrimary || false,
        influenceScore
      );

      res.json({
        success: true,
        data: assignment,
        message: 'Role assigned to contact successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove role from contact in an account
   * DELETE /api/crm/accounts/:accountId/contacts/:contactId/role/:roleId
   */
  async removeContactRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const accountId = parseInt(req.params.accountId);
      const contactId = parseInt(req.params.contactId);
      const roleId = parseInt(req.params.roleId);

      await this.roleService.removeRoleFromContact(
        companyId,
        accountId,
        contactId,
        roleId
      );

      res.json({
        success: true,
        message: 'Role removed from contact successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}