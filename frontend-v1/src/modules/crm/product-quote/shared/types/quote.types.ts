// Quote Types - Sprint 19 Frontend Implementation

export interface Quote {
  id: number;
  companyId: number;
  quoteNumber: string;
  version: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'sent' | 'accepted' | 'expired' | 'converted';
  type: 'standard' | 'renewal' | 'amendment' | 'upsell';

  // Customer Information
  customerId?: number;
  accountId?: number;
  contactId?: number;
  customer?: QuoteCustomer;

  // Quote Details
  title: string;
  description?: string;
  currencyCode: string;
  exchangeRate: number;

  // Line Items
  lineItems: QuoteLineItem[];
  sections: QuoteSection[];

  // Pricing
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  total: number;
  margin?: number;

  // Terms
  terms?: QuoteTerms;
  notes?: string;
  internalNotes?: string;

  // Dates
  validFrom: string;
  validTo: string;
  createdAt: string;
  updatedAt: string;

  // Workflow
  approvalStatus: 'not_required' | 'pending' | 'approved' | 'rejected';
  approvalProcessId?: number;

  // Users
  createdBy: number;
  updatedBy?: number;
  assignedTo?: number;

  // Metadata
  tags?: string[];
  customFields?: Record<string, any>;

  // Related Records
  opportunityId?: number;
  sourceQuoteId?: number; // For versions/amendments
  convertedOrderId?: number;

  // Documents
  documents?: QuoteDocument[];
}

export interface QuoteLineItem {
  id: number;
  quoteId: number;
  sectionId?: number;

  // Product Information
  productId?: number;
  product?: Product;
  variantId?: number;

  // Line Details
  name: string;
  description?: string;
  sku?: string;

  // Quantities and Pricing
  quantity: number;
  unitPrice: number;
  listPrice?: number;
  cost?: number;
  discount: number;
  discountType: 'percentage' | 'fixed';
  subtotal: number;

  // Configuration
  configuration?: LineItemConfiguration;
  customFields?: Record<string, any>;

  // Metadata
  sortOrder: number;
  isOptional: boolean;

  // Pricing Rules
  appliedRules: AppliedRule[];

  // Revenue Recognition
  revenueScheduleId?: number;

  createdAt: string;
  updatedAt: string;
}

export interface QuoteSection {
  id: number;
  quoteId: number;
  name: string;
  description?: string;
  sortOrder: number;
  isCollapsible: boolean;
  isCollapsed: boolean;
  showTotals: boolean;
  lineItems: QuoteLineItem[];
}

export interface LineItemConfiguration {
  attributes: Record<string, any>;
  options: ConfigurationOption[];
  bundleItems?: BundleConfiguration[];
}

export interface ConfigurationOption {
  name: string;
  value: any;
  label?: string;
  priceImpact?: number;
}

export interface BundleConfiguration {
  productId: number;
  quantity: number;
  isRequired: boolean;
  configuration?: Record<string, any>;
}

export interface QuoteCustomer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  billingAddress?: Address;
  shippingAddress?: Address;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface QuoteTerms {
  paymentTerms?: string;
  deliveryTerms?: string;
  warrantyTerms?: string;
  supportTerms?: string;
  cancellationTerms?: string;
  customTerms?: TermSection[];
}

export interface TermSection {
  title: string;
  content: string;
  isRequired: boolean;
}

export interface QuoteDocument {
  id: number;
  quoteId: number;
  type: 'pdf' | 'word' | 'excel' | 'image';
  name: string;
  url: string;
  size: number;
  generatedAt: string;
  templateId?: number;
}

export interface QuoteTotals {
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  shipping?: number;
  total: number;
  margin?: number;
  marginPercentage?: number;
}

export interface QuoteCalculation {
  lineItems: LineItemCalculation[];
  sections: SectionCalculation[];
  totals: QuoteTotals;
  appliedDiscounts: DiscountInfo[];
  taxes: TaxCalculation[];
}

export interface LineItemCalculation {
  lineItemId: number;
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
  tax: number;
  total: number;
}

export interface SectionCalculation {
  sectionId: number;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

export interface TaxCalculation {
  name: string;
  rate: number;
  amount: number;
  included: boolean;
}

// Quote Builder Types
export interface QuoteBuilder {
  quote: Quote | null;
  isDirty: boolean;
  isValid: boolean;
  validationErrors: ValidationError[];
  calculatedTotals: QuoteTotals;

