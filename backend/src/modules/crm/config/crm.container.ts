/**
 * CRM Container Configuration
 * Dependency injection configuration for CRM module
 */

import { Container } from 'inversify';
import { TYPES } from '@/container/types';
import { EventEmitter } from 'events';

// Database
import { CRMDatabaseConnection } from './database.config';

// Auth Middleware
import { AuthMiddleware } from '@/shared/middleware/auth';

// Repositories
import { LeadRepository } from '../repositories/LeadRepository';
import { AccountRepository } from '../repositories/AccountRepository';
import { ContactRepository } from '../repositories/ContactRepository';
import { OpportunityRepository } from '../repositories/OpportunityRepository';
import { ActivityRepository } from '../repositories/ActivityRepository';

// Services
import { LeadService } from '../services/LeadService';
import { AccountService } from '../services/AccountService';
import { ContactService } from '../services/ContactService';
import { OpportunityService } from '../services/OpportunityService';
import { ActivityService } from '../services/ActivityService';
import { LeadScoringService } from '../services/LeadScoringService';
import { ConversionService } from '../services/ConversionService';
import { ReferenceDataRepository } from '../repositories/ReferenceDataRepository';

// Sprint 21: Activities & Task Management Services
import { CalendarIntegrationService } from '../services/CalendarIntegrationService';
import { TaskAutomationService } from '../services/TaskAutomationService';
import { CalendarController } from '../controllers/CalendarController';
import { ActivityTemplateRepository } from '../repositories/ActivityTemplateRepository';
import { CalendarIntegrationRepository } from '../repositories/CalendarIntegrationRepository';
import { TaskAutomationRepository } from '../repositories/TaskAutomationRepository';

// Sprint 22: CRM Analytics & Integration Services
import { AnalyticsService } from '../services/AnalyticsService';
import { ReportService } from '../services/ReportService';
import { KpiService } from '../services/KpiService';
import { DashboardService } from '../services/DashboardService';
import { ExportService } from '../services/ExportService';
import { ReportRepository } from '../repositories/ReportRepository';
import { KpiRepository } from '../repositories/KpiRepository';
import { DashboardRepository } from '../repositories/DashboardRepository';
import { ExportRepository } from '../repositories/ExportRepository';

// Sprint 20: Product & Quote Module
import { configureProductQuoteContainer } from '../product-quote/config/product-quote.container';
import { IntegrationLogRepository } from '../repositories/IntegrationLogRepository';
import { AnalyticsController } from '../controllers/AnalyticsController';
import { ReportController } from '../controllers/ReportController';
import { ExportController } from '../controllers/ExportController';

// Sprint 16: Lead Management Services
import { ScoringEngineService } from '../lead-management/scoring/services/ScoringEngineService';
import { AssignmentRuleEngine } from '../lead-management/assignment/services/AssignmentRuleEngine';
import { DuplicateDetectorService } from '../lead-management/duplicate/services/DuplicateDetectorService';
import { OmniChannelIntegrationService } from '../lead-management/capture/services/OmniChannelIntegrationService';
import { LeadManagementController } from '../controllers/LeadManagementController';

// Sprint 17: Advanced Account & Contact Management
import { AccountHierarchyService } from '../services/AccountHierarchyService';
import { AccountHierarchyRepository } from '../repositories/AccountHierarchyRepository';
import { TerritoryManagementService } from '../services/TerritoryManagementService';
import { TerritoryRepository } from '../repositories/TerritoryRepository';
import { TerritoryController } from '../controllers/TerritoryController';
import { ContactRoleManagementService } from '../services/ContactRoleManagementService';
import { ContactRoleRepository } from '../repositories/ContactRoleRepository';
import { AccountHealthScoringService } from '../services/AccountHealthScoringService';
import { AccountHealthRepository } from '../repositories/AccountHealthRepository';
import { AdvancedSearchService } from '../services/AdvancedSearchService';
import { SearchController } from '../controllers/SearchController';

// Interfaces
import { ILeadService } from '../interfaces/ILeadService';
import { IAccountService } from '../interfaces/IAccountService';
import { IContactService } from '../interfaces/IContactService';
import { IOpportunityService } from '../interfaces/IOpportunityService';
import { IActivityService } from '../interfaces/IActivityService';

// Controllers
import { LeadController } from '../controllers/LeadController';
import { AccountController } from '../controllers/AccountController';
import { ContactController } from '../controllers/ContactController';
import { OpportunityController } from '../controllers/OpportunityController';
import { ActivityController } from '../controllers/ActivityController';

/**
 * Configure CRM module dependencies
 */
