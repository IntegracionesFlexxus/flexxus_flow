/**
 * Integration Interfaces - Sprint 09
 * Core interfaces for external integrations
 */

export interface IIntegrationConfig {
  id: string;
  company_id: string;
  provider: string;
  type: 'crm' | 'helpdesk' | 'calendar' | 'email' | 'storage';
  name: string;
  config: Record<string, any>;
  mappings: IFieldMappingConfig;
  sync_config: ISyncConfig;
  webhook_config?: IWebhookConfig;
  is_active: boolean;
  last_sync_at?: Date;
  sync_status: 'never_synced' | 'syncing' | 'success' | 'failed' | 'paused';
  metadata?: Record<string, any>;
}

export interface ISyncConfig {
  strategy: 'full' | 'incremental' | 'real_time';
  interval: number; // seconds
  batch_size: number;
  retry_attempts: number;
  conflict_resolution?: 'local_wins' | 'remote_wins' | 'newest_wins' | 'manual';
}

export interface IWebhookConfig {
  endpoint_url?: string;
  events: string[];
  secret?: string;
  headers?: Record<string, string>;
}

export interface IFieldMappingConfig {
  field_mappings: IFieldMapping[];
  transformations?: ITransformation[];
  validations?: IValidation[];
}

export interface IFieldMapping {
  source_field: string;
  target_field: string;
  required?: boolean;
  default_value?: any;
  transformation?: string; // reference to transformation id
}

export interface ITransformation {
  id: string;
  type: 'format' | 'convert' | 'calculate' | 'lookup' | 'custom';
  config: Record<string, any>;
}

export interface IValidation {
  field: string;
  type: 'required' | 'format' | 'range' | 'custom';
  config: Record<string, any>;
  error_message?: string;
}

export interface IIntegrationProvider {
  // Connection management
  connect(config: IIntegrationConfig): Promise<void>;
  disconnect(): Promise<void>;
  testConnection(): Promise<IConnectionTestResult>;
  
  // Data synchronization
  sync(options: ISyncOptions): Promise<ISyncResult>;
  syncEntity(entityType: string, options: ISyncOptions): Promise<ISyncResult>;
  
  // CRUD operations
  create(entityType: string, data: any): Promise<any>;
  read(entityType: string, id: string): Promise<any>;
  update(entityType: string, id: string, data: any): Promise<any>;
  delete(entityType: string, id: string): Promise<boolean>;
  list(entityType: string, filters?: any): Promise<any[]>;
  
  // Webhook handling
  handleWebhook(payload: any, headers: Record<string, string>): Promise<void>;
  validateWebhook(payload: any, signature: string): boolean;
  
  // Metadata
  getMetadata(): IProviderMetadata;
  getSupportedEntities(): string[];
  getFieldSchema(entityType: string): Promise<IFieldSchema[]>;
}

export interface ISyncOptions {
  entity_types?: string[];
  since?: Date;
  until?: Date;
  filters?: Record<string, any>;
  batch_size?: number;
  direction?: 'inbound' | 'outbound' | 'bidirectional';
}

export interface ISyncResult {
  success: boolean;
  sync_id: string;
  started_at: Date;
  completed_at?: Date;
  records_synced: number;
  records_created: number;
  records_updated: number;
  records_deleted: number;
  records_failed: number;
  errors?: ISyncError[];
  warnings?: string[];
}

export interface ISyncError {
  record_id?: string;
  entity_type: string;
  error_code: string;
  error_message: string;
  data?: any;
}

export interface IConnectionTestResult {
  success: boolean;
  message: string;
  details?: Record<string, any>;
  error?: string;
}

export interface IProviderMetadata {
  name: string;
  version: string;
  author: string;
  description: string;
  documentation_url?: string;
  supported_entities: string[];
  supported_operations: string[];
  authentication_type: 'api_key' | 'oauth2' | 'basic' | 'custom';
  rate_limits?: IRateLimit[];
}

