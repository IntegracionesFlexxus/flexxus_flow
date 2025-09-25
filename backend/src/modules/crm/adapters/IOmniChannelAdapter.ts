/**
 * Interface for OmniChannel Integration
 * This interface defines the contract for omnichannel module communication
 * TODO: OMNICHANNEL - Update when actual module is available
 */

export interface IConversation {
  id: string;
  customerId?: string;
  customerEmail?: string;
  messages: Array<{
    content: string;
    sender: 'customer' | 'agent';
    timestamp: Date;
  }>;
  metadata?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    company?: string;
    email?: string;
  };
  qualified?: boolean;
  createdAt: Date;
}

export interface ILandingPageSubmission {
  id: string;
  landingPageId: string;
  formData: {
    firstName?: string;
    lastName?: string;
    email: string;
    phone?: string;
    company?: string;
    jobTitle?: string;
    budget?: number;
    timeline?: string;
    needs?: string;
    customFields?: Record<string, any>;
  };
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  referrer?: string;
  submittedAt: Date;
}

export interface IEmailEngagement {
  contactEmail: string;
  campaignId: string;
  action: 'open' | 'click' | 'unsubscribe' | 'bounce' | 'reply';
  linkUrl?: string;
  timestamp: Date;
}

export interface IOmniChannelAdapter {
  // Conversation methods
  getConversation(conversationId: string): Promise<IConversation | null>;
  getQualifiedConversations(since?: Date): Promise<IConversation[]>;
  linkConversationToLead(conversationId: string, leadId: number): Promise<void>;

  // Landing page methods
  getLandingPageSubmission(submissionId: string): Promise<ILandingPageSubmission | null>;
  getRecentSubmissions(since?: Date): Promise<ILandingPageSubmission[]>;

  // Email engagement methods
  getEmailEngagements(email: string): Promise<IEmailEngagement[]>;
  trackEmailEngagement(engagement: IEmailEngagement): Promise<void>;

  // Event subscription methods
  subscribeToEvents(eventHandler: (event: IOmniChannelEvent) => void): void;
  unsubscribeFromEvents(): void;
}

export interface IOmniChannelEvent {
  type: 'conversation.qualified' | 'form.submitted' | 'email.engaged' | 'chat.started';
  data: any;
  timestamp: Date;
  companyId: number;
}