/**
 * Company Service - Sprint 2 & 3
 * Servicio para gestión de empresas y switching multi-empresa
 * Siguiendo principios SOLID del Nivel 2
 */

import { api } from '@/shared/services/api';
import { tokenService } from '@/shared/services/tokenService';
import { useAuthStore } from '@/shared/store/authStore';
import { toast } from 'sonner';

// Types
export interface Company {
  id: string;
  name: string;
  logo?: string;
  plan: string;
  role: string;
  permissions?: string[];
  isDefault: boolean;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  settings?: CompanySettings;
}

export interface CompanySettings {
  timezone: string;
  language: string;
  currency: string;
  dateFormat: string;
  features: Record<string, boolean>;
  modules: {
    omni: boolean;
    crm: boolean;
    workflow: boolean;
    analytics: boolean;
  };
}

export interface SwitchCompanyRequest {
  companyId: string;
  reason?: string;
}

export interface SwitchCompanyResponse {
  success: boolean;
  data: {
    user: any;
    company: Company;
    accessToken: string;
    expiresIn: number;
    permissions: string[];
    sessionId: string;
  };
}

export interface CompanyListResponse {
  success: boolean;
  data: Company[];
}

export interface CreateCompanyRequest {
  name: string;
  industry?: string;
  size?: string;
  website?: string;
  phone?: string;
}

export interface UpdateCompanyRequest {
  name?: string;
  logo?: string;
  settings?: Partial<CompanySettings>;
}

/**
 * Company Management Service
 * Responsabilidad única: Gestión de empresas y switching
 */
class CompanyService {
  private readonly baseEndpoint = '/auth';
  private switchingInProgress = false;

  /**
   * Get user's companies
   * Obtiene lista de empresas asociadas al usuario
   */
  async getUserCompanies(): Promise<Company[]> {
    try {
      const response = await api.get<CompanyListResponse>(
        `${this.baseEndpoint}/companies`,
        {
          headers: tokenService.getAuthHeaders()
        }
      );

      // Debug en desarrollo
      if (import.meta.env.DEV) {
        console.log('[CompanyService] Response:', response.data);
      }

      // Manejar diferentes formatos de respuesta
      if (response.data?.success && response.data.data) {
        return Array.isArray(response.data.data) ? response.data.data : [];
      }

      // Si la respuesta es directamente un array
      if (Array.isArray(response.data)) {
        return response.data;
      }

      console.warn('[CompanyService] Unexpected response format:', response.data);
      return [];
    } catch (error) {
      console.error('[CompanyService] Error fetching companies:', error);
      throw this.handleError(error, 'fetch companies');
    }
  }

  /**
   * Switch active company
   * Cambia la empresa activa del usuario
   */
  async switchCompany(request: SwitchCompanyRequest): Promise<SwitchCompanyResponse> {
    // Prevent multiple simultaneous switch requests
    if (this.switchingInProgress) {
      throw new Error('Company switch already in progress');
    }

    this.switchingInProgress = true;

    try {
      // Show loading notification
      const loadingToast = toast.loading('Switching company...');

      const response = await api.post<SwitchCompanyResponse>(
        `${this.baseEndpoint}/switch-company`,
        request,
        {
          headers: tokenService.getAuthHeaders()
        }
      );

      if (!response.data.success) {
        throw new Error('Failed to switch company');
      }

      const { accessToken, expiresIn, company, permissions, sessionId } = response.data.data;

      // Update tokens
      tokenService.storeTokens(accessToken, undefined, expiresIn);

      // Update local storage
      localStorage.setItem('company_id', company.id);
      localStorage.setItem('company', JSON.stringify(company));
      localStorage.setItem('permissions', JSON.stringify(permissions));
      localStorage.setItem('sessionId', sessionId);

      // Update auth store
      useAuthStore.getState().setCompany(company);
      useAuthStore.getState().setPermissions(permissions);

      // Dismiss loading and show success
      toast.dismiss(loadingToast);
      toast.success(`Switched to ${company.name}`);

      // Trigger app-wide refresh event
      window.dispatchEvent(new CustomEvent('company-switched', { 
        detail: { company } 
      }));

      return response.data;
    } catch (error) {
      console.error('[CompanyService] Error switching company:', error);
      toast.error('Failed to switch company');
      throw this.handleError(error, 'switch company');
    } finally {
      this.switchingInProgress = false;
    }
  }

  /**
   * Get current company
   * Obtiene la empresa actualmente seleccionada
   */
  getCurrentCompany(): Company | null {
    const companyStr = localStorage.getItem('company');
    if (!companyStr) return null;

    try {
      return JSON.parse(companyStr);
    } catch {
      return null;
    }
  }

