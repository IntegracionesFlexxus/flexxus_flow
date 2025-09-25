// Excel Generator - Sprint 19 Frontend Implementation

// Note: This would typically use libraries like ExcelJS or SheetJS
// For this implementation, we'll create the structure and interface

export interface ExcelGenerationOptions {
  format?: 'xlsx' | 'xls' | 'csv';
  includeHeaders?: boolean;
  includeFormulas?: boolean;
  autoWidth?: boolean;
  freeze?: {
    rows: number;
    columns: number;
  };
  protection?: {
    password?: string;
    allowEditing?: boolean;
    allowFormatting?: boolean;
  };
  metadata?: {
    title: string;
    author: string;
    subject: string;
    keywords: string[];
    company: string;
  };
  styling?: {
    headerStyle?: ExcelCellStyle;
    dataStyle?: ExcelCellStyle;
    alternateRowColor?: string;
  };
}

export interface ExcelCellStyle {
  font?: {
    name?: string;
    size?: number;
    bold?: boolean;
    italic?: boolean;
    color?: string;
  };
  fill?: {
    type: 'pattern' | 'gradient';
    pattern?: string;
    fgColor?: string;
    bgColor?: string;
  };
  border?: {
    top?: BorderStyle;
    right?: BorderStyle;
    bottom?: BorderStyle;
    left?: BorderStyle;
  };
  alignment?: {
    horizontal?: 'left' | 'center' | 'right';
    vertical?: 'top' | 'middle' | 'bottom';
    wrapText?: boolean;
  };
  numberFormat?: string;
}

interface BorderStyle {
  style: 'thin' | 'thick' | 'medium';
  color: string;
}

export interface ExcelSheet {
  name: string;
  data: any[][];
  headers?: string[];
  options?: Partial<ExcelGenerationOptions>;
  charts?: ExcelChart[];
  images?: ExcelImage[];
}

export interface ExcelChart {
  type: 'line' | 'bar' | 'pie' | 'scatter';
  title: string;
  position: { x: number; y: number; width: number; height: number };
  dataRange: string;
  categories: string;
  series: Array<{
    name: string;
    values: string;
    color?: string;
  }>;
}

export interface ExcelImage {
  path: string;
  position: { x: number; y: number; width?: number; height?: number };
  description?: string;
}

export interface ExcelGenerationResult {
  blob: Blob;
  url: string;
  size: number;
  sheets: number;
  metadata: {
    title: string;
    author: string;
    createdAt: string;
    format: string;
  };
}

export class ExcelGenerator {
  private options: ExcelGenerationOptions;

  constructor(options: ExcelGenerationOptions = {}) {
    this.options = {
      format: 'xlsx',
      includeHeaders: true,
      includeFormulas: true,
      autoWidth: true,
      ...options
    };
  }

  /**
   * Generate Excel from array data
   */
  async generateFromArray(
    data: any[][],
    headers?: string[],
    options?: Partial<ExcelGenerationOptions>
  ): Promise<ExcelGenerationResult> {
    const mergedOptions = { ...this.options, ...options };

    try {
      const workbook = await this.createWorkbook(mergedOptions);
      const worksheet = this.addWorksheet(workbook, 'Sheet1');

      // Add headers if provided
      if (headers && mergedOptions.includeHeaders) {
        this.addHeaders(worksheet, headers, mergedOptions);
      }

      // Add data
      this.addData(worksheet, data, mergedOptions);

      // Apply styling
      this.applyStyles(worksheet, mergedOptions);

      // Generate file
      const buffer = await this.writeWorkbook(workbook, mergedOptions.format);
      const blob = new Blob([buffer], {
        type: this.getMimeType(mergedOptions.format || 'xlsx')
      });
      const url = URL.createObjectURL(blob);

      return {
        blob,
        url,
        size: blob.size,
        sheets: 1,
        metadata: {
          title: mergedOptions.metadata?.title || 'Generated Spreadsheet',
          author: mergedOptions.metadata?.author || 'System',
          createdAt: new Date().toISOString(),
          format: mergedOptions.format || 'xlsx'
        }
      };
    } catch (error) {
      console.error('Excel generation failed:', error);
      throw new Error(`Failed to generate Excel: ${error.message}`);
    }
  }

