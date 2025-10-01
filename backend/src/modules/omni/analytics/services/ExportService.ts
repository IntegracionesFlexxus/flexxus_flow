/**
 * ExportService - Sprint 13
 * Service for exporting analytics data in various formats
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import * as fs from 'fs/promises';
import * as path from 'path';

interface ExportOptions {
  format: 'csv' | 'excel' | 'json' | 'pdf';
  fileName?: string;
  includeHeaders?: boolean;
  delimiter?: string;
}

@injectable()
export class ExportService {
  private readonly EXPORTS_DIR = path.join(process.cwd(), 'storage', 'exports');

  constructor(
    @inject(TYPES.Logger) private logger: Logger
  ) {
    this.ensureExportsDirectory();
  }

  async exportData(data: any[], options: ExportOptions): Promise<string> {
    try {
      this.logger.info('Exporting data', {
        format: options.format,
        recordCount: data.length
      });

      let content: string;
      let extension: string;

      switch (options.format) {
        case 'csv':
          content = this.generateCSV(data, options);
          extension = 'csv';
          break;
        case 'json':
          content = JSON.stringify(data, null, 2);
          extension = 'json';
          break;
        case 'excel':
        case 'pdf':
          throw new Error(`Format ${options.format} not yet implemented`);
        default:
          throw new Error(`Unsupported format: ${options.format}`);
      }

      const fileName = options.fileName || `export_${Date.now()}.${extension}`;
      const filePath = path.join(this.EXPORTS_DIR, fileName);

      await fs.writeFile(filePath, content, 'utf-8');

      this.logger.info('Export completed', { filePath });

      return filePath;
    } catch (error) {
      this.logger.error('Error exporting data', { error });
      throw new Error(`Failed to export data: ${error.message}`);
    }
  }

  private generateCSV(data: any[], options: ExportOptions): string {
    if (data.length === 0) return '';

    const delimiter = options.delimiter || ',';
    const lines: string[] = [];

    // Headers
    if (options.includeHeaders !== false) {
      const headers = Object.keys(data[0]);
      lines.push(headers.map(h => `"${h}"`).join(delimiter));
    }

    // Data rows
    for (const row of data) {
      const values = Object.values(row).map(v => {
        const str = String(v ?? '');
        return `"${str.replace(/"/g, '""')}"`;
      });
      lines.push(values.join(delimiter));
    }

    return lines.join('\n');
  }

  private async ensureExportsDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.EXPORTS_DIR, { recursive: true });
    } catch (error) {
      this.logger.error('Error creating exports directory', { error });
    }
  }
}

interface Logger {
  error(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
}
