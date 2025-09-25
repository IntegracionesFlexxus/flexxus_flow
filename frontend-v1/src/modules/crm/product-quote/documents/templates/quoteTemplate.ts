// Quote Template - Sprint 19 Frontend Implementation

export const quoteTemplate = {
  id: 'quote-standard',
  name: 'Standard Quote Template',
  description: 'Professional quote template with company branding',
  category: 'quote',
  language: 'en',
  variables: [
    {
      name: 'company_name',
      type: 'text',
      label: 'Company Name',
      required: true,
      description: 'Name of the company issuing the quote'
    },
    {
      name: 'company_address',
      type: 'text',
      label: 'Company Address',
      required: true,
      description: 'Complete address of the company'
    },
    {
      name: 'company_phone',
      type: 'text',
      label: 'Company Phone',
      required: false,
      description: 'Contact phone number'
    },
    {
      name: 'company_email',
      type: 'email',
      label: 'Company Email',
      required: false,
      description: 'Contact email address'
    },
    {
      name: 'company_website',
      type: 'url',
      label: 'Company Website',
      required: false,
      description: 'Company website URL'
    },
    {
      name: 'quote_number',
      type: 'text',
      label: 'Quote Number',
      required: true,
      description: 'Unique quote identifier'
    },
    {
      name: 'quote_date',
      type: 'date',
      label: 'Quote Date',
      required: true,
      description: 'Date the quote was issued'
    },
    {
      name: 'valid_until',
      type: 'date',
      label: 'Valid Until',
      required: true,
      description: 'Quote expiration date'
    },
    {
      name: 'customer_name',
      type: 'text',
      label: 'Customer Name',
      required: true,
      description: 'Name of the customer or contact person'
    },
    {
      name: 'customer_company',
      type: 'text',
      label: 'Customer Company',
      required: false,
      description: 'Customer company name'
    },
    {
      name: 'customer_address',
      type: 'text',
      label: 'Customer Address',
      required: true,
      description: 'Customer billing address'
    },
    {
      name: 'customer_phone',
      type: 'text',
      label: 'Customer Phone',
      required: false,
      description: 'Customer phone number'
    },
    {
      name: 'customer_email',
      type: 'email',
      label: 'Customer Email',
      required: false,
      description: 'Customer email address'
    },
    {
      name: 'line_items',
      type: 'list',
      label: 'Line Items',
      required: true,
      description: 'List of products/services being quoted'
    },
    {
      name: 'subtotal',
      type: 'currency',
      label: 'Subtotal',
      required: true,
      description: 'Subtotal amount before taxes and discounts'
    },
    {
      name: 'discount_amount',
      type: 'currency',
      label: 'Discount Amount',
      required: false,
      description: 'Total discount amount'
    },
    {
      name: 'discount_percentage',
      type: 'percentage',
      label: 'Discount Percentage',
      required: false,
      description: 'Discount percentage applied'
    },
    {
      name: 'tax_amount',
      type: 'currency',
      label: 'Tax Amount',
      required: false,
      description: 'Total tax amount'
    },
    {
      name: 'tax_rate',
      type: 'percentage',
      label: 'Tax Rate',
      required: false,
      description: 'Tax rate percentage'
    },
    {
      name: 'total_amount',
      type: 'currency',
      label: 'Total Amount',
      required: true,
      description: 'Final total amount'
    },
    {
      name: 'currency',
      type: 'text',
      label: 'Currency',
      required: true,
      description: 'Currency code (e.g., USD, EUR)'
    },
    {
      name: 'payment_terms',
      type: 'text',
      label: 'Payment Terms',
      required: false,
      description: 'Payment terms and conditions'
    },
    {
      name: 'notes',
      type: 'text',
      label: 'Notes',
      required: false,
      description: 'Additional notes or comments'
    },
    {
      name: 'terms_conditions',
      type: 'text',
      label: 'Terms & Conditions',
      required: false,
      description: 'Terms and conditions text'
    },
    {
      name: 'prepared_by',
      type: 'text',
      label: 'Prepared By',
      required: false,
      description: 'Name of person who prepared the quote'
    },
    {
      name: 'prepared_by_title',
      type: 'text',
      label: 'Prepared By Title',
      required: false,
      description: 'Job title of person who prepared the quote'
    }
  ],
  content: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Quote {{quote_number}}</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            body {
                font-family: 'Helvetica', 'Arial', sans-serif;
                font-size: 12px;
                line-height: 1.6;
                color: #333;
                background: #fff;
            }

            .container {
                max-width: 800px;
                margin: 0 auto;
                padding: 40px;
            }

            .header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 40px;
                border-bottom: 2px solid #3B82F6;
                padding-bottom: 20px;
            }

            .company-info h1 {
                font-size: 24px;
                color: #3B82F6;
                margin-bottom: 10px;
            }

            .company-info p {
                margin: 2px 0;
                color: #666;
            }

            .quote-info {
                text-align: right;
            }

            .quote-info h2 {
                font-size: 28px;
                color: #1F2937;
                margin-bottom: 10px;
            }

            .quote-info p {
                margin: 5px 0;
                font-weight: bold;
            }

            .quote-details {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 40px;
                margin-bottom: 40px;
            }

            .section h3 {
                font-size: 16px;
                color: #1F2937;
                margin-bottom: 15px;
                padding-bottom: 5px;
                border-bottom: 1px solid #E5E7EB;
            }

            .section p {
                margin: 5px 0;
            }

            .line-items {
                margin-bottom: 40px;
            }

            .line-items h3 {
                font-size: 18px;
                color: #1F2937;
                margin-bottom: 20px;
            }

            table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
            }

            th, td {
                padding: 12px;
                text-align: left;
                border-bottom: 1px solid #E5E7EB;
            }

            th {
                background-color: #F9FAFB;
                font-weight: bold;
                color: #374151;
                font-size: 13px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            td {
                vertical-align: top;
            }

            .text-right {
                text-align: right;
            }

            .text-center {
                text-align: center;
            }

            .totals {
                margin-left: auto;
                width: 300px;
                margin-bottom: 40px;
            }

            .totals table {
                margin-bottom: 0;
            }

            .totals th, .totals td {
                border-bottom: 1px solid #E5E7EB;
                padding: 8px 12px;
            }

            .total-row {
                font-weight: bold;
                font-size: 16px;
                background-color: #F3F4F6;
            }

            .terms {
                margin-bottom: 30px;
            }

            .terms h4 {
                font-size: 14px;
                color: #1F2937;
                margin-bottom: 10px;
            }

            .terms p {
                font-size: 11px;
                line-height: 1.5;
                color: #666;
            }

            .footer {
                border-top: 1px solid #E5E7EB;
                padding-top: 20px;
                text-align: center;
                color: #666;
                font-size: 11px;
            }

            .signature {
                margin-top: 40px;
                text-align: right;
            }

            .signature p {
                margin: 5px 0;
            }

            .highlight {
                background-color: #FEF3C7;
                padding: 15px;
                border-left: 4px solid #F59E0B;
                margin: 20px 0;
            }

            @media print {
                .container {
                    padding: 20px;
                }

                .header {
                    page-break-inside: avoid;
                }

                table {
                    page-break-inside: avoid;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <!-- Header -->
            <div class="header">
                <div class="company-info">
                    <h1>{{company_name}}</h1>
                    <p>{{company_address}}</p>
                    {{#if company_phone}}<p>Phone: {{company_phone}}</p>{{/if}}
                    {{#if company_email}}<p>Email: {{company_email}}</p>{{/if}}
                    {{#if company_website}}<p>Website: {{company_website}}</p>{{/if}}
                </div>
                <div class="quote-info">
                    <h2>QUOTE</h2>
                    <p>Quote #: {{quote_number}}</p>
                    <p>Date: {{format_date quote_date}}</p>
                    <p>Valid Until: {{format_date valid_until}}</p>
                </div>
            </div>

            <!-- Quote Details -->
            <div class="quote-details">
                <div class="section">
                    <h3>Bill To</h3>
                    <p><strong>{{customer_name}}</strong></p>
                    {{#if customer_company}}<p>{{customer_company}}</p>{{/if}}
                    <p>{{customer_address}}</p>
                    {{#if customer_phone}}<p>Phone: {{customer_phone}}</p>{{/if}}
                    {{#if customer_email}}<p>Email: {{customer_email}}</p>{{/if}}
                </div>
                <div class="section">
                    <h3>Quote Summary</h3>
                    <p><strong>Total Amount: {{format_currency total_amount currency}}</strong></p>
                    <p>Currency: {{currency}}</p>
                    {{#if payment_terms}}<p>Payment Terms: {{payment_terms}}</p>{{/if}}
                </div>
            </div>

            <!-- Line Items -->
            <div class="line-items">
                <h3>Items & Services</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th class="text-center">Qty</th>
                            <th class="text-right">Unit Price</th>
                            <th class="text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {{#each line_items}}
                        <tr>
                            <td>
                                <strong>{{this.name}}</strong>
                                {{#if this.description}}<br><small>{{this.description}}</small>{{/if}}
                            </td>
                            <td class="text-center">{{this.quantity}}</td>
                            <td class="text-right">{{format_currency this.unit_price ../currency}}</td>
                            <td class="text-right">{{format_currency this.total ../currency}}</td>
                        </tr>
                        {{/each}}
                    </tbody>
                </table>
            </div>

            <!-- Totals -->
            <div class="totals">
                <table>
                    <tr>
                        <th>Subtotal</th>
                        <td class="text-right">{{format_currency subtotal currency}}</td>
                    </tr>
                    {{#if discount_amount}}
                    <tr>
                        <th>Discount{{#if discount_percentage}} ({{discount_percentage}}%){{/if}}</th>
                        <td class="text-right">-{{format_currency discount_amount currency}}</td>
                    </tr>
                    {{/if}}
                    {{#if tax_amount}}
                    <tr>
                        <th>Tax{{#if tax_rate}} ({{tax_rate}}%){{/if}}</th>
                        <td class="text-right">{{format_currency tax_amount currency}}</td>
                    </tr>
                    {{/if}}
                    <tr class="total-row">
                        <th>Total</th>
                        <td class="text-right">{{format_currency total_amount currency}}</td>
                    </tr>
                </table>
            </div>

            <!-- Validity Notice -->
            <div class="highlight">
                <p><strong>Important:</strong> This quote is valid until {{format_date valid_until}}. Prices and availability are subject to change after this date.</p>
            </div>

            <!-- Notes -->
            {{#if notes}}
            <div class="terms">
                <h4>Notes</h4>
                <p>{{notes}}</p>
            </div>
            {{/if}}

            <!-- Terms & Conditions -->
            {{#if terms_conditions}}
            <div class="terms">
                <h4>Terms & Conditions</h4>
                <p>{{terms_conditions}}</p>
            </div>
            {{/if}}

            <!-- Signature -->
            {{#if prepared_by}}
            <div class="signature">
                <p><strong>{{prepared_by}}</strong></p>
                {{#if prepared_by_title}}<p>{{prepared_by_title}}</p>{{/if}}
                <p>{{company_name}}</p>
            </div>
            {{/if}}

            <!-- Footer -->
            <div class="footer">
                <p>Thank you for considering our services. We look forward to working with you!</p>
                {{#if company_email}}<p>For questions about this quote, please contact us at {{company_email}}</p>{{/if}}
            </div>
        </div>
    </body>
    </html>
  `,
  styles: {
    fonts: {
      heading: 'Helvetica',
      body: 'Arial'
    },
    colors: {
      primary: '#3B82F6',
      secondary: '#6B7280',
      text: '#1F2937'
    },
    layout: {
      margin: '40px',
      spacing: '20px'
    }
  },
  settings: {
    pageSize: 'A4',
    orientation: 'portrait',
    headerFooter: true,
    watermark: false
  }
};

export default quoteTemplate;