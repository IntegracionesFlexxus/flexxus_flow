// Repositorio base con operaciones CRUD comunes
class BaseRepository {
  constructor(connection, tableName) {
    this.connection = connection;
    this.tableName = tableName;
  }

  // Encontrar por ID
  async findById(id) {
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE id = $1 AND deleted_at IS NULL
    `;
    
    const result = await this.connection.query(query, [id]);
    return result.rows[0] || null;
  }

  // Encontrar todos con filtros opcionales
  async findAll(filters = {}, options = {}) {
    let query = `SELECT * FROM ${this.tableName} WHERE deleted_at IS NULL`;
    const params = [];
    let paramIndex = 1;

    // Agregar filtros dinámicamente
    for (const [field, value] of Object.entries(filters)) {
      query += ` AND ${field} = $${paramIndex}`;
      params.push(value);
      paramIndex++;
    }

    // Agregar ordenamiento
    if (options.orderBy) {
      query += ` ORDER BY ${options.orderBy}`;
      if (options.orderDirection) {
        query += ` ${options.orderDirection}`;
      }
    }

    // Agregar paginación
    if (options.limit) {
      query += ` LIMIT ${options.limit}`;
    }
    if (options.offset) {
      query += ` OFFSET ${options.offset}`;
    }

    const result = await this.connection.query(query, params);
    return result.rows;
  }

  // Encontrar uno por campo
  async findOneBy(field, value) {
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE ${field} = $1 AND deleted_at IS NULL
      LIMIT 1
    `;
    
    const result = await this.connection.query(query, [value]);
    return result.rows[0] || null;
  }

  // Crear nuevo registro
  async create(data) {
    // Agregar timestamps
    data.created_at = new Date();
    data.updated_at = new Date();

    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = fields.map((_, i) => `$${i + 1}`);

    const query = `
      INSERT INTO ${this.tableName} (${fields.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;

    const result = await this.connection.query(query, values);
    return result.rows[0];
  }

  // Actualizar registro
  async update(id, data) {
    // Agregar timestamp de actualización
    data.updated_at = new Date();

    const fields = Object.keys(data);
    const values = Object.values(data);
    const setClause = fields.map((field, i) => `${field} = $${i + 2}`).join(', ');

    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await this.connection.query(query, [id, ...values]);
    return result.rows[0] || null;
  }

  // Eliminar registro (soft delete)
  async delete(id) {
    const query = `
      UPDATE ${this.tableName}
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id
    `;

    const result = await this.connection.query(query, [id]);
    return result.rows.length > 0;
  }

  // Eliminar registro permanentemente
  async hardDelete(id) {
    const query = `
      DELETE FROM ${this.tableName}
      WHERE id = $1
      RETURNING id
    `;

    const result = await this.connection.query(query, [id]);
    return result.rows.length > 0;
  }

  // Contar registros
  async count(filters = {}) {
    let query = `SELECT COUNT(*) FROM ${this.tableName} WHERE deleted_at IS NULL`;
    const params = [];
    let paramIndex = 1;

    for (const [field, value] of Object.entries(filters)) {
      query += ` AND ${field} = $${paramIndex}`;
      params.push(value);
      paramIndex++;
    }

    const result = await this.connection.query(query, params);
    return parseInt(result.rows[0].count, 10);
  }

  // Verificar si existe
  async exists(field, value) {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM ${this.tableName} 
        WHERE ${field} = $1 AND deleted_at IS NULL
      )
    `;

    const result = await this.connection.query(query, [value]);
    return result.rows[0].exists;
  }

  // Ejecutar query personalizado
  async rawQuery(query, params = []) {
    const result = await this.connection.query(query, params);
    return result.rows;
  }

  // Bulk insert
  async bulkCreate(dataArray) {
    if (!dataArray.length) return [];

    const timestamp = new Date();
    const records = dataArray.map(data => ({
      ...data,
      created_at: timestamp,
      updated_at: timestamp
    }));

    const fields = Object.keys(records[0]);
    const values = [];
    const placeholders = [];

    records.forEach((record, recordIndex) => {
      const recordPlaceholders = fields.map((_, fieldIndex) => {
        const paramIndex = recordIndex * fields.length + fieldIndex + 1;
        return `$${paramIndex}`;
      });
      placeholders.push(`(${recordPlaceholders.join(', ')})`);
      values.push(...Object.values(record));
    });

    const query = `
      INSERT INTO ${this.tableName} (${fields.join(', ')})
      VALUES ${placeholders.join(', ')}
      RETURNING *
    `;

    const result = await this.connection.query(query, values);
    return result.rows;
  }
}

module.exports = BaseRepository;