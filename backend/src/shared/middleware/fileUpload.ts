/**
 * File Upload Middleware - Sprint 2
 * Siguiendo lineamientos nivel 2: validación de archivos y seguridad
 * Manejo seguro de uploads con validación exhaustiva
 */

import multer, { StorageEngine, FileFilterCallback, MulterError } from 'multer';
import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { Logger } from 'winston';
import { container } from '@/container/container';
import { TYPES } from '../../../container/types';
import { EncryptionService } from '@/shared/services/EncryptionService';
import sharp from 'sharp';
import fileType from 'file-type';
import { promisify } from 'util';
import stream from 'stream';

const pipeline = promisify(stream.pipeline);

export interface FileUploadOptions {
  destination?: string;
  allowedTypes?: string[];
  allowedMimeTypes?: string[];
  maxFileSize?: number;
  maxFiles?: number;
  preserveExtension?: boolean;
  generateThumbnails?: boolean;
  thumbnailSizes?: number[];
  scanForVirus?: boolean;
  encryptFiles?: boolean;
  validateContent?: boolean;
  sanitizeFileName?: boolean;
}

export interface UploadedFile {
  id: string;
  originalName: string;
  filename: string;
  mimeType: string;
  size: number;
  path: string;
  hash: string;
  uploadDate: Date;
  metadata?: Record<string, any>;
  thumbnails?: string[];
  encrypted?: boolean;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileInfo?: {
    actualType: string;
    declaredType: string;
    size: number;
    dimensions?: { width: number; height: number };
  };
}

/**
 * File upload configuration and storage
 */
export class FileUploadService {
  private logger: Logger;
  private encryptionService: EncryptionService;
  private uploadPath: string;

  constructor() {
    this.logger = container.get<Logger>(TYPES.Logger);
    this.encryptionService = container.get<EncryptionService>(TYPES.EncryptionService);
    this.uploadPath = process.env.UPLOAD_PATH || 'uploads';
  }

  /**
   * Create multer storage engine with custom configuration
   */
  createStorage(options: FileUploadOptions = {}): StorageEngine {
    return multer.diskStorage({
      destination: async (req, file, cb) => {
        try {
          const dir = options.destination || path.join(this.uploadPath, 'temp');
          await this.ensureDirectoryExists(dir);
          cb(null, dir);
        } catch (error) {
          cb(error as Error, '');
        }
      },
      filename: async (req, file, cb) => {
        try {
          const uniqueId = crypto.randomBytes(16).toString('hex');
          const timestamp = Date.now();
          const sanitizedName = this.sanitizeFileName(file.originalname);
          const ext = options.preserveExtension ? path.extname(sanitizedName) : '';
          const filename = `${timestamp}-${uniqueId}${ext}`;

          cb(null, filename);
        } catch (error) {
          cb(error as Error, '');
        }
      },
    });
  }

  /**
   * Create file filter for validation
   */
  createFileFilter(options: FileUploadOptions = {}) {
    return async (
      req: Request,
      file: Express.Multer.File,
      cb: FileFilterCallback
    ) => {
      try {
        // Validate file extension
        if (options.allowedTypes && options.allowedTypes.length > 0) {
          const ext = path.extname(file.originalname).toLowerCase().slice(1);
          if (!options.allowedTypes.includes(ext)) {
            return cb(new Error(`File type .${ext} is not allowed`));
          }
        }

        // Validate MIME type
        if (options.allowedMimeTypes && options.allowedMimeTypes.length > 0) {
          if (!options.allowedMimeTypes.includes(file.mimetype)) {
            return cb(new Error(`MIME type ${file.mimetype} is not allowed`));
          }
        }

        // Check for malicious file names
        if (this.isMaliciousFileName(file.originalname)) {
          return cb(new Error('Potentially malicious filename detected'));
        }

        cb(null, true);
      } catch (error) {
        cb(error as Error);
      }
    };
  }

  /**
   * Validate uploaded file content
   */
  async validateFile(
    filePath: string,
    options: FileUploadOptions = {}
  ): Promise<FileValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const result: FileValidationResult = {
      isValid: true,
      errors,
      warnings,
    };

