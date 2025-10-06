/**
 * Omni Module Container Configuration - Sprint 05 & 06
 * Inversify container setup for dependency injection
 */

import { Container } from 'inversify';
import { TYPES } from '@/container/types';

// Import repositories
import { ChannelRepository } from '../repositories/ChannelRepository';
import { ConversationRepository } from '../repositories/ConversationRepository';
import { MessageRepository } from '../repositories/MessageRepository';
import { CustomerRepository } from '../repositories/CustomerRepository';
import { TemplateRepository, QuickReplyRepository } from '../repositories/TemplateRepository';
import { LandingPageRepository } from '../repositories/LandingPageRepository'; // Sprint N+3
import { EmailEngagementRepository } from '../repositories/EmailEngagementRepository'; // Sprint N+3

// Import services
import {
  ChannelService,
  ConversationService,
  MessageService,
  CustomerService,
  TemplateService
} from '../services';

// Import Sprint 06 services
import { ChannelHealthMonitor } from '../services/ChannelHealthMonitor';
import { RateLimiter } from '../services/RateLimiter';
import { WebhookProcessor } from '../services/WebhookProcessor';
import { MessageQueue } from '../queues/MessageQueue';

// Import Sprint 07 services
import { RuleEngine } from '../rules/RuleEngine';
import { RuleRepository } from '../rules/RuleRepository';
import { RuleEvaluator } from '../rules/RuleEvaluator';
import { ActionExecutor } from '../rules/ActionExecutor';
import { AutoResponseService } from '../automation/AutoResponseService';
import { AutoResponseRepository } from '../automation/AutoResponseRepository';
import { KeywordMatcher } from '../automation/KeywordMatcher';
import { ScheduleManager } from '../automation/ScheduleManager';

// Import Sprint 08 services
import { RealTimeAnalytics } from '../analytics/RealTimeAnalytics';
import { ReportingService } from '../reporting/ReportingService';
import { DashboardService as DashboardServiceLegacy } from '../dashboard/DashboardService';
import { KPIService } from '../kpi/KPIService';
import { PredictionEngine } from '../predictions/PredictionEngine';
import { DataPipeline } from '../pipeline/DataPipeline';

// Import Sprint 09 services
import { IntegrationManager } from '../integrations/IntegrationManager';
import { OAuthService } from '../integrations/OAuthService';
import { SalesforceProvider } from '../integrations/providers/SalesforceProvider';

// Import Sprint 10 services - AI & Advanced Features
import { SentimentAnalysisService } from '../ai/services/SentimentAnalysisService';
import { SummarizationService } from '../ai/services/SummarizationService';
import { AdvancedRoutingEngine } from '../routing/AdvancedRoutingEngine';
import { SkillBasedRouting } from '../routing/strategies/SkillBasedRouting';
import { QualityManagementService } from '../quality/QualityManagementService';
import { PerformanceOptimizer } from '../performance/PerformanceOptimizer';
import { SmartCacheService } from '../cache/SmartCacheService';
import { RealTimeAIProcessor } from '../ai/processors/RealTimeAIProcessor';
import { AIController } from '../controllers/AIController';

// Import controllers
import {
  ChannelController,
  ConversationController,
  MessageController,
  CustomerController,
  TemplateController
} from '../controllers';
import { AnalyticsController as AnalyticsControllerLegacy } from '../controllers/AnalyticsController';
import { CRMIntegrationController } from '../controllers/CRMIntegrationController';

// Import WebSocket handler
import { OmniWebSocketHandler } from '../websocket/OmniWebSocketHandler';

/**
 * Configure the Omni module container
 */
