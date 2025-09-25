import 'reflect-metadata';
import { ProductService } from '../../catalog/services/product.service';
import { IProductRepository } from '../../catalog/interfaces/IProductRepository';
import { AppError } from '../../../../../shared/errors/AppError';

describe('ProductService', () => {
  let productService: ProductService;
  let mockProductRepository: jest.Mocked<IProductRepository>;

  beforeEach(() => {
    mockProductRepository = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findById: jest.fn(),
      findBySKU: jest.fn(),
      findAll: jest.fn(),
      findByCategory: jest.fn(),
      hasActiveQuotes: jest.fn(),
      getInventoryStatus: jest.fn()
    };

    productService = new ProductService(mockProductRepository);
  });

  describe('create', () => {
    it('should create a product successfully', async () => {
      const productInput = {
        sku: 'TEST-001',
        name: 'Test Product',
        base_price: 100,
        cost_price: 50
      };

      const expectedProduct = {
        product_id: 1,
        ...productInput,
        profit_margin: 100
      };

      mockProductRepository.findBySKU.mockResolvedValue(null);
      mockProductRepository.create.mockResolvedValue(expectedProduct);

      const result = await productService.create(productInput);

      expect(result).toEqual(expectedProduct);
      expect(mockProductRepository.findBySKU).toHaveBeenCalledWith('TEST-001');
      expect(mockProductRepository.create).toHaveBeenCalledWith({
        ...productInput,
        profit_margin: 100
      });
    });

    it('should throw error if SKU already exists', async () => {
      const productInput = {
        sku: 'TEST-001',
        name: 'Test Product',
        base_price: 100
      };

      mockProductRepository.findBySKU.mockResolvedValue({ product_id: 1 } as any);

      await expect(productService.create(productInput)).rejects.toThrow(
        new AppError('SKU already exists', 409)
      );
    });
  });

  describe('update', () => {
    it('should update a product successfully', async () => {
      const existingProduct = {
        product_id: 1,
        sku: 'TEST-001',
        name: 'Test Product',
        base_price: 100,
        cost_price: 50
      };

      const updateData = {
        base_price: 120
      };

      const updatedProduct = {
        ...existingProduct,
        ...updateData,
        profit_margin: 140
      };

      mockProductRepository.findById.mockResolvedValue(existingProduct);
      mockProductRepository.update.mockResolvedValue(updatedProduct);

      const result = await productService.update(1, updateData);

      expect(result).toEqual(updatedProduct);
      expect(mockProductRepository.update).toHaveBeenCalledWith(1, {
        ...updateData,
        profit_margin: 140
      });
    });

    it('should throw error if product not found', async () => {
      mockProductRepository.findById.mockResolvedValue(null);

      await expect(productService.update(1, {})).rejects.toThrow(
        new AppError('Product not found', 404)
      );
    });
  });

  describe('delete', () => {
    it('should delete a product successfully', async () => {
      mockProductRepository.findById.mockResolvedValue({ product_id: 1 } as any);
      mockProductRepository.hasActiveQuotes.mockResolvedValue(false);
      mockProductRepository.delete.mockResolvedValue(true);

      const result = await productService.delete(1);

      expect(result).toBe(true);
      expect(mockProductRepository.hasActiveQuotes).toHaveBeenCalledWith(1);
      expect(mockProductRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw error if product has active quotes', async () => {
      mockProductRepository.findById.mockResolvedValue({ product_id: 1 } as any);
      mockProductRepository.hasActiveQuotes.mockResolvedValue(true);

      await expect(productService.delete(1)).rejects.toThrow(
        new AppError('Cannot delete product with active quotes', 409)
      );
    });
  });

  describe('updateStock', () => {
    it('should add stock successfully', async () => {
      const product = {
        product_id: 1,
        sku: 'TEST-001',
        track_inventory: true,
        stock_quantity: 10,
        min_stock_quantity: 5
      };

      const updatedProduct = {
        ...product,
        stock_quantity: 20
      };

      mockProductRepository.findById.mockResolvedValue(product);
      mockProductRepository.update.mockResolvedValue(updatedProduct);

      const result = await productService.updateStock(1, 10, 'add');

      expect(result).toEqual(updatedProduct);
      expect(mockProductRepository.update).toHaveBeenCalledWith(1, { stock_quantity: 20 });
    });

    it('should subtract stock successfully', async () => {
      const product = {
        product_id: 1,
        sku: 'TEST-001',
        track_inventory: true,
        stock_quantity: 10
      };

      const updatedProduct = {
        ...product,
        stock_quantity: 5
      };

      mockProductRepository.findById.mockResolvedValue(product);
      mockProductRepository.update.mockResolvedValue(updatedProduct);

      const result = await productService.updateStock(1, 5, 'subtract');

      expect(result).toEqual(updatedProduct);
      expect(mockProductRepository.update).toHaveBeenCalledWith(1, { stock_quantity: 5 });
    });

    it('should throw error for insufficient stock', async () => {
      const product = {
        product_id: 1,
        track_inventory: true,
        stock_quantity: 5
      };

      mockProductRepository.findById.mockResolvedValue(product);

      await expect(productService.updateStock(1, 10, 'subtract')).rejects.toThrow(
        new AppError('Insufficient stock', 400)
      );
    });

    it('should throw error if product does not track inventory', async () => {
      const product = {
        product_id: 1,
        track_inventory: false
      };

      mockProductRepository.findById.mockResolvedValue(product);

      await expect(productService.updateStock(1, 10, 'add')).rejects.toThrow(
        new AppError('Product does not track inventory', 400)
      );
    });
  });
});