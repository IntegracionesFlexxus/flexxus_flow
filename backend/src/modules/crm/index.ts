/**
 * CRM Module Index
 * Exports routes and configuration for CRM module integration
 */

export { registerCRMRoutes as default } from './routes';
export { configureCRMContainer, initializeCRMModule, shutdownCRMModule } from './config/crm.container';