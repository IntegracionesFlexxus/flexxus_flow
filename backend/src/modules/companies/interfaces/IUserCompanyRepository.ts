// IUserCompanyRepository Interface
// Defines the contract for user-company relationship management
export interface UserCompanyRelation {
  userId: string;
  companyId: string;
  roleId: string;
  role?: string;
  isDefault: boolean;
  status: 'active' | 'inactive' | 'pending';
  permissions?: string[];
  createdAt: Date;
  updatedAt: Date;
}
export interface CompanyWithRole {
  companyId: string;
  name: string;
  role: string;
  roleId: string;
  isDefault: boolean;
  status: string;
  joinedAt: Date;
}
export interface UserInCompany {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  roleId: string;
  joinedAt: Date;
  lastActiveAt?: Date;
}
export interface UserCompanyFilters {
  offset?: number;
  limit?: number;
  search?: string;
  roleId?: string;
  status?: string;
}
/**
 * Repository interface for managing user-company relationships
 * Follows Single Responsibility Principle - only handles user-company associations
 */
export interface IUserCompanyRepository {
  // User's companies management
  getUserCompanies(userId: string): Promise<CompanyWithRole[]>;
  getDefaultCompany(userId: string): Promise<CompanyWithRole | null>;
  setDefaultCompany(userId: string, companyId: string): Promise<void>;
  // Company's users management
  getUsersInCompany(companyId: string, filters?: UserCompanyFilters): Promise<UserInCompany[]>;
  countUsersInCompany(companyId: string, filters?: Omit<UserCompanyFilters, 'offset' | 'limit'>): Promise<number>;
  // Relationship management
  addUserToCompany(
    userId: string, 
    companyId: string, 
    roleId: string, 
    options?: {
      isDefault?: boolean;
      permissions?: string[];
    }
  ): Promise<void>;
  removeUserFromCompany(userId: string, companyId: string): Promise<void>;
  updateUserCompanyStatus(userId: string, companyId: string, status: 'active' | 'inactive' | 'pending'): Promise<void>;
  // Validation
  isUserInCompany(userId: string, companyId: string): Promise<boolean>;
  getUserCompanyRelation(userId: string, companyId: string): Promise<UserCompanyRelation | null>;
  // Role management in company context
  getUserRoleInCompany(userId: string, companyId: string): Promise<{ roleId: string; role: string } | null>;
  updateUserRoleInCompany(userId: string, companyId: string, newRoleId: string): Promise<void>;
}
