// index.ts
import { Express } from 'express';
import { Container } from 'inversify';
import { Server as SocketServer } from 'socket.io';
import { createOmniRoutes } from './routes';
import { configureOmniContainer, setupOmniEventHandlers } from './container/omni.container';
import { WebSocketService } from './services/WebSocketService';
import { OMNI_TYPES } from './types/omni.types';

export function initializeOmniModule(
  app: Express,
  container: Container,
  io?: SocketServer
): void {
  try {
    // Configurar container
    configureOmniContainer(container);

    // Configurar WebSocket service si está disponible
    if (io) {
      // Obtener el WebSocketService y inicializarlo con Socket.IO
      const wsService = container.get<WebSocketService>(OMNI_TYPES.WebSocketService);
      wsService.initialize(io);
      console.log('✅ WebSocket service initialized for Omni module');
    } else {
      console.warn('⚠️  WebSocket not provided. Omni module will work without real-time features.');
    }

    // Configurar event handlers
    setupOmniEventHandlers(container);

    // Montar rutas
    const omniRoutes = createOmniRoutes(container);
    app.use('/api/omni', omniRoutes);

    console.log('✅ Omni module initialized successfully');
    console.log('📍 Routes mounted at: /api/omni');
    console.log('🔌 Available endpoints:');
    console.log('   GET    /api/omni/health');
    console.log('   GET    /api/omni/channels');
    console.log('   POST   /api/omni/channels');
    console.log('   GET    /api/omni/conversations');
    console.log('   POST   /api/omni/conversations');

  } catch (error) {
    console.error('❌ Failed to initialize Omni module:', error);
    throw error;
  }
}

// Exportar tipos e interfaces para uso externo
export * from './interfaces';
export * from './types/omni.types';
export * from './events';

// Exportar servicios principales para posible uso externo
export { ChannelService } from './services/ChannelService';
export { ConversationService } from './services/ConversationService';
export { MessageService } from './services/MessageService';
export { CustomerService } from './services/CustomerService';
export { TemplateService } from './services/TemplateService';
export { WebSocketService } from './services/WebSocketService';
