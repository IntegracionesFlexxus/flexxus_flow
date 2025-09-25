// Shared Types Index - Sprint 19 Frontend Implementation

// Re-export all types
export * from './product.types';
export * from './pricing.types';
export * from './quote.types';
export * from './approval.types';

// Common shared types used across modules
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterConfig {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
}

export interface TableColumn<T = any> {
  key: string;
  title: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: number | string;
  render?: (value: any, record: T, index: number) => React.ReactNode;
}

export interface ActionItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}

export interface NavigationItem {
  key: string;
  label: string;
  path: string;
  icon?: React.ReactNode;
  children?: NavigationItem[];
  badge?: number | string;
  disabled?: boolean;
}

export interface BreadcrumbItem {
  key: string;
  label: string;
  path?: string;
  onClick?: () => void;
}

export interface TabItem {
  key: string;
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
  closable?: boolean;
}

export interface MenuOption {
  value: any;
  label: string;
  disabled?: boolean;
  group?: string;
  icon?: React.ReactNode;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'password' | 'textarea' | 'select' | 'multiselect' | 'checkbox' | 'radio' | 'date' | 'datetime' | 'file' | 'custom';
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: MenuOption[];
  validation?: ValidationRule[];
  defaultValue?: any;
  component?: React.ComponentType<any>;
}

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message: string;
  validator?: (value: any) => boolean | Promise<boolean>;
}

export interface NotificationConfig {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface LoadingState {
  loading: boolean;
  error: string | null;
  lastUpdated?: string;
}

export interface SelectionState<T = number> {
  selectedItems: T[];
  selectAll: boolean;
  indeterminate: boolean;
}

export interface ViewMode {
  type: 'grid' | 'list' | 'table' | 'kanban';
  itemsPerPage: number;
  showFilters: boolean;
  showSearch: boolean;
}

export interface DragDropResult {
  sourceIndex: number;
  destinationIndex: number;
  sourceId: string;
  destinationId?: string;
}

export interface FileUploadResult {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf' | 'json';
  columns: string[];
  filters?: FilterConfig[];
  includeHeaders: boolean;
  filename?: string;
}

export interface ImportOptions {
  format: 'csv' | 'excel' | 'json';
  hasHeaders: boolean;
  mapping: Record<string, string>;
  validation: boolean;
  preview: boolean;
}

export interface SearchSuggestion {
  value: string;
  label: string;
  type: 'recent' | 'popular' | 'suggestion';
  count?: number;
}

export interface BulkAction {
  key: string;
  label: string;
  icon?: React.ReactNode;
  handler: (selectedIds: number[]) => Promise<void>;
  confirmation?: {
    title: string;
    message: string;
  };
  disabled?: boolean;
}

export interface SystemConfiguration {
  company: {
    id: number;
    name: string;
    currency: string;
    timezone: string;
    dateFormat: string;
    numberFormat: string;
  };
  features: {
    multiCurrency: boolean;
    advancedPricing: boolean;
    workflowApprovals: boolean;
    documentGeneration: boolean;
    analytics: boolean;
  };
  limits: {
    maxProducts: number;
    maxQuoteItems: number;
    maxFileSize: number;
    maxUsers: number;
  };
  integrations: {
    enabled: string[];
    configurations: Record<string, any>;
  };
}

export interface UserPermissions {
  module: string;
  actions: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    approve: boolean;
    export: boolean;
    import: boolean;
    admin: boolean;
  };
}

export interface AuditLog {
  id: number;
  entityType: string;
  entityId: number;
  action: 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'export' | 'import';
  userId: number;
  userName: string;
  timestamp: string;
  changes?: Record<string, { old: any; new: any }>;
  metadata?: Record<string, any>;
}

// Theme and UI types
export interface ThemeColors {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  borderLight: string;
}

export interface Breakpoints {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  xxl: string;
}

export interface Spacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  xxl: string;
}

export interface ComponentSize {
  small: string;
  medium: string;
  large: string;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredKeys<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

export type EntityWithTimestamps = {
  createdAt: string;
  updatedAt: string;
  createdBy?: number;
  updatedBy?: number;
};

export type CreateDto<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;

export type UpdateDto<T> = Partial<Omit<T, 'id' | 'createdAt' | 'createdBy'>>;