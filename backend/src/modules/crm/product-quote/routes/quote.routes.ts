import { Router } from 'express';
import '../container'; // Cargar configuración del container
import { container } from '../container';
import { QuoteController } from '../quotes/controllers/quote.controller';
import { authenticateToken, requirePermission } from '@/shared/middleware/auth';
import { validateRequest } from '@/shared/middleware/validation';
import { 
  CreateQuoteDTO, 
  UpdateQuoteDTO, 
  UpdateQuoteStatusDTO,
  ApplyPromotionDTO,
  QuoteItemDTO,
  QuoteFiltersDTO 
} from '../validators/quote.validator';

const router = Router();
const quoteController = container.resolve(QuoteController);

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Rutas de cotizaciones
router.get(
  '/',
  validateRequest(QuoteFiltersDTO, 'query'),
  requirePermission('crm.quotes.view'),
  quoteController.findAll.bind(quoteController)
);

router.get(
  '/:id',
  requirePermission('crm.quotes.view'),
  quoteController.findById.bind(quoteController)
);

router.get(
  '/number/:number',
  requirePermission('crm.quotes.view'),
  quoteController.findByNumber.bind(quoteController)
);

router.post(
  '/',
  validateRequest(CreateQuoteDTO),
  requirePermission('crm.quotes.create'),
  quoteController.create.bind(quoteController)
);

router.put(
  '/:id',
  validateRequest(UpdateQuoteDTO),
  requirePermission('crm.quotes.edit'),
  quoteController.update.bind(quoteController)
);

router.patch(
  '/:id/status',
  validateRequest(UpdateQuoteStatusDTO),
  requirePermission('crm.quotes.edit'),
  quoteController.updateStatus.bind(quoteController)
);

router.post(
  '/:id/items',
  validateRequest(QuoteItemDTO),
  requirePermission('crm.quotes.edit'),
  quoteController.addItem.bind(quoteController)
);

router.delete(
  '/:id/items/:itemId',
  requirePermission('crm.quotes.edit'),
  quoteController.removeItem.bind(quoteController)
);

router.post(
  '/:id/apply-promotion',
  validateRequest(ApplyPromotionDTO),
  requirePermission('crm.quotes.edit'),
  quoteController.applyPromotion.bind(quoteController)
);

router.post(
  '/:id/convert-to-order',
  requirePermission('crm.quotes.convert'),
  quoteController.convertToOrder.bind(quoteController)
);

router.post(
  '/:id/duplicate',
  requirePermission('crm.quotes.create'),
  quoteController.duplicate.bind(quoteController)
);

router.delete(
  '/:id',
  requirePermission('crm.quotes.delete'),
  quoteController.delete.bind(quoteController)
);

export default router;