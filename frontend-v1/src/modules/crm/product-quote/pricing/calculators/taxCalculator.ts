// Tax Calculation Engine - Sprint 19 Phase 3
// Specialized calculator for tax computation and compliance

import {
  TaxInfo,
  PriceCalculationParams
} from '../../../shared/types/pricing.types';

interface TaxJurisdiction {
  id: string;
  name: string;
  type: 'federal' | 'state' | 'county' | 'city' | 'local';
  rate: number;
  isCompoundable: boolean;
  applicableProductTypes?: string[];
  exemptProductTypes?: string[];
  minimumAmount?: number;
  maximumAmount?: number;
}

interface TaxRule {
  jurisdictionId: string;
  productType?: string;
  customerType?: string;
  exemptionCode?: string;
  effectiveDate: string;
  expiryDate?: string;
  rate: number;
  isActive: boolean;
}

interface CustomerTaxInfo {
  customerId: number;
  taxExemptionCertificate?: string;
  exemptionType?: 'full' | 'partial' | 'none';
  exemptJurisdictions?: string[];
  businessType?: string;
  taxId?: string;
}

interface ProductTaxInfo {
  productId: number;
  taxCategory: string;
  isExempt: boolean;
  exemptJurisdictions?: string[];
  harmonizedCode?: string;
}

interface TaxCalculationContext {
  subtotal: number;
  shippingAmount?: number;
  customerInfo?: CustomerTaxInfo;
  productInfo?: ProductTaxInfo[];
  billingAddress?: {
    country: string;
    state?: string;
    county?: string;
    city?: string;
    postalCode?: string;
  };
  shippingAddress?: {
    country: string;
    state?: string;
    county?: string;
    city?: string;
    postalCode?: string;
  };
  orderDate: Date;
}

interface TaxCalculationResult {
  taxes: TaxInfo[];
  totalTaxAmount: number;
  effectiveTaxRate: number;
  taxableAmount: number;
  exemptAmount: number;
  breakdown: {
    jurisdictionId: string;
    jurisdictionName: string;
    rate: number;
    taxableAmount: number;
    taxAmount: number;
    included: boolean;
  }[];
}

export class TaxCalculator {
  private jurisdictions: Map<string, TaxJurisdiction> = new Map();
  private taxRules: TaxRule[] = [];
  private readonly DEFAULT_PRECISION = 4; // 4 decimal places for tax calculations

  constructor() {
    this.initializeDefaultJurisdictions();
    this.initializeDefaultRules();
  }

  /**
   * Initialize default tax jurisdictions
   */
  private initializeDefaultJurisdictions(): void {
    const defaultJurisdictions: TaxJurisdiction[] = [
      // US Federal
      {
        id: 'us_federal',
        name: 'United States Federal',
        type: 'federal',
        rate: 0,
        isCompoundable: false
      },
      // California State
      {
        id: 'ca_state',
        name: 'California State',
        type: 'state',
        rate: 7.25,
        isCompoundable: false
      },
      // Los Angeles County
      {
        id: 'la_county',
        name: 'Los Angeles County',
        type: 'county',
        rate: 0.25,
        isCompoundable: false
      },
      // New York State
      {
        id: 'ny_state',
        name: 'New York State',
        type: 'state',
        rate: 8.0,
        isCompoundable: false
      },
      // Canada GST
      {
        id: 'ca_gst',
        name: 'Canada GST',
        type: 'federal',
        rate: 5.0,
        isCompoundable: false
      },
      // Ontario HST
      {
        id: 'on_hst',
        name: 'Ontario HST',
        type: 'state',
        rate: 13.0,
        isCompoundable: false
      },
      // EU VAT (example)
      {
        id: 'eu_vat',
        name: 'EU VAT',
        type: 'federal',
        rate: 20.0,
        isCompoundable: false
      }
    ];

    defaultJurisdictions.forEach(jurisdiction => {
      this.jurisdictions.set(jurisdiction.id, jurisdiction);
    });
  }

