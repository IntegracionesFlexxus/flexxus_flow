const BaseRepository = require('./BaseRepository');
const connectionManager = require('../connections/ConnectionManager');

// Repositorio específico para empresas
class CompanyRepository extends BaseRepository {
  constructor() {
    // Usar la conexión 'shared' para empresas
    const connection = connectionManager.getConnection('shared');
    super(connection, 'companies');
  }

  // Buscar empresa por código
  async findByCode(code) {
    return await this.findOneBy('company_code', code);
  }

  // Buscar empresa por nombre
  async findByName(name) {
    return await this.findOneBy('name', name);
  }

  // Buscar empresas activas
  async findActiveCompanies() {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE is_active = true 
        AND deleted_at IS NULL
      ORDER BY name ASC
    `;
    
    return await this.rawQuery(query);
  }

  // Crear empresa con validación
  async createCompany(companyData) {
    // Verificar si el código ya existe
    if (companyData.company_code) {
      const existingCode = await this.exists('company_code', companyData.company_code);
      if (existingCode) {
        throw new Error('Código de empresa ya existe');
      }
    }

    // Agregar campos por defecto
    const company = {
      ...companyData,
      is_active: true,
      subscription_status: 'trial',
      user_limit: 10
    };

    return await this.create(company);
  }

  // Obtener empresa con sus usuarios
  async getCompanyWithUsers(companyId) {
    const company = await this.findById(companyId);
    if (!company) return null;

    // Obtener usuarios de la empresa
    const usersQuery = `
      SELECT id, email, username, first_name, last_name, role, is_active
      FROM users
      WHERE company_id = $1 AND deleted_at IS NULL
    `;
    
    const users = await this.rawQuery(usersQuery, [companyId]);
    
    return {
      ...company,
      users
    };
  }

  // Actualizar límite de usuarios
  async updateUserLimit(companyId, newLimit) {
    return await this.update(companyId, {
      user_limit: newLimit
    });
  }

  // Estadísticas de la empresa
  async getCompanyStats(companyId) {
    const query = `
      SELECT 
        c.*,
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT u.id) FILTER (WHERE u.is_active = true) as active_users
      FROM ${this.tableName} c
      LEFT JOIN users u ON u.company_id = c.id AND u.deleted_at IS NULL
      WHERE c.id = $1 AND c.deleted_at IS NULL
      GROUP BY c.id
    `;
    
    const result = await this.rawQuery(query, [companyId]);
    return result[0];
  }

  // Buscar empresas por plan de suscripción
  async findBySubscriptionPlan(plan) {
    return await this.findAll({ subscription_status: plan });
  }

  // Actualizar estado de suscripción
  async updateSubscription(companyId, status, expiryDate = null) {
    const updateData = {
      subscription_status: status
    };

    if (expiryDate) {
      updateData.subscription_expires_at = expiryDate;
    }

    return await this.update(companyId, updateData);
  }
}

module.exports = CompanyRepository;