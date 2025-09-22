// container/omni.container.ts
import { Container } from 'inversify';
import { Pool } from 'pg';
import { EventEmitter } from 'events';
import { OMNI_TYPES } from '../types/omni.types';

// Repositories
import { BaseOmniRepository } from '../repositories/BaseOmniRepository';
import { ChannelRepository } from '../repositories/ChannelRepository';
import { ConversationRepository } from '../repositories/ConversationRepository';
import { MessageRepository } from '../repositories/MessageRepository';
import { CustomerRepository } from '../repositories/CustomerRepository';
import { TemplateRepository } from '../repositories/TemplateRepository';

// Services
import { ChannelService } from '../services/ChannelService';
import { ConversationService } from '../services/ConversationService';
import { MessageService } from '../services/MessageService';
import { CustomerService } from '../services/CustomerService';
import { TemplateService } from '../services/TemplateService';
import { WebSocketService } from '../services/WebSocketService';

// Controllers
import { ChannelController } from '../controllers/ChannelController';
import { ConversationController } from '../controllers/ConversationController';

// Events
import { OmniEventEmitter } from '../events/OmniEventEmitter';

export function configureOmniContainer(container: Container): void {
  // Crear pool separado para omni_db
  const omniDbPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.OMNI_DB_NAME || 'flexxus_omni',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  // Pool de conexión a base de datos Omni
  container.bind<Pool>(OMNI_TYPES.OmniDbPool).toConstantValue(omniDbPool);

  // Base Repository
  container.bind<BaseOmniRepository>(OMNI_TYPES.BaseOmniRepository).to(BaseOmniRepository);

  // Event Emitter
  const omniEventEmitter = new OmniEventEmitter();
  container.bind<EventEmitter>(OMNI_TYPES.EventEmitter).toConstantValue(omniEventEmitter);
  container.bind<OmniEventEmitter>(OMNI_TYPES.OmniEventEmitter).toConstantValue(omniEventEmitter);

  // Repositories
  container.bind<ChannelRepository>(OMNI_TYPES.ChannelRepository).to(ChannelRepository);
  container.bind<ConversationRepository>(OMNI_TYPES.ConversationRepository).to(ConversationRepository);
  container.bind<MessageRepository>(OMNI_TYPES.MessageRepository).to(MessageRepository);
  container.bind<CustomerRepository>(OMNI_TYPES.CustomerRepository).to(CustomerRepository);
  container.bind<TemplateRepository>(OMNI_TYPES.TemplateRepository).to(TemplateRepository);

  // Services
  container.bind<ChannelService>(OMNI_TYPES.ChannelService).to(ChannelService);
  container.bind<ConversationService>(OMNI_TYPES.ConversationService).to(ConversationService);
  container.bind<MessageService>(OMNI_TYPES.MessageService).to(MessageService);
  container.bind<CustomerService>(OMNI_TYPES.CustomerService).to(CustomerService);
  container.bind<TemplateService>(OMNI_TYPES.TemplateService).to(TemplateService);
  container.bind<WebSocketService>(OMNI_TYPES.WebSocketService).to(WebSocketService).inSingletonScope();

  // Controllers
  container.bind<ChannelController>(OMNI_TYPES.ChannelController).to(ChannelController);
  container.bind<ConversationController>(OMNI_TYPES.ConversationController).to(ConversationController);

  console.log('Omni container configured successfully');
}

export function setupOmniEventHandlers(container: Container): void {
  const eventEmitter = container.get<OmniEventEmitter>(OMNI_TYPES.OmniEventEmitter);

  // Handler para logging general de eventos
  eventEmitter.on('omni.event', (eventData) => {
    console.log(`[OMNI EVENT] ${eventData.event}:`, {
      companyId: eventData.companyId,
      userId: eventData.userId,
      timestamp: eventData.timestamp
    });
  });

  // Handler específico para eventos de canales
  eventEmitter.on('channel.created', (eventData) => {
    console.log(`New channel created: ${eventData.data.channelId} for company ${eventData.companyId}`);
  });

  // Handler específico para eventos de conversaciones
  eventEmitter.on('conversation.created', (eventData) => {
    console.log(`New conversation created: ${eventData.data.conversationId} for company ${eventData.companyId}`);
  });

  // Handler específico para eventos de mensajes
  eventEmitter.on('message.received', (eventData) => {
    console.log(`New message received in conversation: ${eventData.data.conversationId}`);
  });

  // Handler para SLA warnings
  eventEmitter.on('sla.warning', (eventData) => {
    console.warn(`SLA warning for conversation: ${eventData.data.conversationId}`);
    // Aquí se podría enviar notificaciones, emails, etc.
  });

  // Handler para SLA breaches
  eventEmitter.on('sla.breached', (eventData) => {
    console.error(`SLA breached for conversation: ${eventData.data.conversationId}`);
    // Aquí se podría escalar automáticamente, enviar alertas, etc.
  });

  console.log('Omni event handlers configured successfully');
}