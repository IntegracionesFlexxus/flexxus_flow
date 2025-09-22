// types/omni.types.ts
/**
 * Tipos adicionales para el módulo Omni
 */

// Omni Module Services
export const OMNI_TYPES = {
  OmniDbPool: Symbol.for('OmniDbPool'),
  BaseOmniRepository: Symbol.for('BaseOmniRepository'),

  // Omni Repositories
  ChannelRepository: Symbol.for('ChannelRepository'),
  ConversationRepository: Symbol.for('ConversationRepository'),
  MessageRepository: Symbol.for('MessageRepository'),
  CustomerRepository: Symbol.for('CustomerRepository'),
  TemplateRepository: Symbol.for('TemplateRepository'),

  // Omni Services
  ChannelService: Symbol.for('ChannelService'),
  ConversationService: Symbol.for('ConversationService'),
  MessageService: Symbol.for('MessageService'),
  CustomerService: Symbol.for('CustomerService'),
  TemplateService: Symbol.for('TemplateService'),
  WebSocketService: Symbol.for('WebSocketService'),

  // Omni Controllers
  ChannelController: Symbol.for('ChannelController'),
  ConversationController: Symbol.for('ConversationController'),
  MessageController: Symbol.for('MessageController'),
  CustomerController: Symbol.for('CustomerController'),
  TemplateController: Symbol.for('TemplateController'),

  // Event Emitter
  EventEmitter: Symbol.for('EventEmitter'),
  OmniEventEmitter: Symbol.for('OmniEventEmitter'),

  // Socket.IO Server
  SocketIO: Symbol.for('SocketIO'),
};

// Exportar junto con TYPES principal
export { TYPES } from '../../../container/types';