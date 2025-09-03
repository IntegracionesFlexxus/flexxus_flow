/**
 * Row-Level Security Context Helper
 * Sprint 1 - Database Team
 * 
 * Este módulo proporciona funciones para establecer el contexto
 * de usuario y empresa en las conexiones de PostgreSQL para que
 * las políticas de RLS funcionen correctamente.
 */

const { Pool } = require('pg');

/**
 * Clase para manejar contexto RLS en PostgreSQL
 */
class RLSContext {
  /**
   * Establece el contexto de usuario y empresa para la sesión actual
   * @param {Client|PoolClient} client - Cliente de PostgreSQL
   * @param {string} userId - UUID del usuario actual
   * @param {string} companyId - UUID de la empresa actual
   */
  static async setContext(client, userId, companyId) {
    try {
      // Validar UUIDs
      if (!this.isValidUUID(userId)) {
        throw new Error('Invalid user ID format');
      }
      if (!this.isValidUUID(companyId)) {
        throw new Error('Invalid company ID format');
      }

      // Establecer variables de sesión para RLS
      await client.query(`SET LOCAL app.current_user_id = '${userId}'`);
      await client.query(`SET LOCAL app.current_company_id = '${companyId}'`);
      
      return true;
    } catch (error) {
      console.error('Error setting RLS context:', error);
      throw error;
    }
  }

  /**
   * Establece contexto para una transacción completa
   * @param {Pool} pool - Pool de conexiones
   * @param {string} userId - UUID del usuario
   * @param {string} companyId - UUID de la empresa
   * @param {Function} callback - Función a ejecutar con el contexto
   */
  static async withContext(pool, userId, companyId, callback) {
    const client = await pool.connect();
    
    try {
      // Iniciar transacción
      await client.query('BEGIN');
      
      // Establecer contexto RLS
      await this.setContext(client, userId, companyId);
      
      // Ejecutar callback con el cliente contextualizado
      const result = await callback(client);
      
      // Commit de la transacción
      await client.query('COMMIT');
      
      return result;
    } catch (error) {
      // Rollback en caso de error
      await client.query('ROLLBACK');
      throw error;
    } finally {
      // Liberar cliente al pool
      client.release();
    }
  }

  /**
   * Limpia el contexto RLS (útil para operaciones administrativas)
   * @param {Client|PoolClient} client - Cliente de PostgreSQL
   */
  static async clearContext(client) {
    try {
      await client.query('RESET app.current_user_id');
      await client.query('RESET app.current_company_id');
      return true;
    } catch (error) {
      console.error('Error clearing RLS context:', error);
      throw error;
    }
  }

  /**
   * Obtiene el contexto actual de la sesión
   * @param {Client|PoolClient} client - Cliente de PostgreSQL
   * @returns {Object} Contexto actual {userId, companyId}
   */
  static async getCurrentContext(client) {
    try {
      const userResult = await client.query("SELECT current_setting('app.current_user_id', true) as user_id");
      const companyResult = await client.query("SELECT current_setting('app.current_company_id', true) as company_id");
      
      return {
        userId: userResult.rows[0].user_id || null,
        companyId: companyResult.rows[0].company_id || null
      };
    } catch (error) {
      console.error('Error getting RLS context:', error);
      return { userId: null, companyId: null };
    }
  }

  /**
   * Valida si una cadena es un UUID válido
   * @param {string} uuid - Cadena a validar
   * @returns {boolean} True si es UUID válido
   */
  static isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Crea un middleware para Express que establece contexto RLS
   * @param {Pool} pool - Pool de conexiones
   * @returns {Function} Middleware de Express
   */
  static middleware(pool) {
    return async (req, res, next) => {
      // Obtener userId y companyId del request (desde JWT o sesión)
      const userId = req.user?.id;
      const companyId = req.user?.companyId || req.headers['x-company-id'];
      
      if (!userId || !companyId) {
        // Si no hay contexto, continuar sin establecer RLS
        return next();
      }

      // Adjuntar función helper al request
      req.withRLSContext = async (callback) => {
        return RLSContext.withContext(pool, userId, companyId, callback);
      };

      // Establecer contexto para la conexión del request
      req.rlsContext = { userId, companyId };
      
      next();
    };
  }
}

