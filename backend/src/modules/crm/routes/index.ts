/**
 * CRM Module Routes
 * Aggregates all CRM routes for registration
 */

import { Router } from 'express';
import { Container } from 'inversify';
import { TYPES } from '@/container/types';
import { AuthMiddleware } from '@/shared/middleware/auth';
import { validate } from '@/shared/middleware/validation';

// Import validators
import * as leadValidators from '../validators/lead.validators';
import * as accountValidators from '../validators/account.validators';
import * as contactValidators from '../validators/contact.validators';
import * as opportunityValidators from '../validators/opportunity.validators';
import * as activityValidators from '../validators/activity.validators';

// Import Sprint 16 Lead Management routes
import { leadManagementRoutes, leadManagementWebhooks } from './leadManagement.routes';

// Import Sprint 20 Product & Quote routes
import { createProductQuoteRoutes } from '../product-quote/routes';

// Import Sprint 21 Calendar routes
import { registerCalendarRoutes } from './calendar.routes';

// Import Sprint 22 Analytics routes
import { createAnalyticsRoutes } from './analytics.routes';

export function registerCRMRoutes(container: Container): Router {
  const router = Router();

  // Get controllers from container
  const leadController = container.get(TYPES.LeadController);
  const accountController = container.get(TYPES.AccountController);
  const contactController = container.get(TYPES.ContactController);
  const opportunityController = container.get(TYPES.OpportunityController);
  const activityController = container.get(TYPES.ActivityController);

  // Middleware
  const authMiddleware = container.get<AuthMiddleware>(TYPES.AuthMiddleware);

  // ==================== LEAD ROUTES ====================
  router.post(
    '/leads',
    authMiddleware.authenticate.bind(authMiddleware),
    validate({ body: leadValidators.leadCreateSchema }),
    leadController.createLead.bind(leadController)
  );

  router.get(
    '/leads',
    authMiddleware.authenticate.bind(authMiddleware),
    leadController.getLeads.bind(leadController)
  );

  router.get(
    '/leads/metrics',
    authMiddleware.authenticate.bind(authMiddleware),
    leadController.getLeadMetrics.bind(leadController)
  );

  router.get(
    '/leads/duplicates',
    authMiddleware.authenticate.bind(authMiddleware),
    leadController.findDuplicates.bind(leadController)
  );

  router.get(
    '/leads/:id',
    authMiddleware.authenticate.bind(authMiddleware),
    leadController.getLeadById.bind(leadController)
  );

  router.put(
    '/leads/:id',
    authMiddleware.authenticate.bind(authMiddleware),
    validate({ body: leadValidators.leadUpdateSchema }),
    leadController.updateLead.bind(leadController)
  );

  router.delete(
    '/leads/:id',
    authMiddleware.authenticate.bind(authMiddleware),
    leadController.deleteLead.bind(leadController)
  );

  router.post(
    '/leads/:id/qualify',
    authMiddleware.authenticate.bind(authMiddleware),
    leadController.qualifyLead.bind(leadController)
  );

  router.post(
    '/leads/:id/convert',
    authMiddleware.authenticate.bind(authMiddleware),
    validate({ body: leadValidators.leadConversionSchema }),
    leadController.convertLead.bind(leadController)
  );

  router.post(
    '/leads/:id/score',
    authMiddleware.authenticate.bind(authMiddleware),
    leadController.updateLeadScore.bind(leadController)
  );

  router.post(
    '/leads/score/bulk',
    authMiddleware.authenticate.bind(authMiddleware),
    leadController.bulkUpdateScores.bind(leadController)
  );

  router.post(
    '/leads/:id/assign',
    authMiddleware.authenticate.bind(authMiddleware),
    leadController.assignLead.bind(leadController)
  );

  router.post(
    '/leads/merge',
    authMiddleware.authenticate.bind(authMiddleware),
    leadController.mergeLeads.bind(leadController)
  );

  // ==================== ACCOUNT ROUTES ====================
  router.post(
    '/accounts',
    authMiddleware.authenticate.bind(authMiddleware),
    validate({ body: accountValidators.accountCreateSchema }),
    accountController.createAccount.bind(accountController)
  );

  router.get(
    '/accounts',
    authMiddleware.authenticate.bind(authMiddleware),
    accountController.getAccounts.bind(accountController)
  );

  router.get(
    '/accounts/metrics',
    authMiddleware.authenticate.bind(authMiddleware),
    accountController.getAccountMetrics.bind(accountController)
  );

  router.get(
    '/accounts/duplicates',
    authMiddleware.authenticate.bind(authMiddleware),
    accountController.findDuplicates.bind(accountController)
  );

  router.get(
    '/accounts/top',
    authMiddleware.authenticate.bind(authMiddleware),
    accountController.getTopAccounts.bind(accountController)
  );

  router.get(
    '/accounts/:id',
    authMiddleware.authenticate.bind(authMiddleware),
    accountController.getAccountById.bind(accountController)
  );

  router.put(
    '/accounts/:id',
    authMiddleware.authenticate.bind(authMiddleware),
    validate({ body: accountValidators.accountUpdateSchema }),
    accountController.updateAccount.bind(accountController)
  );

  router.delete(
    '/accounts/:id',
    authMiddleware.authenticate.bind(authMiddleware),
    accountController.deleteAccount.bind(accountController)
  );

  router.get(
    '/accounts/:id/hierarchy',
    authMiddleware.authenticate.bind(authMiddleware),
    accountController.getAccountHierarchy.bind(accountController)
  );

  router.put(
    '/accounts/:id/rating',
    authMiddleware.authenticate.bind(authMiddleware),
    accountController.updateAccountRating.bind(accountController)
  );

  router.post(
    '/accounts/merge',
    authMiddleware.authenticate.bind(authMiddleware),
    accountController.mergeAccounts.bind(accountController)
  );

  // ==================== SPRINT 17: ACCOUNT MANAGEMENT ROUTES ====================
  // Account Health Scoring
  router.get(
    '/accounts/:id/health',
    authMiddleware.authenticate.bind(authMiddleware),
    accountController.getAccountHealth.bind(accountController)
  );

  // Ruta removida - La funcionalidad está cubierta por GET /accounts/:id/health

  // Account Hierarchy
  router.post(
    '/accounts/:id/hierarchy',
    authMiddleware.authenticate.bind(authMiddleware),
    accountController.createHierarchy.bind(accountController)
  );

  router.get(
    '/accounts/:id/hierarchy/full',
    authMiddleware.authenticate.bind(authMiddleware),
    accountController.getFullHierarchy.bind(accountController)
  );

  router.delete(
    '/accounts/:parentId/hierarchy/:childId',
    authMiddleware.authenticate.bind(authMiddleware),
    accountController.removeHierarchy.bind(accountController)
  );

  // Territory Management
  router.post(
    '/accounts/:id/territory',
    authMiddleware.authenticate.bind(authMiddleware),
    accountController.assignToTerritory.bind(accountController)
  );

  router.get(
    '/accounts/:id/territory',
    authMiddleware.authenticate.bind(authMiddleware),
    accountController.getAccountTerritory.bind(accountController)
  );

  router.get(
    '/territories',
    authMiddleware.authenticate.bind(authMiddleware),
    accountController.getTerritories.bind(accountController)
  );

  router.get(
    '/territories/:id/performance',
    authMiddleware.authenticate.bind(authMiddleware),
    accountController.getTerritoryPerformance.bind(accountController)
  );

  // Advanced Search
  router.post(
    '/accounts/search/advanced',
    authMiddleware.authenticate.bind(authMiddleware),
    accountController.advancedSearch.bind(accountController)
  );

  // ==================== CONTACT ROUTES ====================
  router.post(
    '/contacts',
    authMiddleware.authenticate.bind(authMiddleware),
    validate({ body: contactValidators.contactCreateSchema }),
    contactController.createContact.bind(contactController)
  );

  router.get(
    '/contacts',
    authMiddleware.authenticate.bind(authMiddleware),
    contactController.getContacts.bind(contactController)
  );

  router.get(
    '/contacts/duplicates',
    authMiddleware.authenticate.bind(authMiddleware),
    contactController.findDuplicates.bind(contactController)
  );

  router.get(
    '/contacts/birthdays',
    authMiddleware.authenticate.bind(authMiddleware),
    contactController.getBirthdayContacts.bind(contactController)
  );

  router.get(
    '/contacts/:id',
    authMiddleware.authenticate.bind(authMiddleware),
    contactController.getContactById.bind(contactController)
  );

  router.put(
    '/contacts/:id',
    authMiddleware.authenticate.bind(authMiddleware),
    validate({ body: contactValidators.contactUpdateSchema }),
    contactController.updateContact.bind(contactController)
  );

  router.delete(
    '/contacts/:id',
    authMiddleware.authenticate.bind(authMiddleware),
    contactController.deleteContact.bind(contactController)
  );

  router.get(
    '/contacts/account/:accountId',
    authMiddleware.authenticate.bind(authMiddleware),
    contactController.getContactsByAccount.bind(contactController)
  );

  router.put(
    '/contacts/:id/primary',
    authMiddleware.authenticate.bind(authMiddleware),
    contactController.setPrimaryContact.bind(contactController)
  );

  router.get(
    '/contacts/:id/hierarchy',
    authMiddleware.authenticate.bind(authMiddleware),
    contactController.getContactHierarchy.bind(contactController)
  );

  router.post(
    '/contacts/merge',
    authMiddleware.authenticate.bind(authMiddleware),
    contactController.mergeContacts.bind(contactController)
  );

  // ==================== SPRINT 17: CONTACT MANAGEMENT ROUTES ====================
  // Contact Roles
  router.post(
    '/accounts/:accountId/contacts/:contactId/role',
    authMiddleware.authenticate.bind(authMiddleware),
    contactController.assignContactRole.bind(contactController)
  );

  router.get(
    '/accounts/:accountId/contacts/roles',
    authMiddleware.authenticate.bind(authMiddleware),
    contactController.getContactRoles.bind(contactController)
  );

  router.put(
    '/contact-roles/:id',
    authMiddleware.authenticate.bind(authMiddleware),
    contactController.updateContactRole.bind(contactController)
  );

  router.delete(
    '/contact-roles/:id',
    authMiddleware.authenticate.bind(authMiddleware),
    contactController.removeContactRole.bind(contactController)
  );

  // Buying Committees
  router.post(
    '/opportunities/:opportunityId/buying-committee',
    authMiddleware.authenticate.bind(authMiddleware),
    contactController.createBuyingCommittee.bind(contactController)
  );

  router.get(
    '/opportunities/:opportunityId/buying-committee',
    authMiddleware.authenticate.bind(authMiddleware),
    contactController.getBuyingCommittee.bind(contactController)
  );

  router.post(
    '/buying-committees/:id/members',
    authMiddleware.authenticate.bind(authMiddleware),
    contactController.addCommitteeMember.bind(contactController)
  );

  router.delete(
    '/buying-committees/:id/members/:memberId',
    authMiddleware.authenticate.bind(authMiddleware),
    contactController.removeCommitteeMember.bind(contactController)
  );

  // ==================== OPPORTUNITY ROUTES ====================
  router.post(
    '/opportunities',
    authMiddleware.authenticate.bind(authMiddleware),
    validate({ body: opportunityValidators.opportunityCreateSchema }),
    opportunityController.createOpportunity.bind(opportunityController)
  );

  router.get(
    '/opportunities',
    authMiddleware.authenticate.bind(authMiddleware),
    opportunityController.getOpportunities.bind(opportunityController)
  );

  router.get(
    '/opportunities/pipeline',
    authMiddleware.authenticate.bind(authMiddleware),
    opportunityController.getPipeline.bind(opportunityController)
  );

  router.get(
    '/opportunities/pipeline/metrics',
    authMiddleware.authenticate.bind(authMiddleware),
    opportunityController.getPipelineMetrics.bind(opportunityController)
  );

  router.get(
    '/opportunities/forecast',
    authMiddleware.authenticate.bind(authMiddleware),
    opportunityController.getForecastData.bind(opportunityController)
  );

  router.get(
    '/opportunities/analysis/win-loss',
    authMiddleware.authenticate.bind(authMiddleware),
    opportunityController.getWinLossAnalysis.bind(opportunityController)
  );

  router.get(
    '/opportunities/:id',
    authMiddleware.authenticate.bind(authMiddleware),
    opportunityController.getOpportunityById.bind(opportunityController)
  );

  router.put(
    '/opportunities/:id',
    authMiddleware.authenticate.bind(authMiddleware),
    validate({ body: opportunityValidators.opportunityUpdateSchema }),
    opportunityController.updateOpportunity.bind(opportunityController)
  );

  router.delete(
    '/opportunities/:id',
    authMiddleware.authenticate.bind(authMiddleware),
    opportunityController.deleteOpportunity.bind(opportunityController)
  );

  router.put(
    '/opportunities/:id/stage',
    authMiddleware.authenticate.bind(authMiddleware),
    validate({ body: opportunityValidators.opportunityStageUpdateSchema }),
    opportunityController.updateStage.bind(opportunityController)
  );

  router.post(
    '/opportunities/:id/won',
    authMiddleware.authenticate.bind(authMiddleware),
    opportunityController.markAsWon.bind(opportunityController)
  );

  router.post(
    '/opportunities/:id/lost',
    authMiddleware.authenticate.bind(authMiddleware),
    opportunityController.markAsLost.bind(opportunityController)
  );

  router.post(
    '/opportunities/:id/clone',
    authMiddleware.authenticate.bind(authMiddleware),
    opportunityController.cloneOpportunity.bind(opportunityController)
  );

  router.get(
    '/opportunities/:id/weighted-value',
    authMiddleware.authenticate.bind(authMiddleware),
    opportunityController.calculateWeightedValue.bind(opportunityController)
  );

  // ==================== SPRINT 18: PIPELINE MANAGEMENT ROUTES ====================
  // ML Predictions - COMENTADO: Métodos no implementados aún
  // router.get(
  //   '/opportunities/:id/predictions',
  //   authMiddleware.authenticate.bind(authMiddleware),
  //   opportunityController.getPredictions.bind(opportunityController)
  // );

  // router.post(
  //   '/opportunities/predictions/batch',
  //   authMiddleware.authenticate.bind(authMiddleware),
  //   opportunityController.getBatchPredictions.bind(opportunityController)
  // );

  // Opportunity Timeline
  router.get(
    '/opportunities/:id/timeline',
    authMiddleware.authenticate.bind(authMiddleware),
    opportunityController.getTimeline.bind(opportunityController)
  );

  // Bulk Operations
  router.post(
    '/opportunities/bulk',
    authMiddleware.authenticate.bind(authMiddleware),
    validate({ body: opportunityValidators.opportunityBulkCreateSchema }),
    opportunityController.bulkCreate.bind(opportunityController)
  );

  router.put(
    '/opportunities/bulk',
    authMiddleware.authenticate.bind(authMiddleware),
    validate({ body: opportunityValidators.opportunityBulkUpdateSchema }),
    opportunityController.bulkUpdate.bind(opportunityController)
  );

  router.delete(
    '/opportunities/bulk',
    authMiddleware.authenticate.bind(authMiddleware),
    validate({ body: opportunityValidators.opportunityBulkDeleteSchema }),
    opportunityController.bulkDelete.bind(opportunityController)
  );

  // ==================== ACTIVITY ROUTES ====================
  router.post(
    '/activities',
    authMiddleware.authenticate.bind(authMiddleware),
    validate({ body: activityValidators.activityCreateSchema }),
    activityController.createActivity.bind(activityController)
  );

  router.get(
    '/activities',
    authMiddleware.authenticate.bind(authMiddleware),
    activityController.getActivities.bind(activityController)
  );

  router.get(
    '/activities/overdue',
    authMiddleware.authenticate.bind(authMiddleware),
    activityController.getOverdueActivities.bind(activityController)
  );

  router.get(
    '/activities/reminders',
    authMiddleware.authenticate.bind(authMiddleware),
    activityController.getActivitiesWithReminders.bind(activityController)
  );

  router.get(
    '/activities/metrics',
    authMiddleware.authenticate.bind(authMiddleware),
    activityController.getActivityMetrics.bind(activityController)
  );

  router.get(
    '/activities/my',
    authMiddleware.authenticate.bind(authMiddleware),
    activityController.getMyActivities.bind(activityController)
  );

  router.get(
    '/activities/:id',
    authMiddleware.authenticate.bind(authMiddleware),
    activityController.getActivityById.bind(activityController)
  );

  router.put(
    '/activities/:id',
    authMiddleware.authenticate.bind(authMiddleware),
    validate({ body: activityValidators.activityUpdateSchema }),
    activityController.updateActivity.bind(activityController)
  );

  router.delete(
    '/activities/:id',
    authMiddleware.authenticate.bind(authMiddleware),
    activityController.deleteActivity.bind(activityController)
  );

  router.post(
    '/activities/:id/complete',
    authMiddleware.authenticate.bind(authMiddleware),
    validate({ body: activityValidators.activityCompleteSchema }),
    activityController.completeActivity.bind(activityController)
  );

  router.post(
    '/activities/:id/reschedule',
    authMiddleware.authenticate.bind(authMiddleware),
    validate({ body: activityValidators.activityRescheduleSchema }),
    activityController.rescheduleActivity.bind(activityController)
  );

  router.post(
    '/activities/bulk/status',
    authMiddleware.authenticate.bind(authMiddleware),
    activityController.bulkUpdateStatus.bind(activityController)
  );

  router.get(
    '/activities/timeline/:entityType/:entityId',
    authMiddleware.authenticate.bind(authMiddleware),
    activityController.getEntityTimeline.bind(activityController)
  );

  router.get(
    '/activities/user/:userId',
    authMiddleware.authenticate.bind(authMiddleware),
    activityController.getUserActivities.bind(activityController)
  );

  // ==================== SPRINT 16: LEAD MANAGEMENT ROUTES ====================
  // Mount lead management routes (these already include auth middleware)
  router.use('/', leadManagementRoutes);

  // Mount webhook routes (no auth required as they're external)
  router.use('/webhooks', leadManagementWebhooks);

  // ==================== SPRINT 20: PRODUCT & QUOTE ROUTES ====================
  // Mount product and quote management routes
  router.use('/product-quote', createProductQuoteRoutes(container));

  // ==================== SPRINT 21: CALENDAR & TASK AUTOMATION ROUTES ====================
  // Register calendar integration and task automation routes
  registerCalendarRoutes(router, container);

  // ==================== SPRINT 22: CRM ANALYTICS & INTEGRATION ROUTES ====================
  // Register analytics, reporting, and export routes
  const analyticsRoutes = createAnalyticsRoutes(container);
  router.use('/analytics', analyticsRoutes);

  return router;
}

export default registerCRMRoutes;