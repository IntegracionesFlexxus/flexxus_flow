/**
 * Company Test Data Builder
 * Sprint 4 - Builder pattern para datos de empresa en tests
 */
import { v4 as uuidv4 } from 'uuid';
export interface TestCompany {
  id: string;
  name: string;
  tax_id: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country: string;
  postal_code?: string;
  website?: string;
  industry?: string;
  size?: 'small' | 'medium' | 'large' | 'enterprise';
  is_active: boolean;
  settings?: Record<string, any>;
  features?: string[];
  subscription_tier?: 'free' | 'basic' | 'pro' | 'enterprise';
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}
export class CompanyBuilder {
  private company: TestCompany;
  constructor() {
    const now = new Date();
    this.company = {
      id: uuidv4(),
      name: `Test Company ${Date.now()}`,
      tax_id: `TAX${Date.now()}`,
      email: `company_${Date.now()}@test.com`,
      phone: '+1234567890',
      address: '123 Test Street',
      city: 'Test City',
      state: 'TS',
      country: 'Test Country',
      postal_code: '12345',
      website: 'https://testcompany.com',
      industry: 'Technology',
      size: 'medium',
      is_active: true,
      settings: {},
      features: [],
      subscription_tier: 'basic',
      created_at: now,
      updated_at: now,
      deleted_at: null
    };
  }
  withId(id: string): CompanyBuilder {
    this.company.id = id;
    return this;
  }
  withName(name: string): CompanyBuilder {
    this.company.name = name;
    return this;
  }
  withTaxId(taxId: string): CompanyBuilder {
    this.company.tax_id = taxId;
    return this;
  }
  withEmail(email: string): CompanyBuilder {
    this.company.email = email;
    return this;
  }
  withPhone(phone: string): CompanyBuilder {
    this.company.phone = phone;
    return this;
  }
  withAddress(address: string, city: string, state: string, postalCode: string): CompanyBuilder {
    this.company.address = address;
    this.company.city = city;
    this.company.state = state;
    this.company.postal_code = postalCode;
    return this;
  }
  withCountry(country: string): CompanyBuilder {
    this.company.country = country;
    return this;
  }
  withWebsite(website: string): CompanyBuilder {
    this.company.website = website;
    return this;
  }
  withIndustry(industry: string): CompanyBuilder {
    this.company.industry = industry;
    return this;
  }
  withSize(size: 'small' | 'medium' | 'large' | 'enterprise'): CompanyBuilder {
    this.company.size = size;
    return this;
  }
  withSubscription(tier: 'free' | 'basic' | 'pro' | 'enterprise'): CompanyBuilder {
    this.company.subscription_tier = tier;
    return this;
  }
  withSettings(settings: Record<string, any>): CompanyBuilder {
    this.company.settings = settings;
    return this;
  }
  withFeatures(...features: string[]): CompanyBuilder {
    this.company.features = features;
    return this;
  }
  asActive(): CompanyBuilder {
    this.company.is_active = true;
    return this;
  }
  asInactive(): CompanyBuilder {
    this.company.is_active = false;
    return this;
  }
  asDeleted(): CompanyBuilder {
    this.company.deleted_at = new Date();
    return this;
  }
  withCreatedAt(date: Date): CompanyBuilder {
    this.company.created_at = date;
    return this;
  }
  withUpdatedAt(date: Date): CompanyBuilder {
    this.company.updated_at = date;
    return this;
  }
  build(): TestCompany {
    return { ...this.company };
  }
  // Preset builders for common test scenarios
  static startup(): CompanyBuilder {
    return new CompanyBuilder()
      .withName('Startup Inc')
      .withSize('small')
      .withSubscription('free')
      .withIndustry('Technology')
      .withFeatures('basic_reports', 'user_management');
  }
  static enterprise(): CompanyBuilder {
    return new CompanyBuilder()
      .withName('Enterprise Corp')
      .withSize('enterprise')
      .withSubscription('enterprise')
      .withIndustry('Finance')
      .withFeatures(
        'advanced_reports',
        'user_management',
        'api_access',
        'white_label',
        'custom_integrations',
        'priority_support'
      )
      .withSettings({
        sso_enabled: true,
        custom_domain: 'enterprise.example.com',
        api_rate_limit: 10000
      });
  }
  static inactive(): CompanyBuilder {
    return new CompanyBuilder()
      .withName('Inactive Company')
      .asInactive()
      .withSubscription('free');
  }
  static deleted(): CompanyBuilder {
    return new CompanyBuilder()
      .withName('Deleted Company')
      .asDeleted();
  }
  static withFullDetails(): CompanyBuilder {
    return new CompanyBuilder()
      .withName('Full Details Company')
      .withTaxId('12-3456789')
      .withEmail('contact@fullcompany.com')
      .withPhone('+1 555 123 4567')
      .withAddress('456 Business Ave', 'Business City', 'BC', '54321')
      .withCountry('United States')
      .withWebsite('https://fullcompany.com')
      .withIndustry('Software')
      .withSize('large')
      .withSubscription('pro')
      .withFeatures('all_features')
      .withSettings({
        timezone: 'America/New_York',
        language: 'en',
        currency: 'USD',
        fiscal_year_start: 'January'
      });
  }
  // Bulk creation helpers
  static createMany(count: number, customizer?: (builder: CompanyBuilder, index: number) => CompanyBuilder): TestCompany[] {
    const companies: TestCompany[] = [];
    for (let i = 0; i < count; i++) {
      let builder = new CompanyBuilder()
        .withName(`Company ${i}`)
        .withEmail(`company_${i}@test.com`)
        .withTaxId(`TAX${i}`);
      if (customizer) {
        builder = customizer(builder, i);
      }
      companies.push(builder.build());
    }
    return companies;
  }
  static createWithUsers(userCount: number = 5): { company: TestCompany; userIds: string[] } {
    const company = new CompanyBuilder().build();
    const userIds: string[] = [];
    for (let i = 0; i < userCount; i++) {
      userIds.push(uuidv4());
    }
    return { company, userIds };
  }
}
