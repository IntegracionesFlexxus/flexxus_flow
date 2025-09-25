import { injectable, inject } from 'tsyringe';
import { IProductService } from '../interfaces/IProductService';
import { IProductRepository } from '../interfaces/IProductRepository';
import { Product, ProductInput, ProductFilters } from '../../../types/product.types';
import { AppError } from '../../../../../shared/errors/AppError';
import { PaginatedResult } from '../../../../../shared/types/pagination.types';

@injectable()
export class ProductService implements IProductService {
  constructor(
    @inject('ProductRepository')
    private productRepository: IProductRepository
  ) {}

  async create(data: ProductInput): Promise<Product> {
    try {
      // Validar SKU único
      const existingSKU = await this.productRepository.findBySKU(data.sku);
      if (existingSKU) {
        throw new AppError('SKU already exists', 409);
      }

      // Calcular margen si se proporciona costo
      if (data.cost_price && data.base_price) {
        data.profit_margin = ((data.base_price - data.cost_price) / data.cost_price) * 100;
      }

      return await this.productRepository.create(data);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to create product: ${error.message}`, 500);
    }
  }

  async update(id: number, data: Partial<ProductInput>): Promise<Product> {
    try {
      const product = await this.productRepository.findById(id);
      if (!product) {
        throw new AppError('Product not found', 404);
      }

      // Si se actualiza SKU, verificar unicidad
      if (data.sku && data.sku !== product.sku) {
        const existingSKU = await this.productRepository.findBySKU(data.sku);
        if (existingSKU) {
          throw new AppError('SKU already exists', 409);
        }
      }

      // Recalcular margen si se actualizan precios
      if ((data.cost_price || product.cost_price) && (data.base_price || product.base_price)) {
        const cost = data.cost_price || product.cost_price;
        const base = data.base_price || product.base_price;
        data.profit_margin = ((base - cost) / cost) * 100;
      }

      return await this.productRepository.update(id, data);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to update product: ${error.message}`, 500);
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      const product = await this.productRepository.findById(id);
      if (!product) {
        throw new AppError('Product not found', 404);
      }

      // Verificar si el producto está en uso
      const hasQuotes = await this.productRepository.hasActiveQuotes(id);
      if (hasQuotes) {
        throw new AppError('Cannot delete product with active quotes', 409);
      }

      return await this.productRepository.delete(id);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to delete product: ${error.message}`, 500);
    }
  }

  async findById(id: number): Promise<Product | null> {
    try {
      return await this.productRepository.findById(id);
    } catch (error) {
      throw new AppError(`Failed to find product: ${error.message}`, 500);
    }
  }

  async findBySKU(sku: string): Promise<Product | null> {
    try {
      return await this.productRepository.findBySKU(sku);
    } catch (error) {
      throw new AppError(`Failed to find product by SKU: ${error.message}`, 500);
    }
  }

  async findAll(filters?: ProductFilters): Promise<PaginatedResult<Product>> {
    try {
      return await this.productRepository.findAll(filters);
    } catch (error) {
      throw new AppError(`Failed to find products: ${error.message}`, 500);
    }
  }

  async findByCategory(categoryId: number): Promise<Product[]> {
    try {
      return await this.productRepository.findByCategory(categoryId);
    } catch (error) {
      throw new AppError(`Failed to find products by category: ${error.message}`, 500);
    }
  }

  async updateStock(id: number, quantity: number, operation: 'add' | 'subtract'): Promise<Product> {
    try {
      const product = await this.productRepository.findById(id);
      if (!product) {
        throw new AppError('Product not found', 404);
      }

      if (!product.track_inventory) {
        throw new AppError('Product does not track inventory', 400);
      }

      const currentStock = product.stock_quantity || 0;
      const newStock = operation === 'add' ? currentStock + quantity : currentStock - quantity;

      if (newStock < 0) {
        throw new AppError('Insufficient stock', 400);
      }

      if (newStock < (product.min_stock_quantity || 0)) {
        // Podría enviar una notificación aquí
        console.warn(`Product ${product.sku} is below minimum stock level`);
      }

      return await this.productRepository.update(id, { stock_quantity: newStock });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to update stock: ${error.message}`, 500);
    }
  }

  async bulkUpdatePrices(updates: Array<{ id: number; price: number }>): Promise<boolean> {
    try {
      // Validar que todos los productos existen
      for (const update of updates) {
        const product = await this.productRepository.findById(update.id);
        if (!product) {
          throw new AppError(`Product with ID ${update.id} not found`, 404);
        }
      }

      // Ejecutar actualizaciones
      for (const update of updates) {
        await this.productRepository.update(update.id, { base_price: update.price });
      }

      return true;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to bulk update prices: ${error.message}`, 500);
    }
  }

  async getInventoryStatus(): Promise<any> {
    try {
      return await this.productRepository.getInventoryStatus();
    } catch (error) {
      throw new AppError(`Failed to get inventory status: ${error.message}`, 500);
    }
  }
}