export interface IRateLimit {
  requests: number;
  window: number; // seconds
  scope?: string; // endpoint or operation
}

export interface IFieldSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  label?: string;
  required: boolean;
  readonly: boolean;
  max_length?: number;
  min_length?: number;
  pattern?: string;
  enum_values?: any[];
  description?: string;
}

export interface ISyncStrategy {
  execute(provider: IIntegrationProvider, options: ISyncOptions): Promise<ISyncResult>;
  resolveConflicts(local: any, remote: any, strategy: string): Promise<any>;
  detectChanges(previous: any, current: any): IChangeSet;
}

export interface IChangeSet {
  created: any[];
  updated: any[];
  deleted: any[];
}

export interface IOAuthConfig {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  authorization_url: string;
  token_url: string;
  scopes: string[];
  state?: string;
  code_challenge?: string;
  code_challenge_method?: 'S256' | 'plain';
}

export interface IOAuthToken {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in?: number;
  expires_at?: Date;
  scope?: string;
  id_token?: string;
}

export interface IWebhookEvent {
  id: string;
  type: string;
  timestamp: Date;
  data: any;
  metadata?: Record<string, any>;
}

export interface IWebhookDelivery {
  webhook_endpoint_id: string;
  event: IWebhookEvent;
  attempts: number;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  last_attempt_at?: Date;
  next_retry_at?: Date;
  response?: {
    status: number;
    body?: any;
    headers?: Record<string, string>;
  };
  error?: string;
}

export interface IApiKey {
  id: string;
  company_id: string;
  name: string;
  key_prefix: string;
  key_hint: string;
  scopes: string[];
  rate_limit: number;
  expires_at?: Date;
  is_active: boolean;
  last_used_at?: Date;
  usage_count: number;
}

export interface IIntegrationRepository {
  // Integration configs
  createIntegration(data: Partial<IIntegrationConfig>): Promise<IIntegrationConfig>;
  getIntegration(id: string): Promise<IIntegrationConfig | null>;
  updateIntegration(id: string, data: Partial<IIntegrationConfig>): Promise<IIntegrationConfig>;
  deleteIntegration(id: string): Promise<boolean>;
  listIntegrations(companyId: string, filters?: any): Promise<IIntegrationConfig[]>;
  
  // OAuth tokens
  saveOAuthToken(integrationId: string, token: IOAuthToken): Promise<void>;
  getOAuthToken(integrationId: string): Promise<IOAuthToken | null>;
  refreshOAuthToken(integrationId: string): Promise<IOAuthToken>;
  
  // Sync logs
  createSyncLog(log: any): Promise<void>;
  getSyncLogs(integrationId: string, limit?: number): Promise<any[]>;
  
  // API keys
  createApiKey(data: Partial<IApiKey>): Promise<{ key: string; apiKey: IApiKey }>;
  validateApiKey(keyHash: string): Promise<IApiKey | null>;
  revokeApiKey(id: string, reason: string): Promise<void>;
}

export interface IIntegrationService {
  // Integration management
  registerProvider(provider: IIntegrationProvider): void;
  getProvider(providerId: string): IIntegrationProvider | null;
  listProviders(): IProviderMetadata[];
  
  // Connection management
  connectIntegration(integrationId: string): Promise<void>;
  disconnectIntegration(integrationId: string): Promise<void>;
  testIntegrationConnection(integrationId: string): Promise<IConnectionTestResult>;
  
  // Synchronization
  syncIntegration(integrationId: string, options?: ISyncOptions): Promise<ISyncResult>;
  scheduleSync(integrationId: string, cronExpression: string): void;
  cancelScheduledSync(integrationId: string): void;
  
  // Webhook management
  processWebhook(providerId: string, payload: any, headers: Record<string, string>): Promise<void>;
  registerWebhookEndpoint(integrationId: string, config: IWebhookConfig): Promise<string>;
  unregisterWebhookEndpoint(integrationId: string, endpointId: string): Promise<void>;
}