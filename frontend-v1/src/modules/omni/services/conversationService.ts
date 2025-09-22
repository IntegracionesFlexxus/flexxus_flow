// services/conversationService.ts
import BaseOmniService from './baseService';
import {
  Conversation,
  ConversationFilters,
  CreateConversationRequest,
  ConversationStats,
  ApiResponse,
  ApiListResponse
} from '../types';

class ConversationService extends BaseOmniService {
  async getConversations(filters?: ConversationFilters): Promise<ApiListResponse<Conversation>> {
    try {
      const response = await this.api.get('/conversations', { params: filters });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getConversation(id: string): Promise<ApiResponse<Conversation>> {
    try {
      const response = await this.api.get(`/conversations/${id}`);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async createConversation(data: CreateConversationRequest): Promise<ApiResponse<Conversation>> {
    try {
      const response = await this.api.post('/conversations', data);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async assignConversation(id: string, userId: string): Promise<ApiResponse<Conversation>> {
    try {
      const response = await this.api.post(`/conversations/${id}/assign`, { userId });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async updateConversationStatus(id: string, status: string): Promise<ApiResponse<Conversation>> {
    try {
      const response = await this.api.put(`/conversations/${id}/status`, { status });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async resolveConversation(id: string): Promise<ApiResponse<Conversation>> {
    try {
      const response = await this.api.post(`/conversations/${id}/resolve`);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async reopenConversation(id: string): Promise<ApiResponse<Conversation>> {
    try {
      const response = await this.api.post(`/conversations/${id}/reopen`);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async updateConversationPriority(id: string, priority: string): Promise<ApiResponse<Conversation>> {
    try {
      const response = await this.api.put(`/conversations/${id}/priority`, { priority });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async addTags(id: string, tags: string[]): Promise<ApiResponse<Conversation>> {
    try {
      const response = await this.api.post(`/conversations/${id}/tags`, { tags });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async removeTags(id: string, tags: string[]): Promise<ApiResponse<Conversation>> {
    try {
      const response = await this.api.delete(`/conversations/${id}/tags`, { data: { tags } });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getConversationStats(): Promise<ApiResponse<ConversationStats>> {
    try {
      const response = await this.api.get('/conversations/stats');
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }
}

export default new ConversationService();