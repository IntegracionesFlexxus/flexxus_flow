// Company Repository Interface - Sprint 1

import { Company, UserCompany } from '../types/auth.types';

export interface ICompanyRepository {
  findById(id: string): Promise<Company | null>;
  findByTaxId(taxId: string): Promise<Company | null>;
  create(data: Partial<Company>): Promise<Company>;
  update(id: string, data: Partial<Company>): Promise<Company | null>;
  delete(id: string): Promise<boolean>;
  findAll(limit?: number, offset?: number): Promise<Company[]>;
  
  // User-Company relationships
  addUserToCompany(userId: string, companyId: string, role: string): Promise<UserCompany>;
  removeUserFromCompany(userId: string, companyId: string): Promise<boolean>;
  getUserCompanies(userId: string): Promise<UserCompany[]>;
  getCompanyUsers(companyId: string): Promise<UserCompany[]>;
  setDefaultCompany(userId: string, companyId: string): Promise<void>;
  getUserCompany(userId: string, companyId: string): Promise<UserCompany | null>;
}