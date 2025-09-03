/**
 * Base Repository with RLS Support
 * Sprint 1 - Database Team
 * 
 * Repositorio base que maneja automáticamente el contexto RLS
 * para todas las operaciones de base de datos
 */

const { RLSContext, RLSQueries } = require('../config/rls-context');

class BaseRepositoryRLS {
  constructor(pool, tableName) {
    this.pool = pool;
    this.tableName = tableName;
  }

  /**
   * Encuentra un registro por ID con contexto RLS
   * @param {string} id - UUID del registro
   * @param {Object} context - Contexto RLS {userId, companyId}
   */
  async findById(id, context) {
    if (!context?.userId || !context?.companyId) {
      throw new Error('RLS context required');
    }

    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE id = $1 
      AND deleted_at IS NULL
    `;

    const results = await RLSQueries.executeWithContext(
      this.pool,
      context.userId,
      context.companyId,
      query,
      [id]
    );

    return results[0] || null;
  }

  /**
   * Encuentra todos los registros con contexto RLS
   * @param {Object} context - Contexto RLS {userId, companyId}
   * @param {Object} options - Opciones de búsqueda
   */
  async findAll(context, options = {}) {
    if (!context?.userId || !context?.companyId) {
      throw new Error('RLS context required');
    }

    const { 
      limit = 100, 
      offset = 0, 
      orderBy = 'created_at', 
      orderDir = 'DESC' 
    } = options;

    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE deleted_at IS NULL
      ORDER BY ${orderBy} ${orderDir}
      LIMIT $1 OFFSET $2
    `;

    return RLSQueries.executeWithContext(
      this.pool,
      context.userId,
      context.companyId,
      query,
      [limit, offset]
    );
  }

  /**
   * Encuentra registros por campo específico con RLS
   * @param {string} field - Nombre del campo
   * @param {any} value - Valor a buscar
   * @param {Object} context - Contexto RLS {userId, companyId}
   */
  async findByField(field, value, context) {
    if (!context?.userId || !context?.companyId) {
      throw new Error('RLS context required');
    }

    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE ${field} = $1 
      AND deleted_at IS NULL
    `;

    return RLSQueries.executeWithContext(
      this.pool,
      context.userId,
      context.companyId,
      query,
      [value]
    );
  }

  /**
   * Crea un nuevo registro con contexto RLS
   * @param {Object} data - Datos del registro
   * @param {Object} context - Contexto RLS {userId, companyId}
   */
  async create(data, context) {
    if (!context?.userId || !context?.companyId) {
      throw new Error('RLS context required');
    }

    // Agregar metadatos automáticos
    const enrichedData = {
      ...data,
      id: data.id || this.generateUUID(),
      created_at: new Date(),
      updated_at: new Date()
    };

    const fields = Object.keys(enrichedData);
    const values = Object.values(enrichedData);
    const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');

    const query = `
      INSERT INTO ${this.tableName} (${fields.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    const results = await RLSQueries.executeWithContext(
      this.pool,
      context.userId,
      context.companyId,
      query,
      values
    );

    return results[0];
  }

  /**
   * Actualiza un registro con contexto RLS
   * @param {string} id - UUID del registro
   * @param {Object} data - Datos a actualizar
   * @param {Object} context - Contexto RLS {userId, companyId}
   */
  async update(id, data, context) {
    if (!context?.userId || !context?.companyId) {
      throw new Error('RLS context required');
    }

    // No actualizar campos de sistema
    const { id: _, created_at, deleted_at, ...updateData } = data;
    
    const fields = Object.keys(updateData);
    const values = Object.values(updateData);
    const setClause = fields.map((field, i) => `${field} = $${i + 2}`).join(', ');

    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}
      WHERE id = $1 
      AND deleted_at IS NULL
      RETURNING *
    `;

    const results = await RLSQueries.executeWithContext(
      this.pool,
      context.userId,
      context.companyId,
      query,
      [id, ...values]
    );

    return results[0] || null;
  }

  /**
   * Soft delete con contexto RLS
   * @param {string} id - UUID del registro
   * @param {Object} context - Contexto RLS {userId, companyId}
   */
  async softDelete(id, context) {
    if (!context?.userId || !context?.companyId) {
      throw new Error('RLS context required');
    }

    const query = `
      UPDATE ${this.tableName}
      SET deleted_at = NOW()
      WHERE id = $1 
      AND deleted_at IS NULL
      RETURNING *
    `;

    const results = await RLSQueries.executeWithContext(
      this.pool,
      context.userId,
      context.companyId,
      query,
      [id]
    );

    return results[0] || null;
  }

  /**
   * Cuenta registros con contexto RLS
   * @param {Object} filters - Filtros opcionales
   * @param {Object} context - Contexto RLS {userId, companyId}
   */
  async count(filters = {}, context) {
    if (!context?.userId || !context?.companyId) {
      throw new Error('RLS context required');
    }

    const whereClauses = ['deleted_at IS NULL'];
    const values = [];
    let paramIndex = 1;

    Object.entries(filters).forEach(([key, value]) => {
      whereClauses.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    });

    const query = `
      SELECT COUNT(*) as total 
      FROM ${this.tableName}
      WHERE ${whereClauses.join(' AND ')}
    `;

    const results = await RLSQueries.executeWithContext(
      this.pool,
      context.userId,
      context.companyId,
      query,
      values
    );

    return parseInt(results[0]?.total || 0);
  }

  /**
   * Verifica si existe un registro con contexto RLS
   * @param {string} id - UUID del registro
   * @param {Object} context - Contexto RLS {userId, companyId}
   */
  async exists(id, context) {
    if (!context?.userId || !context?.companyId) {
      throw new Error('RLS context required');
    }

    const query = `
      SELECT EXISTS(
        SELECT 1 FROM ${this.tableName}
        WHERE id = $1 
        AND deleted_at IS NULL
      ) as exists
    `;

    const results = await RLSQueries.executeWithContext(
      this.pool,
      context.userId,
      context.companyId,
      query,
      [id]
    );

    return results[0]?.exists || false;
  }

  /**
   * Ejecuta una transacción con contexto RLS
   * @param {Function} callback - Función a ejecutar en la transacción
   * @param {Object} context - Contexto RLS {userId, companyId}
   */
  async transaction(callback, context) {
    if (!context?.userId || !context?.companyId) {
      throw new Error('RLS context required');
    }

    return RLSContext.withContext(
      this.pool,
      context.userId,
      context.companyId,
      callback
    );
  }

  /**
   * Búsqueda con paginación y contexto RLS
   * @param {Object} params - Parámetros de búsqueda
   * @param {Object} context - Contexto RLS {userId, companyId}
   */
  async paginate(params = {}, context) {
    if (!context?.userId || !context?.companyId) {
      throw new Error('RLS context required');
    }

    const {
      page = 1,
      limit = 20,
      filters = {},
      orderBy = 'created_at',
      orderDir = 'DESC'
    } = params;

    const offset = (page - 1) * limit;

    // Contar total
    const total = await this.count(filters, context);

    // Obtener registros
    const whereClauses = ['deleted_at IS NULL'];
    const values = [];
    let paramIndex = 1;

    Object.entries(filters).forEach(([key, value]) => {
      whereClauses.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    });

    values.push(limit, offset);

    const query = `
      SELECT * FROM ${this.tableName}
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY ${orderBy} ${orderDir}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const data = await RLSQueries.executeWithContext(
      this.pool,
      context.userId,
      context.companyId,
      query,
      values
    );

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Genera un UUID v4
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

module.exports = BaseRepositoryRLS;