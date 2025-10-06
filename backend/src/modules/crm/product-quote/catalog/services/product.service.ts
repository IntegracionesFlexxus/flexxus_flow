import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { IProductService } from '../interfaces/IProductService';
import { IProductRepository } from '../interfaces/IProductRepository';
// TODO: Create missing types file
// import { Product, ProductInput, ProductFilters } from '../../../types/product.types';
import { AppError, ErrorCode } from '../../../../../shared/errors/AppError';
// TODO: Create missing types file
// import { PaginatedResult } from '../../../../../shared/types/pagination.types';

@injectable()
export class ProductService implements IProductService {
  constructor(
    @inject(TYPES.ProductRepository)
    private productRepository: IProductRepository
  ) {}

  async create(data: any): Promise<any> {
    try {
      const companyId = data.company_id;
      if (!companyId) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'company_id is required', 400);
      }

      // Validar SKU único
      const existingSKU = await this.productRepository.findBySKU(companyId, data.sku);
      if (existingSKU) {
        throw new AppError(ErrorCode.RESOURCE_ALREADY_EXISTS, 'SKU already exists', 409);
      }

      // Calcular margen si se proporciona costo
      if (data.cost_price && data.base_price) {
        data.profit_margin = ((data.base_price - data.cost_price) / data.cost_price) * 100;
      }

      return await this.productRepository.create(companyId, data);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(ErrorCode.INTERNAL_SERVER_ERROR, `Failed to create product: ${error.message}`, 500);
    }
  }

  async update(id: number, data: Partial<any>): Promise<any> {
    try {
      const companyId = data.company_id;
      if (!companyId) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'company_id is required', 400);
      }

      const product = await this.productRepository.findById(companyId, id);
      if (!product) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Product not found', 404);
      }

      // Si se actualiza SKU, verificar unicidad
      if (data.sku && data.sku !== product.sku) {
        const existingSKU = await this.productRepository.findBySKU(companyId, data.sku);
        if (existingSKU) {
          throw new AppError(ErrorCode.RESOURCE_ALREADY_EXISTS, 'SKU already exists', 409);
        }
      }

      // Recalcular margen si se actualizan precios
      if ((data.cost_price || product.cost_price) && (data.base_price || product.base_price)) {
        const cost = data.cost_price || product.cost_price;
        const base = data.base_price || product.base_price;
        data.profit_margin = ((base - cost) / cost) * 100;
      }

      return await this.productRepository.update(companyId, id, data);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(ErrorCode.INTERNAL_SERVER_ERROR, `Failed to update product: ${error.message}`, 500);
    }
  }

  async delete(id: number, companyId: number): Promise<boolean> {
    try {
      const product = await this.productRepository.findById(companyId, id);
      if (!product) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Product not found', 404);
      }

      // Verificar si el producto está en uso
      const hasQuotes = await this.productRepository.hasActiveQuotes(id);
      if (hasQuotes) {
        throw new AppError(ErrorCode.BUSINESS_RULE_VIOLATION, 'Cannot delete product with active quotes', 409);
      }

      return await this.productRepository.delete(companyId, id);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(ErrorCode.INTERNAL_SERVER_ERROR, `Failed to delete product: ${error.message}`, 500);
    }
  }

  async findById(id: number, companyId: number): Promise<any | null> {
    try {
      return await this.productRepository.findById(companyId, id);
    } catch (error) {
      throw new AppError(ErrorCode.INTERNAL_SERVER_ERROR, `Failed to find product: ${error.message}`, 500);
    }
  }

  async findBySKU(sku: string, companyId: number): Promise<any | null> {
    try {
      return await this.productRepository.findBySKU(companyId, sku);
    } catch (error) {
      throw new AppError(ErrorCode.INTERNAL_SERVER_ERROR, `Failed to find product by SKU: ${error.message}`, 500);
    }
  }

  async findAll(companyId: number, filters?: any): Promise<any> {
    try {
      const limit = filters?.limit;
      const offset = filters?.offset;
      return await this.productRepository.findAll(companyId, limit, offset);
    } catch (error) {
      throw new AppError(ErrorCode.INTERNAL_SERVER_ERROR, `Failed to find products: ${error.message}`, 500);
    }
  }

  async findByCategory(categoryId: number, companyId: number): Promise<any[]> {
    try {
      // Note: findByCategory method is not in IProductRepository interface
      // Using search with category criteria instead
      const searchCriteria = { category_id: categoryId };
      return await this.productRepository.search(companyId, searchCriteria);
    } catch (error) {
      throw new AppError(ErrorCode.INTERNAL_SERVER_ERROR, `Failed to find products by category: ${error.message}`, 500);
    }
  }

  async updateStock(id: number, quantity: number, operation: 'add' | 'subtract', companyId: number): Promise<any> {
    try {
      const product = await this.productRepository.findById(companyId, id);
      if (!product) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Product not found', 404);
      }

      if (!product.track_inventory) {
        throw new AppError(ErrorCode.BUSINESS_RULE_VIOLATION, 'Product does not track inventory', 400);
      }

      const currentStock = product.stock_quantity || 0;
      const newStock = operation === 'add' ? currentStock + quantity : currentStock - quantity;

      if (newStock < 0) {
        throw new AppError(ErrorCode.BUSINESS_RULE_VIOLATION, 'Insufficient stock', 400);
      }

      if (newStock < (product.min_quantity || 0)) {
        // Podría enviar una notificación aquí
        console.warn(`Product ${product.sku} is below minimum stock level`);
      }

      return await this.productRepository.update(companyId, id, { stock_quantity: newStock });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(ErrorCode.INTERNAL_SERVER_ERROR, `Failed to update stock: ${error.message}`, 500);
    }
  }

  async bulkUpdatePrices(updates: Array<{ id: number; price: number }>, companyId: number): Promise<boolean> {
    try {
      // Validar que todos los productos existen
      for (const update of updates) {
        const product = await this.productRepository.findById(companyId, update.id);
        if (!product) {
          throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, `Product with ID ${update.id} not found`, 404);
        }
      }

      // Ejecutar actualizaciones
      for (const update of updates) {
        await this.productRepository.update(companyId, update.id, { base_price: update.price });
      }

      return true;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(ErrorCode.INTERNAL_SERVER_ERROR, `Failed to bulk update prices: ${error.message}`, 500);
    }
  }

  async getInventoryStatus(): Promise<any> {
    try {
      // TODO: Implement getInventoryStatus in ProductRepository
      throw new AppError(ErrorCode.NOT_IMPLEMENTED, 'getInventoryStatus method not yet implemented', 501);
      // return await this.productRepository.getInventoryStatus();
    } catch (error) {
      throw new AppError(ErrorCode.INTERNAL_SERVER_ERROR, `Failed to get inventory status: ${error.message}`, 500);
    }
  }
}