  /**
   * Initialize default tax rules
   */
  private initializeDefaultRules(): void {
    this.taxRules = [
      {
        jurisdictionId: 'ca_state',
        effectiveDate: '2023-01-01',
        rate: 7.25,
        isActive: true
      },
      {
        jurisdictionId: 'ny_state',
        effectiveDate: '2023-01-01',
        rate: 8.0,
        isActive: true
      },
      {
        jurisdictionId: 'ca_gst',
        effectiveDate: '2023-01-01',
        rate: 5.0,
        isActive: true
      }
    ];
  }

  /**
   * Main tax calculation method
   */
  async calculateTax(
    params: PriceCalculationParams,
    amount: number,
    context?: Partial<TaxCalculationContext>
  ): Promise<TaxInfo[]> {
    const calculationContext: TaxCalculationContext = {
      subtotal: amount,
      orderDate: new Date(),
      ...context
    };

    try {
      const result = await this.performTaxCalculation(calculationContext);
      return result.taxes;
    } catch (error) {
      console.error('Tax calculation failed:', error);
      // Return empty array rather than failing the entire price calculation
      return [];
    }
  }

  /**
   * Perform comprehensive tax calculation
   */
  private async performTaxCalculation(context: TaxCalculationContext): Promise<TaxCalculationResult> {
    // Determine applicable jurisdictions
    const applicableJurisdictions = await this.getApplicableJurisdictions(context);

    // Calculate tax for each jurisdiction
    const taxes: TaxInfo[] = [];
    const breakdown: TaxCalculationResult['breakdown'] = [];
    let totalTaxAmount = 0;
    let taxableAmount = context.subtotal;
    let exemptAmount = 0;

    for (const jurisdiction of applicableJurisdictions) {
      const jurisdictionTax = await this.calculateJurisdictionTax(
        jurisdiction,
        context,
        taxableAmount
      );

      if (jurisdictionTax.amount > 0) {
        taxes.push(jurisdictionTax);
        totalTaxAmount += jurisdictionTax.amount;

        breakdown.push({
          jurisdictionId: jurisdiction.id,
          jurisdictionName: jurisdiction.name,
          rate: jurisdiction.rate,
          taxableAmount: taxableAmount,
          taxAmount: jurisdictionTax.amount,
          included: jurisdictionTax.included
        });
      }
    }

    const effectiveTaxRate = taxableAmount > 0 ? (totalTaxAmount / taxableAmount) * 100 : 0;

    return {
      taxes,
      totalTaxAmount,
      effectiveTaxRate,
      taxableAmount,
      exemptAmount,
      breakdown
    };
  }

  /**
   * Get applicable tax jurisdictions based on context
   */
  private async getApplicableJurisdictions(context: TaxCalculationContext): Promise<TaxJurisdiction[]> {
    const applicable: TaxJurisdiction[] = [];

    // Use shipping address for tax jurisdiction determination
    const address = context.shippingAddress || context.billingAddress;

    if (!address) {
      return applicable;
    }

    // US tax logic
    if (address.country === 'US') {
      if (address.state === 'CA') {
        const caState = this.jurisdictions.get('ca_state');
        if (caState) applicable.push(caState);

        // Add county if applicable
        if (address.county === 'Los Angeles') {
          const laCounty = this.jurisdictions.get('la_county');
          if (laCounty) applicable.push(laCounty);
        }
      } else if (address.state === 'NY') {
        const nyState = this.jurisdictions.get('ny_state');
        if (nyState) applicable.push(nyState);
      }
    }

    // Canadian tax logic
    if (address.country === 'CA') {
      const caGst = this.jurisdictions.get('ca_gst');
      if (caGst) applicable.push(caGst);

      if (address.state === 'ON') {
        const onHst = this.jurisdictions.get('on_hst');
        if (onHst) applicable.push(onHst);
      }
    }

    // EU tax logic
    if (this.isEUCountry(address.country)) {
      const euVat = this.jurisdictions.get('eu_vat');
      if (euVat) applicable.push(euVat);
    }

    return applicable;
  }

