/**
 * Salesforce Integration Provider - Sprint 09
 * Integration with Salesforce CRM
 */

import { injectable } from 'inversify';
import { CRMIntegrationProvider, ICRMContact, ICRMCompany, ICRMDeal } from './CRMIntegrationProvider';
import {
  IIntegrationConfig,
  IConnectionTestResult,
  ISyncOptions,
  ISyncResult,
  IProviderMetadata
} from '../interfaces/IIntegration';

// Mock Salesforce client - replace with @salesforce/jsforce in production
class MockSalesforceClient {
  private connected = false;
  private instanceUrl = 'https://mock.salesforce.com';
  private accessToken = 'mock_token';

  async login(username: string, password: string, securityToken: string): Promise<void> {
    // Mock login
    this.connected = true;
  }

  async loginWithOAuth(config: any): Promise<void> {
    // Mock OAuth login
    this.connected = true;
  }

  async query(soql: string): Promise<any> {
    // Mock query
    if (soql.includes('Contact')) {
      return {
        totalSize: 2,
        records: [
          {
            Id: 'SF001',
            FirstName: 'John',
            LastName: 'Doe',
            Email: 'john@example.com',
            Phone: '123-456-7890'
          },
          {
            Id: 'SF002',
            FirstName: 'Jane',
            LastName: 'Smith',
            Email: 'jane@example.com',
            Phone: '098-765-4321'
          }
        ]
      };
    }
    return { totalSize: 0, records: [] };
  }

  async create(objectType: string, data: any): Promise<{ id: string }> {
    return { id: `SF${Date.now()}` };
  }

  async update(objectType: string, data: any): Promise<{ success: boolean }> {
    return { success: true };
  }

  async delete(objectType: string, id: string): Promise<{ success: boolean }> {
    return { success: true };
  }

  async describe(objectType: string): Promise<any> {
    return {
      fields: [
        { name: 'Id', type: 'string' },
        { name: 'FirstName', type: 'string' },
        { name: 'LastName', type: 'string' },
        { name: 'Email', type: 'email' }
      ]
    };
  }
}

@injectable()
export class SalesforceProvider extends CRMIntegrationProvider {
  private client?: MockSalesforceClient;
  private instanceUrl?: string;
  private apiVersion = 'v57.0';

  /**
   * Get provider metadata
   */
  getMetadata(): IProviderMetadata {
    return {
      name: 'Salesforce',
      version: '1.0.0',
      author: 'Flexxus',
      description: 'Salesforce CRM integration',
      documentation_url: 'https://developer.salesforce.com/docs/apis',
      supported_entities: ['contact', 'lead', 'account', 'opportunity', 'task', 'event'],
      supported_operations: ['create', 'read', 'update', 'delete', 'list', 'sync'],
      authentication_type: 'oauth2',
      rate_limits: [
        { requests: 15000, window: 86400, scope: 'daily' },
        { requests: 25, window: 20, scope: 'concurrent' }
      ]
    };
  }

  /**
   * Validate configuration
   */
  protected validateConfig(config: IIntegrationConfig): void {
    if (!config.config.client_id || !config.config.client_secret) {
      throw new Error('Salesforce client_id and client_secret are required');
    }
    if (!config.config.instance_url) {
      throw new Error('Salesforce instance URL is required');
    }
  }

  /**
   * Establish connection
   */
  protected async establishConnection(config: IIntegrationConfig): Promise<void> {
    this.client = new MockSalesforceClient();
    this.instanceUrl = config.config.instance_url;

    if (config.config.access_token && config.config.refresh_token) {
      // OAuth connection
      await this.client.loginWithOAuth({
        instanceUrl: config.config.instance_url,
        accessToken: config.config.access_token,
        refreshToken: config.config.refresh_token,
        clientId: config.config.client_id,
        clientSecret: config.config.client_secret
      });
    } else if (config.config.username && config.config.password) {
      // Username/password connection
      await this.client.login(
        config.config.username,
        config.config.password,
        config.config.security_token || ''
      );
    } else {
      throw new Error('Invalid Salesforce credentials');
    }
  }

  /**
   * Close connection
   */
  protected async closeConnection(): Promise<void> {
    this.client = undefined;
  }