    try {
      // Check file existence
      const stats = await fs.stat(filePath);

      // Validate file size
      if (options.maxFileSize && stats.size > options.maxFileSize) {
        errors.push(`File size (${stats.size} bytes) exceeds maximum allowed (${options.maxFileSize} bytes)`);
        result.isValid = false;
      }

      // Detect actual file type using magic numbers
      const fileBuffer = await fs.readFile(filePath);
      const detectedType = await fileType.fromBuffer(fileBuffer);

      if (detectedType) {
        result.fileInfo = {
          actualType: detectedType.mime,
          declaredType: '', // Will be set from multer file object
          size: stats.size,
        };

        // Validate detected type matches allowed types
        if (options.allowedMimeTypes && !options.allowedMimeTypes.includes(detectedType.mime)) {
          errors.push(`Detected file type (${detectedType.mime}) is not allowed`);
          result.isValid = false;
        }

        // Check for file type mismatch (possible spoofing)
        const ext = path.extname(filePath).toLowerCase().slice(1);
        if (ext && detectedType.ext !== ext) {
          warnings.push(`File extension (${ext}) doesn't match detected type (${detectedType.ext})`);
        }
      }

      // Additional image validation
      if (this.isImageFile(filePath)) {
        const imageInfo = await this.validateImage(filePath);
        if (imageInfo.errors.length > 0) {
          errors.push(...imageInfo.errors);
          result.isValid = false;
        }
        if (imageInfo.dimensions) {
          result.fileInfo = { ...result.fileInfo, ...imageInfo };
        }
      }

      // Check for embedded scripts in files
      if (await this.containsMaliciousContent(fileBuffer)) {
        errors.push('File contains potentially malicious content');
        result.isValid = false;
      }

    } catch (error) {
      errors.push(`File validation error: ${error.message}`);
      result.isValid = false;
    }

