// interfaces/ITemplate.ts
export interface ITemplate {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  category: string;
  subject?: string;
  content: string;
  mediaUrl?: string;
  channelTypes: string[];
  variables: Record<string, string>;
  usageCount: number;
  lastUsedAt?: Date;
  isActive: boolean;
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAutoResponse {
  id: string;
  companyId: string;
  channelId?: string;
  name: string;
  description?: string;
  isActive: boolean;
  triggerType: string;
  triggerConditions: Record<string, any>;
  templateId: string;
  responseDelaySeconds: number;
  maxUsesPerContact?: number;
  activeHours?: Record<string, any>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}