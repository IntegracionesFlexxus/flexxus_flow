/**
 * Omni Module Index - Sprint 05
 * Main entry point for the omnichannel module
 */

import { Router } from 'express';
import { container } from '@/container/container';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';
import { configureOmniContainer, initializeOmniModule } from './config/omni.container';
import omniRoutes from './routes';

const logger = LoggerFactory.create({ file: __filename });

// NOTE: Container configuration is done in container/container.ts
// to avoid duplicate registration errors

// Initialize the module (WebSocket handlers, message queue, etc.)
initializeOmniModule(container).catch(error => {
  logger.error('❌ CRITICAL: Failed to initialize Omni module', { error });
  console.error('❌ CRITICAL: Failed to initialize Omni module:', error);
});

// Create main router
const router = Router();

// Mount omni routes under /api/omni
router.use('/', omniRoutes);

// Export the router as default
export default router;

// Also export configuration functions for external use
export { configureOmniContainer, initializeOmniModule } from './config/omni.container';

// Export types and interfaces for external modules
export * from './interfaces/IChannel';
export * from './interfaces/IConversation';
export * from './interfaces/IMessage';
export * from './interfaces/ICustomer';
export * from './interfaces/ITemplate';

// Export types
export * from './types/channel.types';
export * from './types/conversation.types';
export * from './types/message.types';
