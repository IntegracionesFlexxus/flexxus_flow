/**
 * Company Data Provider
 * Provides company data from the shared database for cross-database enrichment
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { CompanyRepository } from '@/modules/auth/repositories/CompanyRepository';
import { CompanyBasicInfo } from '@/shared/types/cross-database.types';
import { Logger } from 'winston';

/**
 * Provider for fetching company data from the shared database
 */
@injectable()
export class CompanyDataProvider {
  constructor(
    @inject(TYPES.CompanyRepository) private companyRepository: CompanyRepository,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  /**
   * Fetch companies by IDs from shared database
   * @param ids Array of company IDs (UUIDs) to fetch
   * @returns Array of companies with basic information
   */
  async fetchCompaniesByIds(ids: string[]): Promise<CompanyBasicInfo[]> {
    if (ids.length === 0) return [];

    try {
      // Use the batch method we added to CompanyRepository
      const companies = await this.companyRepository.findBasicInfoByIds(ids);

      // Transform to CompanyBasicInfo if needed
      return companies.map(company => ({
        id: company.id,
        name: company.name,
        industry: company.industry,
        size: company.size,
        status: company.status
      }));
    } catch (error) {
      this.logger.error('Error fetching companies by IDs', {
        error,
        ids,
        count: ids.length
      });
      return [];
    }
  }

  /**
   * Fetch all active company IDs for cache preloading
   * @param limit Maximum number of company IDs to return
   * @returns Array of active company IDs
   */
  async fetchActiveCompanyIds(limit: number = 500): Promise<string[]> {
    try {
      return await this.companyRepository.getActiveCompanyIds(limit);
    } catch (error) {
      this.logger.error('Error fetching active company IDs', { error, limit });
      return [];
    }
  }

  /**
   * Fetch a single company by ID
   * @param id Company ID (UUID) to fetch
   * @returns Company basic info or null if not found
   */
  async fetchCompanyById(id: string): Promise<CompanyBasicInfo | null> {
    try {
      const companies = await this.fetchCompaniesByIds([id]);
      return companies[0] || null;
    } catch (error) {
      this.logger.error('Error fetching company by ID', { error, id });
      return null;
    }
  }

  /**
   * Check if company exists
   * @param id Company ID (UUID) to check
   * @returns True if company exists
   */
  async companyExists(id: string): Promise<boolean> {
    try {
      const company = await this.fetchCompanyById(id);
      return company !== null;
    } catch (error) {
      this.logger.error('Error checking if company exists', { error, id });
      return false;
    }
  }
}