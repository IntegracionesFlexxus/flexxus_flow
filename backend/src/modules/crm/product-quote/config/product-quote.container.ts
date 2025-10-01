/**
 * Product & Quote Module Container Configuration - Sprint 20
 * Inversify container setup for dependency injection
 */

import { Container } from 'inversify';
import { TYPES } from '@/container/types';

// Import Repositories
import { ProductRepository } from '../catalog/repositories/ProductRepository';
import { QuoteRepository } from '../quotes/repositories/QuoteRepository';
import { ProductCategoryRepository } from '../catalog/repositories/product-category.repository';
import { QuoteLineItemRepository } from '../quotes/repositories/quote-line-item.repository';

// Import Services
import { ProductServiceImpl } from '../catalog/services/ProductServiceImpl';
import { QuoteServiceImpl } from '../quotes/services/QuoteServiceImpl';
import { PricingServiceImpl } from '../pricing/services/PricingServiceImpl';
import { DocumentGenerationService } from '../documents/services/document-generation.service';

// Import Controllers
import { ProductController } from '../catalog/controllers/ProductController';
import { QuoteController } from '../quotes/controllers/QuoteController';
import { PricingController } from '../pricing/controllers/pricing.controller';
import { ProductCategoryController } from '../catalog/controllers/product-category.controller';

/**
 * Configure the Product & Quote module container
 */
export function configureProductQuoteContainer(container: Container): void {
  // Bind Repositories
  container.bind(TYPES.ProductRepository)
    .to(ProductRepository)
    .inSingletonScope();

  container.bind(TYPES.QuoteRepository)
    .to(QuoteRepository)
    .inSingletonScope();

  container.bind(TYPES.ProductCategoryRepository)
    .to(ProductCategoryRepository)
    .inSingletonScope();

  container.bind(TYPES.QuoteLineItemRepository)
    .to(QuoteLineItemRepository)
    .inSingletonScope();

  // Bind Services
  container.bind(TYPES.ProductService)
    .to(ProductServiceImpl)
    .inSingletonScope();

  container.bind(TYPES.QuoteService)
    .to(QuoteServiceImpl)
    .inSingletonScope();

  container.bind(TYPES.PricingService)
    .to(PricingServiceImpl)
    .inSingletonScope();

  container.bind(TYPES.DocumentGenerationService)
    .to(DocumentGenerationService)
    .inSingletonScope();

  // Note: ApprovalService not implemented in Sprint 20 yet
  // container.bind(TYPES.ApprovalService).to(ApprovalServiceImpl).inSingletonScope();

  // Bind Controllers
  container.bind(TYPES.ProductController)
    .to(ProductController)
    .inSingletonScope();

  container.bind(TYPES.QuoteController)
    .to(QuoteController)
    .inSingletonScope();

  container.bind(TYPES.PricingController)
    .to(PricingController)
    .inSingletonScope();

  container.bind(TYPES.ProductCategoryController)
    .to(ProductCategoryController)
    .inSingletonScope();

  console.log('✅ Product & Quote Module (Sprint 20) services registered');
}
