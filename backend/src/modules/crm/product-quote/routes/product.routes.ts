import { Router } from 'express';
import '../container'; // Cargar configuración del container
import { container } from '../container';
import { ProductController } from '../catalog/controllers/product.controller';
import { authenticateToken, requirePermission } from '@/shared/middleware/auth';
import { validateRequest } from '@/shared/middleware/validation';
import { 
  CreateProductDTO, 
  UpdateProductDTO, 
  UpdateStockDTO, 
  BulkPriceUpdateDTO,
  ProductFiltersDTO 
} from '../validators/product.validator';

const router = Router();
const productController = container.resolve(ProductController);

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Rutas de productos
router.get(
  '/',
  validateRequest(ProductFiltersDTO, 'query'),
  requirePermission('crm.products.view'),
  productController.findAll.bind(productController)
);

router.get(
  '/inventory-status',
  requirePermission('crm.products.view'),
  productController.getInventoryStatus.bind(productController)
);

router.get(
  '/:id',
  requirePermission('crm.products.view'),
  productController.findById.bind(productController)
);

router.get(
  '/sku/:sku',
  requirePermission('crm.products.view'),
  productController.findBySKU.bind(productController)
);

router.post(
  '/',
  validateRequest(CreateProductDTO),
  requirePermission('crm.products.create'),
  productController.create.bind(productController)
);

router.put(
  '/:id',
  validateRequest(UpdateProductDTO),
  requirePermission('crm.products.edit'),
  productController.update.bind(productController)
);

router.patch(
  '/:id/stock',
  validateRequest(UpdateStockDTO),
  requirePermission('crm.products.edit'),
  productController.updateStock.bind(productController)
);

router.post(
  '/bulk-update-prices',
  validateRequest(BulkPriceUpdateDTO),
  requirePermission('crm.products.edit'),
  productController.bulkUpdatePrices.bind(productController)
);

router.delete(
  '/:id',
  requirePermission('crm.products.delete'),
  productController.delete.bind(productController)
);

export default router;