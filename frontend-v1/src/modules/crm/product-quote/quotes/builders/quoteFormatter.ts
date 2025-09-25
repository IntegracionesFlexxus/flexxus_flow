// quoteFormatter - Sprint 19 Frontend Implementation
// Format quotes for display/export

import {
  Quote,
  QuoteLineItem,
  QuoteSection,
  ExportOptions
} from '../../shared/types';

interface FormattedQuote {
  header: FormattedQuoteHeader;
  sections: FormattedQuoteSection[];
  totals: FormattedQuoteTotals;
  terms: FormattedQuoteTerms;
  footer: FormattedQuoteFooter;
}

interface FormattedQuoteHeader {
  quoteNumber: string;
  title: string;
  version: string;
  status: string;
  validFrom: string;
  validTo: string;
  customer: string;
  createdBy: string;
  createdAt: string;
}

interface FormattedQuoteSection {
  name: string;
  description?: string;
  items: FormattedQuoteLineItem[];
  subtotal: string;
}

interface FormattedQuoteLineItem {
  name: string;
  description?: string;
  sku?: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  subtotal: string;
}

interface FormattedQuoteTotals {
  subtotal: string;
  totalDiscount: string;
  totalTax: string;
  total: string;
  currency: string;
}

interface FormattedQuoteTerms {
  payment?: string;
  delivery?: string;
  warranty?: string;
  support?: string;
  custom: Array<{ title: string; content: string }>;
}

interface FormattedQuoteFooter {
  notes?: string;
  internalNotes?: string;
  generatedAt: string;
  generatedBy: string;
}

class QuoteFormatter {
  /**
   * Format quote for display
   */
  formatQuote(quote: Quote, options: {
    includeInternalNotes?: boolean;
    dateFormat?: 'short' | 'long';
    currencyFormat?: 'symbol' | 'code';
  } = {}): FormattedQuote {
    const {
      includeInternalNotes = false,
      dateFormat = 'short',
      currencyFormat = 'symbol'
    } = options;

    return {
      header: this.formatHeader(quote, dateFormat),
      sections: this.formatSections(quote.sections, quote.lineItems, quote.currencyCode, currencyFormat),
      totals: this.formatTotals(quote, currencyFormat),
      terms: this.formatTerms(quote),
      footer: this.formatFooter(quote, includeInternalNotes)
    };
  }

  /**
   * Format quote header
   */
  private formatHeader(quote: Quote, dateFormat: 'short' | 'long'): FormattedQuoteHeader {
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return dateFormat === 'long'
        ? date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        : date.toLocaleDateString('en-US');
    };

