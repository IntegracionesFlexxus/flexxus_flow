// quoteValidator - Sprint 19 Frontend Implementation
// Quote validation logic

import { Quote, QuoteLineItem, ValidationError } from '../../shared/types';

class QuoteValidator {
  /**
   * Validate entire quote
   */
  validateQuote(quote: Quote): ValidationError[] {
    const errors: ValidationError[] = [];

    // Basic Information Validation
    errors.push(...this.validateBasicInfo(quote));

    // Line Items Validation
    errors.push(...this.validateLineItems(quote.lineItems));

    // Pricing Validation
    errors.push(...this.validatePricing(quote));

    // Terms Validation
    errors.push(...this.validateTerms(quote));

    // Business Rules Validation
    errors.push(...this.validateBusinessRules(quote));

    return errors;
  }

  /**
   * Validate specific step
   */
  validateStep(quote: Quote, stepId: string): ValidationError[] {
    switch (stepId) {
      case 'basic-info':
        return this.validateBasicInfo(quote);
      case 'line-items':
        return this.validateLineItems(quote.lineItems);
      case 'pricing':
        return this.validatePricing(quote);
      case 'terms':
        return this.validateTerms(quote);
      case 'review':
        return this.validateQuote(quote);
      default:
        return [];
    }
  }

  /**
   * Validate basic information
   */
  private validateBasicInfo(quote: Quote): ValidationError[] {
    const errors: ValidationError[] = [];

    // Title is required
    if (!quote.title || quote.title.trim() === '') {
      errors.push({
        field: 'title',
        message: 'Quote title is required',
        severity: 'error'
      });
    }

    // Title length
    if (quote.title && quote.title.length > 200) {
      errors.push({
        field: 'title',
        message: 'Quote title must be less than 200 characters',
        severity: 'error'
      });
    }

    // Currency code is required
    if (!quote.currencyCode) {
      errors.push({
        field: 'currencyCode',
        message: 'Currency is required',
        severity: 'error'
      });
    }

    // Valid from date
    if (!quote.validFrom) {
      errors.push({
        field: 'validFrom',
        message: 'Valid from date is required',
        severity: 'error'
      });
    }

    // Valid to date
    if (!quote.validTo) {
      errors.push({
        field: 'validTo',
        message: 'Valid to date is required',
        severity: 'error'
      });
    }

    // Date range validation
    if (quote.validFrom && quote.validTo) {
      const fromDate = new Date(quote.validFrom);
      const toDate = new Date(quote.validTo);

      if (toDate <= fromDate) {
        errors.push({
          field: 'validTo',
          message: 'Valid to date must be after valid from date',
          severity: 'error'
        });
      }

      // Warning for short validity periods
      const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff < 7) {
        errors.push({
          field: 'validTo',
          message: 'Quote validity period is less than 7 days',
          severity: 'warning'
        });
      }

      // Warning for past dates
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (toDate < today) {
        errors.push({
          field: 'validTo',
          message: 'Quote has expired',
          severity: 'warning'
        });
      }
    }

    // Description length
    if (quote.description && quote.description.length > 1000) {
      errors.push({
        field: 'description',
        message: 'Description must be less than 1000 characters',
        severity: 'warning'
      });
    }