  // Actions
  initializeQuote: (data: Partial<Quote>) => void;
  updateQuote: (updates: Partial<Quote>) => void;
  addLineItem: (item: CreateLineItemDto) => void;
  updateLineItem: (id: number, updates: Partial<QuoteLineItem>) => void;
  removeLineItem: (id: number) => void;
  reorderLineItems: (items: { id: number; sortOrder: number }[]) => void;
  addSection: (section: Omit<QuoteSection, 'id' | 'quoteId'>) => void;
  updateSection: (id: number, updates: Partial<QuoteSection>) => void;
  removeSection: (id: number) => void;
  calculateTotals: () => void;
  validate: () => boolean;
  save: () => Promise<void>;
  submitForApproval: () => Promise<void>;
  reset: () => void;
}

export interface CreateLineItemDto {
  productId?: number;
  variantId?: number;
  name: string;
  description?: string;
  sku?: string;
  quantity: number;
  unitPrice?: number;
  discount?: number;
  discountType?: 'percentage' | 'fixed';
  sectionId?: number;
  configuration?: LineItemConfiguration;
  isOptional?: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

// Document Generation Types
export interface DocumentTemplate {
  id: number;
  companyId: number;
  name: string;
  type: 'quote' | 'proposal' | 'contract' | 'invoice';
  format: 'pdf' | 'word' | 'html';
  content: string;
  variables: TemplateVariable[];
  styles?: string;
  header?: string;
  footer?: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateVariable {
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  defaultValue?: any;
}

export interface DocumentGenerationRequest {
  quoteId: number;
  templateId: number;
  format?: 'pdf' | 'word' | 'html';
  variables?: Record<string, any>;
  includeAttachments?: boolean;
}

export interface DocumentGenerationResult {
  id: number;
  url: string;
  fileName: string;
  size: number;
  format: string;
  generatedAt: string;
  variables: Record<string, any>;
}

// Component Props Types
export interface QuoteBuilderProps {
  quoteId?: string;
  customerId?: number;
  accountId?: number;
  opportunityId?: number;
  onSave?: (quote: Quote) => void;
  onCancel?: () => void;
  onSubmitApproval?: (quote: Quote) => void;
}

export interface QuoteLineItemsTableProps {
  lineItems: QuoteLineItem[];
  sections: QuoteSection[];
  editable?: boolean;
  onAddItem: () => void;
  onEditItem: (item: QuoteLineItem) => void;
  onRemoveItem: (itemId: number) => void;
  onReorderItems: (items: { id: number; sortOrder: number }[]) => void;
  onUpdateQuantity: (itemId: number, quantity: number) => void;
  onUpdateDiscount: (itemId: number, discount: number, type: 'percentage' | 'fixed') => void;
  loading?: boolean;
}

export interface QuoteSummaryProps {
  quote: Quote;
  totals: QuoteTotals;
  showBreakdown?: boolean;
  editable?: boolean;
  onUpdateTerms?: (terms: QuoteTerms) => void;
}

export interface QuoteVersionManagerProps {
  quote: Quote;
  versions: Quote[];
  onCreateVersion: () => void;
  onRestoreVersion: (versionId: number) => void;
  onCompareVersions: (version1Id: number, version2Id: number) => void;
}

export interface QuoteComparisonProps {
  quote1: Quote;
  quote2: Quote;
  onClose: () => void;
}

export interface QuoteDataTableProps {
  quotes: Quote[];
  loading?: boolean;
  filters: QuoteFilters;
  onFiltersChange: (filters: QuoteFilters) => void;
  onEdit: (quote: Quote) => void;
  onDelete: (quoteId: number) => void;
  onDuplicate: (quote: Quote) => void;
  onConvert: (quote: Quote) => void;
  onExport: (quoteIds: number[]) => void;
}

export interface QuoteFilters {
  status: string[];
  type: string[];
  customer: string;
  assignedTo: number[];
  dateRange: {
    start: string;
    end: string;
  };
  amountRange: [number, number];
  tags: string[];
  search: string;
}

// Store Types
export interface QuoteStore {
  // State
  quotes: Quote[];
  currentQuote: Quote | null;
  quoteTotals: QuoteTotals | null;
  loading: boolean;
  error: string | null;

  // Builder State
  builder: QuoteBuilder | null;

  // Actions
  loadQuotes: (filters?: QuoteFilters) => Promise<void>;
  loadQuote: (id: number) => Promise<void>;
  createQuote: (data: Omit<Quote, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Quote>;
  updateQuote: (id: number, updates: Partial<Quote>) => Promise<void>;
  deleteQuote: (id: number) => Promise<void>;
  duplicateQuote: (id: number) => Promise<Quote>;

  // Line Items
  addLineItem: (quoteId: number, item: CreateLineItemDto) => Promise<void>;
  updateLineItem: (itemId: number, updates: Partial<QuoteLineItem>) => Promise<void>;
  removeLineItem: (itemId: number) => Promise<void>;

  // Calculations
  calculateTotals: (quoteId: number) => Promise<QuoteTotals>;

  // Workflow
  submitForApproval: (quoteId: number) => Promise<void>;
  convertToOrder: (quoteId: number) => Promise<void>;

  // Builder
  initializeBuilder: (quoteId?: number) => void;
  destroyBuilder: () => void;
}