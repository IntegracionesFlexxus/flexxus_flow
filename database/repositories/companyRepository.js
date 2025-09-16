// ============================================
// Repositorio de Empresas
// Nivel 1 - MVP con operaciones CRUD básicas
// ============================================

const db = require('../config/database');

const companyRepository = {
  // Crear empresa
  async create(companyData) {
    const { name, taxId, plan = 'basic' } = companyData;
    
    const sql = `
      INSERT INTO companies (name, tax_id, plan)
      VALUES ($1, $2, $3)
      RETURNING id, name, tax_id, plan, status, created_at
    `;
    
    try {
      const result = await db.query(sql, [name, taxId, plan], 'shared');
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') {
        throw new Error('El CUIT/Tax ID ya está registrado');
      }
      throw error;
    }
  },
  
  // Buscar por ID
  async findById(id) {
    const sql = `
      SELECT id, name, tax_id, plan, status, settings, created_at, updated_at
      FROM companies 
      WHERE id = $1
    `;
    
    const result = await db.query(sql, [id], 'shared');
    return result.rows[0] || null;
  },
  
  // Buscar por Tax ID
  async findByTaxId(taxId) {
    const sql = `
      SELECT id, name, tax_id, plan, status, created_at
      FROM companies 
      WHERE tax_id = $1
    `;
    
    const result = await db.query(sql, [taxId], 'shared');
    return result.rows[0] || null;
  },
  
  // Actualizar empresa
  async update(companyId, updates) {
    const fields = [];
    const params = [companyId];
    let paramIndex = 2;
    
    // Construir query dinámicamente
    Object.keys(updates).forEach(key => {
      // Solo permitir campos seguros
      if (['name', 'tax_id', 'plan', 'settings'].includes(key)) {
        fields.push(`${key} = $${paramIndex}`);
        // Si es settings, convertir a JSON
        const value = key === 'settings' ? JSON.stringify(updates[key]) : updates[key];
        params.push(value);
        paramIndex++;
      }
    });
    
    if (fields.length === 0) {
      return null;
    }
    
    const sql = `
      UPDATE companies 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, name, tax_id, plan, status, settings, updated_at
    `;
    
    const result = await db.query(sql, params, 'shared');
    return result.rows[0];
  },
  
  // Cambiar estado de empresa
  async updateStatus(companyId, status) {
    const validStatuses = ['active', 'suspended', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      throw new Error('Estado inválido');
    }
    
    const sql = `
      UPDATE companies 
      SET status = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, status, updated_at
    `;
    
    const result = await db.query(sql, [companyId, status], 'shared');
    return result.rows[0];
  },
  
  // Obtener usuarios de la empresa
  async getUsers(companyId, options = {}) {
    const { limit = 50, offset = 0, role = null } = options;
    
    let sql = `
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.is_active,
        uc.role,
        uc.is_default,
        uc.created_at as joined_at
      FROM user_companies uc
      JOIN users u ON u.id = uc.user_id
      WHERE uc.company_id = $1
        AND uc.status = 'active'
    `;
    
    const params = [companyId];
    
    // Filtrar por rol si se especifica
    if (role) {
      sql += ` AND uc.role = $${params.length + 1}`;
      params.push(role);
    }
    
    sql += ` ORDER BY uc.role, u.first_name
             LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    
    params.push(limit, offset);
    
    const result = await db.query(sql, params, 'shared');
    return result.rows;
  },
  
  // Contar usuarios por rol
  async countUsersByRole(companyId) {
    const sql = `
      SELECT 
        role,
        COUNT(*) as count
      FROM user_companies
      WHERE company_id = $1
        AND status = 'active'
      GROUP BY role
    `;
    
    const result = await db.query(sql, [companyId], 'shared');
    
    // Convertir a objeto
    const counts = {};
    result.rows.forEach(row => {
      counts[row.role] = parseInt(row.count);
    });
    
    return counts;
  },
  
  // Obtener configuración
  async getSettings(companyId) {
    const sql = `
      SELECT settings
      FROM companies
      WHERE id = $1
    `;
    
    const result = await db.query(sql, [companyId], 'shared');
    return result.rows[0]?.settings || {};
  },
  
  // Actualizar configuración (merge)
  async updateSettings(companyId, newSettings) {
    // Primero obtener settings actuales
    const currentSettings = await this.getSettings(companyId);
    
    // Merge con nuevas settings
    const mergedSettings = { ...currentSettings, ...newSettings };
    
    const sql = `
      UPDATE companies
      SET settings = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING settings
    `;
    
    const result = await db.query(sql, [companyId, JSON.stringify(mergedSettings)], 'shared');
    return result.rows[0]?.settings;
  },
  
  // Listar empresas (para admin)
  async list(options = {}) {
    const { limit = 50, offset = 0, status = null } = options;
    
    let sql = `
      SELECT 
        id,
        name,
        tax_id,
        plan,
        status,
        created_at
      FROM companies
      WHERE 1=1
    `;
    
    const params = [];
    
    if (status) {
      sql += ` AND status = $${params.length + 1}`;
      params.push(status);
    }
    
    sql += ` ORDER BY created_at DESC
             LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    
    params.push(limit, offset);
    
    const result = await db.query(sql, params, 'shared');
    return result.rows;
  },
  
  // Estadísticas básicas
  async getStats(companyId) {
    const stats = {};
    
    // Contar usuarios
    const userCountSql = `
      SELECT COUNT(*) as total_users
      FROM user_companies
      WHERE company_id = $1 AND status = 'active'
    `;
    
    const userResult = await db.query(userCountSql, [companyId], 'shared');
    stats.totalUsers = parseInt(userResult.rows[0].total_users);
    
    // Contar contactos (si está la tabla)
    try {
      const contactCountSql = `
        SELECT COUNT(*) as total_contacts
        FROM contacts
        WHERE company_id = $1 AND status = 'active'
      `;
      
      const contactResult = await db.query(contactCountSql, [companyId], 'personas');
      stats.totalContacts = parseInt(contactResult.rows[0].total_contacts);
    } catch (error) {
      stats.totalContacts = 0;
    }
    
    return stats;
  }
};

module.exports = companyRepository;