  /**
   * Test connection
   */
  protected async performConnectionTest(): Promise<IConnectionTestResult> {
    try {
      if (!this.client) {
        throw new Error('Not connected');
      }

      // Try to query a simple object
      const result = await this.client.query('SELECT Id FROM User LIMIT 1');
      
      return {
        success: true,
        message: 'Successfully connected to Salesforce',
        details: {
          instance_url: this.instanceUrl,
          api_version: this.apiVersion
        }
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to connect to Salesforce',
        error: error.message
      };
    }
  }

  /**
   * Process webhook
   */
  protected async processWebhook(payload: any, headers: Record<string, string>): Promise<void> {
    // Process Salesforce Outbound Messages or Platform Events
    const eventType = headers['x-sfdc-event-type'] || payload.event?.type;
    
    this.logger.info('Processing Salesforce webhook', { eventType });
    
    // Handle different event types
    switch (eventType) {
      case 'contact.created':
      case 'contact.updated':
        await this.handleContactChange(payload);
        break;
      case 'opportunity.created':
      case 'opportunity.updated':
        await this.handleOpportunityChange(payload);
        break;
      default:
        this.logger.warn('Unknown Salesforce event type', { eventType });
    }
  }

  /**
   * Sync contacts
   */
  protected async syncContacts(options: ISyncOptions): Promise<ISyncResult> {
    const syncId = this.generateSyncId();
    const startedAt = new Date();
    
    try {
      if (!this.client) {
        throw new Error('Not connected to Salesforce');
      }

      // Build SOQL query
      let soql = 'SELECT Id, FirstName, LastName, Email, Phone, MobilePhone, Title, Department, AccountId FROM Contact';
      
      if (options.since) {
        soql += ` WHERE LastModifiedDate >= ${options.since.toISOString()}`;
      }
      
      soql += ' LIMIT 200'; // Mock limit

      const result = await this.client.query(soql);
      
      // Process records
      const contacts: ICRMContact[] = result.records.map((record: any) => 
        this.normalizeContact(record)
      );

      return {
        success: true,
        sync_id: syncId,
        started_at: startedAt,
        completed_at: new Date(),
        records_synced: contacts.length,
        records_created: 0,
        records_updated: contacts.length,
        records_deleted: 0,
        records_failed: 0
      };
    } catch (error: any) {
      return {
        success: false,
        sync_id: syncId,
        started_at: startedAt,
        completed_at: new Date(),
        records_synced: 0,
        records_created: 0,
        records_updated: 0,
        records_deleted: 0,
        records_failed: 0,
        errors: [{
          entity_type: 'contact',
          error_code: 'SYNC_ERROR',
          error_message: error.message
        }]
      };
    }
  }

  /**
   * Sync companies (accounts)
   */
  protected async syncCompanies(options: ISyncOptions): Promise<ISyncResult> {
    const syncId = this.generateSyncId();
    const startedAt = new Date();
    
    try {
      if (!this.client) {
        throw new Error('Not connected to Salesforce');
      }

      const soql = 'SELECT Id, Name, Website, Industry, NumberOfEmployees, AnnualRevenue FROM Account LIMIT 200';
      const result = await this.client.query(soql);
      
      const companies: ICRMCompany[] = result.records.map((record: any) => 
        this.normalizeCompany(record)
      );

      return {
        success: true,
        sync_id: syncId,
        started_at: startedAt,
        completed_at: new Date(),
        records_synced: companies.length,
        records_created: 0,
        records_updated: companies.length,
        records_deleted: 0,
        records_failed: 0
      };
    } catch (error: any) {
      return {
        success: false,
        sync_id: syncId,
        started_at: startedAt,
        completed_at: new Date(),
        records_synced: 0,
        records_created: 0,
        records_updated: 0,
        records_deleted: 0,
        records_failed: 0,
        errors: [{
          entity_type: 'company',
          error_code: 'SYNC_ERROR',
          error_message: error.message
        }]
      };
    }
  }

