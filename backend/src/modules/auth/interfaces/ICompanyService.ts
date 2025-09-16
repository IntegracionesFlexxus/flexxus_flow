// Company Service Interface - Sprint 1

import { Company, UserCompany } from '../types/auth.types';

export interface ICompanyService {
  getCompanyById(id: string): Promise<Company | null>;
  createCompany(data: Partial<Company>, ownerId: string): Promise<Company>;
  updateCompany(id: string, data: Partial<Company>): Promise<Company | null>;
  deleteCompany(id: string): Promise<boolean>;
  getAllCompanies(limit?: number, offset?: number): Promise<Company[]>;
  
  // User-Company management
  addUserToCompany(userId: string, companyId: string, role: string): Promise<UserCompany>;
  removeUserFromCompany(userId: string, companyId: string): Promise<boolean>;
  getUserCompanies(userId: string): Promise<UserCompany[]>;
  getCompanyUsers(companyId: string): Promise<UserCompany[]>;
  switchUserCompany(userId: string, companyId: string): Promise<UserCompany>;
  updateUserRole(userId: string, companyId: string, newRole: string): Promise<UserCompany>;
}