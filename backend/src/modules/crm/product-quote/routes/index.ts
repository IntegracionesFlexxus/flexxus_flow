import { Router } from 'express';
import { Container } from 'inversify';
import { createProductRoutes } from '../catalog/routes/productRoutes';
import { createQuoteRoutes } from '../quotes/routes/quoteRoutes';

export function createProductQuoteRoutes(container: Container): Router {
  const router = Router();

  // Montar rutas del módulo producto-cotización
  router.use('/products', createProductRoutes(container));
  router.use('/quotes', createQuoteRoutes(container));

  // Ruta de health check del módulo
  router.get('/health', (req, res) => {
    res.json({
      success: true,
      message: 'Product & Quote module is healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      modules: {
        products: 'Available',
        quotes: 'Available'
      }
    });
  });

  return router;
}

export default createProductQuoteRoutes;