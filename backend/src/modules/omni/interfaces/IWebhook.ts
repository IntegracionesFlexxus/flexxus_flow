/**
 * Webhook Interface - Sprint 06
 * Interface for webhook processing
 */

export interface IWebhook {
  id: string;
  channel_id: string;
  channel_type: string;
  event_type: string;
  payload: any;
  headers: Record<string, string>;
  signature?: string;
  received_at: Date;
  processed_at?: Date;
  status: 'pending' | 'processing' | 'processed' | 'failed';
  error?: string;
  metadata?: any;
}