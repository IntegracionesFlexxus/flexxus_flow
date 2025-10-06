/**
 * Dynamic Query Builder
 * Sprint 4 - Constructor dinámico de consultas
 */

export type WhereOperator =
  | '=' | '!=' | '>' | '>=' | '<' | '<='
  | 'LIKE' | 'NOT LIKE' | 'IN' | 'NOT IN'
  | 'BETWEEN' | 'IS NULL' | 'IS NOT NULL';

export interface WhereCondition {
  field: string;
  operator: WhereOperator;
  value?: any;
  logic?: 'AND' | 'OR';
}

export interface JoinCondition {
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  table: string;
  alias?: string;
  on: {
    left: string;
    operator: '=' | '!=' | '>' | '>=' | '<' | '<=';
    right: string;
  };
}

export interface SortCondition {
  field: string;
  direction: 'ASC' | 'DESC';
}

export interface QueryOptions {
  select?: string[];
  where?: WhereCondition[];
  joins?: JoinCondition[];
  orderBy?: SortCondition[];
  limit?: number;
  offset?: number;
  groupBy?: string[];
  having?: WhereCondition[];
}

/**
 * Dynamic Query Builder Class
 */
export class DynamicQueryBuilder {
  private options: QueryOptions = {};

  select(...fields: string[]): this {
    this.options.select = fields;
    return this;
  }

  where(field: string, operator: WhereOperator, value?: any, logic: 'AND' | 'OR' = 'AND'): this {
    if (!this.options.where) {
      this.options.where = [];
    }
    this.options.where.push({ field, operator, value, logic });
    return this;
  }

  join(type: JoinCondition['type'], table: string, leftField: string, rightField: string, alias?: string): this {
    if (!this.options.joins) {
      this.options.joins = [];
    }
    this.options.joins.push({
      type,
      table,
      alias,
      on: { left: leftField, operator: '=', right: rightField }
    });
    return this;
  }

  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    if (!this.options.orderBy) {
      this.options.orderBy = [];
    }
    this.options.orderBy.push({ field, direction });
    return this;
  }

  limit(limit: number): this {
    this.options.limit = limit;
    return this;
  }

  offset(offset: number): this {
    this.options.offset = offset;
    return this;
  }

  groupBy(...fields: string[]): this {
    this.options.groupBy = fields;
    return this;
  }

  having(field: string, operator: WhereOperator, value?: any, logic: 'AND' | 'OR' = 'AND'): this {
    if (!this.options.having) {
      this.options.having = [];
    }
    this.options.having.push({ field, operator, value, logic });
    return this;
  }

  build(): QueryOptions {
    return { ...this.options };
  }

  toSQL(tableName: string): string {
    let sql = 'SELECT ';

    // SELECT clause
    sql += this.options.select?.length ? this.options.select.join(', ') : '*';

    // FROM clause
    sql += ` FROM ${tableName}`;

    // JOIN clauses
    if (this.options.joins?.length) {
      this.options.joins.forEach(join => {
        sql += ` ${join.type} JOIN ${join.table}`;
        if (join.alias) sql += ` AS ${join.alias}`;
        sql += ` ON ${join.on.left} ${join.on.operator} ${join.on.right}`;
      });
    }

    // WHERE clause
    if (this.options.where?.length) {
      sql += ' WHERE ';
      sql += this.options.where.map((condition, idx) => {
        const prefix = idx === 0 ? '' : ` ${condition.logic} `;
        return `${prefix}${condition.field} ${condition.operator}${condition.value !== undefined ? ` ?` : ''}`;
      }).join('');
    }

    // GROUP BY clause
    if (this.options.groupBy?.length) {
      sql += ` GROUP BY ${this.options.groupBy.join(', ')}`;
    }

    // HAVING clause
    if (this.options.having?.length) {
      sql += ' HAVING ';
      sql += this.options.having.map((condition, idx) => {
        const prefix = idx === 0 ? '' : ` ${condition.logic} `;
        return `${prefix}${condition.field} ${condition.operator}${condition.value !== undefined ? ` ?` : ''}`;
      }).join('');
    }

    // ORDER BY clause
    if (this.options.orderBy?.length) {
      sql += ' ORDER BY ';
      sql += this.options.orderBy.map(sort => `${sort.field} ${sort.direction}`).join(', ');
    }

    // LIMIT and OFFSET
    if (this.options.limit) {
      sql += ` LIMIT ${this.options.limit}`;
    }
    if (this.options.offset) {
      sql += ` OFFSET ${this.options.offset}`;
    }

    return sql;
  }
}

/**
 * Factory function to create a new query builder
 */
export function createQueryBuilder(): DynamicQueryBuilder {
  return new DynamicQueryBuilder();
}