  /**
   * Calculate tax for a specific jurisdiction
   */
  private async calculateJurisdictionTax(
    jurisdiction: TaxJurisdiction,
    context: TaxCalculationContext,
    taxableAmount: number
  ): Promise<TaxInfo> {
    // Check for exemptions
    if (await this.isExemptFromJurisdiction(jurisdiction, context)) {
      return {
        name: jurisdiction.name,
        rate: jurisdiction.rate,
        amount: 0,
        included: false
      };
    }

    // Apply minimum/maximum amount constraints
    let applicableAmount = taxableAmount;

    if (jurisdiction.minimumAmount && applicableAmount < jurisdiction.minimumAmount) {
      applicableAmount = 0;
    }

    if (jurisdiction.maximumAmount && applicableAmount > jurisdiction.maximumAmount) {
      applicableAmount = jurisdiction.maximumAmount;
    }

    // Calculate tax amount
    const taxAmount = this.roundTax((applicableAmount * jurisdiction.rate) / 100);

    return {
      name: jurisdiction.name,
      rate: jurisdiction.rate,
      amount: taxAmount,
      included: false // Generally taxes are added, not included in price
    };
  }

  /**
   * Check if order is exempt from jurisdiction tax
   */
  private async isExemptFromJurisdiction(
    jurisdiction: TaxJurisdiction,
    context: TaxCalculationContext
  ): Promise<boolean> {
    // Check customer exemptions
    if (context.customerInfo?.exemptionType === 'full') {
      return true;
    }

    if (context.customerInfo?.exemptJurisdictions?.includes(jurisdiction.id)) {
      return true;
    }

    // Check product exemptions
    if (context.productInfo) {
      const allProductsExempt = context.productInfo.every(product =>
        product.isExempt || product.exemptJurisdictions?.includes(jurisdiction.id)
      );

      if (allProductsExempt) {
        return true;
      }
    }

    // Check jurisdiction-specific product type exemptions
    if (jurisdiction.exemptProductTypes && context.productInfo) {
      const hasExemptProductTypes = context.productInfo.some(product =>
        jurisdiction.exemptProductTypes?.includes(product.taxCategory)
      );

      if (hasExemptProductTypes) {
        return true;
      }
    }

    return false;
  }

  /**
   * Round tax amount to appropriate precision
   */
  private roundTax(amount: number): number {
    return Math.round(amount * Math.pow(10, this.DEFAULT_PRECISION)) / Math.pow(10, this.DEFAULT_PRECISION);
  }

  /**
   * Check if country is in EU for VAT purposes
   */
  private isEUCountry(country: string): boolean {
    const euCountries = [
      'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
      'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
      'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
    ];

    return euCountries.includes(country.toUpperCase());
  }

  /**
   * Calculate reverse tax (when tax is included in price)
   */
  calculateReverseTax(
    inclusiveAmount: number,
    taxRate: number
  ): { taxAmount: number; netAmount: number } {
    const taxMultiplier = 1 + (taxRate / 100);
    const netAmount = inclusiveAmount / taxMultiplier;
    const taxAmount = inclusiveAmount - netAmount;

    return {
      taxAmount: this.roundTax(taxAmount),
      netAmount: this.roundTax(netAmount)
    };
  }

  /**
   * Calculate compound tax (tax on tax)
   */
  calculateCompoundTax(
    baseAmount: number,
    taxes: Array<{ rate: number; isCompoundable: boolean }>
  ): Array<{ rate: number; amount: number; compoundBase: number }> {
    const results: Array<{ rate: number; amount: number; compoundBase: number }> = [];
    let runningTotal = baseAmount;

    for (const tax of taxes) {
      const taxAmount = this.roundTax((runningTotal * tax.rate) / 100);

      results.push({
        rate: tax.rate,
        amount: taxAmount,
        compoundBase: runningTotal
      });

      if (tax.isCompoundable) {
        runningTotal += taxAmount;
      }
    }

    return results;
  }

