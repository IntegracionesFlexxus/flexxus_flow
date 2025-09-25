// Invoice Template - Sprint 19 Frontend Implementation

export const invoiceTemplate = {
  id: 'invoice-standard',
  name: 'Standard Invoice Template',
  description: 'Professional invoice template with payment details',
  category: 'invoice',
  language: 'en',
  variables: [
    {
      name: 'company_name',
      type: 'text',
      label: 'Company Name',
      required: true,
      description: 'Name of the company issuing the invoice'
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
      name: 'company_tax_id',
      type: 'text',
      label: 'Tax ID',
      required: false,
      description: 'Company tax identification number'
    },
    {
      name: 'invoice_number',
      type: 'text',
      label: 'Invoice Number',
      required: true,
      description: 'Unique invoice identifier'
    },
    {
      name: 'invoice_date',
      type: 'date',
      label: 'Invoice Date',
      required: true,
      description: 'Date the invoice was issued'
    },
    {
      name: 'due_date',
      type: 'date',
      label: 'Due Date',
      required: true,
      description: 'Payment due date'
    },
    {
      name: 'po_number',
      type: 'text',
      label: 'PO Number',
      required: false,
      description: 'Purchase order number'
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
      name: 'customer_tax_id',
      type: 'text',
      label: 'Customer Tax ID',
      required: false,
      description: 'Customer tax identification number'
    },
    {
      name: 'line_items',
      type: 'list',
      label: 'Line Items',
      required: true,
      description: 'List of products/services being invoiced'
    },
    {
      name: 'subtotal',
      type: 'currency',
      label: 'Subtotal',
      required: true,
      description: 'Subtotal amount before taxes'
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
      description: 'Final total amount due'
    },
    {
      name: 'amount_paid',
      type: 'currency',
      label: 'Amount Paid',
      required: false,
      description: 'Amount already paid'
    },
    {
      name: 'balance_due',
      type: 'currency',
      label: 'Balance Due',
      required: false,
      description: 'Remaining balance due'
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
      name: 'payment_methods',
      type: 'text',
      label: 'Payment Methods',
      required: false,
      description: 'Accepted payment methods'
    },
    {
      name: 'bank_details',
      type: 'text',
      label: 'Bank Details',
      required: false,
      description: 'Bank account details for wire transfers'
    },
    {
      name: 'notes',
      type: 'text',
      label: 'Notes',
      required: false,
      description: 'Additional notes or comments'
    },
    {
      name: 'late_fee_policy',
      type: 'text',
      label: 'Late Fee Policy',
      required: false,
      description: 'Late payment fee policy'
    }
  ],
  content: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice {{invoice_number}}</title>
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
                border-bottom: 3px solid #DC2626;
                padding-bottom: 20px;
            }

            .company-info h1 {
                font-size: 24px;
                color: #DC2626;
                margin-bottom: 10px;
            }

            .company-info p {
                margin: 2px 0;
                color: #666;
            }

            .invoice-info {
                text-align: right;
            }

            .invoice-info h2 {
                font-size: 32px;
                color: #1F2937;
                margin-bottom: 10px;
                font-weight: bold;
            }

            .invoice-info p {
                margin: 5px 0;
                font-weight: bold;
            }

            .invoice-details {
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

            .status-badge {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-top: 10px;
            }

            .status-due {
                background-color: #FEF3C7;
                color: #92400E;
                border: 1px solid #F59E0B;
            }

            .status-overdue {
                background-color: #FEE2E2;
                color: #991B1B;
                border: 1px solid #DC2626;
            }

            .status-paid {
                background-color: #D1FAE5;
                color: #065F46;
                border: 1px solid #10B981;
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
                width: 350px;
                margin-bottom: 40px;
            }

            .totals table {
                margin-bottom: 0;
            }

            .totals th, .totals td {
                border-bottom: 1px solid #E5E7EB;
                padding: 10px 12px;
            }

            .total-row {
                font-weight: bold;
                font-size: 18px;
                background-color: #DC2626;
                color: white;
            }

            .balance-row {
                font-weight: bold;
                font-size: 16px;
                background-color: #FEF3C7;
                color: #92400E;
            }

            .payment-info {
                background-color: #F9FAFB;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 30px;
                border-left: 4px solid #DC2626;
            }

            .payment-info h4 {
                font-size: 16px;
                color: #1F2937;
                margin-bottom: 15px;
            }

            .payment-info p {
                margin: 8px 0;
                font-size: 13px;
            }

            .payment-methods {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-top: 15px;
            }

            .payment-method {
                background: white;
                padding: 15px;
                border-radius: 6px;
                border: 1px solid #E5E7EB;
            }

            .payment-method h5 {
                font-size: 14px;
                color: #374151;
                margin-bottom: 8px;
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
                border-top: 2px solid #E5E7EB;
                padding-top: 20px;
                text-align: center;
                color: #666;
                font-size: 11px;
            }

            .warning {
                background-color: #FEF3C7;
                border: 1px solid #F59E0B;
                border-radius: 6px;
                padding: 15px;
                margin: 20px 0;
            }

            .warning h4 {
                color: #92400E;
                font-size: 14px;
                margin-bottom: 8px;
            }

            .warning p {
                color: #92400E;
                font-size: 12px;
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

            .due-date-notice {
                background-color: #FEE2E2;
                border: 1px solid #FECACA;
                border-radius: 6px;
                padding: 12px;
                margin: 20px 0;
                text-align: center;
            }

            .due-date-notice p {
                color: #991B1B;
                font-weight: bold;
                font-size: 14px;
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
                    {{#if company_tax_id}}<p>Tax ID: {{company_tax_id}}</p>{{/if}}
                </div>
                <div class="invoice-info">
                    <h2>INVOICE</h2>
                    <p>Invoice #: {{invoice_number}}</p>
                    <p>Date: {{format_date invoice_date}}</p>
                    <p>Due Date: {{format_date due_date}}</p>
                    {{#if po_number}}<p>PO #: {{po_number}}</p>{{/if}}

                    {{#if balance_due}}
                        {{#if (gt balance_due 0)}}
                            <div class="status-badge status-due">Amount Due</div>
                        {{else}}
                            <div class="status-badge status-paid">Paid in Full</div>
                        {{/if}}
                    {{/if}}
                </div>
            </div>

            <!-- Invoice Details -->
            <div class="invoice-details">
                <div class="section">
                    <h3>Bill To</h3>
                    <p><strong>{{customer_name}}</strong></p>
                    {{#if customer_company}}<p>{{customer_company}}</p>{{/if}}
                    <p>{{customer_address}}</p>
                    {{#if customer_tax_id}}<p>Tax ID: {{customer_tax_id}}</p>{{/if}}
                </div>
                <div class="section">
                    <h3>Invoice Summary</h3>
                    <p><strong>Total Amount: {{format_currency total_amount currency}}</strong></p>
                    {{#if amount_paid}}<p>Amount Paid: {{format_currency amount_paid currency}}</p>{{/if}}
                    {{#if balance_due}}<p><strong>Balance Due: {{format_currency balance_due currency}}</strong></p>{{/if}}
                    <p>Currency: {{currency}}</p>
                </div>
            </div>

            <!-- Due Date Notice -->
            {{#if (is_past_due due_date)}}
            <div class="due-date-notice">
                <p>⚠️ This invoice is past due. Please remit payment immediately to avoid late fees.</p>
            </div>
            {{else}}
            {{#if (is_due_soon due_date)}}
            <div class="warning">
                <h4>Payment Due Soon</h4>
                <p>This invoice is due on {{format_date due_date}}. Please ensure timely payment to avoid late fees.</p>
            </div>
            {{/if}}
            {{/if}}

            <!-- Line Items -->
            <div class="line-items">
                <h3>Items & Services</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th class="text-center">Qty</th>
                            <th class="text-right">Rate</th>
                            <th class="text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {{#each line_items}}
                        <tr>
                            <td>
                                <strong>{{this.name}}</strong>
                                {{#if this.description}}<br><small>{{this.description}}</small>{{/if}}
                                {{#if this.date_performed}}<br><small>Date: {{format_date this.date_performed}}</small>{{/if}}
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
                    {{#if amount_paid}}
                    <tr>
                        <th>Amount Paid</th>
                        <td class="text-right">{{format_currency amount_paid currency}}</td>
                    </tr>
                    {{/if}}
                    {{#if balance_due}}
                    <tr class="balance-row">
                        <th>Balance Due</th>
                        <td class="text-right">{{format_currency balance_due currency}}</td>
                    </tr>
                    {{/if}}
                </table>
            </div>

            <!-- Payment Information -->
            <div class="payment-info">
                <h4>Payment Information</h4>
                {{#if payment_terms}}<p><strong>Payment Terms:</strong> {{payment_terms}}</p>{{/if}}

                {{#if payment_methods}}
                <p><strong>Accepted Payment Methods:</strong></p>
                <div class="payment-methods">
                    {{#if (contains payment_methods "bank")}}
                    <div class="payment-method">
                        <h5>Bank Transfer</h5>
                        {{#if bank_details}}<p>{{bank_details}}</p>{{/if}}
                    </div>
                    {{/if}}

                    {{#if (contains payment_methods "card")}}
                    <div class="payment-method">
                        <h5>Credit Card</h5>
                        <p>Visa, MasterCard, American Express</p>
                    </div>
                    {{/if}}

                    {{#if (contains payment_methods "check")}}
                    <div class="payment-method">
                        <h5>Check</h5>
                        <p>Make payable to: {{company_name}}</p>
                    </div>
                    {{/if}}
                </div>
                {{/if}}
            </div>

            <!-- Notes -->
            {{#if notes}}
            <div class="terms">
                <h4>Notes</h4>
                <p>{{notes}}</p>
            </div>
            {{/if}}

            <!-- Late Fee Policy -->
            {{#if late_fee_policy}}
            <div class="warning">
                <h4>Late Payment Policy</h4>
                <p>{{late_fee_policy}}</p>
            </div>
            {{/if}}

            <!-- Footer -->
            <div class="footer">
                <p>Thank you for your business!</p>
                <p>Questions about this invoice? Contact us at {{company_email}} or {{company_phone}}</p>
                <p>Invoice generated on {{format_date "now"}} | {{company_name}}</p>
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
      primary: '#DC2626',
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

export default invoiceTemplate;