// ============================================
// Repositorio de Usuarios
// Nivel 1 - MVP con operaciones CRUD básicas
// ============================================

const db = require('../config/database');
const bcrypt = require('bcrypt');

// Configuración de bcrypt
const SALT_ROUNDS = 10; // TODO: Mover a .env en Nivel 2

const userRepository = {
  // Crear usuario
  async create(userData) {
    const { email, password, firstName, lastName, phone } = userData;
    
    // Hash del password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    
    const sql = `
      INSERT INTO users (email, password_hash, first_name, last_name, phone)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, first_name, last_name, phone, is_active, created_at
    `;
    
    const params = [email, passwordHash, firstName, lastName, phone];
    
    try {
      const result = await db.query(sql, params, 'shared');
      return result.rows[0];
    } catch (error) {
      // Si es error de duplicado
      if (error.code === '23505') {
        throw new Error('El email ya está registrado');
      }
      throw error;
    }
  },
  
  // Buscar por email
  async findByEmail(email) {
    const sql = `
      SELECT id, email, password_hash, first_name, last_name, phone, 
             is_active, email_verified, last_login_at, created_at
      FROM users 
      WHERE email = $1
    `;
    
    const result = await db.query(sql, [email], 'shared');
    return result.rows[0] || null;
  },
  
  // Buscar por ID
  async findById(id) {
    const sql = `
      SELECT id, email, first_name, last_name, phone, 
             is_active, email_verified, last_login_at, created_at
      FROM users 
      WHERE id = $1
    `;
    
    const result = await db.query(sql, [id], 'shared');
    return result.rows[0] || null;
  },
  
  // Verificar password
  async verifyPassword(email, password) {
    const user = await this.findByEmail(email);
    
    if (!user) {
      return { valid: false, user: null };
    }
    
    const valid = await bcrypt.compare(password, user.password_hash);
    
    // Eliminar hash del objeto retornado
    delete user.password_hash;
    
    return { valid, user: valid ? user : null };
  },
  
  // Actualizar último login
  async updateLastLogin(userId) {
    const sql = `
      UPDATE users 
      SET last_login_at = CURRENT_TIMESTAMP 
      WHERE id = $1
      RETURNING last_login_at
    `;
    
    const result = await db.query(sql, [userId], 'shared');
    return result.rows[0];
  },
  
  // Obtener empresas del usuario
  async getCompanies(userId) {
    const sql = `
      SELECT 
        c.id,
        c.name,
        c.plan,
        c.status,
        uc.role,
        uc.is_default
      FROM user_companies uc
      JOIN companies c ON c.id = uc.company_id
      WHERE uc.user_id = $1 
        AND uc.status = 'active'
        AND c.status = 'active'
      ORDER BY uc.is_default DESC, c.name
    `;
    
    const result = await db.query(sql, [userId], 'shared');
    return result.rows;
  },
  
  // Asignar usuario a empresa
  async assignToCompany(userId, companyId, role = 'member') {
    const sql = `
      INSERT INTO user_companies (user_id, company_id, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, company_id) 
      DO UPDATE SET role = $3, updated_at = CURRENT_TIMESTAMP
      RETURNING id, role, is_default
    `;
    
    const result = await db.query(sql, [userId, companyId, role], 'shared');
    return result.rows[0];
  },
  
  // Actualizar usuario
  async update(userId, updates) {
    const fields = [];
    const params = [userId];
    let paramIndex = 2;
    
    // Construir query dinámicamente
    Object.keys(updates).forEach(key => {
      // Solo permitir campos seguros
      if (['first_name', 'last_name', 'phone'].includes(key)) {
        fields.push(`${key} = $${paramIndex}`);
        params.push(updates[key]);
        paramIndex++;
      }
    });
    
    if (fields.length === 0) {
      throw new Error('No hay campos válidos para actualizar');
    }
    
    const sql = `
      UPDATE users 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, first_name, last_name, phone, updated_at
    `;
    
    const result = await db.query(sql, params, 'shared');
    return result.rows[0];
  },
  
  // Activar/Desactivar usuario
  async setActive(userId, isActive) {
    const sql = `
      UPDATE users 
      SET is_active = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, is_active
    `;
    
    const result = await db.query(sql, [userId, isActive], 'shared');
    return result.rows[0];
  },
  
  // Listar usuarios de una empresa
  async listByCompany(companyId, options = {}) {
    const { limit = 50, offset = 0 } = options;
    
    const sql = `
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.is_active,
        uc.role,
        u.last_login_at
      FROM users u
      JOIN user_companies uc ON uc.user_id = u.id
      WHERE uc.company_id = $1
        AND uc.status = 'active'
      ORDER BY u.first_name, u.last_name
      LIMIT $2 OFFSET $3
    `;
    
    const result = await db.query(sql, [companyId, limit, offset], 'shared');
    return result.rows;
  }
};

module.exports = userRepository;