export function configureCRMContainer(container: Container): void {
  // EventEmitter is now registered in the main container
  // No need to register it here again

  // Auth Middleware - Required for route authentication
  container
    .bind<AuthMiddleware>(TYPES.AuthMiddleware)
    .to(AuthMiddleware)
    .inSingletonScope();

  // Database Connection
  container
    .bind<CRMDatabaseConnection>(TYPES.CRMDatabaseConnection)
    .to(CRMDatabaseConnection)
    .inSingletonScope();

  // Database Pool - For repositories that need direct pool access
  container.bind(TYPES.DatabasePool).toDynamicValue((context) => {
    const dbConnection = context.container.get<CRMDatabaseConnection>(TYPES.CRMDatabaseConnection);
    return dbConnection.getPool();
  }).inSingletonScope();

  // Repositories
  container
    .bind<LeadRepository>(TYPES.LeadRepository)
    .to(LeadRepository)
    .inSingletonScope();

  container
    .bind<AccountRepository>(TYPES.AccountRepository)
    .to(AccountRepository)
    .inSingletonScope();

  container
    .bind<ContactRepository>(TYPES.ContactRepository)
    .to(ContactRepository)
    .inSingletonScope();

  container
    .bind<OpportunityRepository>(TYPES.OpportunityRepository)
    .to(OpportunityRepository)
    .inSingletonScope();

  container
    .bind<ActivityRepository>(TYPES.ActivityRepository)
    .to(ActivityRepository)
    .inSingletonScope();

  // Services
  container
    .bind<ILeadService>(TYPES.LeadService)
    .to(LeadService)
    .inSingletonScope();

  container
    .bind<IAccountService>(TYPES.AccountService)
    .to(AccountService)
    .inSingletonScope();

  container
    .bind<IContactService>(TYPES.ContactService)
    .to(ContactService)
    .inSingletonScope();

  container
    .bind<IOpportunityService>(TYPES.OpportunityService)
    .to(OpportunityService)
    .inSingletonScope();

  container
    .bind<IActivityService>(TYPES.ActivityService)
    .to(ActivityService)
    .inSingletonScope();

  container
    .bind<LeadScoringService>(TYPES.LeadScoringService)
    .to(LeadScoringService)
    .inSingletonScope();

  container
    .bind<ConversionService>(TYPES.ConversionService)
    .to(ConversionService)
    .inSingletonScope();

  // Reference Data Repository
  container
    .bind<ReferenceDataRepository>(TYPES.ReferenceDataRepository)
    .to(ReferenceDataRepository)
    .inSingletonScope();

  // Controllers
  container
    .bind<LeadController>(TYPES.LeadController)
    .to(LeadController)
    .inSingletonScope();

  container
    .bind<AccountController>(TYPES.AccountController)
    .to(AccountController)
    .inSingletonScope();

  container
    .bind<ContactController>(TYPES.ContactController)
    .to(ContactController)
    .inSingletonScope();

  container
    .bind<OpportunityController>(TYPES.OpportunityController)
    .to(OpportunityController)
    .inSingletonScope();

  container
    .bind<ActivityController>(TYPES.ActivityController)
    .to(ActivityController)
    .inSingletonScope();

  // Sprint 16: Lead Management Services
  container
    .bind<ScoringEngineService>('ScoringEngineService')
    .to(ScoringEngineService)
    .inSingletonScope();

  container
    .bind<AssignmentRuleEngine>('AssignmentRuleEngine')
    .to(AssignmentRuleEngine)
    .inSingletonScope();

  container
    .bind<DuplicateDetectorService>('DuplicateDetectorService')
    .to(DuplicateDetectorService)
    .inSingletonScope();

  container
    .bind<OmniChannelIntegrationService>('OmniChannelIntegrationService')
    .to(OmniChannelIntegrationService)
    .inSingletonScope();

  // Sprint 16: Lead Management Controller
  container
    .bind<LeadManagementController>('LeadManagementController')
    .to(LeadManagementController)
    .inSingletonScope();

  // EventBus for Lead Management (using the already registered EventEmitter)
  container
    .bind<EventEmitter>('EventBus')
    .toDynamicValue(context => context.container.get<EventEmitter>(TYPES.EventEmitter))
    .inSingletonScope();

  // DatabaseConnection for Lead Management services
  container
    .bind<any>('DatabaseConnection')
    .toDynamicValue(context => context.container.get<any>(TYPES.CRMDatabaseConnection).getPool())
    .inSingletonScope();

  // Sprint 18: Pipeline Management Services
  container
    .bind<any>('MLPredictionService')
    .toDynamicValue(() => {
      const { MLPredictionService } = require('../services/MLPredictionService');
      return new MLPredictionService();
    })
    .inSingletonScope();

  container
    .bind<any>('ScenarioModelingService')
    .toDynamicValue(() => {
      const { ScenarioModelingService } = require('../services/ScenarioModelingService');
      return new ScenarioModelingService();
    })
    .inSingletonScope();

  container
    .bind<any>('InsightsGenerationService')
    .toDynamicValue(() => {
      const { InsightsGenerationService } = require('../services/InsightsGenerationService');
      return new InsightsGenerationService();
    })
    .inSingletonScope();

  // Sprint 17: Advanced Account & Contact Management Bindings

  // Repositories
  container
    .bind<AccountHierarchyRepository>(TYPES.AccountHierarchyRepository)
    .to(AccountHierarchyRepository)
    .inSingletonScope();

  container
    .bind<TerritoryRepository>(TYPES.TerritoryRepository)
    .to(TerritoryRepository)
    .inSingletonScope();

  container
    .bind<ContactRoleRepository>(TYPES.ContactRoleRepository)
    .to(ContactRoleRepository)
    .inSingletonScope();

  container
    .bind<AccountHealthRepository>(TYPES.AccountHealthRepository)
    .to(AccountHealthRepository)
    .inSingletonScope();

  // Services
  container
    .bind<AccountHierarchyService>(TYPES.AccountHierarchyService)
    .to(AccountHierarchyService)
    .inSingletonScope();

  container
    .bind<TerritoryManagementService>(TYPES.TerritoryManagementService)
    .to(TerritoryManagementService)
    .inSingletonScope();

  container
    .bind<ContactRoleManagementService>(TYPES.ContactRoleManagementService)
    .to(ContactRoleManagementService)
    .inSingletonScope();

  container
    .bind<AccountHealthScoringService>(TYPES.AccountHealthScoringService)
    .to(AccountHealthScoringService)
    .inSingletonScope();

  container
    .bind<AdvancedSearchService>(TYPES.AdvancedSearchService)
    .to(AdvancedSearchService)
    .inSingletonScope();

  // Controllers
  container
    .bind<TerritoryController>(TYPES.TerritoryController)
    .to(TerritoryController)
    .inSingletonScope();

  container
    .bind<SearchController>(TYPES.SearchController)
    .to(SearchController)
    .inSingletonScope();

  // ========== Sprint 21: Activities & Task Management Bindings ==========

  // Repositories
  container
    .bind<ActivityTemplateRepository>(TYPES.ActivityTemplateRepository)
    .to(ActivityTemplateRepository)
    .inSingletonScope();

  container
    .bind<CalendarIntegrationRepository>(TYPES.CalendarIntegrationRepository)
    .to(CalendarIntegrationRepository)
    .inSingletonScope();

  container
    .bind<TaskAutomationRepository>(TYPES.TaskAutomationRepository)
    .to(TaskAutomationRepository)
    .inSingletonScope();

  // Services
  container
    .bind<CalendarIntegrationService>(TYPES.CalendarIntegrationService)
    .to(CalendarIntegrationService)
    .inSingletonScope();

  container
    .bind<TaskAutomationService>(TYPES.TaskAutomationService)
    .to(TaskAutomationService)
    .inSingletonScope();

  // Controllers
  container
    .bind<CalendarController>(TYPES.CalendarController)
    .to(CalendarController)
    .inSingletonScope();

  // ========== Sprint 22: CRM Analytics & Integration Bindings ==========

  // Repositories
  container
    .bind<ReportRepository>(TYPES.CRMReportRepository)
    .to(ReportRepository)
    .inSingletonScope();

  container
    .bind<KpiRepository>(TYPES.CRMKpiRepository)
    .to(KpiRepository)
    .inSingletonScope();

  container
    .bind<DashboardRepository>(TYPES.CRMDashboardRepository)
    .to(DashboardRepository)
    .inSingletonScope();

  container
    .bind<ExportRepository>(TYPES.CRMExportRepository)
    .to(ExportRepository)
    .inSingletonScope();

  container
    .bind<IntegrationLogRepository>(TYPES.CRMIntegrationLogRepository)
    .to(IntegrationLogRepository)
    .inSingletonScope();

  // Services
  container
    .bind<AnalyticsService>(TYPES.CRMAnalyticsService)
    .to(AnalyticsService)
    .inSingletonScope();

  container
    .bind<ReportService>(TYPES.CRMReportService)
    .to(ReportService)
    .inSingletonScope();

  container
    .bind<KpiService>(TYPES.CRMKpiService)
    .to(KpiService)
    .inSingletonScope();

  container
    .bind<DashboardService>(TYPES.CRMDashboardService)
    .to(DashboardService)
    .inSingletonScope();

  container
    .bind<ExportService>(TYPES.CRMExportService)
    .to(ExportService)
    .inSingletonScope();

  // Controllers
  container
    .bind<AnalyticsController>(TYPES.CRMAnalyticsController)
    .to(AnalyticsController)
    .inSingletonScope();

  container
    .bind<ReportController>(TYPES.CRMReportController)
    .to(ReportController)
    .inSingletonScope();

  container
    .bind<ExportController>(TYPES.CRMExportController)
    .to(ExportController)
    .inSingletonScope();

  // Configure Product & Quote Module (Sprint 20)
  configureProductQuoteContainer(container);

  console.log('✅ CRM Module fully configured');
}

/**
 * Initialize CRM module
 */
export async function initializeCRMModule(container: Container): Promise<void> {
  try {
    // Initialize database connection
    const dbConnection = container.get<CRMDatabaseConnection>(TYPES.CRMDatabaseConnection);
    await dbConnection.connect();

    console.log('✅ CRM module initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize CRM module:', error);
    throw error;
  }
}

/**
 * Shutdown CRM module
 */
export async function shutdownCRMModule(container: Container): Promise<void> {
  try {
    const dbConnection = container.get<CRMDatabaseConnection>(TYPES.CRMDatabaseConnection);
    await dbConnection.disconnect();

    console.log('✅ CRM module shutdown successfully');
  } catch (error) {
    console.error('❌ Error during CRM module shutdown:', error);
    throw error;
  }
}