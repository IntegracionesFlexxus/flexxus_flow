// Product Types - Sprint 19 Frontend Implementation

export interface Product {
  id: number;
  companyId: number;
  name: string;
  sku: string;
  description?: string;
  longDescription?: string;
  status: 'active' | 'inactive' | 'discontinued';
  categoryId?: number;
  category?: Category;
  type: 'simple' | 'variable' | 'grouped' | 'external';
  isDigital: boolean;
  isVirtual: boolean;
  isDownloadable: boolean;
  weight?: number;
  dimensions?: ProductDimensions;
  images: ProductImage[];
  variants?: ProductVariant[];
  customFields?: Record<string, any>;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  updatedBy?: number;
}

export interface ProductVariant {
  id: number;
  productId: number;
  sku: string;
  attributes: ProductAttribute[];
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  inventoryQuantity: number;
  lowStockThreshold?: number;
  weight?: number;
  dimensions?: ProductDimensions;
  image?: string;
  isActive: boolean;
}

export interface ProductAttribute {
  id: number;
  name: string;
  value: string;
  displayName?: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'color' | 'image';
  options?: string[];
}

export interface ProductDimensions {
  length?: number;
  width?: number;
  height?: number;
  unit: 'cm' | 'in' | 'm';
}

export interface ProductImage {
  id: number;
  url: string;
  alt?: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface Category {
  id: number;
  companyId: number;
  name: string;
  slug: string;
  description?: string;
  parentId?: number;
  parent?: Category;
  children?: Category[];
  level: number;
  lft: number; // Nested Set Model
  rgt: number; // Nested Set Model
  productCount: number;
  image?: string;
  isActive: boolean;
  sortOrder: number;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ProductBundle {
  id: number;
  companyId: number;
  name: string;
  description?: string;
  bundleType: 'fixed' | 'dynamic' | 'mixed';
  items: BundleItem[];
  pricing: BundlePricing;
  isActive: boolean;
  validFrom?: string;
  validTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BundleItem {
  id: number;
  productId: number;
  product: Product;
  quantity: number;
  isOptional: boolean;
  discount?: number;
  discountType: 'percentage' | 'fixed';
}

export interface BundlePricing {
  type: 'percentage_discount' | 'fixed_discount' | 'fixed_price';
  value: number;
  minQuantity?: number;
  maxQuantity?: number;
}

export interface InventoryLevel {
  productId: number;
  variantId?: number;
  quantity: number;
  available: number;
  committed: number;
  onOrder: number;
  lowStockThreshold: number;
  location?: string;
  lastUpdated: string;
}

export interface ProductSearchParams {
  query?: string;
  categoryId?: number;
  status?: string[];
  type?: string[];
  tags?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  hasImages?: boolean;
  sortBy?: 'name' | 'price' | 'created_at' | 'updated_at' | 'popularity';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  facets?: string[];
}

export interface ProductSearchResult {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  facets: ProductFacet[];
  suggestions?: string[];
}

export interface ProductFacet {
  name: string;
  displayName: string;
  type: 'text' | 'number' | 'range' | 'boolean';
  values: FacetValue[];
}

export interface FacetValue {
  value: string;
  count: number;
  selected: boolean;
}

export interface CreateProductDto {
  name: string;
  sku: string;
  description?: string;
  longDescription?: string;
  status: 'active' | 'inactive';
  categoryId?: number;
  type: 'simple' | 'variable' | 'grouped' | 'external';
  isDigital?: boolean;
  isVirtual?: boolean;
  isDownloadable?: boolean;
  weight?: number;
  dimensions?: ProductDimensions;
  images?: Omit<ProductImage, 'id'>[];
  variants?: Omit<ProductVariant, 'id' | 'productId'>[];
  customFields?: Record<string, any>;
  tags?: string[];
}

export interface UpdateProductDto extends Partial<CreateProductDto> {
  updatedBy?: number;
}

export interface ProductFilters {
  categories: number[];
  status: string[];
  type: string[];
  tags: string[];
  priceRange: [number, number];
  inStock: boolean;
  hasImages: boolean;
  search: string;
}

export interface ImportResult {
  success: number;
  failed: number;
  errors: ImportError[];
  warnings: ImportWarning[];
}

export interface ImportError {
  row: number;
  field: string;
  message: string;
  value?: any;
}

export interface ImportWarning {
  row: number;
  field: string;
  message: string;
  value?: any;
}

// Component Props Types
export interface ProductGridProps {
  products: Product[];
  loading?: boolean;
  viewMode: 'grid' | 'list';
  selectable?: boolean;
  selectedItems?: number[];
  onProductSelect?: (product: Product) => void;
  onSelectionChange?: (selectedIds: number[]) => void;
  onBulkAction?: (action: string, ids: number[]) => void;
  virtualScrolling?: boolean;
}

export interface ProductCardProps {
  product: Product;
  viewMode: 'grid' | 'list';
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (product: Product) => void;
  onEdit?: (product: Product) => void;
  onDelete?: (productId: number) => void;
}

export interface CategoryTreeProps {
  categories: Category[];
  selectedCategoryId?: number;
  onSelectCategory: (category: Category | null) => void;
  onMoveCategory?: (categoryId: number, newParentId: number | null) => void;
  onEditCategory?: (category: Category) => void;
  onDeleteCategory?: (categoryId: number) => void;
  expandable?: boolean;
  showProductCounts?: boolean;
}

export interface ProductFiltersProps {
  filters: ProductFilters;
  categories: Category[];
  availableTags: string[];
  onFiltersChange: (filters: ProductFilters) => void;
  onClearFilters: () => void;
  loading?: boolean;
}