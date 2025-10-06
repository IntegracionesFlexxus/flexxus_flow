import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { IProductCategoryService } from '../interfaces/IProductCategoryService';
import { IProductCategoryRepository } from '../interfaces/IProductCategoryRepository';
// TODO: Create missing types file
// import { ProductCategory, ProductCategoryInput } from '../../../types/product.types';
import { AppError, ErrorCode } from '../../../../../shared/errors/AppError';

@injectable()
export class ProductCategoryService implements IProductCategoryService {
  constructor(
    @inject(TYPES.ProductCategoryRepository)
    private categoryRepository: IProductCategoryRepository,
    @inject(TYPES.CrmConnection)
    private pool: any
  ) {}

  async create(data: any): Promise<any> {
    try {
      const companyId = data.company_id;
      if (!companyId) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'company_id is required', 400);
      }

      // Validar que no existe una categoría con el mismo nombre
      const existing = await this.categoryRepository.findByName(data.name);
      if (existing) {
        throw new AppError(ErrorCode.RESOURCE_ALREADY_EXISTS, 'Category with this name already exists', 409);
      }

      // Si tiene padre, validar que existe
      if (data.parent_category_id) {
        const parent = await this.categoryRepository.findById(companyId, data.parent_category_id);
        if (!parent) {
          throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Parent category not found', 404);
        }

        // Calcular nivel basado en el padre
        data.level = (parent.level || 0) + 1;

        // Construir path
        data.path = parent.path ? `${parent.path}/${data.name}` : data.name;
      } else {
        data.level = 0;
        data.path = data.name;
      }

      return await this.categoryRepository.create(companyId, data);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(ErrorCode.INTERNAL_SERVER_ERROR, `Failed to create category: ${error.message}`, 500);
    }
  }

  async update(id: number, data: Partial<any>): Promise<any> {
    try {
      const companyId = data.company_id;
      if (!companyId) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'company_id is required', 400);
      }

      const category = await this.categoryRepository.findById(companyId, id);
      if (!category) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Category not found', 404);
      }

      // No permitir cambiar el padre a sí mismo o a sus hijos
      if (data.parent_category_id) {
        if (data.parent_category_id === id) {
          throw new AppError(ErrorCode.BUSINESS_RULE_VIOLATION, 'Category cannot be its own parent', 400);
        }

        const children = await this.getChildrenRecursive(id, companyId);
        if (children.some(c => c.category_id === data.parent_category_id)) {
          throw new AppError(ErrorCode.BUSINESS_RULE_VIOLATION, 'Cannot set child category as parent', 400);
        }
      }

      return await this.categoryRepository.update(companyId, id, data);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(ErrorCode.INTERNAL_SERVER_ERROR, `Failed to update category: ${error.message}`, 500);
    }
  }

  async delete(id: number, companyId: number): Promise<boolean> {
    try {
      const category = await this.categoryRepository.findById(companyId, id);
      if (!category) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Category not found', 404);
      }

      // Verificar si tiene productos
      const hasProducts = await this.categoryRepository.hasProducts(id);
      if (hasProducts) {
        throw new AppError(ErrorCode.BUSINESS_RULE_VIOLATION, 'Cannot delete category with products', 409);
      }

      // Verificar si tiene subcategorías
      const children = await this.categoryRepository.getChildren(companyId, id);
      if (children.length > 0) {
        throw new AppError(ErrorCode.BUSINESS_RULE_VIOLATION, 'Cannot delete category with subcategories', 409);
      }

      return await this.categoryRepository.delete(companyId, id);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(ErrorCode.INTERNAL_SERVER_ERROR, `Failed to delete category: ${error.message}`, 500);
    }
  }

  async findById(id: number, companyId: number): Promise<any | null> {
    return await this.categoryRepository.findById(companyId, id);
  }

  async findAll(companyId: number, includeInactive = false): Promise<any[]> {
    return await this.categoryRepository.findAll(companyId);
  }

  async getHierarchy(companyId: number): Promise<any> {
    const categories = await this.categoryRepository.findAll(companyId);
    return this.buildHierarchy(categories);
  }

  async getChildren(parentId: number, companyId: number): Promise<any[]> {
    return await this.categoryRepository.getChildren(companyId, parentId);
  }

  async getChildrenRecursive(parentId: number, companyId: number): Promise<any[]> {
    const children = await this.categoryRepository.getChildren(companyId, parentId);
    const allChildren = [...children];

    for (const child of children) {
      const grandChildren = await this.getChildrenRecursive(child.category_id, companyId);
      allChildren.push(...grandChildren);
    }

    return allChildren;
  }

  async getPath(categoryId: number, companyId: number): Promise<any[]> {
    const category = await this.categoryRepository.findById(companyId, categoryId);
    if (!category) return [];

    const path: any[] = [category];
    let currentCategory = category;

    while (currentCategory.parent_category_id) {
      const parent = await this.categoryRepository.findById(companyId, currentCategory.parent_category_id);
      if (!parent) break;
      path.unshift(parent);
      currentCategory = parent;
    }

    return path;
  }

  async moveCategory(categoryId: number, newParentId: number | null, companyId: number): Promise<any> {
    try {
      const category = await this.categoryRepository.findById(companyId, categoryId);
      if (!category) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Category not found', 404);
      }

      // Validaciones de movimiento
      if (newParentId) {
        if (newParentId === categoryId) {
          throw new AppError(ErrorCode.BUSINESS_RULE_VIOLATION, 'Category cannot be its own parent', 400);
        }

        const children = await this.getChildrenRecursive(categoryId, companyId);
        if (children.some(c => c.category_id === newParentId)) {
          throw new AppError(ErrorCode.BUSINESS_RULE_VIOLATION, 'Cannot move category to its own descendant', 400);
        }
      }

      return await this.categoryRepository.update(companyId, categoryId, {
        parent_category_id: newParentId
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(ErrorCode.INTERNAL_SERVER_ERROR, `Failed to move category: ${error.message}`, 500);
    }
  }

  private buildHierarchy(categories: any[]): any {
    const map = new Map();
    const roots = [];

    // Create map
    categories.forEach(cat => {
      map.set(cat.category_id, {
        ...cat,
        children: []
      });
    });

    // Build hierarchy
    categories.forEach(cat => {
      if (cat.parent_category_id) {
        const parent = map.get(cat.parent_category_id);
        if (parent) {
          parent.children.push(map.get(cat.category_id));
        }
      } else {
        roots.push(map.get(cat.category_id));
      }
    });

    return roots;
  }
}