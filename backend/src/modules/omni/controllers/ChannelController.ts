// controllers/ChannelController.ts
import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'inversify';
import { ChannelService } from '../services/ChannelService';
import { validateChannel } from '../validators/channelValidators';
import { OMNI_TYPES } from '../types/omni.types';

@injectable()
export class ChannelController {
  constructor(
    @inject(OMNI_TYPES.ChannelService) private channelService: ChannelService
  ) {}

  async createChannel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user?.companyId;
      const validatedData = await validateChannel(req.body);

      const channel = await this.channelService.createChannel({
        ...validatedData,
        companyId,
        createdBy: req.user?.id
      });

      res.status(201).json({
        success: true,
        data: channel,
        message: 'Channel created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async getChannels(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user?.companyId;
      const { type } = req.query;

      let channels;
      if (type) {
        channels = await this.channelService.getChannelsByType(companyId, type as any);
      } else {
        channels = await this.channelService.getAllChannels(companyId);
      }

      res.json({
        success: true,
        data: channels,
        count: channels.length
      });
    } catch (error) {
      next(error);
    }
  }

  async getChannel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const channel = await this.channelService.getChannel(id);

      if (!channel) {
        res.status(404).json({
          success: false,
          message: 'Channel not found'
        });
        return;
      }

      res.json({
        success: true,
        data: channel
      });
    } catch (error) {
      next(error);
    }
  }

  async updateChannel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      // Validar solo los campos que se están actualizando
      const validatedData = await validateChannel(req.body);

      const channel = await this.channelService.updateChannel(id, validatedData);

      if (!channel) {
        res.status(404).json({
          success: false,
          message: 'Channel not found'
        });
        return;
      }

      res.json({
        success: true,
        data: channel,
        message: 'Channel updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteChannel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await this.channelService.deleteChannel(id);

      res.json({
        success: true,
        message: 'Channel deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async toggleChannelStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const channel = await this.channelService.toggleChannelStatus(id);

      if (!channel) {
        res.status(404).json({
          success: false,
          message: 'Channel not found'
        });
        return;
      }

      res.json({
        success: true,
        data: channel,
        message: `Channel ${channel.isActive ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      next(error);
    }
  }

  async checkChannelHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await this.channelService.updateChannelHealth(id);

      res.json({
        success: true,
        message: 'Health check completed successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async getChannelStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user?.companyId;
      const channels = await this.channelService.getAllChannels(companyId);

      const stats = {
        total: channels.length,
        active: channels.filter(c => c.isActive).length,
        inactive: channels.filter(c => !c.isActive).length,
        byType: channels.reduce((acc, channel) => {
          acc[channel.channelType] = (acc[channel.channelType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byHealth: channels.reduce((acc, channel) => {
          acc[channel.healthStatus] = (acc[channel.healthStatus] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
}