const BaseRepository = require('./BaseRepository');
const connectionManager = require('../connections/ConnectionManager');

// Repositorio específico para usuarios
class UserRepository extends BaseRepository {
  constructor() {
    // Usar la conexión 'shared' para usuarios
    const connection = connectionManager.getConnection('shared');
    super(connection, 'users');
  }

  // Buscar usuario por email
  async findByEmail(email) {
    return await this.findOneBy('email', email);
  }

  // Buscar usuario por username
  async findByUsername(username) {
    return await this.findOneBy('username', username);
  }

  // Buscar usuarios por empresa
  async findByCompanyId(companyId) {
    return await this.findAll({ company_id: companyId });
  }

  // Buscar usuarios activos
  async findActiveUsers() {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE is_active = true 
        AND deleted_at IS NULL
      ORDER BY created_at DESC
    `;
    
    return await this.rawQuery(query);
  }

  // Crear usuario con validación
  async createUser(userData) {
    // Verificar si el email ya existe
    const existingEmail = await this.exists('email', userData.email);
    if (existingEmail) {
      throw new Error('Email ya registrado');
    }

    // Verificar si el username ya existe
    if (userData.username) {
      const existingUsername = await this.exists('username', userData.username);
      if (existingUsername) {
        throw new Error('Username ya existe');
      }
    }

    // Agregar campos por defecto
    const user = {
      ...userData,
      is_active: true,
      email_verified: false,
      failed_login_attempts: 0
    };

    return await this.create(user);
  }

  // Actualizar último login
  async updateLastLogin(userId) {
    return await this.update(userId, {
      last_login_at: new Date(),
      failed_login_attempts: 0
    });
  }

  // Incrementar intentos de login fallidos
  async incrementFailedLoginAttempts(userId) {
    const user = await this.findById(userId);
    if (!user) return null;

    const attempts = (user.failed_login_attempts || 0) + 1;
    const isBlocked = attempts >= 5;

    return await this.update(userId, {
      failed_login_attempts: attempts,
      is_active: !isBlocked
    });
  }

  // Buscar usuarios con roles específicos
  async findByRole(role) {
    const query = `
      SELECT u.* FROM ${this.tableName} u
      WHERE u.role = $1 
        AND u.deleted_at IS NULL
      ORDER BY u.created_at DESC
    `;
    
    return await this.rawQuery(query, [role]);
  }

  // Estadísticas de usuarios
  async getUserStats() {
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE is_active = true) as active_users,
        COUNT(*) FILTER (WHERE is_active = false) as inactive_users,
        COUNT(*) FILTER (WHERE email_verified = true) as verified_users,
        COUNT(*) as total_users
      FROM ${this.tableName}
      WHERE deleted_at IS NULL
    `;
    
    const result = await this.rawQuery(query);
    return result[0];
  }
}

module.exports = UserRepository;