export function configureOmniContainer(container: Container): void {
  // Bind repositories
  container.bind<ChannelRepository>(TYPES.OmniChannelRepository)
    .to(ChannelRepository)
    .inSingletonScope();

  container.bind<ConversationRepository>(TYPES.OmniConversationRepository)
    .to(ConversationRepository)
    .inSingletonScope();

  container.bind<MessageRepository>(TYPES.OmniMessageRepository)
    .to(MessageRepository)
    .inSingletonScope();

  container.bind<CustomerRepository>(TYPES.OmniCustomerRepository)
    .to(CustomerRepository)
    .inSingletonScope();

  container.bind<TemplateRepository>(TYPES.OmniTemplateRepository)
    .to(TemplateRepository)
    .inSingletonScope();

  // Sprint N+3: Landing Pages & Email Engagement
  container.bind<LandingPageRepository>(TYPES.OmniLandingPageRepository)
    .to(LandingPageRepository)
    .inSingletonScope();

  container.bind<EmailEngagementRepository>(TYPES.OmniEmailEngagementRepository)
    .to(EmailEngagementRepository)
    .inSingletonScope();

  // Bind services
  container.bind<ChannelService>(TYPES.OmniChannelService)
    .to(ChannelService)
    .inSingletonScope();

  container.bind<ConversationService>(TYPES.OmniConversationService)
    .to(ConversationService)
    .inSingletonScope();

  container.bind<MessageService>(TYPES.OmniMessageService)
    .to(MessageService)
    .inSingletonScope();

  container.bind<CustomerService>(TYPES.OmniCustomerService)
    .to(CustomerService)
    .inSingletonScope();

  container.bind<TemplateService>(TYPES.OmniTemplateService)
    .to(TemplateService)
    .inSingletonScope();

  // Bind controllers
  container.bind<ChannelController>(TYPES.OmniChannelController)
    .to(ChannelController)
    .inSingletonScope();

  container.bind<ConversationController>(TYPES.OmniConversationController)
    .to(ConversationController)
    .inSingletonScope();

  container.bind<MessageController>(TYPES.OmniMessageController)
    .to(MessageController)
    .inSingletonScope();

  container.bind<CustomerController>(TYPES.OmniCustomerController)
    .to(CustomerController)
    .inSingletonScope();

  container.bind<TemplateController>(TYPES.OmniTemplateController)
    .to(TemplateController)
    .inSingletonScope();

  // Sprint N+1: CRM Integration Controller
  container.bind<CRMIntegrationController>(TYPES.CRMIntegrationController)
    .to(CRMIntegrationController)
    .inSingletonScope();

  // Bind WebSocket handler
  container.bind<OmniWebSocketHandler>(TYPES.OmniWebSocketHandler)
    .to(OmniWebSocketHandler)
    .inSingletonScope();

  // Bind Sprint 06 services
  container.bind<ChannelHealthMonitor>(TYPES.OmniChannelHealthMonitor)
    .to(ChannelHealthMonitor)
    .inSingletonScope();

  container.bind<RateLimiter>(TYPES.OmniRateLimiter)
    .to(RateLimiter)
    .inSingletonScope();

  container.bind<WebhookProcessor>(TYPES.OmniWebhookProcessor)
    .to(WebhookProcessor)
    .inSingletonScope();

  container.bind<MessageQueue>(TYPES.OmniMessageQueue)
    .to(MessageQueue)
    .inSingletonScope();

  // Bind Sprint 07 services - Automation & Rules
  container.bind<RuleEngine>(TYPES.OmniRuleEngine)
    .to(RuleEngine)
    .inSingletonScope();

  container.bind<RuleRepository>(TYPES.OmniRuleRepository)
    .to(RuleRepository)
    .inSingletonScope();

  container.bind<RuleEvaluator>(TYPES.OmniRuleEvaluator)
    .to(RuleEvaluator)
    .inSingletonScope();

  container.bind<ActionExecutor>(TYPES.OmniActionExecutor)
    .to(ActionExecutor)
    .inSingletonScope();

  container.bind<AutoResponseService>(TYPES.OmniAutoResponseService)
    .to(AutoResponseService)
    .inSingletonScope();

  container.bind<AutoResponseRepository>(TYPES.OmniAutoResponseRepository)
    .to(AutoResponseRepository)
    .inSingletonScope();

  container.bind<KeywordMatcher>(TYPES.OmniKeywordMatcher)
    .to(KeywordMatcher)
    .inSingletonScope();

  container.bind<ScheduleManager>(TYPES.OmniScheduleManager)
    .to(ScheduleManager)
    .inSingletonScope();

  // Bind Sprint 08 services - Analytics & Reporting
  container.bind<RealTimeAnalytics>(TYPES.OmniRealTimeAnalytics)
    .to(RealTimeAnalytics)
    .inSingletonScope();

  container.bind<ReportingService>(TYPES.ReportingService)
    .to(ReportingService)
    .inSingletonScope();

  container.bind<DashboardServiceLegacy>(TYPES.OmniDashboardServiceLegacy)
    .to(DashboardServiceLegacy)
    .inSingletonScope();

  container.bind<KPIService>(TYPES.KPIService)
    .to(KPIService)
    .inSingletonScope();

  container.bind<PredictionEngine>(TYPES.PredictionEngine)
    .to(PredictionEngine)
    .inSingletonScope();

  container.bind<DataPipeline>(TYPES.DataPipeline)
    .to(DataPipeline)
    .inSingletonScope();

  container.bind<AnalyticsControllerLegacy>(TYPES.AnalyticsController)
    .to(AnalyticsControllerLegacy)
    .inSingletonScope();

  // Bind Sprint 09 services - External Integrations & APIs
  container.bind<IntegrationManager>(TYPES.IntegrationManager)
    .to(IntegrationManager)
    .inSingletonScope();

  container.bind<OAuthService>(TYPES.OAuthService)
    .to(OAuthService)
    .inSingletonScope();

  container.bind<SalesforceProvider>(TYPES.SalesforceProvider)
    .to(SalesforceProvider)
    .inSingletonScope();

  // Bind Sprint 10 services - AI & Advanced Features
  container.bind<SentimentAnalysisService>('SentimentAnalysisService')
    .to(SentimentAnalysisService)
    .inSingletonScope();

  container.bind<SummarizationService>('SummarizationService')
    .to(SummarizationService)
    .inSingletonScope();

  container.bind<AdvancedRoutingEngine>('AdvancedRoutingEngine')
    .to(AdvancedRoutingEngine)
    .inSingletonScope();

  container.bind<SkillBasedRouting>('SkillBasedRouting')
    .to(SkillBasedRouting)
    .inSingletonScope();

  container.bind<QualityManagementService>('QualityManagementService')
    .to(QualityManagementService)
    .inSingletonScope();

  container.bind<PerformanceOptimizer>('PerformanceOptimizer')
    .to(PerformanceOptimizer)
    .inSingletonScope();

  container.bind<SmartCacheService>('SmartCacheService')
    .to(SmartCacheService)
    .inSingletonScope();

  container.bind<RealTimeAIProcessor>('RealTimeAIProcessor')
    .to(RealTimeAIProcessor)
    .inSingletonScope();

  container.bind<AIController>('AIController')
    .to(AIController)
    .inSingletonScope();

  // Bind Sprint 12 services - ML Core
  const { MLModelRepository } = require('../ml/repositories/MLModelRepository');
  const { MLDeploymentRepository } = require('../ml/repositories/MLDeploymentRepository');
  const { PredictionRepository } = require('../ml/repositories/PredictionRepository');
  const { FeatureStoreRepository } = require('../ml/repositories/FeatureStoreRepository');
  const { MLModelService } = require('../ml/services/MLModelService');
  const { MLDeploymentService } = require('../ml/services/MLDeploymentService');
  const { PredictionService } = require('../ml/services/PredictionService');
  const { FeatureStoreService } = require('../ml/services/FeatureStoreService');

  container.bind<typeof MLModelRepository>(TYPES.MLModelRepository)
    .to(MLModelRepository)
    .inSingletonScope();

  container.bind<typeof MLDeploymentRepository>(TYPES.MLDeploymentRepository)
    .to(MLDeploymentRepository)
    .inSingletonScope();

  container.bind<typeof PredictionRepository>(TYPES.PredictionRepository)
    .to(PredictionRepository)
    .inSingletonScope();

  container.bind<typeof FeatureStoreRepository>(TYPES.FeatureStoreRepository)
    .to(FeatureStoreRepository)
    .inSingletonScope();

  container.bind<typeof MLModelService>(TYPES.MLModelService)
    .to(MLModelService)
    .inSingletonScope();

  container.bind<typeof MLDeploymentService>(TYPES.MLDeploymentService)
    .to(MLDeploymentService)
    .inSingletonScope();

  container.bind<typeof PredictionService>(TYPES.PredictionService)
    .to(PredictionService)
    .inSingletonScope();

  container.bind<typeof FeatureStoreService>(TYPES.FeatureStoreService)
    .to(FeatureStoreService)
    .inSingletonScope();

  // Bind Sprint 12 services - NLP
  const { NLPModelRepository } = require('../nlp/repositories/NLPModelRepository');
  const { IntentPatternRepository } = require('../nlp/repositories/IntentPatternRepository');
  const { ConversationContextRepository } = require('../nlp/repositories/ConversationContextRepository');
  const { IntentClassificationService } = require('../nlp/services/IntentClassificationService');
  const { ConversationContextService } = require('../nlp/services/ConversationContextService');

  container.bind<typeof NLPModelRepository>(TYPES.NLPModelRepository)
    .to(NLPModelRepository)
    .inSingletonScope();

  container.bind<typeof IntentPatternRepository>(TYPES.IntentPatternRepository)
    .to(IntentPatternRepository)
    .inSingletonScope();

  container.bind<typeof ConversationContextRepository>(TYPES.ConversationContextRepository)
    .to(ConversationContextRepository)
    .inSingletonScope();

  container.bind<typeof IntentClassificationService>(TYPES.IntentClassificationService)
    .to(IntentClassificationService)
    .inSingletonScope();

  container.bind<typeof ConversationContextService>(TYPES.ConversationContextService)
    .to(ConversationContextService)
    .inSingletonScope();

  // Bind Sprint 12 Fase 2 - AI Workflows & Automation
  const { AIWorkflowRepository } = require('../automation/repositories/AIWorkflowRepository');
  const { WorkflowExecutionRepository } = require('../automation/repositories/WorkflowExecutionRepository');
  const { DecisionRuleRepository } = require('../automation/repositories/DecisionRuleRepository');
  const { AIWorkflowEngine } = require('../automation/workflows/AIWorkflowEngine');
  const { AIWorkflowService } = require('../automation/workflows/AIWorkflowService');
  const { MLBasedRuleEngine } = require('../automation/rules/MLBasedRuleEngine');
  const { DecisionRuleService } = require('../automation/rules/DecisionRuleService');
  const { AIWorkflowController } = require('../controllers/AIWorkflowController');
  const { DecisionRuleController } = require('../controllers/DecisionRuleController');

  container.bind(TYPES.AIWorkflowRepository).to(AIWorkflowRepository).inSingletonScope();
  container.bind(TYPES.WorkflowExecutionRepository).to(WorkflowExecutionRepository).inSingletonScope();
  container.bind(TYPES.DecisionRuleRepository).to(DecisionRuleRepository).inSingletonScope();
  container.bind(TYPES.AIWorkflowEngine).to(AIWorkflowEngine).inSingletonScope();
  container.bind(TYPES.AIWorkflowService).to(AIWorkflowService).inSingletonScope();
  container.bind(TYPES.MLBasedRuleEngine).to(MLBasedRuleEngine).inSingletonScope();
  container.bind(TYPES.DecisionRuleService).to(DecisionRuleService).inSingletonScope();
  container.bind(TYPES.AIWorkflowController).to(AIWorkflowController).inSingletonScope();
  container.bind(TYPES.DecisionRuleController).to(DecisionRuleController).inSingletonScope();

  // Bind Sprint 12 Fase 3 - Predictive Analytics
  const { CustomerPredictionRepository } = require('../analytics/predictions/CustomerPredictionRepository');
  const { AnomalyRepository } = require('../analytics/anomaly/AnomalyRepository');
  const { ForecastRepository } = require('../analytics/forecasting/ForecastRepository');
  const { CustomerBehaviorPredictionService } = require('../analytics/predictions/CustomerBehaviorPredictionService');
  const { AnomalyDetectionService } = require('../analytics/anomaly/AnomalyDetectionService');
  const { DemandForecastingService } = require('../analytics/forecasting/DemandForecastingService');
  const { PredictiveAnalyticsController } = require('../controllers/PredictiveAnalyticsController');

  container.bind(TYPES.CustomerPredictionRepository).to(CustomerPredictionRepository).inSingletonScope();
  container.bind(TYPES.AnomalyRepository).to(AnomalyRepository).inSingletonScope();
  container.bind(TYPES.ForecastRepository).to(ForecastRepository).inSingletonScope();
  container.bind(TYPES.CustomerBehaviorPredictionService).to(CustomerBehaviorPredictionService).inSingletonScope();
  container.bind(TYPES.AnomalyDetectionService).to(AnomalyDetectionService).inSingletonScope();
  container.bind(TYPES.DemandForecastingService).to(DemandForecastingService).inSingletonScope();
  container.bind(TYPES.PredictiveAnalyticsController).to(PredictiveAnalyticsController).inSingletonScope();

  // Bind Sprint 12 Fase 4 - Cognitive Services & ML Monitoring
  const { DocumentAIRepository } = require('../cognitive/repositories/DocumentAIRepository');
  const { VoiceAnalyticsRepository } = require('../cognitive/repositories/VoiceAnalyticsRepository');
  const { KnowledgeGraphRepository } = require('../cognitive/repositories/KnowledgeGraphRepository');
  const { DocumentAIService } = require('../cognitive/services/DocumentAIService');
  const { VoiceAnalyticsService } = require('../cognitive/services/VoiceAnalyticsService');
  const { KnowledgeGraphService } = require('../cognitive/services/KnowledgeGraphService');
  const { ModelMonitoringRepository } = require('../monitoring/repositories/ModelMonitoringRepository');
  const { DriftDetectionRepository } = require('../monitoring/repositories/DriftDetectionRepository');
  const { ABTestRepository } = require('../monitoring/repositories/ABTestRepository');
  const { ModelPerformanceMonitoringService } = require('../monitoring/services/ModelPerformanceMonitoringService');
  const { DataDriftDetectionService } = require('../monitoring/services/DataDriftDetectionService');
  const { ABTestingService } = require('../monitoring/services/ABTestingService');
  const { CognitiveController } = require('../controllers/CognitiveController');
  const { MLMonitoringController } = require('../controllers/MLMonitoringController');

  container.bind(TYPES.DocumentAIRepository).to(DocumentAIRepository).inSingletonScope();
  container.bind(TYPES.VoiceAnalyticsRepository).to(VoiceAnalyticsRepository).inSingletonScope();
  container.bind(TYPES.KnowledgeGraphRepository).to(KnowledgeGraphRepository).inSingletonScope();
  container.bind(TYPES.DocumentAIService).to(DocumentAIService).inSingletonScope();
  container.bind(TYPES.VoiceAnalyticsService).to(VoiceAnalyticsService).inSingletonScope();
  container.bind(TYPES.KnowledgeGraphService).to(KnowledgeGraphService).inSingletonScope();
  container.bind(TYPES.ModelMonitoringRepository).to(ModelMonitoringRepository).inSingletonScope();
  container.bind(TYPES.DriftDetectionRepository).to(DriftDetectionRepository).inSingletonScope();
  container.bind(TYPES.ABTestRepository).to(ABTestRepository).inSingletonScope();
  container.bind(TYPES.ModelPerformanceMonitoringService).to(ModelPerformanceMonitoringService).inSingletonScope();
  container.bind(TYPES.DataDriftDetectionService).to(DataDriftDetectionService).inSingletonScope();
  container.bind(TYPES.ABTestingService).to(ABTestingService).inSingletonScope();
  container.bind(TYPES.CognitiveController).to(CognitiveController).inSingletonScope();
  container.bind(TYPES.MLMonitoringController).to(MLMonitoringController).inSingletonScope();

  console.log('✅ Sprint 12 ML/AI services registered (Fases 1-4)');

  // ============================================================================
  // SPRINT 13 - ANALYTICS & REPORTING MODULE
  // ============================================================================

  // Import Sprint 13 Repositories
  const { DataMartRepository } = require('../analytics/repositories/DataMartRepository');
  const { DashboardRepository } = require('../analytics/repositories/DashboardRepository');
  const { ReportRepository } = require('../analytics/repositories/ReportRepository');
  const { KpiRepository } = require('../analytics/repositories/KpiRepository');
  const { EtlPipelineRepository } = require('../analytics/repositories/EtlPipelineRepository');
  const { WidgetRepository } = require('../analytics/repositories/WidgetRepository');

  // Import Sprint 13 Engines
  const { CalculationEngine } = require('../analytics/engines/CalculationEngine');
  const { AggregationEngine } = require('../analytics/engines/AggregationEngine');
  const { StreamProcessor } = require('../analytics/engines/StreamProcessor');
  const { ReportGenerator } = require('../analytics/engines/ReportGenerator');

  // Import Sprint 13 ETL Components
  const { PipelineManager } = require('../analytics/etl/PipelineManager');
  const { DataExtractor } = require('../analytics/etl/DataExtractor');
  const { DataTransformer } = require('../analytics/etl/DataTransformer');
  const { DataLoader } = require('../analytics/etl/DataLoader');

  // Import Sprint 13 Services
  const { AnalyticsService } = require('../analytics/services/AnalyticsService');
  const { DashboardService } = require('../analytics/services/DashboardService');
  const { ReportService } = require('../analytics/services/ReportService');
  const { KpiService } = require('../analytics/services/KpiService');
  const { EtlService } = require('../analytics/services/EtlService');
  const { ExportService } = require('../analytics/services/ExportService');
  const { WidgetDataService } = require('../analytics/services/WidgetDataService');

  // Import Sprint 13 Controllers
  const { AnalyticsController } = require('../analytics/controllers/AnalyticsController');
  const { DashboardController } = require('../analytics/controllers/DashboardController');
  const { ReportController } = require('../analytics/controllers/ReportController');
  const { KpiController } = require('../analytics/controllers/KpiController');

  // Bind Repositories
  container.bind(TYPES.DataMartRepository).to(DataMartRepository).inSingletonScope();
  container.bind(TYPES.AnalyticsDashboardRepository).to(DashboardRepository).inSingletonScope();
  container.bind(TYPES.AnalyticsReportRepository).to(ReportRepository).inSingletonScope();
  container.bind(TYPES.KpiRepository).to(KpiRepository).inSingletonScope();
  container.bind(TYPES.EtlPipelineRepository).to(EtlPipelineRepository).inSingletonScope();
  container.bind(TYPES.WidgetRepository).to(WidgetRepository).inSingletonScope();

  // Bind Engines
  container.bind(TYPES.CalculationEngine).to(CalculationEngine).inSingletonScope();
  container.bind(TYPES.AggregationEngine).to(AggregationEngine).inSingletonScope();
  container.bind(TYPES.StreamProcessor).to(StreamProcessor).inSingletonScope();
  container.bind(TYPES.ReportGenerator).to(ReportGenerator).inSingletonScope();

  // Bind ETL Components
  container.bind(TYPES.PipelineManager).to(PipelineManager).inSingletonScope();
  container.bind(TYPES.DataExtractor).to(DataExtractor).inSingletonScope();
  container.bind(TYPES.DataTransformer).to(DataTransformer).inSingletonScope();
  container.bind(TYPES.DataLoader).to(DataLoader).inSingletonScope();

  // Bind Services
  container.bind(TYPES.OmniAnalyticsService).to(AnalyticsService).inSingletonScope();
  container.bind(TYPES.OmniAnalyticsDashboardService).to(DashboardService).inSingletonScope();
  container.bind(TYPES.OmniAnalyticsReportService).to(ReportService).inSingletonScope();
  container.bind(TYPES.OmniAnalyticsKpiService).to(KpiService).inSingletonScope();
  container.bind(TYPES.AnalyticsEtlService).to(EtlService).inSingletonScope();
  container.bind(TYPES.AnalyticsExportService).to(ExportService).inSingletonScope();
  container.bind(TYPES.WidgetDataService).to(WidgetDataService).inSingletonScope();

  // Bind Controllers
  container.bind(TYPES.OmniAnalyticsController).to(AnalyticsController).inSingletonScope();
  container.bind(TYPES.OmniAnalyticsDashboardController).to(DashboardController).inSingletonScope();
  container.bind(TYPES.OmniAnalyticsReportController).to(ReportController).inSingletonScope();
  container.bind(TYPES.OmniAnalyticsKpiController).to(KpiController).inSingletonScope();

  console.log('✅ Sprint 13 Analytics & Reporting services registered');
}