    return {
      quoteNumber: quote.quoteNumber,
      title: quote.title,
      version: `v${quote.version}`,
      status: this.formatStatus(quote.status),
      validFrom: formatDate(quote.validFrom),
      validTo: formatDate(quote.validTo),
      customer: quote.customer?.name || quote.customerId?.toString() || 'N/A',
      createdBy: quote.createdBy.toString(), // Would be replaced with actual user name
      createdAt: formatDate(quote.createdAt)
    };
  }

  /**
   * Format quote sections
   */
  private formatSections(
    sections: QuoteSection[],
    lineItems: QuoteLineItem[],
    currencyCode: string,
    currencyFormat: 'symbol' | 'code'
  ): FormattedQuoteSection[] {
    const formattedSections: FormattedQuoteSection[] = [];

    // Group line items by section
    const sectionedItems = new Map<number, QuoteLineItem[]>();
    const unsectionedItems: QuoteLineItem[] = [];

    lineItems.forEach(item => {
      if (item.sectionId) {
        if (!sectionedItems.has(item.sectionId)) {
          sectionedItems.set(item.sectionId, []);
        }
        sectionedItems.get(item.sectionId)!.push(item);
      } else {
        unsectionedItems.push(item);
      }
    });

    // Format sections with their items
    sections.forEach(section => {
      const items = sectionedItems.get(section.id) || [];
      const sectionSubtotal = items.reduce((sum, item) => sum + item.subtotal, 0);

      formattedSections.push({
        name: section.name,
        description: section.description,
        items: items.map(item => this.formatLineItem(item, currencyCode, currencyFormat)),
        subtotal: this.formatCurrency(sectionSubtotal, currencyCode, currencyFormat)
      });
    });

    // Add unsectioned items as a default section
    if (unsectionedItems.length > 0) {
      const unsectionedSubtotal = unsectionedItems.reduce((sum, item) => sum + item.subtotal, 0);

      formattedSections.unshift({
        name: 'Items',
        items: unsectionedItems.map(item => this.formatLineItem(item, currencyCode, currencyFormat)),
        subtotal: this.formatCurrency(unsectionedSubtotal, currencyCode, currencyFormat)
      });
    }

    return formattedSections;
  }

  /**
   * Format line item
   */
  private formatLineItem(
    item: QuoteLineItem,
    currencyCode: string,
    currencyFormat: 'symbol' | 'code'
  ): FormattedQuoteLineItem {
    const formatDiscount = () => {
      if (item.discount === 0) return '-';

      return item.discountType === 'percentage'
        ? `${item.discount}%`
        : this.formatCurrency(item.discount, currencyCode, currencyFormat);
    };

    return {
      name: item.name,
      description: item.description,
      sku: item.sku,
      quantity: this.formatQuantity(item.quantity),
      unitPrice: this.formatCurrency(item.unitPrice, currencyCode, currencyFormat),
      discount: formatDiscount(),
      subtotal: this.formatCurrency(item.subtotal, currencyCode, currencyFormat)
    };
  }

  /**
   * Format quote totals
   */
  private formatTotals(quote: Quote, currencyFormat: 'symbol' | 'code'): FormattedQuoteTotals {
    return {
      subtotal: this.formatCurrency(quote.subtotal, quote.currencyCode, currencyFormat),
      totalDiscount: this.formatCurrency(quote.totalDiscount, quote.currencyCode, currencyFormat),
      totalTax: this.formatCurrency(quote.totalTax, quote.currencyCode, currencyFormat),
      total: this.formatCurrency(quote.total, quote.currencyCode, currencyFormat),
      currency: quote.currencyCode
    };
  }

  /**
   * Format quote terms
   */
  private formatTerms(quote: Quote): FormattedQuoteTerms {
    const terms = quote.terms;
    if (!terms) {
      return { custom: [] };
    }

    return {
      payment: terms.paymentTerms,
      delivery: terms.deliveryTerms,
      warranty: terms.warrantyTerms,
      support: terms.supportTerms,
      custom: terms.customTerms?.map(term => ({
        title: term.title,
        content: term.content
      })) || []
    };
  }

  /**
   * Format quote footer
   */
  private formatFooter(quote: Quote, includeInternalNotes: boolean): FormattedQuoteFooter {
    return {
      notes: quote.notes,
      internalNotes: includeInternalNotes ? quote.internalNotes : undefined,
      generatedAt: new Date().toLocaleDateString('en-US'),
      generatedBy: 'System' // Would be replaced with actual user
    };
  }

  /**
   * Format currency
   */
  private formatCurrency(
    amount: number,
    currencyCode: string,
    format: 'symbol' | 'code'
  ): string {
    if (format === 'code') {
      return `${amount.toFixed(2)} ${currencyCode}`;
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Format quantity
   */
  private formatQuantity(quantity: number): string {
    return quantity % 1 === 0 ? quantity.toString() : quantity.toFixed(2);
  }

  /**
   * Format status
   */
  private formatStatus(status: string): string {
    return status.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  /**
   * Export quote to CSV
   */
  exportToCSV(quote: Quote): string {
    const lines: string[] = [];

    // Header
    lines.push(`Quote Number,${quote.quoteNumber}`);
    lines.push(`Title,${quote.title}`);
    lines.push(`Status,${this.formatStatus(quote.status)}`);
    lines.push(`Total,${this.formatCurrency(quote.total, quote.currencyCode, 'symbol')}`);
    lines.push(''); // Empty line

    // Line items header
    lines.push('Item Name,Description,SKU,Quantity,Unit Price,Discount,Subtotal');

    // Line items
    quote.lineItems.forEach(item => {
      const discount = item.discountType === 'percentage'
        ? `${item.discount}%`
        : this.formatCurrency(item.discount, quote.currencyCode, 'symbol');

      lines.push([
        `"${item.name}"`,
        `"${item.description || ''}"`,
        item.sku || '',
        item.quantity.toString(),
        this.formatCurrency(item.unitPrice, quote.currencyCode, 'symbol'),
        discount,
        this.formatCurrency(item.subtotal, quote.currencyCode, 'symbol')
      ].join(','));
    });

    return lines.join('\n');
  }

  /**
   * Export quote to JSON
   */
  exportToJSON(quote: Quote, options: ExportOptions): string {
    const formatted = this.formatQuote(quote, {
      includeInternalNotes: options.columns?.includes('internalNotes') || false
    });

    return JSON.stringify(formatted, null, 2);
  }

  /**
   * Generate HTML template
   */
  generateHTML(quote: Quote, template: 'default' | 'professional' | 'minimal' = 'default'): string {
    const formatted = this.formatQuote(quote);

    switch (template) {
      case 'professional':
        return this.generateProfessionalHTML(formatted);
      case 'minimal':
        return this.generateMinimalHTML(formatted);
      default:
        return this.generateDefaultHTML(formatted);
    }
  }

  /**
   * Generate default HTML template
   */
  private generateDefaultHTML(quote: FormattedQuote): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Quote ${quote.header.quoteNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
          .quote-title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .quote-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .section { margin: 20px 0; }
          .section-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f5f5f5; }
          .totals { float: right; width: 300px; }
          .total-row { font-weight: bold; font-size: 16px; }
          .terms { margin-top: 40px; }
          .footer { margin-top: 40px; border-top: 1px solid #ccc; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="quote-title">${quote.header.title}</div>
          <div class="quote-info">
            <div>
              <strong>Quote #:</strong> ${quote.header.quoteNumber}<br>
              <strong>Version:</strong> ${quote.header.version}<br>
              <strong>Status:</strong> ${quote.header.status}
            </div>
            <div>
              <strong>Valid From:</strong> ${quote.header.validFrom}<br>
              <strong>Valid To:</strong> ${quote.header.validTo}<br>
              <strong>Customer:</strong> ${quote.header.customer}
            </div>
          </div>
        </div>

        ${quote.sections.map(section => `
          <div class="section">
            <div class="section-title">${section.name}</div>
            ${section.description ? `<p>${section.description}</p>` : ''}
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Discount</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${section.items.map(item => `
                  <tr>
                    <td>
                      <strong>${item.name}</strong>
                      ${item.description ? `<br><small>${item.description}</small>` : ''}
                      ${item.sku ? `<br><small>SKU: ${item.sku}</small>` : ''}
                    </td>
                    <td>${item.quantity}</td>
                    <td>${item.unitPrice}</td>
                    <td>${item.discount}</td>
                    <td>${item.subtotal}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `).join('')}

        <div class="totals">
          <table>
            <tr><td>Subtotal:</td><td>${quote.totals.subtotal}</td></tr>
            <tr><td>Discount:</td><td>-${quote.totals.totalDiscount}</td></tr>
            <tr><td>Tax:</td><td>${quote.totals.totalTax}</td></tr>
            <tr class="total-row"><td>Total:</td><td>${quote.totals.total}</td></tr>
          </table>
        </div>

        <div style="clear: both;"></div>

        ${this.generateTermsHTML(quote.terms)}

        <div class="footer">
          <p><small>Generated on ${quote.footer.generatedAt}</small></p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate terms HTML
   */
  private generateTermsHTML(terms: FormattedQuoteTerms): string {
    const sections: string[] = [];

    if (terms.payment) {
      sections.push(`<p><strong>Payment Terms:</strong> ${terms.payment}</p>`);
    }
    if (terms.delivery) {
      sections.push(`<p><strong>Delivery Terms:</strong> ${terms.delivery}</p>`);
    }
    if (terms.warranty) {
      sections.push(`<p><strong>Warranty Terms:</strong> ${terms.warranty}</p>`);
    }
    if (terms.support) {
      sections.push(`<p><strong>Support Terms:</strong> ${terms.support}</p>`);
    }

    terms.custom.forEach(term => {
      sections.push(`<p><strong>${term.title}:</strong> ${term.content}</p>`);
    });

    if (sections.length === 0) return '';

    return `
      <div class="terms">
        <div class="section-title">Terms & Conditions</div>
        ${sections.join('')}
      </div>
    `;
  }

  /**
   * Generate professional HTML template (placeholder)
   */
  private generateProfessionalHTML(quote: FormattedQuote): string {
    return this.generateDefaultHTML(quote); // Placeholder
  }

  /**
   * Generate minimal HTML template (placeholder)
   */
  private generateMinimalHTML(quote: FormattedQuote): string {
    return this.generateDefaultHTML(quote); // Placeholder
  }
}

// Export singleton instance
export const quoteFormatter = new QuoteFormatter();
export default quoteFormatter;