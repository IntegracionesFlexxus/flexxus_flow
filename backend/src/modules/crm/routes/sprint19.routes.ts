/**
 * Sprint 19 Routes
 * Product Catalog, Pricing, Quotes, Approvals, and Documents
 */

import { Router } from 'express';
import { Container } from 'inversify';
import { TYPES } from '@/container/types';
import { authenticateToken, requirePermission } from '@/shared/middleware/auth';
import { validateRequest } from '@/shared/middleware/validation';
import { generalLimiter, createEndpointLimiter } from '@/shared/middleware/rateLimiter';
import { PRODUCT_QUOTE_PERMISSIONS } from '@/modules/auth/middleware/permissionMiddleware';

// Create aliases for common usage patterns
const checkPermission = requirePermission;
const rateLimiter = createEndpointLimiter;

// Import Controllers
import { ProductCatalogController } from '../controllers/ProductCatalogController';
import { PricingController } from '../controllers/PricingController';
import { QuoteController } from '../controllers/QuoteController';
import { ApprovalController } from '../controllers/ApprovalController';
import { DocumentController } from '../controllers/DocumentController';

export function registerSprint19Routes(container: Container): Router {
  const router = Router();

  // Get controller instances from container
  const productController = container.get<ProductCatalogController>(TYPES.ProductController);
  const pricingController = container.get<PricingController>(TYPES.PricingController);
  const quoteController = container.get<QuoteController>(TYPES.QuoteController);
  const approvalController = container.get<ApprovalController>(TYPES.ApprovalController);
  const documentController = container.get<DocumentController>(TYPES.DocumentController);

  // Apply authentication middleware to all routes
  router.use(authenticateToken);

  // ============================================
  // PRODUCT CATALOG ROUTES
  // ============================================

  // Products
  router.get('/products',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.PRODUCT_VIEW),
    productController.getProducts.bind(productController));
  router.get('/products/:id',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.PRODUCT_VIEW),
    productController.getProductById.bind(productController));
  router.post('/products',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.PRODUCT_CREATE),
    validateRequest,
    productController.createProduct.bind(productController));
  router.put('/products/:id',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.PRODUCT_UPDATE),
    validateRequest,
    productController.updateProduct.bind(productController));
  router.delete('/products/:id',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.PRODUCT_DELETE),
    productController.deleteProduct.bind(productController));

  // Product Search
  router.post('/products/search',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.PRODUCT_VIEW),
    validateRequest,
    productController.searchProducts.bind(productController));

  // Product Variants
  router.post('/products/:id/variants', validateRequest, productController.createVariant.bind(productController));

  // Product Bundles
  router.post('/bundles', validateRequest, productController.createBundle.bind(productController));

  // Inventory
  router.get('/inventory/levels', productController.getInventoryLevels.bind(productController));
  router.post('/inventory/movements', validateRequest, productController.recordInventoryMovement.bind(productController));

  // Import/Export
  router.post('/products/bulk-import',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.PRODUCT_IMPORT),
    validateRequest,
    productController.bulkImportProducts.bind(productController));
  router.get('/products/export',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.PRODUCT_EXPORT),
    productController.exportProducts.bind(productController));

  // Categories
  router.get('/categories',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.CATEGORY_VIEW),
    productController.getCategories.bind(productController));
  router.post('/categories',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.CATEGORY_MANAGE),
    validateRequest,
    productController.createCategory.bind(productController));
  router.put('/categories/:id/move',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.CATEGORY_MANAGE),
    validateRequest,
    productController.moveCategory.bind(productController));
  router.delete('/categories/:id',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.CATEGORY_MANAGE),
    productController.deleteCategory.bind(productController));

  // ============================================
  // PRICING ROUTES
  // ============================================

  // Price Calculation
  router.post('/pricing/calculate',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.PRICING_VIEW),
    validateRequest,
    rateLimiter({ windowMs: 60000, max: 100 }),
    pricingController.calculatePrice.bind(pricingController));
  router.post('/pricing/calculate-bulk',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.PRICING_VIEW),
    validateRequest,
    rateLimiter({ windowMs: 60000, max: 20 }),
    pricingController.calculateBulkPrices.bind(pricingController));

  // Pricing Rules
  router.get('/pricing/rules',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.PRICING_VIEW),
    pricingController.getPricingRules.bind(pricingController));
  router.get('/pricing/rules/:id',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.PRICING_VIEW),
    pricingController.getPricingRuleById.bind(pricingController));
  router.post('/pricing/rules',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.PRICING_RULES_CREATE),
    validateRequest,
    pricingController.createPricingRule.bind(pricingController));
  router.put('/pricing/rules/:id',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.PRICING_RULES_UPDATE),
    validateRequest,
    pricingController.updatePricingRule.bind(pricingController));
  router.delete('/pricing/rules/:id',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.PRICING_RULES_DELETE),
    pricingController.deletePricingRule.bind(pricingController));

  // Discount Codes
  router.post('/pricing/discount-codes', validateRequest, pricingController.createDiscountCode.bind(pricingController));
  router.post('/pricing/discount-codes/apply', validateRequest, pricingController.applyDiscountCode.bind(pricingController));

  // Customer Pricing
  router.get('/pricing/customer/:accountId', pricingController.getCustomerPricing.bind(pricingController));
  router.post('/pricing/customer', validateRequest, pricingController.setCustomerPricing.bind(pricingController));

  // Tiered & Bundle Pricing
  router.get('/pricing/tiers/:productId', pricingController.getTieredPricing.bind(pricingController));
  router.post('/pricing/bundles/:bundleId/calculate', validateRequest, pricingController.calculateBundlePrice.bind(pricingController));

  // Promotions
  router.post('/pricing/promotions', validateRequest, pricingController.createPromotion.bind(pricingController));

  // History & Analytics
  router.get('/pricing/history/:productId', pricingController.getPriceHistory.bind(pricingController));
  router.get('/pricing/analytics', pricingController.getPricingAnalytics.bind(pricingController));

  // Simulation & Optimization
  router.post('/pricing/simulate', validateRequest, pricingController.simulatePricing.bind(pricingController));
  router.post('/pricing/optimize', validateRequest, pricingController.optimizePricingRules.bind(pricingController));

  // Cache Management
  router.post('/pricing/cache/clear', pricingController.clearPricingCache.bind(pricingController));

  // ============================================
  // QUOTE ROUTES
  // ============================================

  // Quote Management
  // NOTE: Following methods are commented out - they don't exist in QuoteController
  // Uncomment when QuoteController methods are fully implemented
  /*
  router.get('/quotes',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.QUOTE_VIEW),
    quoteController.getQuotes.bind(quoteController));
  router.get('/quotes/:id',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.QUOTE_VIEW),
    quoteController.getQuoteById.bind(quoteController));
  */
  router.post('/quotes',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.QUOTE_CREATE),
    validateRequest,
    quoteController.createQuote.bind(quoteController));
  router.put('/quotes/:id',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.QUOTE_UPDATE),
    validateRequest,
    quoteController.updateQuote.bind(quoteController));
  router.delete('/quotes/:id',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.QUOTE_DELETE),
    quoteController.deleteQuote.bind(quoteController));

  // Quote Items & Sections
  router.post('/quotes/:id/items',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.QUOTE_UPDATE),
    validateRequest,
    quoteController.addQuoteItem.bind(quoteController));
  /*
  router.put('/quotes/:id/items/:itemId',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.QUOTE_UPDATE),
    validateRequest,
    quoteController.updateQuoteItem.bind(quoteController));
  router.delete('/quotes/:id/items/:itemId',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.QUOTE_UPDATE),
    quoteController.deleteQuoteItem.bind(quoteController));
  */
  router.post('/quotes/:id/sections',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.QUOTE_UPDATE),
    validateRequest,
    quoteController.addSection.bind(quoteController));

  // Quote Actions
  router.post('/quotes/:id/clone',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.QUOTE_CREATE),
    quoteController.cloneQuote.bind(quoteController));
  router.post('/quotes/:id/version',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.QUOTE_UPDATE),
    quoteController.createVersion.bind(quoteController));
  router.get('/quotes/:id/versions',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.QUOTE_VIEW),
    quoteController.getQuoteVersions.bind(quoteController));
  router.post('/quotes/:id/submit-approval',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.QUOTE_UPDATE),
    quoteController.submitForApproval.bind(quoteController));
  router.put('/quotes/:id/status',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.QUOTE_APPROVE),
    validateRequest,
    quoteController.updateQuoteStatus.bind(quoteController));

  // Quote Documents
  /*
  router.post('/quotes/:id/generate-document',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.DOCUMENT_GENERATE),
    validateRequest,
    quoteController.generateQuoteDocument.bind(quoteController));
  */
  router.post('/quotes/:id/send-email',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.QUOTE_VIEW),
    validateRequest,
    quoteController.sendQuoteEmail.bind(quoteController));

  // Quote Comparison & Analytics
  router.post('/quotes/compare',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.QUOTE_VIEW),
    validateRequest,
    quoteController.compareQuotes.bind(quoteController));
  router.get('/quotes/analytics/conversion',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.QUOTE_VIEW),
    quoteController.getConversionAnalytics.bind(quoteController));

  // ============================================
  // APPROVAL ROUTES
  // ============================================

  // Workflow Management
  router.get('/approvals/workflows',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.APPROVAL_VIEW),
    approvalController.getWorkflows.bind(approvalController));
  router.get('/approvals/workflows/:id',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.APPROVAL_VIEW),
    approvalController.getWorkflowById.bind(approvalController));
  router.post('/approvals/workflows',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.WORKFLOW_MANAGE),
    validateRequest,
    approvalController.createWorkflow.bind(approvalController));
  router.put('/approvals/workflows/:id',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.WORKFLOW_MANAGE),
    validateRequest,
    approvalController.updateWorkflow.bind(approvalController));
  router.delete('/approvals/workflows/:id',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.WORKFLOW_MANAGE),
    approvalController.deleteWorkflow.bind(approvalController));

  // Approval Processes
  router.get('/approvals/pending',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.APPROVAL_VIEW),
    approvalController.getPendingApprovals.bind(approvalController));
  router.get('/approvals/processes/:id',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.APPROVAL_VIEW),
    approvalController.getApprovalProcess.bind(approvalController));
  router.post('/approvals/processes/:id/decision',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.APPROVAL_APPROVE),
    validateRequest,
    approvalController.submitApprovalDecision.bind(approvalController));
  router.post('/approvals/processes/:id/delegate',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.APPROVAL_DELEGATE),
    validateRequest,
    approvalController.delegateApproval.bind(approvalController));
  router.post('/approvals/processes/:id/recall',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.APPROVAL_VIEW),
    validateRequest,
    approvalController.recallApprovalRequest.bind(approvalController));
  router.post('/approvals/processes/:id/escalate', validateRequest, approvalController.escalateApproval.bind(approvalController));

  // Bulk Operations
  router.post('/approvals/bulk-decision', validateRequest, approvalController.submitBulkDecision.bind(approvalController));

  // History & Analytics
  router.get('/approvals/history', approvalController.getApprovalHistory.bind(approvalController));
  router.get('/approvals/analytics', approvalController.getApprovalAnalytics.bind(approvalController));

  // ============================================
  // DOCUMENT ROUTES
  // ============================================

  // Template Management
  router.get('/documents/templates',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.DOCUMENT_VIEW),
    documentController.getTemplates.bind(documentController));
  router.get('/documents/templates/:id',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.DOCUMENT_VIEW),
    documentController.getTemplateById.bind(documentController));
  router.post('/documents/templates',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.TEMPLATE_MANAGE),
    validateRequest,
    documentController.createTemplate.bind(documentController));
  router.put('/documents/templates/:id',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.TEMPLATE_MANAGE),
    validateRequest,
    documentController.updateTemplate.bind(documentController));
  router.delete('/documents/templates/:id',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.TEMPLATE_MANAGE),
    documentController.deleteTemplate.bind(documentController));
  router.post('/documents/templates/:id/clone',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.TEMPLATE_MANAGE),
    validateRequest,
    documentController.cloneTemplate.bind(documentController));

  // Document Generation
  router.post('/documents/generate',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.DOCUMENT_GENERATE),
    validateRequest,
    documentController.generateDocument.bind(documentController));
  router.post('/documents/bulk-generate',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.DOCUMENT_GENERATE),
    validateRequest,
    documentController.bulkGenerateDocuments.bind(documentController));
  router.post('/documents/preview',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.DOCUMENT_VIEW),
    validateRequest,
    documentController.previewDocument.bind(documentController));
  router.get('/documents/generated',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.DOCUMENT_VIEW),
    documentController.getGeneratedDocuments.bind(documentController));

  // Revenue Recognition (ASC 606)
  router.post('/documents/revenue-schedules',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.REVENUE_MANAGE),
    validateRequest,
    documentController.createRevenueSchedule.bind(documentController));
  router.get('/documents/revenue-schedules',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.REVENUE_VIEW),
    documentController.getRevenueSchedules.bind(documentController));
  router.post('/documents/revenue-schedules/:id/recognize',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.REVENUE_MANAGE),
    validateRequest,
    documentController.recognizeRevenue.bind(documentController));
  router.get('/documents/revenue-reports',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.REVENUE_VIEW),
    documentController.getRevenueReport.bind(documentController));

  // Import/Export
  router.get('/documents/templates/export',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.TEMPLATE_MANAGE),
    documentController.exportTemplates.bind(documentController));
  router.post('/documents/templates/import',
    checkPermission(PRODUCT_QUOTE_PERMISSIONS.TEMPLATE_MANAGE),
    validateRequest,
    documentController.importTemplates.bind(documentController));

  return router;
}