/**
 * Initialize the Omni module
 */
export async function initializeOmniModule(container: Container): Promise<void> {
  console.log('🚀 Initializing Omni module...');

  // Get WebSocket handler and initialize if WebSocket server is available
  try {
    const wsHandler = container.get<OmniWebSocketHandler>(TYPES.OmniWebSocketHandler);
    const io = container.get<any>(TYPES.WebSocketServer);

    if (io) {
      wsHandler.initialize(io);
      console.log('✅ Omni WebSocket handler initialized');
    }
  } catch (error) {
    console.log('⚠️  WebSocket server not available for Omni module');
  }

  // Initialize message queue
  try {
    const messageQueue = container.get<MessageQueue>(TYPES.OmniMessageQueue);
    await messageQueue.initialize();
    console.log('✅ Message queue initialized');
  } catch (error) {
    console.log('⚠️  Failed to initialize message queue:', error);
  }

  // Start health monitoring for default company (optional)
  // This would typically be started per company when they activate channels
  try {
    const healthMonitor = container.get<ChannelHealthMonitor>(TYPES.OmniChannelHealthMonitor);
    // Health monitoring would be started per company
    console.log('✅ Health monitor service ready');
  } catch (error) {
    console.log('⚠️  Failed to initialize health monitor:', error);
  }

  // Initialize Sprint 10 services
  try {
    const performanceOptimizer = container.get<PerformanceOptimizer>('PerformanceOptimizer');
    await performanceOptimizer.startMonitoring();
    console.log('✅ Performance optimizer started');
  } catch (error) {
    console.log('⚠️  Failed to start performance optimizer:', error);
  }

  try {
    const aiProcessor = container.get<RealTimeAIProcessor>('RealTimeAIProcessor');
    await aiProcessor.start();
    console.log('✅ Real-time AI processor started');
  } catch (error) {
    console.log('⚠️  Failed to start AI processor:', error);
  }

  try {
    const cacheService = container.get<SmartCacheService>('SmartCacheService');
    // Cache service auto-starts
    console.log('✅ Smart cache service ready');
  } catch (error) {
    console.log('⚠️  Failed to initialize cache service:', error);
  }

  console.log('✅ Omni module initialized successfully');
}