  /**
   * Sync deals (opportunities)
   */
  protected async syncDeals(options: ISyncOptions): Promise<ISyncResult> {
    const syncId = this.generateSyncId();
    const startedAt = new Date();
    
    try {
      if (!this.client) {
        throw new Error('Not connected to Salesforce');
      }

      const soql = 'SELECT Id, Name, Amount, StageName, Probability, CloseDate, AccountId, Description FROM Opportunity LIMIT 200';
      const result = await this.client.query(soql);
      
      const deals: ICRMDeal[] = result.records.map((record: any) => 
        this.normalizeDeal(record)
      );

      return {
        success: true,
        sync_id: syncId,
        started_at: startedAt,
        completed_at: new Date(),
        records_synced: deals.length,
        records_created: 0,
        records_updated: deals.length,
        records_deleted: 0,
        records_failed: 0
      };
    } catch (error: any) {
      return {
        success: false,
        sync_id: syncId,
        started_at: startedAt,
        completed_at: new Date(),
        records_synced: 0,
        records_created: 0,
        records_updated: 0,
        records_deleted: 0,
        records_failed: 0,
        errors: [{
          entity_type: 'deal',
          error_code: 'SYNC_ERROR',
          error_message: error.message
        }]
      };
    }
  }

  /**
   * Normalize Salesforce contact to standard format
   */
  protected normalizeContact(sfContact: any): ICRMContact {
    return {
      id: sfContact.Id,
      first_name: sfContact.FirstName || '',
      last_name: sfContact.LastName || '',
      email: sfContact.Email || '',
      phone: sfContact.Phone,
      company: sfContact.AccountId,
      job_title: sfContact.Title,
      custom_fields: {
        department: sfContact.Department,
        mobile_phone: sfContact.MobilePhone
      }
    };
  }

  /**
   * Normalize Salesforce account to standard company format
   */
  protected normalizeCompany(sfAccount: any): ICRMCompany {
    return {
      id: sfAccount.Id,
      name: sfAccount.Name,
      domain: sfAccount.Website,
      industry: sfAccount.Industry,
      size: sfAccount.NumberOfEmployees,
      revenue: sfAccount.AnnualRevenue
    };
  }

  /**
   * Normalize Salesforce opportunity to standard deal format
   */
  protected normalizeDeal(sfOpportunity: any): ICRMDeal {
    return {
      id: sfOpportunity.Id,
      name: sfOpportunity.Name,
      amount: sfOpportunity.Amount || 0,
      stage: sfOpportunity.StageName,
      probability: sfOpportunity.Probability,
      close_date: sfOpportunity.CloseDate ? new Date(sfOpportunity.CloseDate) : undefined,
      company_id: sfOpportunity.AccountId,
      description: sfOpportunity.Description
    };
  }

  /**
   * Handle contact change from webhook
   */
  private async handleContactChange(payload: any): Promise<void> {
    const contact = this.normalizeContact(payload.data);
    this.emit('entity:changed', {
      entity_type: 'contact',
      entity_id: contact.id,
      data: contact
    });
  }

  /**
   * Handle opportunity change from webhook
   */
  private async handleOpportunityChange(payload: any): Promise<void> {
    const deal = this.normalizeDeal(payload.data);
    this.emit('entity:changed', {
      entity_type: 'deal',
      entity_id: deal.id,
      data: deal
    });
  }

  // CRUD implementations
  async create(entityType: string, data: any): Promise<any> {
    if (!this.client) throw new Error('Not connected');
    
    const sfData = this.denormalizeData(entityType, data);
    const result = await this.client.create(this.getSalesforceObjectType(entityType), sfData);
    return { ...data, id: result.id };
  }

  async read(entityType: string, id: string): Promise<any> {
    if (!this.client) throw new Error('Not connected');
    
    const objectType = this.getSalesforceObjectType(entityType);
    const soql = `SELECT * FROM ${objectType} WHERE Id = '${id}'`;
    const result = await this.client.query(soql);
    
    if (result.totalSize === 0) return null;
    return this.normalizeData(entityType, result.records[0]);
  }

  async update(entityType: string, id: string, data: any): Promise<any> {
    if (!this.client) throw new Error('Not connected');
    
    const sfData = { Id: id, ...this.denormalizeData(entityType, data) };
    await this.client.update(this.getSalesforceObjectType(entityType), sfData);
    return { ...data, id };
  }

