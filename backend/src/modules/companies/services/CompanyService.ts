// Company Service Implementation - Sprint 1 con principios Nivel 2
// Aplicando SOLID: Single Responsibility, Dependency Injection

import { injectable, inject } from 'inversify';
import { ICompanyService } from '@/modules/companies/interfaces/ICompanyService';
import { ICompanyRepository } from '@/shared/interfaces/repositories/ICompanyRepository';
import { Company, UserCompany } from '@/modules/companies/types/auth.types';
import { TYPES } from '@/container/types';
import winston from 'winston';

/**
 * CompanyService - Gesti�n de empresas y relaciones usuario-empresa
 * Principio SOLID: Single Responsibility - Solo gestiona l�gica de negocio de empresas
 */
@injectable()
export class CompanyService implements ICompanyService {
  constructor(
    @inject(TYPES.CompanyRepository) private companyRepository: ICompanyRepository,
    @inject(TYPES.Logger) private logger: winston.Logger
  ) {}

  /**
   * Obtener empresa por ID
   * Clean Code: Funci�n peque�a con una sola responsabilidad
   */
  async getCompanyById(id: string): Promise<Company | null> {
    try {
      this.validateId(id);
      return await this.companyRepository.findById(id);
    } catch (error) {
      this.logger.error('Error getting company by id:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Crear nueva empresa con owner inicial
   * Patr�n: Transaction Script para operaci�n compleja
   */
  async createCompany(data: Partial<Company>, ownerId: string): Promise<Company> {
    try {
      this.validateCompanyData(data);
      this.validateId(ownerId, 'Owner ID');

      // Crear empresa con valores por defecto
      const companyData: Partial<Company> = {
        ...this.getDefaultCompanyValues(),
        ...data,
        status: 'active'
      };

      // Crear empresa
      const company = await this.companyRepository.create(companyData);

      // Agregar owner como admin
      await this.companyRepository.addUserToCompany(
        ownerId, 
        company.id, 
        'admin'
      );

      // Establecer como empresa por defecto para el owner
      await this.companyRepository.setDefaultCompany(ownerId, company.id);

      this.logger.info(`Company ${company.id} created with owner ${ownerId}`);
      return company;
    } catch (error) {
      this.logger.error('Error creating company:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Actualizar datos de empresa
   * Clean Code: Validaci�n clara y manejo de errores consistente
   */
  async updateCompany(id: string, data: Partial<Company>): Promise<Company | null> {
    try {
      this.validateId(id);

      // Remover campos que no deben actualizarse
      const sanitizedData = this.sanitizeCompanyUpdateData(data);

      const updated = await this.companyRepository.update(id, sanitizedData);
      if (updated) {
        this.logger.info(`Company ${id} updated`);
      }

      return updated;
    } catch (error) {
      this.logger.error('Error updating company:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Eliminar empresa (soft delete)
   * Principio: Fail-safe - solo soft delete para evitar p�rdida de datos
   */
  async deleteCompany(id: string): Promise<boolean> {
    try {
      this.validateId(id);

      // Verificar que no hay usuarios activos
      const users = await this.companyRepository.getCompanyUsers(id);
      if (users.length > 0) {
        throw new Error('Cannot delete company with active users');
      }

      const deleted = await this.companyRepository.delete(id);
      if (deleted) {
        this.logger.info(`Company ${id} deleted`);
      }

      return deleted;
    } catch (error) {
      this.logger.error('Error deleting company:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Obtener todas las empresas con paginaci�n
   * Clean Code: Par�metros con valores por defecto claros
   */
  async getAllCompanies(limit: number = 10, offset: number = 0): Promise<Company[]> {
    try {
      this.validatePaginationParams(limit, offset);
      return await this.companyRepository.findAll(limit, offset);
    } catch (error) {
      this.logger.error('Error getting all companies:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Agregar usuario a empresa con rol espec�fico
   * Patr�n: Command pattern impl�cito para operaci�n de negocio
   */
  async addUserToCompany(
    userId: string, 
    companyId: string, 
    role: string
  ): Promise<UserCompany> {
    try {
      this.validateId(userId, 'User ID');
      this.validateId(companyId, 'Company ID');
      this.validateRole(role);

      // Verificar que la empresa existe y est� activa
      const company = await this.companyRepository.findById(companyId);
      if (!company) {
        throw new Error('Company not found');
      }
      if (company.status !== 'active') {
        throw new Error('Company is not active');
      }

      // Verificar que el usuario no est� ya en la empresa
      const existing = await this.companyRepository.getUserCompany(userId, companyId);
      if (existing && !existing.deleted_at) {
        throw new Error('User already belongs to this company');
      }

      const userCompany = await this.companyRepository.addUserToCompany(
        userId, 
        companyId, 
        role
      );

      this.logger.info(`User ${userId} added to company ${companyId} with role ${role}`);
      return userCompany;
    } catch (error) {
      this.logger.error('Error adding user to company:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Remover usuario de empresa
   * Clean Code: Funci�n con verificaciones claras
   */
  async removeUserFromCompany(userId: string, companyId: string): Promise<boolean> {
    try {
      this.validateId(userId, 'User ID');
      this.validateId(companyId, 'Company ID');

      // Verificar que no es el �ltimo admin
      const companyUsers = await this.companyRepository.getCompanyUsers(companyId);
      const admins = companyUsers.filter(uc => uc.role === 'admin' && !uc.deleted_at);

      if (admins.length === 1 && admins[0].user_id === userId) {
        throw new Error('Cannot remove the last admin from company');
      }

      const removed = await this.companyRepository.removeUserFromCompany(userId, companyId);
      if (removed) {
        this.logger.info(`User ${userId} removed from company ${companyId}`);
      }

      return removed;
    } catch (error) {
      this.logger.error('Error removing user from company:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Obtener empresas de un usuario
   * Clean Code: Nombre descriptivo y funci�n simple
   */
  async getUserCompanies(userId: string): Promise<UserCompany[]> {
    try {
      this.validateId(userId, 'User ID');
      return await this.companyRepository.getUserCompanies(userId);
    } catch (error) {
      this.logger.error('Error getting user companies:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Obtener usuarios de una empresa
   */
  async getCompanyUsers(companyId: string): Promise<UserCompany[]> {
    try {
      this.validateId(companyId, 'Company ID');
      return await this.companyRepository.getCompanyUsers(companyId);
    } catch (error) {
      this.logger.error('Error getting company users:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Cambiar empresa activa del usuario
   * Patr�n: State change con validaciones
   */
  async switchUserCompany(userId: string, companyId: string): Promise<UserCompany> {
    try {
      this.validateId(userId, 'User ID');
      this.validateId(companyId, 'Company ID');

      // Verificar que el usuario pertenece a la empresa
      const userCompany = await this.companyRepository.getUserCompany(userId, companyId);
      if (!userCompany || userCompany.deleted_at) {
        throw new Error('User does not belong to this company');
      }

      // Establecer como empresa por defecto
      await this.companyRepository.setDefaultCompany(userId, companyId);

      this.logger.info(`User ${userId} switched to company ${companyId}`);
      return userCompany;
    } catch (error) {
      this.logger.error('Error switching user company:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Actualizar rol de usuario en empresa
   * Clean Code: Funci�n enfocada en una sola tarea
   */
  async updateUserRole(
    userId: string, 
    companyId: string, 
    newRole: string
  ): Promise<UserCompany> {
    try {
      this.validateId(userId, 'User ID');
      this.validateId(companyId, 'Company ID');
      this.validateRole(newRole);

      // Obtener relaci�n actual
      const userCompany = await this.companyRepository.getUserCompany(userId, companyId);
      if (!userCompany || userCompany.deleted_at) {
        throw new Error('User does not belong to this company');
      }

      // Verificar que no se est� removiendo el �ltimo admin
      if (userCompany.role === 'admin' && newRole !== 'admin') {
        const admins = await this.companyRepository.getCompanyUsers(companyId);
        const activeAdmins = admins.filter(
          uc => uc.role === 'admin' && !uc.deleted_at
        );

        if (activeAdmins.length === 1) {
          throw new Error('Cannot change role of the last admin');
        }
      }

      // Actualizar rol
      const updated = await this.companyRepository.addUserToCompany(
        userId, 
        companyId, 
        newRole
      );

      this.logger.info(`User ${userId} role updated to ${newRole} in company ${companyId}`);
      return updated;
    } catch (error) {
      this.logger.error('Error updating user role:', error);
      throw this.handleError(error);
    }
  }

  // ========== M�todos privados de utilidad (Clean Code) ==========

  /**
   * Validar ID UUID
   * DRY: Reutilizable para cualquier validaci�n de ID
   */
  private validateId(id: string, fieldName: string = 'ID'): void {
    if (!id || typeof id !== 'string') {
      throw new Error(`${fieldName} is required`);
    }
    // Validaci�n b�sica de formato UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new Error(`Invalid ${fieldName} format`);
    }
  }

  /**
   * Validar datos de empresa
   */
  private validateCompanyData(data: Partial<Company>): void {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Company name is required');
    }
    if (data.name.length > 255) {
      throw new Error('Company name is too long');
    }
  }

  /**
   * Validar rol de usuario
   */
  private validateRole(role: string): void {
    const validRoles = ['admin', 'manager', 'sales_rep', 'agent', 'viewer'];
    if (!validRoles.includes(role)) {
      throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }
  }

  /**
   * Validar par�metros de paginaci�n
   */
  private validatePaginationParams(limit: number, offset: number): void {
    if (limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }
    if (offset < 0) {
      throw new Error('Offset must be non-negative');
    }
  }

  /**
   * Obtener valores por defecto para nueva empresa
   * Patr�n: Factory method para valores por defecto
   */
  private getDefaultCompanyValues(): Partial<Company> {
    return {
      plan: 'basic',
      status: 'active',
      settings: {
        timezone: 'America/Argentina/Buenos_Aires',
        language: 'es',
        currency: 'ARS'
      }
    };
  }

  /**
   * Sanitizar datos de actualizaci�n
   * Seguridad: Remover campos que no deben ser actualizados
   */
  private sanitizeCompanyUpdateData(data: Partial<Company>): Partial<Company> {
    const sanitized = { ...data };

    // Remover campos inmutables
    delete sanitized.id;
    delete sanitized.created_at;
    delete sanitized.deleted_at;

    return sanitized;
  }

  /**
   * Manejo centralizado de errores
   * Clean Code: DRY para manejo de errores
   */
  private handleError(error: any): Error {
    if (error instanceof Error) {
      return error;
    }
    return new Error('An unexpected error occurred');
  }
}