    return result;
  }

  /**
   * Process uploaded file
   */
  async processUploadedFile(
    file: Express.Multer.File,
    options: FileUploadOptions = {}
  ): Promise<UploadedFile> {
    const uploadId = crypto.randomUUID();
    const finalPath = path.join(this.uploadPath, 'processed', file.filename);

    try {
      // Validate file content
      if (options.validateContent) {
        const validation = await this.validateFile(file.path, options);
        if (!validation.isValid) {
          await fs.unlink(file.path);
          throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
        }
      }

      // Move file to processed directory
      await this.ensureDirectoryExists(path.dirname(finalPath));
      await fs.rename(file.path, finalPath);

      // Generate file hash
      const fileHash = await this.generateFileHash(finalPath);

      // Generate thumbnails for images
      let thumbnails: string[] = [];
      if (options.generateThumbnails && this.isImageFile(finalPath)) {
        thumbnails = await this.generateThumbnails(
          finalPath,
          options.thumbnailSizes || [150, 300, 600]
        );
      }

      // Encrypt file if required
      let encrypted = false;
      if (options.encryptFiles) {
        await this.encryptFile(finalPath);
        encrypted = true;
      }

      // Create upload record
      const uploadedFile: UploadedFile = {
        id: uploadId,
        originalName: file.originalname,
        filename: file.filename,
        mimeType: file.mimetype,
        size: file.size,
        path: finalPath,
        hash: fileHash,
        uploadDate: new Date(),
        metadata: {
          encoding: file.encoding,
          fieldname: file.fieldname,
        },
        thumbnails,
        encrypted,
      };

      this.logger.info('File processed successfully', {
        uploadId,
        originalName: file.originalname,
        size: file.size,
        encrypted,
      });

      return uploadedFile;
    } catch (error) {
      // Cleanup on error
      try {
        await fs.unlink(finalPath);
      } catch {}

      this.logger.error('File processing failed', {
        error: error.message,
        file: file.originalname,
      });

      throw error;
    }
  }

  /**
   * Validate image file
   */
  private async validateImage(filePath: string): Promise<{
    errors: string[];
    dimensions?: { width: number; height: number };
  }> {
    const errors: string[] = [];
    let dimensions;

    try {
      const metadata = await sharp(filePath).metadata();

      dimensions = {
        width: metadata.width || 0,
        height: metadata.height || 0,
      };

      // Check for reasonable dimensions
      if (dimensions.width > 10000 || dimensions.height > 10000) {
        errors.push('Image dimensions exceed maximum allowed size');
      }

      // Check for suspicious aspect ratios (possible zip bombs)
      const aspectRatio = dimensions.width / dimensions.height;
      if (aspectRatio > 100 || aspectRatio < 0.01) {
        errors.push('Suspicious image aspect ratio detected');
      }

      // Check color space and format
      if (metadata.format && ['svg', 'tiff'].includes(metadata.format)) {
        errors.push(`Image format ${metadata.format} may contain security risks`);
      }

    } catch (error) {
      errors.push(`Image validation failed: ${error.message}`);
    }

    return { errors, dimensions };
  }

  /**
   * Generate thumbnails for image
   */
  private async generateThumbnails(
    imagePath: string,
    sizes: number[]
  ): Promise<string[]> {
    const thumbnails: string[] = [];
    const thumbnailDir = path.join(this.uploadPath, 'thumbnails');
    await this.ensureDirectoryExists(thumbnailDir);

    for (const size of sizes) {
      try {
        const filename = path.basename(imagePath);
        const thumbnailPath = path.join(
          thumbnailDir,
          `${size}-${filename}`
        );

        await sharp(imagePath)
          .resize(size, size, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ quality: 85 })
          .toFile(thumbnailPath);

        thumbnails.push(thumbnailPath);
      } catch (error) {
        this.logger.warn('Thumbnail generation failed', {
          size,
          error: error.message,
        });
      }
    }

    return thumbnails;
  }

  /**
   * Encrypt file in place
   */
  private async encryptFile(filePath: string): Promise<void> {
    const fileContent = await fs.readFile(filePath);
    const encrypted = await this.encryptionService.encrypt(
      fileContent.toString('base64')
    );

    // Write encrypted content back
    await fs.writeFile(filePath + '.enc', JSON.stringify(encrypted));
    await fs.unlink(filePath);
    await fs.rename(filePath + '.enc', filePath);
  }

  /**
   * Generate SHA256 hash of file
   */
  private async generateFileHash(filePath: string): Promise<string> {
    const fileBuffer = await fs.readFile(filePath);
    return crypto
      .createHash('sha256')
      .update(fileBuffer)
      .digest('hex');
  }

  /**
   * Check for malicious content in file
   */
  private async containsMaliciousContent(buffer: Buffer): Promise<boolean> {
    const content = buffer.toString('utf8', 0, Math.min(buffer.length, 8192));

    const maliciousPatterns = [
      /<script[\s\S]*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe/gi,
      /eval\s*\(/gi,
      /document\.write/gi,
      /window\.location/gi,
      /\.exe/gi,
      /\.dll/gi,
      /\.bat/gi,
      /\.cmd/gi,
      /\.ps1/gi,
    ];

    for (const pattern of maliciousPatterns) {
      if (pattern.test(content)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if filename is potentially malicious
   */
  private isMaliciousFileName(filename: string): boolean {
    // Check for path traversal attempts
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return true;
    }

    // Check for null bytes
    if (filename.includes('\0')) {
      return true;
    }

    // Check for overly long filenames
    if (filename.length > 255) {
      return true;
    }

    // Check for special characters that might cause issues
    const dangerousChars = /[<>:"|?*\x00-\x1F]/;
    if (dangerousChars.test(filename)) {
      return true;
    }

    return false;
  }

  /**
   * Sanitize filename
   */
  private sanitizeFileName(filename: string): string {
    // Remove path components
    let sanitized = path.basename(filename);

    // Replace spaces with underscores
    sanitized = sanitized.replace(/\s+/g, '_');

    // Remove non-alphanumeric characters except dots, dashes, and underscores
    sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '');

    // Remove multiple consecutive dots
    sanitized = sanitized.replace(/\.{2,}/g, '.');

    // Limit length
    if (sanitized.length > 100) {
      const ext = path.extname(sanitized);
      const name = path.basename(sanitized, ext);
      sanitized = name.substring(0, 100 - ext.length) + ext;
    }

    return sanitized || 'unnamed_file';
  }

  /**
   * Check if file is an image
   */
  private isImageFile(filePath: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const ext = path.extname(filePath).toLowerCase();
    return imageExtensions.includes(ext);
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Clean up old temporary files
   */
  async cleanupTempFiles(olderThanHours = 24): Promise<void> {
    const tempDir = path.join(this.uploadPath, 'temp');
    const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);

    try {
      const files = await fs.readdir(tempDir);

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filePath);
          this.logger.debug('Cleaned up old temp file', { file });
        }
      }
    } catch (error) {
      this.logger.error('Temp file cleanup failed', { error: error.message });
    }
  }
}

