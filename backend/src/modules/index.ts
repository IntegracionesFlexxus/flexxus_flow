import { Application } from 'express';
import authModule from './auth';
import omniModule from './omni';
import crmModule from './crm';
import workflowModule from './workflow';
import analyticsModule from './analytics';

// Configuración modular mínima - cada módulo se registra independientemente
export function setupModules(app: Application): void {
  // Registrar rutas de cada módulo
  app.use('/api/v1/auth', authModule);
  app.use('/api/v1/omni', omniModule);
  app.use('/api/v1/crm', crmModule);
  app.use('/api/v1/workflow', workflowModule);
  app.use('/api/v1/analytics', analyticsModule);
  
  console.log('Módulos configurados:');
  console.log('- Auth: /api/v1/auth');
  console.log('- Omni: /api/v1/omni');
  console.log('- CRM: /api/v1/crm');
  console.log('- Workflow: /api/v1/workflow');
  console.log('- Analytics: /api/v1/analytics');
}