/**
 * Helper functions para queries comunes con RLS
 */
class RLSQueries {
  /**
   * Ejecuta una query con contexto RLS
   * @param {Pool} pool - Pool de conexiones
   * @param {string} userId - UUID del usuario
   * @param {string} companyId - UUID de la empresa
   * @param {string} query - Query SQL a ejecutar
   * @param {Array} params - Parámetros de la query
   */
  static async executeWithContext(pool, userId, companyId, query, params = []) {
    return RLSContext.withContext(pool, userId, companyId, async (client) => {
      const result = await client.query(query, params);
      return result.rows;
    });
  }

  /**
   * Verifica si el usuario puede acceder a un registro específico
   * @param {Pool} pool - Pool de conexiones
   * @param {string} userId - UUID del usuario
   * @param {string} companyId - UUID de la empresa
   * @param {string} table - Nombre de la tabla
   * @param {string} recordId - ID del registro
   */
  static async canAccess(pool, userId, companyId, table, recordId) {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM ${table} 
        WHERE id = $1
      ) as can_access
    `;
    
    const result = await this.executeWithContext(
      pool, 
      userId, 
      companyId, 
      query, 
      [recordId]
    );
    
    return result[0]?.can_access || false;
  }

  /**
   * Obtiene registros filtrados por RLS
   * @param {Pool} pool - Pool de conexiones
   * @param {string} userId - UUID del usuario
   * @param {string} companyId - UUID de la empresa
   * @param {string} table - Nombre de la tabla
   * @param {Object} filters - Filtros adicionales
   */
  static async getFiltered(pool, userId, companyId, table, filters = {}) {
    // Construir WHERE clause desde filters
    const whereClauses = Object.keys(filters).map((key, index) => 
      `${key} = $${index + 1}`
    );
    const whereClause = whereClauses.length > 0 
      ? `WHERE ${whereClauses.join(' AND ')}` 
      : '';
    
    const query = `
      SELECT * FROM ${table} 
      ${whereClause}
      ORDER BY created_at DESC
    `;
    
    return this.executeWithContext(
      pool, 
      userId, 
      companyId, 
      query, 
      Object.values(filters)
    );
  }
}

/**
 * Función helper para testing de RLS
 */
class RLSTestHelper {
  /**
   * Prueba que un usuario no pueda acceder a datos de otra empresa
   * @param {Pool} pool - Pool de conexiones
   * @param {string} userId - UUID del usuario
   * @param {string} companyId - UUID de la empresa del usuario
   * @param {string} otherCompanyId - UUID de otra empresa
   */
  static async testIsolation(pool, userId, companyId, otherCompanyId) {
    try {
      // Intentar acceder a datos de otra empresa
      const result = await RLSContext.withContext(
        pool, 
        userId, 
        companyId,
        async (client) => {
          // Intentar ver usuarios de otra empresa (debería retornar vacío)
          const query = `
            SELECT * FROM user_companies 
            WHERE company_id = $1
          `;
          const result = await client.query(query, [otherCompanyId]);
          return result.rows;
        }
      );
      
      // Si no retorna registros, el aislamiento funciona
      return result.length === 0;
    } catch (error) {
      console.error('Error testing RLS isolation:', error);
      return false;
    }
  }

  /**
   * Verifica que las políticas RLS estén activas
   * @param {Client|PoolClient} client - Cliente de PostgreSQL
   */
  static async verifyRLSEnabled(client) {
    const query = `
      SELECT 
        schemaname,
        tablename,
        rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('companies', 'users', 'user_companies', 'contacts')
    `;
    
    const result = await client.query(query);
    const tablesWithoutRLS = result.rows.filter(row => !row.rowsecurity);
    
    if (tablesWithoutRLS.length > 0) {
      console.warn('Tables without RLS:', tablesWithoutRLS.map(t => t.tablename));
      return false;
    }
    
    return true;
  }
}

module.exports = {
  RLSContext,
  RLSQueries,
  RLSTestHelper
};