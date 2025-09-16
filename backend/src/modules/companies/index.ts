import { Router } from 'express';
import { container } from '@/container/container';
import { TYPES } from '@/container/types';
import { CompanyController } from '@/modules/companies/controllers/CompanyController';
import { authenticateToken, requirePermission } from '@/shared/middleware/auth';
const router = Router();
// Obtener controller del container (si está registrado)
let companyController: CompanyController;
try {
  companyController = container.get<CompanyController>(TYPES.CompanyController);
} catch {
  // Si no está en el container, crear instancia temporal
  const logger = container.get<any>(TYPES.Logger);
  const companyService = container.get<any>(TYPES.CompanyService);
  companyController = new CompanyController(companyService, logger);
}
// Todas las rutas requieren autenticación
router.use(authenticateToken);
// Rutas de empresas
router.get('/', companyController.getAllCompanies.bind(companyController));
router.get('/:id', companyController.getCompanyById.bind(companyController));
router.post('/', requirePermission('companies:create'), companyController.createCompany.bind(companyController));
router.put('/:id', requirePermission('companies:update'), companyController.updateCompany.bind(companyController));
router.delete('/:id', requirePermission('companies:delete'), companyController.deleteCompany.bind(companyController));
// Rutas de configuración de empresa
router.get('/:id/settings', companyController.getCompanySettings.bind(companyController));
router.put('/:id/settings', requirePermission('companies:update'), companyController.updateCompanySettings.bind(companyController));
// Rutas de gestión de usuarios en empresa
router.get('/:id/users', companyController.getCompanyUsers.bind(companyController));
router.post('/:id/users', requirePermission('companies:manage'), companyController.addUserToCompany.bind(companyController));
router.delete('/:id/users/:userId', requirePermission('companies:manage'), companyController.removeUserFromCompany.bind(companyController));
export default router;
