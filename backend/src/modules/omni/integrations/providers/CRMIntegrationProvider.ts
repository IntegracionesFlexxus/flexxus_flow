/**
 * CRM Integration Provider - Sprint 09
 * Base class for CRM-specific integrations
 */

import { BaseIntegrationProvider } from './BaseIntegrationProvider';
import { ISyncOptions, ISyncResult, IFieldSchema } from '../interfaces/IIntegration';

export interface ICRMContact {
  id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  job_title?: string;
  website?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
  };
  custom_fields?: Record<string, any>;
  created_at?: Date;
  updated_at?: Date;
}

export interface ICRMCompany {
  id?: string;
  name: string;
  domain?: string;
  industry?: string;
  size?: number;
  revenue?: number;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
  };
  custom_fields?: Record<string, any>;
  created_at?: Date;
  updated_at?: Date;
}

export interface ICRMDeal {
  id?: string;
  name: string;
  amount: number;
  stage: string;
  probability?: number;
  close_date?: Date;
  contact_id?: string;
  company_id?: string;
  owner_id?: string;
  description?: string;
  custom_fields?: Record<string, any>;
  created_at?: Date;
  updated_at?: Date;
}

export abstract class CRMIntegrationProvider extends BaseIntegrationProvider {
  protected supportedEntities = ['contact', 'company', 'deal', 'task', 'note'];

  /**
   * Get supported entities
   */
  getSupportedEntities(): string[] {
    return this.supportedEntities;
  }

  /**
   * Sync CRM entity
   */
  async syncEntity(entityType: string, options: ISyncOptions): Promise<ISyncResult> {
    const syncId = this.generateSyncId();
    const startedAt = new Date();

    try {
      switch (entityType) {
        case 'contact':
          return await this.syncContacts(options);
        case 'company':
          return await this.syncCompanies(options);
        case 'deal':
          return await this.syncDeals(options);
        default:
          throw new Error(`Unsupported entity type: ${entityType}`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to sync ${entityType}`, error);
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
          entity_type: entityType,
          error_code: 'SYNC_ERROR',
          error_message: error.message
        }]
      };
    }
  }

  /**
   * Get field schema for entity
   */
  async getFieldSchema(entityType: string): Promise<IFieldSchema[]> {
    switch (entityType) {
      case 'contact':
        return this.getContactFieldSchema();
      case 'company':
        return this.getCompanyFieldSchema();
      case 'deal':
        return this.getDealFieldSchema();
      default:
        return [];
    }
  }

  /**
   * Get contact field schema
   */
  protected getContactFieldSchema(): IFieldSchema[] {
    return [
      {
        name: 'first_name',
        type: 'string',
        label: 'First Name',
        required: true,
        readonly: false,
        max_length: 100
      },
      {
        name: 'last_name',
        type: 'string',
        label: 'Last Name',
        required: true,
        readonly: false,
        max_length: 100
      },
      {
        name: 'email',
        type: 'string',
        label: 'Email',
        required: true,
        readonly: false,
        pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
      },
      {
        name: 'phone',
        type: 'string',
        label: 'Phone',
        required: false,
        readonly: false
      },
      {
        name: 'company',
        type: 'string',
        label: 'Company',
        required: false,
        readonly: false
      },
      {
        name: 'job_title',
        type: 'string',
        label: 'Job Title',
        required: false,
        readonly: false
      }
    ];
  }

  /**
   * Get company field schema
   */
  protected getCompanyFieldSchema(): IFieldSchema[] {
    return [
      {
        name: 'name',
        type: 'string',
        label: 'Company Name',
        required: true,
        readonly: false,
        max_length: 200
      },
      {
        name: 'domain',
        type: 'string',
        label: 'Website Domain',
        required: false,
        readonly: false
      },
      {
        name: 'industry',
        type: 'string',
        label: 'Industry',
        required: false,
        readonly: false
      },
      {
        name: 'size',
        type: 'number',
        label: 'Company Size',
        required: false,
        readonly: false
      },
      {
        name: 'revenue',
        type: 'number',
        label: 'Annual Revenue',
        required: false,
        readonly: false
      }
    ];
  }

  /**
   * Get deal field schema
   */
  protected getDealFieldSchema(): IFieldSchema[] {
    return [
      {
        name: 'name',
        type: 'string',
        label: 'Deal Name',
        required: true,
        readonly: false,
        max_length: 200
      },
      {
        name: 'amount',
        type: 'number',
        label: 'Deal Amount',
        required: true,
        readonly: false
      },
      {
        name: 'stage',
        type: 'string',
        label: 'Deal Stage',
        required: true,
        readonly: false
      },
      {
        name: 'probability',
        type: 'number',
        label: 'Win Probability',
        required: false,
        readonly: false
      },
      {
        name: 'close_date',
        type: 'date',
        label: 'Expected Close Date',
        required: false,
        readonly: false
      }
    ];
  }

  /**
   * Normalize contact data from external format
   */
  protected normalizeContact(externalContact: any): ICRMContact {
    // Override in specific providers
    return externalContact;
  }

  /**
   * Normalize company data from external format
   */
  protected normalizeCompany(externalCompany: any): ICRMCompany {
    // Override in specific providers
    return externalCompany;
  }

  /**
   * Normalize deal data from external format
   */
  protected normalizeDeal(externalDeal: any): ICRMDeal {
    // Override in specific providers
    return externalDeal;
  }

  // Abstract methods for specific CRM operations
  protected abstract syncContacts(options: ISyncOptions): Promise<ISyncResult>;
  protected abstract syncCompanies(options: ISyncOptions): Promise<ISyncResult>;
  protected abstract syncDeals(options: ISyncOptions): Promise<ISyncResult>;

  // CRUD operations for contacts
  abstract createContact(contact: ICRMContact): Promise<ICRMContact>;
  abstract getContact(id: string): Promise<ICRMContact | null>;
  abstract updateContact(id: string, contact: Partial<ICRMContact>): Promise<ICRMContact>;
  abstract deleteContact(id: string): Promise<boolean>;
  abstract listContacts(filters?: any): Promise<ICRMContact[]>;

  // CRUD operations for companies
  abstract createCompany(company: ICRMCompany): Promise<ICRMCompany>;
  abstract getCompany(id: string): Promise<ICRMCompany | null>;
  abstract updateCompany(id: string, company: Partial<ICRMCompany>): Promise<ICRMCompany>;
  abstract deleteCompany(id: string): Promise<boolean>;
  abstract listCompanies(filters?: any): Promise<ICRMCompany[]>;

  // CRUD operations for deals
  abstract createDeal(deal: ICRMDeal): Promise<ICRMDeal>;
  abstract getDeal(id: string): Promise<ICRMDeal | null>;
  abstract updateDeal(id: string, deal: Partial<ICRMDeal>): Promise<ICRMDeal>;
  abstract deleteDeal(id: string): Promise<boolean>;
  abstract listDeals(filters?: any): Promise<ICRMDeal[]>;
}