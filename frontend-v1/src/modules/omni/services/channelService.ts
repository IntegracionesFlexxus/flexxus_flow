// services/channelService.ts
import BaseOmniService from './baseService';
import {
  Channel,
  ChannelType,
  CreateChannelRequest,
  UpdateChannelRequest,
  ApiResponse,
  ApiListResponse
} from '../types';

class ChannelService extends BaseOmniService {
  async getChannels(type?: ChannelType): Promise<ApiListResponse<Channel>> {
    try {
      const params = type ? { type } : {};
      const response = await this.api.get('/channels', { params });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getChannel(id: string): Promise<ApiResponse<Channel>> {
    try {
      const response = await this.api.get(`/channels/${id}`);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async createChannel(data: CreateChannelRequest): Promise<ApiResponse<Channel>> {
    try {
      const response = await this.api.post('/channels', data);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async updateChannel(id: string, data: UpdateChannelRequest): Promise<ApiResponse<Channel>> {
    try {
      const response = await this.api.put(`/channels/${id}`, data);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async deleteChannel(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await this.api.delete(`/channels/${id}`);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async toggleChannelStatus(id: string): Promise<ApiResponse<Channel>> {
    try {
      const response = await this.api.post(`/channels/${id}/toggle`);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async checkChannelHealth(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await this.api.post(`/channels/${id}/health`);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getChannelStats(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/channels/stats');
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }
}

export default new ChannelService();