import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '../../../container/types';
import { ExportService } from '../services/ExportService';
import * as fs from 'fs';

@injectable()
export class ExportController {
  constructor(
    @inject(TYPES.CRMExportService) private exportService: ExportService
  ) {}

  /**
   * Create a new export
   */
  async createExport(req: Request, res: Response): Promise<void> {
    try {
      const companyId = Number(req.user?.companyId || 1);
      const userId = Number(req.user?.id || 1);

      const exportRequest = {
        ...req.body,
        company_id: companyId,
        user_id: userId
      };

      const exportRecord = await this.exportService.createExport(exportRequest);

      res.status(201).json({
        success: true,
        data: {
          exportId: exportRecord.id,
          status: exportRecord.status,
          message: 'Export has been queued for processing'
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }

  /**
   * Get all exports
   */
  async getExports(req: Request, res: Response): Promise<void> {
    try {
      const companyId = Number(req.user?.companyId || 1);
      const { status } = req.query;

      const exports = await this.exportService.getCompanyExports(
        companyId,
        status as string
      );

      res.json({
        success: true,
        data: exports
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }

  /**
   * Get user's exports
   */
  async getUserExports(req: Request, res: Response): Promise<void> {
    try {
      const companyId = Number(req.user?.companyId || 1);
      const userId = Number(req.user?.id || 1);

      const exports = await this.exportService.getUserExports(companyId, userId);

      res.json({
        success: true,
        data: exports
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }

  /**
   * Get export by ID
   */
  async getExport(req: Request, res: Response): Promise<void> {
    try {
      const { exportId } = req.params;

      const exportRecord = await this.exportService.getExport(parseInt(exportId, 10));

      if (!exportRecord) {
        res.status(404).json({
          success: false,
          error: 'Export not found'
        });
        return;
      }

      res.json({
        success: true,
        data: exportRecord
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }

  /**
   * Get export status
   */
  async getExportStatus(req: Request, res: Response): Promise<void> {
    try {
      const { exportId } = req.params;

      const status = await this.exportService.getExportStatus(parseInt(exportId, 10));

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }

  /**
   * Download export
   */
  async downloadExport(req: Request, res: Response): Promise<void> {
    try {
      const { exportId } = req.params;

      const { filePath, filename } = await this.exportService.downloadExport(parseInt(exportId, 10));

      // Stream the file to the response
      const stream = fs.createReadStream(filePath);

      // Set appropriate headers based on file extension
      const extension = filename.split('.').pop()?.toLowerCase();
      let contentType = 'application/octet-stream';

      switch (extension) {
        case 'csv':
          contentType = 'text/csv';
          break;
        case 'xlsx':
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;
        case 'json':
          contentType = 'application/json';
          break;
        case 'pdf':
          contentType = 'application/pdf';
          break;
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      stream.pipe(res);

      stream.on('error', (error) => {
        console.error('Stream error:', error);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Failed to download export'
          });
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }

  /**
   * Cancel export
   */
  async cancelExport(req: Request, res: Response): Promise<void> {
    try {
      const { exportId } = req.params;

      const cancelled = await this.exportService.cancelExport(parseInt(exportId, 10));

      if (!cancelled) {
        res.status(400).json({
          success: false,
          error: 'Unable to cancel export'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Export cancelled successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }

  /**
   * Retry failed export
   */
  async retryExport(req: Request, res: Response): Promise<void> {
    try {
      const { exportId } = req.params;

      const exportRecord = await this.exportService.retryExport(parseInt(exportId, 10));

      res.json({
        success: true,
        data: {
          exportId: exportRecord.id,
          status: exportRecord.status,
          message: 'Export has been requeued for processing'
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }

  /**
   * Get export statistics
   */
  async getExportStatistics(req: Request, res: Response): Promise<void> {
    try {
      const companyId = Number(req.user?.companyId || 1);

      const statistics = await this.exportService.getExportStatistics(companyId);

      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }

  /**
   * Bulk export
   */
  async createBulkExport(req: Request, res: Response): Promise<void> {
    try {
      const companyId = Number(req.user?.companyId || 1);
      const userId = Number(req.user?.id || 1);
      const { entities, format = 'csv', filters } = req.body;

      if (!entities || !Array.isArray(entities) || entities.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Entities array is required'
        });
        return;
      }

      const exports = await Promise.all(
        entities.map(entity =>
          this.exportService.createExport({
            company_id: companyId,
            entity_type: entity,
            format,
            filters: filters?.[entity],
            user_id: userId
          })
        )
      );

      res.status(201).json({
        success: true,
        data: {
          exports: exports.map(e => ({
            exportId: e.id,
            entity: e.entity_type,
            status: e.status
          })),
          message: `${exports.length} exports have been queued for processing`
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }

  /**
   * Clean up expired exports (admin only)
   */
  async cleanupExpiredExports(req: Request, res: Response): Promise<void> {
    try {
      // This should be restricted to admin users
      const cleanedCount = await this.exportService.cleanupExpiredExports();

      res.json({
        success: true,
        data: {
          cleanedCount,
          message: `${cleanedCount} expired exports have been cleaned up`
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }
}