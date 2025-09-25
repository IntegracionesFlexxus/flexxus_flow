import { injectable, inject } from 'tsyringe';
import { IProductCategoryService } from '../interfaces/IProductCategoryService';
import { IProductCategoryRepository } from '../interfaces/IProductCategoryRepository';
import { ProductCategory, ProductCategoryInput } from '../../../types/product.types';
import { AppError } from '../../../../../shared/errors/AppError';

@injectable()
export class ProductCategoryService implements IProductCategoryService {
  constructor(
    @inject('ProductCategoryRepository')
    private categoryRepository: IProductCategoryRepository,
    @inject('DatabasePool')
    private pool: any
  ) {}

  async create(data: ProductCategoryInput): Promise<ProductCategory> {
    try {
      // Validar que no existe una categoría con el mismo nombre
      const existing = await this.categoryRepository.findByName(data.name);
      if (existing) {
        throw new AppError('Category with this name already exists', 409);
      }

      // Si tiene padre, validar que existe
      if (data.parent_category_id) {
        const parent = await this.categoryRepository.findById(data.parent_category_id);
        if (!parent) {
          throw new AppError('Parent category not found', 404);
        }

        // Calcular nivel basado en el padre
        data.level = (parent.level || 0) + 1;

        // Construir path
        data.path = parent.path ? `${parent.path}/${data.name}` : data.name;
      } else {
        data.level = 0;
        data.path = data.name;
      }

      return await this.categoryRepository.create(data);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to create category: ${error.message}`, 500);
    }
  }

  async update(id: number, data: Partial<ProductCategoryInput>): Promise<ProductCategory> {
    try {
      const category = await this.categoryRepository.findById(id);
      if (!category) {
        throw new AppError('Category not found', 404);
      }

      // No permitir cambiar el padre a sí mismo o a sus hijos
      if (data.parent_category_id) {
        if (data.parent_category_id === id) {
          throw new AppError('Category cannot be its own parent', 400);
        }

        const children = await this.getChildrenRecursive(id);
        if (children.some(c => c.category_id === data.parent_category_id)) {
          throw new AppError('Cannot set child category as parent', 400);
        }
      }

      return await this.categoryRepository.update(id, data);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to update category: ${error.message}`, 500);
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      const category = await this.categoryRepository.findById(id);
      if (!category) {
        throw new AppError('Category not found', 404);
      }

      // Verificar si tiene productos
      const hasProducts = await this.categoryRepository.hasProducts(id);
      if (hasProducts) {
        throw new AppError('Cannot delete category with products', 409);
      }

      // Verificar si tiene subcategorías
      const children = await this.categoryRepository.getChildren(id);
      if (children.length > 0) {
        throw new AppError('Cannot delete category with subcategories', 409);
      }

      return await this.categoryRepository.delete(id);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to delete category: ${error.message}`, 500);
    }
  }

  async findById(id: number): Promise<ProductCategory | null> {
    return await this.categoryRepository.findById(id);
  }

  async findAll(includeInactive = false): Promise<ProductCategory[]> {
    return await this.categoryRepository.findAll(includeInactive);
  }

  async getHierarchy(): Promise<any> {
    const categories = await this.categoryRepository.findAll(false);
    return this.buildHierarchy(categories);
  }

  async getChildren(parentId: number): Promise<ProductCategory[]> {
    return await this.categoryRepository.getChildren(parentId);
  }

  async getChildrenRecursive(parentId: number): Promise<ProductCategory[]> {
    const children = await this.categoryRepository.getChildren(parentId);
    const allChildren = [...children];

    for (const child of children) {
      const grandChildren = await this.getChildrenRecursive(child.category_id);
      allChildren.push(...grandChildren);
    }

    return allChildren;
  }

  async getPath(categoryId: number): Promise<ProductCategory[]> {
    const category = await this.categoryRepository.findById(categoryId);
    if (!category) return [];

    const path: ProductCategory[] = [category];
    let currentCategory = category;

    while (currentCategory.parent_category_id) {
      const parent = await this.categoryRepository.findById(currentCategory.parent_category_id);
      if (!parent) break;
      path.unshift(parent);
      currentCategory = parent;
    }

    return path;
  }

  async moveCategory(categoryId: number, newParentId: number | null): Promise<ProductCategory> {
    try {
      const category = await this.categoryRepository.findById(categoryId);
      if (!category) {
        throw new AppError('Category not found', 404);
      }

      // Validaciones de movimiento
      if (newParentId) {
        if (newParentId === categoryId) {
          throw new AppError('Category cannot be its own parent', 400);
        }

        const children = await this.getChildrenRecursive(categoryId);
        if (children.some(c => c.category_id === newParentId)) {
          throw new AppError('Cannot move category to its own descendant', 400);
        }
      }

      return await this.categoryRepository.update(categoryId, {
        parent_category_id: newParentId
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to move category: ${error.message}`, 500);
    }
  }

  private buildHierarchy(categories: ProductCategory[]): any {
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