// Pricing Types - Sprint 19 Frontend Implementation

export interface PricingRule {
  id: number;
  companyId: number;
  name: string;
  description?: string;
  priority: number;
  isActive: boolean;
  type: 'percentage' | 'fixed_amount' | 'fixed_price' | 'tiered' | 'volume';
  conditions: PricingCondition[];
  actions: PricingAction[];
  validFrom?: string;
  validTo?: string;
  minQuantity?: number;
  maxQuantity?: number;
  applicableProducts: number[];
  applicableCategories: number[];
  applicableCustomers: number[];
  createdAt: string;
  updatedAt: string;
  createdBy: number;
}

export interface PricingCondition {
  id: number;
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'greater_equal' | 'less_equal' | 'in' | 'not_in' | 'contains';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface PricingAction {
  id: number;
  type: 'discount_percentage' | 'discount_amount' | 'set_price' | 'markup_percentage' | 'markup_amount';
  value: number;
  applyTo: 'line_total' | 'unit_price' | 'shipping' | 'tax';
}

export interface PriceCalculationParams {
  productId: number;
  variantId?: number;
  quantity: number;
  customerId?: number;
  accountId?: number;
  currencyCode?: string;
  date?: string;
  context?: PricingContext;
}

export interface PricingContext {
  salesChannel?: string;
  region?: string;
  customerSegment?: string;
  loyaltyTier?: string;
  promotionCode?: string;
  bundleId?: number;
}

export interface PriceResult {
  basePrice: number;
  finalPrice: number;
  currency: string;
  breakdown: PriceBreakdown[];
  appliedRules: AppliedRule[];
  discounts: DiscountInfo[];
  taxes: TaxInfo[];
  metadata?: Record<string, any>;
  calculatedAt: string;
}

export interface PriceBreakdown {
  component: 'base_price' | 'discount' | 'markup' | 'tax' | 'shipping' | 'fee';
  amount: number;
  percentage?: number;
  description: string;
}

export interface AppliedRule {
  ruleId: number;
  ruleName: string;
  type: string;
  impact: number;
  description: string;
}

export interface DiscountInfo {
  id: number;
  type: 'percentage' | 'fixed_amount';
  value: number;
  amount: number;
  code?: string;
  description: string;
}

export interface TaxInfo {
  name: string;
  rate: number;
  amount: number;
  included: boolean;
}

export interface DiscountCode {
  id: number;
  companyId: number;
  code: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed_amount' | 'free_shipping' | 'buy_x_get_y';
  value: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  usageCount: number;
  customerUsageLimit?: number;
  validFrom: string;
  validTo: string;
  isActive: boolean;
  applicableProducts: number[];
  applicableCategories: number[];
  excludedProducts: number[];
  excludedCategories: number[];
  conditions?: DiscountCondition[];
  createdAt: string;
  updatedAt: string;
}

export interface DiscountCondition {
  type: 'min_quantity' | 'customer_group' | 'first_purchase' | 'geographic';
  value: any;
}

export interface PriceMatrix {
  id: number;
  companyId: number;
  name: string;
  type: 'volume' | 'tier' | 'customer_specific';
  rules: PriceMatrixRule[];
  products: number[];
  customers: number[];
  isActive: boolean;
  validFrom?: string;
  validTo?: string;
}

export interface PriceMatrixRule {
  minQuantity: number;
  maxQuantity?: number;
  price: number;
  discountPercentage?: number;
}

export interface PricingScenario {
  name: string;
  description?: string;
  parameters: PriceCalculationParams;
  expectedResult?: number;
}

export interface SimulationResult {
  scenario: PricingScenario;
  result: PriceResult;
  variance?: number;
  comparison?: ComparisonData;
}

export interface ComparisonData {
  baselinePrice: number;
  difference: number;
  percentageChange: number;
}

export interface OptimizationGoal {
  type: 'maximize_profit' | 'maximize_revenue' | 'maximize_volume' | 'competitive_parity';
  constraints: OptimizationConstraint[];
  targetMetrics: TargetMetric[];
}

export interface OptimizationConstraint {
  field: string;
  operator: string;
  value: any;
}

export interface TargetMetric {
  name: string;
  target: number;
  weight: number;
}

export interface PricingRecommendation {
  productId: number;
  currentPrice: number;
  recommendedPrice: number;
  expectedImpact: ImpactMetrics;
  confidence: number;
  reasoning: string[];
}

export interface ImpactMetrics {
  revenue: number;
  profit: number;
  volume: number;
  margin: number;
}

export interface PricingAnalytics {
  period: {
    start: string;
    end: string;
  };
  metrics: {
    averageDiscount: number;
    discountedOrders: number;
    totalDiscountAmount: number;
    priceVariance: number;
    marginImpact: number;
  };
  topDiscountCodes: DiscountCodePerformance[];
  priceElasticity: PriceElasticityData[];
  competitorComparison?: CompetitorPricing[];
}

export interface DiscountCodePerformance {
  code: string;
  usage: number;
  revenue: number;
  averageOrderValue: number;
  conversionRate: number;
}

export interface PriceElasticityData {
  productId: number;
  priceChange: number;
  demandChange: number;
  elasticity: number;
}

export interface CompetitorPricing {
  competitor: string;
  productId: number;
  price: number;
  lastUpdated: string;
  source: string;
}

// Component Props Types
export interface PriceCalculatorProps {
  productId: number;
  variantId?: number;
  quantity: number;
  customerId?: number;
  accountId?: number;
  onPriceCalculated: (result: PriceResult) => void;
  realTime?: boolean;
  showBreakdown?: boolean;
}

export interface PricingRuleBuilderProps {
  rule?: PricingRule;
  onSave: (rule: Omit<PricingRule, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  availableProducts: Product[];
  availableCategories: Category[];
}

export interface PricingRulesTableProps {
  rules: PricingRule[];
  loading?: boolean;
  onEdit: (rule: PricingRule) => void;
  onDelete: (ruleId: number) => void;
  onToggleActive: (ruleId: number, isActive: boolean) => void;
  onReorder: (rules: PricingRule[]) => void;
}

export interface PriceMatrixViewerProps {
  matrix: PriceMatrix;
  editable?: boolean;
  onUpdate?: (matrix: PriceMatrix) => void;
}

export interface DiscountCodeManagerProps {
  codes: DiscountCode[];
  onEdit: (code: DiscountCode) => void;
  onDelete: (codeId: number) => void;
  onCreate: () => void;
  loading?: boolean;
}

// Store Types
export interface PricingStore {
  // State
  pricingRules: PricingRule[];
  discountCodes: DiscountCode[];
  priceMatrices: PriceMatrix[];
  priceCache: Map<string, PriceResult>;
  analytics: PricingAnalytics | null;
  loading: boolean;
  error: string | null;

  // Actions
  loadPricingRules: () => Promise<void>;
  createPricingRule: (rule: Omit<PricingRule, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updatePricingRule: (id: number, updates: Partial<PricingRule>) => Promise<void>;
  deletePricingRule: (id: number) => Promise<void>;
  calculatePrice: (params: PriceCalculationParams) => Promise<PriceResult>;
  simulatePricing: (scenarios: PricingScenario[]) => Promise<SimulationResult[]>;
  clearPriceCache: () => void;
  loadAnalytics: (period: { start: string; end: string }) => Promise<void>;
}