// Catalog Hooks Index - Sprint 19 Frontend Implementation

export { default as useProductCatalog } from './useProductCatalog';
export { default as useProductSearch } from './useProductSearch';
export { default as useCategories } from './useCategories';
export { default as useInventory } from './useInventory';
export { default as useProductFilters } from './useProductFilters';
export { default as useVirtualScroll } from './useVirtualScroll';

// Re-export types for convenience
export type {
  UseProductCatalogOptions,
  UseProductCatalogReturn
} from './useProductCatalog';

export type {
  UseProductSearchOptions,
  UseProductSearchReturn
} from './useProductSearch';

export type {
  UseCategoriesOptions,
  UseCategoriesReturn
} from './useCategories';

export type {
  UseInventoryOptions,
  UseInventoryReturn
} from './useInventory';

export type {
  UseProductFiltersOptions,
  UseProductFiltersReturn
} from './useProductFilters';

export type {
  UseVirtualScrollOptions,
  UseVirtualScrollReturn
} from './useVirtualScroll';