  /**
   * Generate Excel from multiple sheets
   */
  async generateFromSheets(
    sheets: ExcelSheet[],
    options?: Partial<ExcelGenerationOptions>
  ): Promise<ExcelGenerationResult> {
    const mergedOptions = { ...this.options, ...options };

    try {
      const workbook = await this.createWorkbook(mergedOptions);

      for (const sheet of sheets) {
        const worksheet = this.addWorksheet(workbook, sheet.name);

        // Add headers if provided
        if (sheet.headers && mergedOptions.includeHeaders) {
          this.addHeaders(worksheet, sheet.headers, { ...mergedOptions, ...sheet.options });
        }

        // Add data
        this.addData(worksheet, sheet.data, { ...mergedOptions, ...sheet.options });

        // Add charts
        if (sheet.charts) {
          this.addCharts(worksheet, sheet.charts);
        }

        // Add images
        if (sheet.images) {
          this.addImages(worksheet, sheet.images);
        }

        // Apply styling
        this.applyStyles(worksheet, { ...mergedOptions, ...sheet.options });
      }

      // Generate file
      const buffer = await this.writeWorkbook(workbook, mergedOptions.format);
      const blob = new Blob([buffer], {
        type: this.getMimeType(mergedOptions.format || 'xlsx')
      });
      const url = URL.createObjectURL(blob);

      return {
        blob,
        url,
        size: blob.size,
        sheets: sheets.length,
        metadata: {
          title: mergedOptions.metadata?.title || 'Generated Workbook',
          author: mergedOptions.metadata?.author || 'System',
          createdAt: new Date().toISOString(),
          format: mergedOptions.format || 'xlsx'
        }
      };
    } catch (error) {
      console.error('Excel generation failed:', error);
      throw new Error(`Failed to generate Excel: ${error.message}`);
    }
  }

  /**
   * Generate Excel from template with variables
   */
  async generateFromTemplate(
    templateData: any,
    variables: Record<string, any>,
    options?: Partial<ExcelGenerationOptions>
  ): Promise<ExcelGenerationResult> {
    // Process template with variables
    const processedData = this.processTemplate(templateData, variables);

    return this.generateFromArray(processedData.data, processedData.headers, options);
  }

  /**
   * Generate invoice Excel
   */
  async generateInvoice(
    invoiceData: {
      invoiceNumber: string;
      customerInfo: any;
      lineItems: any[];
      totals: any;
      companyInfo: any;
    },
    options?: Partial<ExcelGenerationOptions>
  ): Promise<ExcelGenerationResult> {
    const sheets: ExcelSheet[] = [
      {
        name: 'Invoice',
        data: this.formatInvoiceData(invoiceData),
        headers: ['Item', 'Description', 'Quantity', 'Unit Price', 'Total'],
        options: {
          styling: {
            headerStyle: {
              font: { bold: true, color: '#FFFFFF' },
              fill: { type: 'pattern', fgColor: '#4F81BD' },
              alignment: { horizontal: 'center' }
            },
            dataStyle: {
              alignment: { horizontal: 'left' }
            }
          }
        }
      }
    ];

    return this.generateFromSheets(sheets, options);
  }

  /**
   * Generate quote Excel
   */
  async generateQuote(
    quoteData: {
      quoteNumber: string;
      customerInfo: any;
      lineItems: any[];
      totals: any;
      companyInfo: any;
    },
    options?: Partial<ExcelGenerationOptions>
  ): Promise<ExcelGenerationResult> {
    const sheets: ExcelSheet[] = [
      {
        name: 'Quote',
        data: this.formatQuoteData(quoteData),
        headers: ['Item', 'Description', 'Quantity', 'Unit Price', 'Total'],
        charts: [
          {
            type: 'pie',
            title: 'Quote Breakdown',
            position: { x: 8, y: 2, width: 400, height: 300 },
            dataRange: 'E2:E' + (quoteData.lineItems.length + 1),
            categories: 'A2:A' + (quoteData.lineItems.length + 1),
            series: [{
              name: 'Amount',
              values: 'E2:E' + (quoteData.lineItems.length + 1)
            }]
          }
        ]
      }
    ];

    return this.generateFromSheets(sheets, options);
  }

  /**
   * Generate revenue report Excel
   */
  async generateRevenueReport(
    revenueData: {
      period: string;
      schedules: any[];
      summary: any;
    },
    options?: Partial<ExcelGenerationOptions>
  ): Promise<ExcelGenerationResult> {
    const sheets: ExcelSheet[] = [
      {
        name: 'Revenue Summary',
        data: this.formatRevenueSummaryData(revenueData.summary),
        headers: ['Metric', 'Value']
      },
      {
        name: 'Revenue Schedules',
        data: this.formatRevenueSchedulesData(revenueData.schedules),
        headers: ['Contract', 'Customer', 'Total Value', 'Recognized', 'Remaining', 'Status']
      }
    ];

    return this.generateFromSheets(sheets, options);
  }

