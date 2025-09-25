import { container } from 'tsyringe';
import { Pool } from 'pg';
import winston from 'winston';

// Repositories
import { ProductRepository } from '../catalog/repositories/ProductRepository';
// import { ProductCategoryRepository } from '../catalog/repositories/product-category.repository';
// import { PriceListRepository } from '../catalog/repositories/price-list.repository';
// import { QuoteRepository } from '../quotes/repositories/quote.repository';
// import { QuoteItemRepository } from '../quotes/repositories/quote-item.repository';
// import { PricingRepository } from '../pricing/repositories/pricing.repository';

// Services
// import { ProductService } from '../catalog/services/product.service';
import { ProductServiceImpl } from '../catalog/services/ProductServiceImpl';
// import { ProductCategoryService } from '../catalog/services/product-category.service';
// import { QuoteService } from '../quotes/services/quote.service';
// import { PricingService } from '../pricing/services/pricing.service';
// import { PromotionService } from '../pricing/services/promotion.service';
// import { DocumentGenerationService } from '../documents/services/document-generation.service';

// Controllers
import { ProductController } from '../catalog/controllers/ProductController';
// import { ProductCategoryController } from '../catalog/controllers/product-category.controller';
// import { QuoteController } from '../quotes/controllers/quote.controller';
// import { PricingController } from '../pricing/controllers/pricing.controller';
// import { PromotionController } from '../pricing/controllers/promotion.controller';

// Configuración de base de datos
const pool = new Pool({
  host: process.env.DB_HOST || '10.250.0.68',
  port: parseInt(process.env.DB_PORT || '5003'),
  database: process.env.DB_NAME || 'flexxus_crm',
  user: process.env.DB_USER || 'flexxus',
  password: process.env.DB_PASSWORD || 'Flexxus2023**'
});

// Registrar pool de base de datos
container.registerInstance('DatabasePool', pool);
container.registerInstance('Pool', pool);

// Registrar Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
container.registerInstance('Logger', logger);

// Registrar Redis (mock por ahora)
const redisMock = {
  get: async () => null,
  set: async () => 'OK',
  del: async () => 1,
  expire: async () => 1
};
container.registerInstance('Redis', redisMock);

// Registrar PricingService mock
const pricingServiceMock = {
  calculatePrice: async () => ({ price: 0 })
};
container.registerInstance('PricingService', pricingServiceMock);

// Registrar Repositories
container.registerSingleton('ProductRepository', ProductRepository);
// container.registerSingleton('ProductCategoryRepository', ProductCategoryRepository);
// container.registerSingleton('PriceListRepository', PriceListRepository);
// container.registerSingleton('QuoteRepository', QuoteRepository);
// container.registerSingleton('QuoteItemRepository', QuoteItemRepository);
// container.registerSingleton('PricingRepository', PricingRepository);

// Registrar Services
// container.registerSingleton('ProductService', ProductService);
container.registerSingleton('ProductServiceImpl', ProductServiceImpl);
// container.registerSingleton('ProductCategoryService', ProductCategoryService);
// container.registerSingleton('QuoteService', QuoteService);
// container.registerSingleton('PricingService', PricingService);
// container.registerSingleton('PromotionService', PromotionService);
// container.registerSingleton('DocumentGenerationService', DocumentGenerationService);

// Registrar Controllers
container.registerSingleton('ProductController', ProductController);
// container.registerSingleton('ProductCategoryController', ProductCategoryController);
// container.registerSingleton('QuoteController', QuoteController);
// container.registerSingleton('PricingController', PricingController);
// container.registerSingleton('PromotionController', PromotionController);

export { container };