/**
 * Create upload middleware with configuration
 */
export function createUploadMiddleware(
  fieldName: string,
  options: FileUploadOptions = {}
): multer.Multer {
  const fileUploadService = new FileUploadService();

  const multerOptions: multer.Options = {
    storage: fileUploadService.createStorage(options),
    fileFilter: fileUploadService.createFileFilter(options),
    limits: {
      fileSize: options.maxFileSize || 10 * 1024 * 1024, // 10MB default
      files: options.maxFiles || 10,
      fields: 50,
      fieldSize: 1024 * 1024, // 1MB
      headerPairs: 2000,
    },
    preservePath: false,
  };

  return multer(multerOptions);
}

/**
 * Upload error handler middleware
 */
export function handleUploadError(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const logger = container.get<Logger>(TYPES.Logger);

  if (error instanceof MulterError) {
    logger.warn('Multer upload error', {
      code: error.code,
      field: error.field,
      message: error.message,
    });

    const errorMessages: Record<string, string> = {
      LIMIT_PART_COUNT: 'Too many parts',
      LIMIT_FILE_SIZE: 'File too large',
      LIMIT_FILE_COUNT: 'Too many files',
      LIMIT_FIELD_KEY: 'Field name too long',
      LIMIT_FIELD_VALUE: 'Field value too long',
      LIMIT_FIELD_COUNT: 'Too many fields',
      LIMIT_UNEXPECTED_FILE: 'Unexpected file field',
    };

    res.status(400).json({
      success: false,
      message: errorMessages[error.code] || 'Upload failed',
      error: error.code,
    });
  } else if (error) {
    logger.error('Upload error', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      message: error.message || 'Upload failed',
    });
  } else {
    next();
  }
}

/**
 * File validation middleware
 */
export function validateUploadedFile(options: FileUploadOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const fileUploadService = new FileUploadService();
    const logger = container.get<Logger>(TYPES.Logger);

    try {
      if (!req.file && !req.files) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
      }

      const files = req.files
        ? Array.isArray(req.files)
          ? req.files
          : Object.values(req.files).flat()
        : [req.file!];

      const processedFiles: UploadedFile[] = [];

      for (const file of files) {
        const processed = await fileUploadService.processUploadedFile(
          file as Express.Multer.File,
          options
        );
        processedFiles.push(processed);
      }

      // Attach processed files to request
      (req as any).processedFiles = processedFiles;

      next();
    } catch (error) {
      logger.error('File validation failed', { error: error.message });

      res.status(400).json({
        success: false,
        message: error.message || 'File validation failed',
      });
    }
  };
}

/**
 * Common file upload configurations
 */
export const FileUploadConfigs = {
  images: {
    allowedTypes: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxFileSize: 5 * 1024 * 1024, // 5MB
    generateThumbnails: true,
    validateContent: true,
    sanitizeFileName: true,
  },

  documents: {
    allowedTypes: ['pdf', 'doc', 'docx', 'txt', 'rtf'],
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/rtf',
    ],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    validateContent: true,
    sanitizeFileName: true,
    encryptFiles: true,
  },

  avatars: {
    allowedTypes: ['jpg', 'jpeg', 'png'],
    allowedMimeTypes: ['image/jpeg', 'image/png'],
    maxFileSize: 2 * 1024 * 1024, // 2MB
    generateThumbnails: true,
    thumbnailSizes: [50, 100, 200],
    validateContent: true,
    sanitizeFileName: true,
  },

  csv: {
    allowedTypes: ['csv'],
    allowedMimeTypes: ['text/csv', 'application/csv'],
    maxFileSize: 50 * 1024 * 1024, // 50MB
    validateContent: true,
    sanitizeFileName: true,
  },
};