  /**
   * Convert CSV to Excel
   */
  async convertCSVToExcel(
    csvContent: string,
    options?: Partial<ExcelGenerationOptions>
  ): Promise<ExcelGenerationResult> {
    const lines = csvContent.split('\n');
    const headers = lines[0]?.split(',') || [];
    const data = lines.slice(1).map(line => line.split(','));

    return this.generateFromArray(data, headers, options);
  }

  /**
   * Add formulas to worksheet
   */
  addFormulas(
    worksheet: any,
    formulas: Array<{ cell: string; formula: string }>
  ): void {
    formulas.forEach(({ cell, formula }) => {
      this.setCellFormula(worksheet, cell, formula);
    });
  }

  /**
   * Add data validation
   */
  addDataValidation(
    worksheet: any,
    validations: Array<{
      range: string;
      type: 'list' | 'whole' | 'decimal' | 'date' | 'time' | 'textLength' | 'custom';
      criteria: any;
    }>
  ): void {
    validations.forEach(validation => {
      this.setDataValidation(worksheet, validation);
    });
  }

  /**
   * Add conditional formatting
   */
  addConditionalFormatting(
    worksheet: any,
    rules: Array<{
      range: string;
      type: 'cellIs' | 'expression' | 'colorScale' | 'dataBar' | 'iconSet';
      priority: number;
      style: ExcelCellStyle;
      formula?: string;
    }>
  ): void {
    rules.forEach(rule => {
      this.setConditionalFormatting(worksheet, rule);
    });
  }

  // Private helper methods

  private async createWorkbook(options: ExcelGenerationOptions): Promise<any> {
    // In a real implementation, this would create an actual Excel workbook
    // using a library like ExcelJS
    console.log('Creating workbook...', options);

    return {
      creator: options.metadata?.author || 'System',
      title: options.metadata?.title || 'Generated Workbook',
      subject: options.metadata?.subject || '',
      keywords: options.metadata?.keywords?.join(', ') || '',
      company: options.metadata?.company || '',
      created: new Date(),
      modified: new Date(),
      worksheets: []
    };
  }

  private addWorksheet(workbook: any, name: string): any {
    const worksheet = {
      name,
      rows: [],
      columns: [],
      charts: [],
      images: []
    };

    workbook.worksheets.push(worksheet);
    return worksheet;
  }

  private addHeaders(
    worksheet: any,
    headers: string[],
    options: ExcelGenerationOptions
  ): void {
    const headerRow = headers.map(header => ({
      value: header,
      style: options.styling?.headerStyle || {}
    }));

    worksheet.rows.push(headerRow);
  }

  private addData(
    worksheet: any,
    data: any[][],
    options: ExcelGenerationOptions
  ): void {
    data.forEach((rowData, index) => {
      const row = rowData.map(cellValue => ({
        value: cellValue,
        style: index % 2 === 0 ? options.styling?.dataStyle : {
          ...options.styling?.dataStyle,
          fill: { type: 'pattern', fgColor: options.styling?.alternateRowColor || '#F2F2F2' }
        }
      }));

      worksheet.rows.push(row);
    });
  }

  private addCharts(worksheet: any, charts: ExcelChart[]): void {
    charts.forEach(chart => {
      worksheet.charts.push(chart);
    });
  }

  private addImages(worksheet: any, images: ExcelImage[]): void {
    images.forEach(image => {
      worksheet.images.push(image);
    });
  }

  private applyStyles(worksheet: any, options: ExcelGenerationOptions): void {
    if (options.autoWidth) {
      this.autoSizeColumns(worksheet);
    }

    if (options.freeze) {
      this.freezePanes(worksheet, options.freeze);
    }

    if (options.protection) {
      this.protectWorksheet(worksheet, options.protection);
    }
  }

  private async writeWorkbook(workbook: any, format?: string): Promise<ArrayBuffer> {
    // In a real implementation, this would write the workbook to a buffer
    console.log('Writing workbook...', format);

    // Simulate Excel generation
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock Excel content (in real implementation, this would be actual Excel data)
    const mockContent = JSON.stringify(workbook);
    return new TextEncoder().encode(mockContent).buffer;
  }

  private getMimeType(format: string): string {
    const mimeTypes = {
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      xls: 'application/vnd.ms-excel',
      csv: 'text/csv'
    };

    return mimeTypes[format as keyof typeof mimeTypes] || mimeTypes.xlsx;
  }

