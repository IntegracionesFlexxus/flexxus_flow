/**
 * File Log Storage - Sprint 2
 * Siguiendo lineamientos nivel 2: almacenamiento de logs en archivos
 */

import { injectable, inject } from 'inversify';
import { promises as fs } from 'fs';
import path from 'path';
import { createWriteStream, WriteStream } from 'fs';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
import { environment } from '@/config/environment';

export interface LogEntry {
  timestamp: Date;
  level: string;
  message: string;
  component?: string;
  context?: Record<string, any>;
  data?: Record<string, any>;
}

export interface LogStorageOptions {
  baseDir: string;
  maxFileSize: number; // bytes
  maxFiles: number;
  rotateDaily: boolean;
  compressionEnabled: boolean;
  retentionDays: number;
}

export interface LogFile {
  filename: string;
  path: string;
  size: number;
  createdAt: Date;
  lastModified: Date;
}

@injectable()
export class FileLogStorage {
  private options: LogStorageOptions;
  private activeStreams = new Map<string, WriteStream>();
  private rotationTimer?: NodeJS.Timeout;

  constructor(
    @inject(TYPES.Logger) private logger: Logger
  ) {
    this.options = this.getDefaultOptions();
    this.ensureDirectoryExists();
    this.startRotationTimer();
  }