    return errors;
  }

  /**
   * Validate line items
   */
  private validateLineItems(lineItems: QuoteLineItem[]): ValidationError[] {
    const errors: ValidationError[] = [];

    // At least one line item required
    if (lineItems.length === 0) {
      errors.push({
        field: 'lineItems',
        message: 'At least one line item is required',
        severity: 'error'
      });
      return errors; // No point validating individual items if none exist
    }

    // Validate each line item
    lineItems.forEach((item, index) => {
      const itemErrors = this.validateLineItem(item, index);
      errors.push(...itemErrors);
    });

    // Check for duplicate SKUs
    const skus = lineItems
      .filter(item => item.sku && item.sku.trim() !== '')
      .map(item => item.sku!.trim().toLowerCase());

    const duplicateSkus = skus.filter((sku, index) => skus.indexOf(sku) !== index);

    if (duplicateSkus.length > 0) {
      errors.push({
        field: 'lineItems',
        message: `Duplicate SKUs found: ${[...new Set(duplicateSkus)].join(', ')}`,
        severity: 'warning'
      });
    }

    return errors;
  }

  /**
   * Validate individual line item
   */
  private validateLineItem(item: QuoteLineItem, index: number): ValidationError[] {
    const errors: ValidationError[] = [];
    const fieldPrefix = `lineItems[${index}]`;

    // Name is required
    if (!item.name || item.name.trim() === '') {
      errors.push({
        field: `${fieldPrefix}.name`,
        message: `Line item ${index + 1}: Name is required`,
        severity: 'error'
      });
    }

    // Name length
    if (item.name && item.name.length > 200) {
      errors.push({
        field: `${fieldPrefix}.name`,
        message: `Line item ${index + 1}: Name must be less than 200 characters`,
        severity: 'error'
      });
    }

    // Quantity validation
    if (item.quantity <= 0) {
      errors.push({
        field: `${fieldPrefix}.quantity`,
        message: `Line item ${index + 1}: Quantity must be greater than 0`,
        severity: 'error'
      });
    }

    if (item.quantity > 10000) {
      errors.push({
        field: `${fieldPrefix}.quantity`,
        message: `Line item ${index + 1}: Quantity seems unusually high`,
        severity: 'warning'
      });
    }

    // Unit price validation
    if (item.unitPrice < 0) {
      errors.push({
        field: `${fieldPrefix}.unitPrice`,
        message: `Line item ${index + 1}: Unit price cannot be negative`,
        severity: 'error'
      });
    }

    if (item.unitPrice === 0 && !item.isOptional) {
      errors.push({
        field: `${fieldPrefix}.unitPrice`,
        message: `Line item ${index + 1}: Zero price should be marked as optional`,
        severity: 'warning'
      });
    }

    // Discount validation
    if (item.discount < 0) {
      errors.push({
        field: `${fieldPrefix}.discount`,
        message: `Line item ${index + 1}: Discount cannot be negative`,
        severity: 'error'
      });
    }

    if (item.discountType === 'percentage' && item.discount > 100) {
      errors.push({
        field: `${fieldPrefix}.discount`,
        message: `Line item ${index + 1}: Percentage discount cannot exceed 100%`,
        severity: 'error'
      });
    }

    if (item.discountType === 'fixed' && item.discount > (item.quantity * item.unitPrice)) {
      errors.push({
        field: `${fieldPrefix}.discount`,
        message: `Line item ${index + 1}: Fixed discount cannot exceed line total`,
        severity: 'error'
      });
    }

    // High discount warning
    const discountPercentage = item.discountType === 'percentage'
      ? item.discount
      : (item.discount / (item.quantity * item.unitPrice)) * 100;

    if (discountPercentage > 50) {
      errors.push({
        field: `${fieldPrefix}.discount`,
        message: `Line item ${index + 1}: Discount exceeds 50%`,
        severity: 'warning'
      });
    }

    // Description length
    if (item.description && item.description.length > 500) {
      errors.push({
        field: `${fieldPrefix}.description`,
        message: `Line item ${index + 1}: Description must be less than 500 characters`,
        severity: 'warning'
      });
    }

    return errors;
  }

  /**
   * Validate pricing
   */
  private validatePricing(quote: Quote): ValidationError[] {
    const errors: ValidationError[] = [];

    // Total cannot be negative
    if (quote.total < 0) {
      errors.push({
        field: 'total',
        message: 'Quote total cannot be negative',
        severity: 'error'
      });
    }

    // Zero total warning
    if (quote.total === 0) {
      errors.push({
        field: 'total',
        message: 'Quote total is zero - please verify pricing',
        severity: 'warning'
      });
    }

    // High total warning
    if (quote.total > 1000000) {
      errors.push({
        field: 'total',
        message: 'Quote total exceeds $1,000,000 - approval may be required',
        severity: 'info'
      });
    }

    // Discount validation
    if (quote.totalDiscount > quote.subtotal) {
      errors.push({
        field: 'totalDiscount',
        message: 'Total discount exceeds subtotal',
        severity: 'error'
      });
    }

    // High discount warning
    const discountPercentage = quote.subtotal > 0 ? (quote.totalDiscount / quote.subtotal) * 100 : 0;
    if (discountPercentage > 30) {
      errors.push({
        field: 'totalDiscount',
        message: `Total discount is ${discountPercentage.toFixed(1)}% - approval may be required`,
        severity: 'warning'
      });
    }

    // Tax validation
    if (quote.totalTax < 0) {
      errors.push({
        field: 'totalTax',
        message: 'Total tax cannot be negative',
        severity: 'error'
      });
    }

    return errors;
  }

  /**
   * Validate terms
   */
  private validateTerms(quote: Quote): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!quote.terms) {
      return errors; // Terms are optional
    }

    // Payment terms length
    if (quote.terms.paymentTerms && quote.terms.paymentTerms.length > 500) {
      errors.push({
        field: 'terms.paymentTerms',
        message: 'Payment terms must be less than 500 characters',
        severity: 'warning'
      });
    }

    // Delivery terms length
    if (quote.terms.deliveryTerms && quote.terms.deliveryTerms.length > 500) {
      errors.push({
        field: 'terms.deliveryTerms',
        message: 'Delivery terms must be less than 500 characters',
        severity: 'warning'
      });
    }

    // Custom terms validation
    if (quote.terms.customTerms) {
      quote.terms.customTerms.forEach((term, index) => {
        if (!term.title || term.title.trim() === '') {
          errors.push({
            field: `terms.customTerms[${index}].title`,
            message: `Custom term ${index + 1}: Title is required`,
            severity: 'error'
          });
        }

        if (!term.content || term.content.trim() === '') {
          errors.push({
            field: `terms.customTerms[${index}].content`,
            message: `Custom term ${index + 1}: Content is required`,
            severity: 'error'
          });
        }

        if (term.content && term.content.length > 1000) {
          errors.push({
            field: `terms.customTerms[${index}].content`,
            message: `Custom term ${index + 1}: Content must be less than 1000 characters`,
            severity: 'warning'
          });
        }
      });
    }

    return errors;
  }

  /**
   * Validate business rules
   */
  private validateBusinessRules(quote: Quote): ValidationError[] {
    const errors: ValidationError[] = [];

    // Customer/Account validation
    if (!quote.customerId && !quote.accountId) {
      errors.push({
        field: 'customer',
        message: 'Either customer or account must be specified',
        severity: 'warning'
      });
    }

    // Status validation
    if (quote.status === 'sent' && (!quote.customer || !quote.customer.email)) {
      errors.push({
        field: 'customer',
        message: 'Customer email is required for sent quotes',
        severity: 'error'
      });
    }

    // Approval validation
    if (quote.total > 50000 && quote.approvalStatus === 'not_required') {
      errors.push({
        field: 'approvalStatus',
        message: 'Quotes over $50,000 typically require approval',
        severity: 'info'
      });
    }

    // Expiration warning
    if (quote.validTo) {
      const daysUntilExpiry = Math.ceil(
        (new Date(quote.validTo).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilExpiry <= 3 && daysUntilExpiry > 0) {
        errors.push({
          field: 'validTo',
          message: `Quote expires in ${daysUntilExpiry} day(s)`,
          severity: 'warning'
        });
      }
    }

    return errors;
  }

  /**
   * Quick validation for specific fields
   */
  validateField(fieldName: string, value: any, context?: any): ValidationError[] {
    const errors: ValidationError[] = [];

    switch (fieldName) {
      case 'title':
        if (!value || value.trim() === '') {
          errors.push({
            field: fieldName,
            message: 'Title is required',
            severity: 'error'
          });
        }
        break;

      case 'quantity':
        if (value <= 0) {
          errors.push({
            field: fieldName,
            message: 'Quantity must be greater than 0',
            severity: 'error'
          });
        }
        break;

      case 'unitPrice':
        if (value < 0) {
          errors.push({
            field: fieldName,
            message: 'Unit price cannot be negative',
            severity: 'error'
          });
        }
        break;

      // Add more field-specific validations as needed
    }

    return errors;
  }
}

// Export singleton instance
export const quoteValidator = new QuoteValidator();
export default quoteValidator;