  private processTemplate(templateData: any, variables: Record<string, any>): any {
    // Process template with variables (similar to PDF template processing)
    return {
      data: templateData.data || [],
      headers: templateData.headers || []
    };
  }

  private formatInvoiceData(invoiceData: any): any[][] {
    const data: any[][] = [];

    // Add company info
    data.push(['Company:', invoiceData.companyInfo.name]);
    data.push(['Invoice #:', invoiceData.invoiceNumber]);
    data.push(['Customer:', invoiceData.customerInfo.name]);
    data.push([]); // Empty row

    // Add line items
    invoiceData.lineItems.forEach((item: any) => {
      data.push([
        item.name,
        item.description,
        item.quantity,
        item.unitPrice,
        item.total
      ]);
    });

    // Add totals
    data.push([]); // Empty row
    data.push(['', '', '', 'Subtotal:', invoiceData.totals.subtotal]);
    data.push(['', '', '', 'Tax:', invoiceData.totals.tax]);
    data.push(['', '', '', 'Total:', invoiceData.totals.total]);

    return data;
  }

  private formatQuoteData(quoteData: any): any[][] {
    // Similar to invoice but for quotes
    return this.formatInvoiceData(quoteData);
  }

  private formatRevenueSummaryData(summary: any): any[][] {
    return [
      ['Total Contract Value', summary.totalContractValue],
      ['Recognized to Date', summary.recognizedToDate],
      ['Remaining Revenue', summary.remainingRevenue],
      ['Recognition Rate', summary.recognitionRate + '%'],
      ['Active Contracts', summary.activeContracts],
      ['Completed Contracts', summary.completedContracts]
    ];
  }

  private formatRevenueSchedulesData(schedules: any[]): any[][] {
    return schedules.map(schedule => [
      schedule.contractNumber,
      schedule.customerName,
      schedule.totalContractValue,
      schedule.recognizedRevenue,
      schedule.remainingRevenue,
      schedule.status
    ]);
  }

  private setCellFormula(worksheet: any, cell: string, formula: string): void {
    // Set formula in specified cell
    console.log(`Setting formula in ${cell}: ${formula}`);
  }

  private setDataValidation(worksheet: any, validation: any): void {
    // Apply data validation
    console.log('Setting data validation:', validation);
  }

  private setConditionalFormatting(worksheet: any, rule: any): void {
    // Apply conditional formatting
    console.log('Setting conditional formatting:', rule);
  }

  private autoSizeColumns(worksheet: any): void {
    // Auto-size columns based on content
    console.log('Auto-sizing columns...');
  }

  private freezePanes(worksheet: any, freeze: { rows: number; columns: number }): void {
    // Freeze panes
    console.log('Freezing panes:', freeze);
  }

  private protectWorksheet(worksheet: any, protection: any): void {
    // Protect worksheet
    console.log('Protecting worksheet:', protection);
  }
}

// Export default instance
export const excelGenerator = new ExcelGenerator();

// Export utility functions
export const ExcelUtils = {
  /**
   * Convert column number to Excel column letter (A, B, C, etc.)
   */
  numberToColumn(num: number): string {
    let result = '';
    while (num > 0) {
      num--;
      result = String.fromCharCode(65 + (num % 26)) + result;
      num = Math.floor(num / 26);
    }
    return result;
  },

  /**
   * Convert Excel column letter to number
   */
  columnToNumber(column: string): number {
    let result = 0;
    for (let i = 0; i < column.length; i++) {
      result = result * 26 + (column.charCodeAt(i) - 64);
    }
    return result;
  },

  /**
   * Convert cell address (A1, B2, etc.) to row/column
   */
  cellAddressToRowCol(address: string): { row: number; col: number } {
    const match = address.match(/^([A-Z]+)(\d+)$/);
    if (!match) throw new Error('Invalid cell address');

    return {
      col: this.columnToNumber(match[1]),
      row: parseInt(match[2])
    };
  },

  /**
   * Convert row/column to cell address
   */
  rowColToCellAddress(row: number, col: number): string {
    return this.numberToColumn(col) + row;
  },

  /**
   * Validate Excel file
   */
  async validateExcel(blob: Blob): Promise<boolean> {
    try {
      // Check file signature for Excel files
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Check for ZIP signature (XLSX files are ZIP archives)
      if (uint8Array[0] === 0x50 && uint8Array[1] === 0x4B) {
        return true;
      }

      // Check for OLE signature (XLS files)
      if (uint8Array[0] === 0xD0 && uint8Array[1] === 0xCF) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }
};

export default ExcelGenerator;