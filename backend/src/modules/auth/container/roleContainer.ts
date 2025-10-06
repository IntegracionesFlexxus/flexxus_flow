/**
 * Role Container Configuration
 * Sprint 3 - Backend Team
 * Configuración de inversify para servicios de roles
 */

import { Container } from 'inversify';
import { TYPES } from '@/container/types';
import { IRoleRepository } from '@/modules/auth/interfaces/IRoleRepository';
import { IRoleService } from '@/modules/auth/interfaces/IRoleService';
import { IPermissionRepository } from '@/modules/auth/interfaces/IPermissionRepository';
import { RoleRepository } from '@/modules/auth/repositories/RoleRepository';
import { RoleService } from '@/modules/roles/services/RoleService';
import { RoleController } from '@/modules/auth/controllers/RoleController';

/**
 * Configurar bindings de roles en el contenedor
 */
export const configureRoleContainer = (container: Container): void => {
  // Repositories
  container.bind<IRoleRepository>(TYPES.RoleRepository)
    .to(RoleRepository)
    .inSingletonScope();

  // Services
  container.bind<IRoleService>(TYPES.RoleService)
    .to(RoleService)
    .inSingletonScope();

  // Controllers
  container.bind<RoleController>(TYPES.RoleController)
    .to(RoleController)
    .inSingletonScope();
};

/**
 * Módulo de roles para carga dinámica
 */
export const RoleModule = {
  configure: configureRoleContainer
};