  /**
   * Set default company
   * Establece una empresa como predeterminada
   */
  async setDefaultCompany(companyId: string): Promise<void> {
    try {
      await api.put(
        `${this.baseEndpoint}/companies/${companyId}/default`,
        {},
        {
          headers: tokenService.getAuthHeaders()
        }
      );

      toast.success('Default company updated');
    } catch (error) {
      console.error('[CompanyService] Error setting default company:', error);
      throw this.handleError(error, 'set default company');
    }
  }

  /**
   * Create new company
   * Crea una nueva empresa
   */
  async createCompany(request: CreateCompanyRequest): Promise<Company> {
    try {
      const response = await api.post<{ success: boolean; data: Company }>(
        '/api/v1/companies',
        request,
        {
          headers: tokenService.getAuthHeaders()
        }
      );

      if (!response.data.success) {
        throw new Error('Failed to create company');
      }

      toast.success(`Company "${request.name}" created successfully`);
      return response.data.data;
    } catch (error) {
      console.error('[CompanyService] Error creating company:', error);
      throw this.handleError(error, 'create company');
    }
  }

  /**
   * Update company settings
   * Actualiza configuración de la empresa
   */
  async updateCompany(companyId: string, request: UpdateCompanyRequest): Promise<Company> {
    try {
      const response = await api.put<{ success: boolean; data: Company }>(
        `/api/companies/${companyId}`,
        request,
        {
          headers: tokenService.getAuthHeaders()
        }
      );

      if (!response.data.success) {
        throw new Error('Failed to update company');
      }

      // Update local storage if it's the current company
      const currentCompany = this.getCurrentCompany();
      if (currentCompany?.id === companyId) {
        const updatedCompany = response.data.data;
        localStorage.setItem('company', JSON.stringify(updatedCompany));
        useAuthStore.getState().setCompany(updatedCompany);
      }

      toast.success('Company updated successfully');
      return response.data.data;
    } catch (error) {
      console.error('[CompanyService] Error updating company:', error);
      throw this.handleError(error, 'update company');
    }
  }

  /**
   * Leave company
   * Abandona una empresa
   */
  async leaveCompany(companyId: string): Promise<void> {
    try {
      await api.delete(
        `/api/companies/${companyId}/leave`,
        {
          headers: tokenService.getAuthHeaders()
        }
      );

      // If leaving current company, switch to another
      const currentCompany = this.getCurrentCompany();
      if (currentCompany?.id === companyId) {
        const companies = await this.getUserCompanies();
        const remainingCompanies = companies.filter(c => c.id !== companyId);
        
        if (remainingCompanies.length > 0) {
          await this.switchCompany({ companyId: remainingCompanies[0].id });
        } else {
          // No more companies, clear auth
          useAuthStore.getState().logout();
          window.location.href = '/auth/login';
        }
      }

      toast.success('Left company successfully');
    } catch (error) {
      console.error('[CompanyService] Error leaving company:', error);
      throw this.handleError(error, 'leave company');
    }
  }

  /**
   * Check if user can switch companies
   * Verifica si el usuario puede cambiar de empresa
   */
  async canSwitchCompanies(): Promise<boolean> {
    try {
      const companies = await this.getUserCompanies();
      return companies.length > 1;
    } catch {
      return false;
    }
  }

  /**
   * Get company by ID
   * Obtiene información de una empresa específica
   */
  async getCompany(companyId: string): Promise<Company> {
    try {
      const response = await api.get<{ success: boolean; data: Company }>(
        `/api/companies/${companyId}`,
        {
          headers: tokenService.getAuthHeaders()
        }
      );

      if (!response.data.success) {
        throw new Error('Failed to fetch company');
      }

      return response.data.data;
    } catch (error) {
      console.error('[CompanyService] Error fetching company:', error);
      throw this.handleError(error, 'fetch company');
    }
  }

  /**
   * Clear company data from local storage
   * Limpia datos de empresa del almacenamiento local
   */
  clearCompanyData(): void {
    localStorage.removeItem('company_id');
    localStorage.removeItem('company');
    localStorage.removeItem('permissions');
    useAuthStore.getState().setCompany(null);
    useAuthStore.getState().setPermissions([]);
  }

  /**
   * Handle service errors
   * Manejo consistente de errores
   */
  private handleError(error: any, operation: string): Error {
    let errorMessage = `Error in ${operation}`;
    
    if (error.response) {
      const data = error.response.data;
      errorMessage = data?.error || data?.message || `HTTP ${error.response.status} error in ${operation}`;
    } else if (error.request) {
      errorMessage = `Network error in ${operation}`;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return new Error(errorMessage);
  }
}

// Singleton instance
export const companyService = new CompanyService();

export default companyService;