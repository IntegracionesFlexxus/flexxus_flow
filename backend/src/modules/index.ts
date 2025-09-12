import { Application } from 'express';
import authModule from '@/modules/auth';
import usersModule from '@/modules/users';
import companiesModule from '@/modules/companies';
import rolesModule from '@/modules/roles';
import omniModule from '@/modules/omni';
import crmModule from '@/modules/crm';
import workflowModule from '@/modules/workflow';
import analyticsModule from '@/modules/analytics';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';

// Configuración modular mínima - cada módulo se registra independientemente
// Logger instance
const logger = LoggerFactory.create({ file: __filename });

export function setupModules(app: Application): void {
  // Registrar rutas de cada módulo
  app.use('/api/v1/auth', authModule);
  app.use('/api/v1/users', usersModule);
  app.use('/api/v1/companies', companiesModule);
  app.use('/api/v1/roles', rolesModule);
  app.use('/api/v1/omni', omniModule);
  app.use('/api/v1/crm', crmModule);
  app.use('/api/v1/workflow', workflowModule);
  app.use('/api/v1/analytics', analyticsModule);
  logger.info('Módulos configurados:');
  logger.info('- Auth: /api/v1/auth');
  logger.info('- Users: /api/v1/users');
  logger.info('- Companies: /api/v1/companies');
  logger.info('- Roles: /api/v1/roles');
  logger.info('- Omni: /api/v1/omni');
  logger.info('- CRM: /api/v1/crm');
  logger.info('- Workflow: /api/v1/workflow');
  logger.info('- Analytics: /api/v1/analytics');
}