  /**
   * Escribir log a archivo
   */
  async writeLog(entry: LogEntry, category: string = 'application'): Promise<void> {
    try {
      const filename = this.generateFilename(category, entry.timestamp);
      const filepath = path.join(this.options.baseDir, filename);

      const logLine = this.formatLogEntry(entry);

      // Obtener o crear stream para el archivo
      const stream = await this.getOrCreateStream(filepath, filename);

      // Escribir la línea
      return new Promise((resolve, reject) => {
        stream.write(logLine + '\n', (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

    } catch (error) {
      this.logger.error('Failed to write log to file', {
        error: error.message,
        category,
        entry: { level: entry.level, message: entry.message }
      });
      throw error;
    }
  }

  /**
   * Leer logs desde archivo
   */
  async readLogs(
    category: string = 'application',
    options: {
      startDate?: Date;
      endDate?: Date;
      level?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<LogEntry[]> {
    try {
      const files = await this.getLogFiles(category, options.startDate, options.endDate);
      const logs: LogEntry[] = [];

      for (const file of files) {
        const fileContent = await fs.readFile(file.path, 'utf8');
        const lines = fileContent.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const logEntry = this.parseLogEntry(line);

            // Aplicar filtros
            if (options.level && logEntry.level !== options.level) {
              continue;
            }

            if (options.startDate && logEntry.timestamp < options.startDate) {
              continue;
            }

            if (options.endDate && logEntry.timestamp > options.endDate) {
              continue;
            }

            logs.push(logEntry);
          } catch (parseError) {
            // Ignorar líneas que no se pueden parsear
            continue;
          }
        }
      }

      // Ordenar por timestamp
      logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Aplicar offset y limit
      const offset = options.offset || 0;
      const limit = options.limit || logs.length;

      return logs.slice(offset, offset + limit);

    } catch (error) {
      this.logger.error('Failed to read logs from file', {
        error: error.message,
        category,
        options
      });
      throw error;
    }
  }

  /**
   * Obtener lista de archivos de log
   */
  async getLogFiles(
    category?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<LogFile[]> {
    try {
      const files = await fs.readdir(this.options.baseDir);
      const logFiles: LogFile[] = [];

      for (const filename of files) {
        if (category && !filename.includes(category)) {
          continue;
        }

        const filepath = path.join(this.options.baseDir, filename);
        const stats = await fs.stat(filepath);

        // Filtrar por fechas si se especifican
        if (startDate && stats.mtime < startDate) {
          continue;
        }

        if (endDate && stats.mtime > endDate) {
          continue;
        }

        logFiles.push({
          filename,
          path: filepath,
          size: stats.size,
          createdAt: stats.birthtime,
          lastModified: stats.mtime
        });
      }

      return logFiles.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

    } catch (error) {
      this.logger.error('Failed to get log files', {
        error: error.message,
        category
      });
      throw error;
    }
  }

  /**
   * Rotar archivos de log
   */
  async rotateLogFiles(): Promise<void> {
    try {
      const files = await this.getLogFiles();

      for (const file of files) {
        // Rotar si el archivo excede el tamaño máximo
        if (file.size > this.options.maxFileSize) {
          await this.rotateFile(file.path);
        }
      }

      // Limpiar archivos antiguos
      await this.cleanupOldFiles();

    } catch (error) {
      this.logger.error('Failed to rotate log files', {
        error: error.message
      });
    }
  }

  /**
   * Comprimir archivos de log antiguos
   */
  async compressOldFiles(): Promise<void> {
    if (!this.options.compressionEnabled) {
      return;
    }

    try {
      const files = await this.getLogFiles();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7); // Comprimir archivos de más de 7 días

      for (const file of files) {
        if (file.lastModified < cutoffDate && !file.filename.endsWith('.gz')) {
          await this.compressFile(file.path);
        }
      }

    } catch (error) {
      this.logger.error('Failed to compress old files', {
        error: error.message
      });
    }
  }

  /**
   * Obtener estadísticas de almacenamiento
   */
  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    oldestFile: Date | null;
    newestFile: Date | null;
    filesByCategory: Record<string, number>;
    sizeByCategory: Record<string, number>;
  }> {
    try {
      const files = await this.getLogFiles();

      let totalSize = 0;
      let oldestFile: Date | null = null;
      let newestFile: Date | null = null;
      const filesByCategory: Record<string, number> = {};
      const sizeByCategory: Record<string, number> = {};

      for (const file of files) {
        totalSize += file.size;

        if (!oldestFile || file.createdAt < oldestFile) {
          oldestFile = file.createdAt;
        }

        if (!newestFile || file.createdAt > newestFile) {
          newestFile = file.createdAt;
        }

        // Extraer categoría del nombre del archivo
        const category = this.extractCategoryFromFilename(file.filename);
        filesByCategory[category] = (filesByCategory[category] || 0) + 1;
        sizeByCategory[category] = (sizeByCategory[category] || 0) + file.size;
      }

      return {
        totalFiles: files.length,
        totalSize,
        oldestFile,
        newestFile,
        filesByCategory,
        sizeByCategory
      };

    } catch (error) {
      this.logger.error('Failed to get storage stats', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Configurar opciones de almacenamiento
   */
  updateOptions(options: Partial<LogStorageOptions>): void {
    this.options = { ...this.options, ...options };

    if (options.baseDir) {
      this.ensureDirectoryExists();
    }

    this.logger.info('File log storage options updated', {
      newOptions: options
    });
  }

  /**
   * Limpiar recursos
   */
  async destroy(): Promise<void> {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
    }

    // Cerrar todos los streams activos
    for (const [filename, stream] of this.activeStreams) {
      await new Promise<void>((resolve) => {
        stream.end(() => resolve());
      });
    }

    this.activeStreams.clear();
    this.logger.info('File log storage destroyed');
  }

  /**
   * Métodos privados
   */
  private getDefaultOptions(): LogStorageOptions {
    return {
      baseDir: path.join(process.cwd(), 'logs'),
      maxFileSize: 100 * 1024 * 1024, // 100MB
      maxFiles: 10,
      rotateDaily: true,
      compressionEnabled: environment.nodeEnv === 'production',
      retentionDays: environment.nodeEnv === 'production' ? 90 : 30
    };
  }

  private async ensureDirectoryExists(): Promise<void> {
    try {
      await fs.mkdir(this.options.baseDir, { recursive: true });
    } catch (error) {
      this.logger.error('Failed to create log directory', {
        error: error.message,
        directory: this.options.baseDir
      });
      throw error;
    }
  }

  private generateFilename(category: string, timestamp: Date): string {
    if (this.options.rotateDaily) {
      const dateStr = timestamp.toISOString().slice(0, 10); // YYYY-MM-DD
      return `${category}-${dateStr}.log`;
    } else {
      return `${category}.log`;
    }
  }

  private formatLogEntry(entry: LogEntry): string {
    const logObj = {
      timestamp: entry.timestamp.toISOString(),
      level: entry.level,
      message: entry.message,
      component: entry.component,
      context: entry.context,
      data: entry.data
    };

    return JSON.stringify(logObj);
  }

  private parseLogEntry(line: string): LogEntry {
    const parsed = JSON.parse(line);

    return {
      timestamp: new Date(parsed.timestamp),
      level: parsed.level,
      message: parsed.message,
      component: parsed.component,
      context: parsed.context,
      data: parsed.data
    };
  }

  private async getOrCreateStream(filepath: string, filename: string): Promise<WriteStream> {
    let stream = this.activeStreams.get(filename);

    if (!stream) {
      stream = createWriteStream(filepath, { flags: 'a' });
      this.activeStreams.set(filename, stream);

      // Manejar errores del stream
      stream.on('error', (error) => {
        this.logger.error('Log file stream error', {
          error: error.message,
          filename
        });
        this.activeStreams.delete(filename);
      });
    }

    return stream;
  }

  private async rotateFile(filepath: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rotatedPath = `${filepath}.${timestamp}`;

    // Cerrar stream si está activo
    const filename = path.basename(filepath);
    const stream = this.activeStreams.get(filename);
    if (stream) {
      await new Promise<void>((resolve) => {
        stream.end(() => resolve());
      });
      this.activeStreams.delete(filename);
    }

    // Renombrar archivo
    await fs.rename(filepath, rotatedPath);

    // Comprimir si está habilitado
    if (this.options.compressionEnabled) {
      await this.compressFile(rotatedPath);
    }
  }

  private async compressFile(filepath: string): Promise<void> {
    const zlib = await import('zlib');
    const { pipeline } = await import('stream');
    const { promisify } = await import('util');
    const pipelineAsync = promisify(pipeline);

    const input = await import('fs').then(fs => fs.createReadStream(filepath));
    const output = await import('fs').then(fs => fs.createWriteStream(`${filepath}.gz`));
    const gzip = zlib.createGzip();

    await pipelineAsync(input, gzip, output);

    // Eliminar archivo original
    await fs.unlink(filepath);
  }

  private async cleanupOldFiles(): Promise<void> {
    const files = await this.getLogFiles();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.options.retentionDays);

    for (const file of files) {
      if (file.lastModified < cutoffDate) {
        await fs.unlink(file.path);
        this.logger.info('Old log file deleted', {
          filename: file.filename,
          lastModified: file.lastModified
        });
      }
    }
  }

  private extractCategoryFromFilename(filename: string): string {
    const parts = filename.split('-');
    return parts[0] || 'unknown';
  }

  private startRotationTimer(): void {
    // Ejecutar rotación cada hora
    this.rotationTimer = setInterval(() => {
      this.rotateLogFiles().catch(error => {
        this.logger.error('Scheduled log rotation failed', {
          error: error.message
        });
      });
    }, 60 * 60 * 1000);
  }
}