  /**
   * Validate tax exemption certificate
   */
  validateTaxExemption(
    certificate: string,
    customerType: string,
    jurisdiction: string
  ): { valid: boolean; reason?: string } {
    // This would integrate with tax service providers for real validation
    // For now, basic format validation

    if (!certificate || certificate.length < 5) {
      return { valid: false, reason: 'Invalid certificate format' };
    }

    // Basic format checks based on jurisdiction
    if (jurisdiction === 'ca_state') {
      // California resale certificate format
      if (!/^[A-Z0-9\-]{7,}$/.test(certificate)) {
        return { valid: false, reason: 'Invalid California resale certificate format' };
      }
    }

    return { valid: true };
  }

  /**
   * Get tax rate for specific location
   */
  async getTaxRateForLocation(
    country: string,
    state?: string,
    county?: string,
    city?: string,
    postalCode?: string
  ): Promise<{ totalRate: number; breakdown: Array<{ jurisdiction: string; rate: number }> }> {
    const context: TaxCalculationContext = {
      subtotal: 100, // Dummy amount for rate calculation
      shippingAddress: { country, state, county, city, postalCode },
      orderDate: new Date()
    };

    const applicableJurisdictions = await this.getApplicableJurisdictions(context);
    const totalRate = applicableJurisdictions.reduce((sum, jurisdiction) => sum + jurisdiction.rate, 0);

    const breakdown = applicableJurisdictions.map(jurisdiction => ({
      jurisdiction: jurisdiction.name,
      rate: jurisdiction.rate
    }));

    return { totalRate, breakdown };
  }

  /**
   * Calculate nexus obligations (simplified)
   */
  hasNexusObligation(
    customerAddress: { country: string; state?: string },
    businessLocations: Array<{ country: string; state?: string }>
  ): boolean {
    // Simplified nexus check - same country/state
    return businessLocations.some(location =>
      location.country === customerAddress.country &&
      (!customerAddress.state || location.state === customerAddress.state)
    );
  }

  /**
   * Generate tax summary for reporting
   */
  generateTaxSummary(taxes: TaxInfo[]): {
    totalTax: number;
    taxCount: number;
    averageRate: number;
    breakdown: Array<{
      name: string;
      rate: number;
      amount: number;
      percentage: number;
    }>;
  } {
    const totalTax = taxes.reduce((sum, tax) => sum + tax.amount, 0);
    const totalRate = taxes.reduce((sum, tax) => sum + tax.rate, 0);
    const averageRate = taxes.length > 0 ? totalRate / taxes.length : 0;

    const breakdown = taxes.map(tax => ({
      name: tax.name,
      rate: tax.rate,
      amount: tax.amount,
      percentage: totalTax > 0 ? (tax.amount / totalTax) * 100 : 0
    }));

    return {
      totalTax,
      taxCount: taxes.length,
      averageRate,
      breakdown
    };
  }

  /**
   * Add custom jurisdiction
   */
  addJurisdiction(jurisdiction: TaxJurisdiction): void {
    this.jurisdictions.set(jurisdiction.id, jurisdiction);
  }

  /**
   * Add tax rule
   */
  addTaxRule(rule: TaxRule): void {
    this.taxRules.push(rule);
  }

  /**
   * Get all jurisdictions
   */
  getJurisdictions(): TaxJurisdiction[] {
    return Array.from(this.jurisdictions.values());
  }

  /**
   * Get tax rules
   */
  getTaxRules(): TaxRule[] {
    return this.taxRules;
  }
}

export default TaxCalculator;