  async delete(entityType: string, id: string): Promise<boolean> {
    if (!this.client) throw new Error('Not connected');
    
    const result = await this.client.delete(this.getSalesforceObjectType(entityType), id);
    return result.success;
  }

  async list(entityType: string, filters?: any): Promise<any[]> {
    if (!this.client) throw new Error('Not connected');
    
    const objectType = this.getSalesforceObjectType(entityType);
    let soql = `SELECT * FROM ${objectType}`;
    
    if (filters) {
      // Build WHERE clause from filters
      const conditions = Object.entries(filters)
        .map(([key, value]) => `${key} = '${value}'`)
        .join(' AND ');
      if (conditions) {
        soql += ` WHERE ${conditions}`;
      }
    }
    
    soql += ' LIMIT 200';
    
    const result = await this.client.query(soql);
    return result.records.map((record: any) => this.normalizeData(entityType, record));
  }

  // Contact-specific CRUD
  async createContact(contact: ICRMContact): Promise<ICRMContact> {
    return this.create('contact', contact);
  }

  async getContact(id: string): Promise<ICRMContact | null> {
    return this.read('contact', id);
  }

  async updateContact(id: string, contact: Partial<ICRMContact>): Promise<ICRMContact> {
    return this.update('contact', id, contact);
  }

  async deleteContact(id: string): Promise<boolean> {
    return this.delete('contact', id);
  }

  async listContacts(filters?: any): Promise<ICRMContact[]> {
    return this.list('contact', filters);
  }

  // Company-specific CRUD
  async createCompany(company: ICRMCompany): Promise<ICRMCompany> {
    return this.create('company', company);
  }

  async getCompany(id: string): Promise<ICRMCompany | null> {
    return this.read('company', id);
  }

  async updateCompany(id: string, company: Partial<ICRMCompany>): Promise<ICRMCompany> {
    return this.update('company', id, company);
  }

  async deleteCompany(id: string): Promise<boolean> {
    return this.delete('company', id);
  }

  async listCompanies(filters?: any): Promise<ICRMCompany[]> {
    return this.list('company', filters);
  }

  // Deal-specific CRUD
  async createDeal(deal: ICRMDeal): Promise<ICRMDeal> {
    return this.create('deal', deal);
  }

  async getDeal(id: string): Promise<ICRMDeal | null> {
    return this.read('deal', id);
  }

  async updateDeal(id: string, deal: Partial<ICRMDeal>): Promise<ICRMDeal> {
    return this.update('deal', id, deal);
  }

  async deleteDeal(id: string): Promise<boolean> {
    return this.delete('deal', id);
  }

  async listDeals(filters?: any): Promise<ICRMDeal[]> {
    return this.list('deal', filters);
  }

  /**
   * Get Salesforce object type from entity type
   */
  private getSalesforceObjectType(entityType: string): string {
    const mapping: Record<string, string> = {
      'contact': 'Contact',
      'company': 'Account',
      'deal': 'Opportunity',
      'task': 'Task',
      'event': 'Event',
      'lead': 'Lead'
    };
    return mapping[entityType] || entityType;
  }

  /**
   * Normalize data from Salesforce format
   */
  private normalizeData(entityType: string, data: any): any {
    switch (entityType) {
      case 'contact':
        return this.normalizeContact(data);
      case 'company':
        return this.normalizeCompany(data);
      case 'deal':
        return this.normalizeDeal(data);
      default:
        return data;
    }
  }

  /**
   * Denormalize data to Salesforce format
   */
  private denormalizeData(entityType: string, data: any): any {
    switch (entityType) {
      case 'contact':
        return {
          FirstName: data.first_name,
          LastName: data.last_name,
          Email: data.email,
          Phone: data.phone,
          Title: data.job_title,
          AccountId: data.company
        };
      case 'company':
        return {
          Name: data.name,
          Website: data.domain,
          Industry: data.industry,
          NumberOfEmployees: data.size,
          AnnualRevenue: data.revenue
        };
      case 'deal':
        return {
          Name: data.name,
          Amount: data.amount,
          StageName: data.stage,
          Probability: data.probability,
          CloseDate: data.close_date,
          AccountId: data.company_id,
          Description: data.description
        };
      default:
        return data;
    }
  }
}