/**
 * Shutdown the Omni module
 */
export async function shutdownOmniModule(container: Container): Promise<void> {
  console.log('🔄 Shutting down Omni module...');

  // Shutdown message queue
  try {
    const messageQueue = container.get<MessageQueue>(TYPES.OmniMessageQueue);
    await messageQueue.shutdown();
    console.log('✅ Message queue shutdown');
  } catch (error) {
    console.log('⚠️  Failed to shutdown message queue:', error);
  }

  // Stop health monitoring
  try {
    const healthMonitor = container.get<ChannelHealthMonitor>(TYPES.OmniChannelHealthMonitor);
    healthMonitor.stopMonitoring();
    console.log('✅ Health monitoring stopped');
  } catch (error) {
    console.log('⚠️  Failed to stop health monitoring:', error);
  }

  // Stop Sprint 10 services
  try {
    const performanceOptimizer = container.get<PerformanceOptimizer>('PerformanceOptimizer');
    await performanceOptimizer.cleanup();
    console.log('✅ Performance optimizer stopped');
  } catch (error) {
    console.log('⚠️  Failed to stop performance optimizer:', error);
  }

  try {
    const aiProcessor = container.get<RealTimeAIProcessor>('RealTimeAIProcessor');
    await aiProcessor.cleanup();
    console.log('✅ AI processor stopped');
  } catch (error) {
    console.log('⚠️  Failed to stop AI processor:', error);
  }

  try {
    const cacheService = container.get<SmartCacheService>('SmartCacheService');
    await cacheService.cleanup();
    console.log('✅ Cache service stopped');
  } catch (error) {
    console.log('⚠️  Failed to stop cache service:', error);
  }

  console.log('✅ Omni module shutdown complete');
}