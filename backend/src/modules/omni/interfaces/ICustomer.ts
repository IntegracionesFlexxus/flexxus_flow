// interfaces/ICustomer.ts
export interface ICustomer {
  id: string;
  companyId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  tags: string[];
  customFields?: Record<string, any>;
  notes?: string;
  firstContactDate?: Date;
  lastContactDate?: Date;
  totalConversations: number;
  crmContactId?: string;
  leadStatus?: string;
  leadScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICustomerIdentity {
  id: string;
  customerId: string;
  channelId: string;
  externalId: string;
  platformUsername?: string;
  displayName?: string;
  profileData?: Record<string, any>;
  isVerified: boolean;
  isActive: boolean;
  firstInteractionAt: Date;
  lastInteractionAt: Date;
  createdAt: Date;
  updatedAt: Date;
}