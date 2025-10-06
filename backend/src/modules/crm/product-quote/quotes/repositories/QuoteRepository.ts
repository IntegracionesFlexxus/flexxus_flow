/**
 * Quote Repository - Sprint 20 Implementation
 * Conexión directa con QuoteServiceImpl existente
 */

import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { Pool, PoolClient } from 'pg';
import { TYPES } from '@/container/types';
import {
  Quote,
  CreateQuoteDto,
  UpdateQuoteDto,
  QuoteSearchParams,
  BulkUpdateResult,
  QuoteItem,
  QuoteVersion,
  ApprovalRequest
} from '../../shared/interfaces/quote.interfaces';

export interface QuoteStatistics {
  total_value: number;
  item_count: number;
  margin: number;
  discount: number;
}

@injectable()
export class QuoteRepository {
  constructor(
    @inject(TYPES.CrmConnection) private pool: Pool,
    @inject(TYPES.Logger) private logger: any
  ) {}

  /**
   * Crear nueva cotización
   */
  async create(data: CreateQuoteDto): Promise<Quote> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Crear la cotización principal
      const quoteQuery = `
        INSERT INTO quotes (
          quote_number, customer_id, opportunity_id, status, type,
          currency, language, valid_until, payment_terms,
          delivery_terms, notes, internal_notes, terms_conditions,
          subtotal, tax_amount, discount_amount, total_amount,
          margin_amount, margin_percentage, created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, $19, $20, $21
        ) RETURNING *
      `;

      const quoteValues = [
        data.quote_name,
        data.customer_id,
        data.opportunity_id,
        data.status || 'draft',
        data.type || 'standard',
        data.currency || 'USD',
        data.language || 'en',
        data.valid_until,
        data.payment_terms,
        data.delivery_terms,
        data.notes,
        data.internal_notes,
        data.terms_conditions,
        data.subtotal || 0,
        data.tax_amount || 0,
        data.discount_amount || 0,
        data.total_amount || 0,
        data.margin_amount || 0,
        data.margin_percentage || 0,
        data.created_by || 1,
        data.updated_by || 1
      ];

      const quoteResult = await client.query(quoteQuery, quoteValues);
      const quote = quoteResult.rows[0];

      // Crear items de la cotización
      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          await this.addQuoteItem(client, quote.id, item);
        }
      }

      // Crear versión inicial
      await this.createQuoteVersion(client, quote.id, 'Initial quote', data.created_by || 1);

      await client.query('COMMIT');

      return this.findById(quote.id);
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error creating quote', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Buscar cotización por ID
   */
  async findById(id: number): Promise<Quote | null> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT
          q.*,
          c.name as customer_name,
          c.email as customer_email,
          c.company_name as customer_company,
          o.name as opportunity_name,
          o.value as opportunity_value,
          COALESCE(
            (SELECT json_agg(
              json_build_object(
                'id', qi.id,
                'product_id', qi.product_id,
                'variant_id', qi.variant_id,
                'product_name', p.name,
                'product_sku', p.sku,
                'description', qi.description,
                'quantity', qi.quantity,
                'unit_price', qi.unit_price,
                'discount_percentage', qi.discount_percentage,
                'discount_amount', qi.discount_amount,
                'line_total', qi.line_total,
                'position', qi.position,
                'product_category', pc.name
              )
            )
            FROM quote_items qi
            LEFT JOIN products p ON qi.product_id = p.id
            LEFT JOIN product_categories pc ON p.category_id = pc.id
            WHERE qi.quote_id = q.id
            ORDER BY qi.position),
            '[]'::json
          ) as items,
          COALESCE(
            (SELECT json_agg(qv.*)
             FROM quote_versions qv
             WHERE qv.quote_id = q.id
             ORDER BY qv.version_number DESC),
            '[]'::json
          ) as versions
        FROM quotes q
        LEFT JOIN contacts c ON q.customer_id = c.id
        LEFT JOIN opportunities o ON q.opportunity_id = o.id
        WHERE q.id = $1
      `;

      const result = await client.query(query, [id]);
      return result.rows[0] ? this.mapToQuote(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  /**
   * Buscar cotización por número
   */
  async findByNumber(quoteNumber: string): Promise<Quote | null> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT q.*, c.name as customer_name
        FROM quotes q
        LEFT JOIN contacts c ON q.customer_id = c.id
        WHERE q.quote_number = $1
      `;

      const result = await client.query(query, [quoteNumber]);
      return result.rows[0] ? this.mapToQuote(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  /**
   * Búsqueda avanzada con filtros
   */
  async search(filters: QuoteSearchParams): Promise<{
    quotes: Quote[];
    total: number;
    statistics: QuoteStatistics;
  }> {
    const client = await this.pool.connect();
    try {
      let whereClause = 'WHERE 1=1';
      const queryParams: any[] = [];
      let paramCount = 0;

      // Construcción dinámica de filtros
      if (filters.query) {
        paramCount++;
        whereClause += ` AND (
          q.quote_number ILIKE $${paramCount} OR
          c.name ILIKE $${paramCount} OR
          c.company_name ILIKE $${paramCount} OR
          q.notes ILIKE $${paramCount}
        )`;
        queryParams.push(`%${filters.query}%`);
      }

      if (filters.customerId) {
        paramCount++;
        whereClause += ` AND q.customer_id = $${paramCount}`;
        queryParams.push(filters.customerId);
      }

      if (filters.opportunityId) {
        paramCount++;
        whereClause += ` AND q.opportunity_id = $${paramCount}`;
        queryParams.push(filters.opportunityId);
      }

      if (filters.status && filters.status.length > 0) {
        paramCount++;
        whereClause += ` AND q.status = ANY($${paramCount})`;
        queryParams.push(filters.status);
      }

      if (filters.type && filters.type.length > 0) {
        paramCount++;
        whereClause += ` AND q.type = ANY($${paramCount})`;
        queryParams.push(filters.type);
      }

      if (filters.dateFrom) {
        paramCount++;
        whereClause += ` AND q.created_at >= $${paramCount}`;
        queryParams.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        paramCount++;
        whereClause += ` AND q.created_at <= $${paramCount}`;
        queryParams.push(filters.dateTo);
      }

      if (filters.validUntilFrom) {
        paramCount++;
        whereClause += ` AND q.valid_until >= $${paramCount}`;
        queryParams.push(filters.validUntilFrom);
      }

      if (filters.validUntilTo) {
        paramCount++;
        whereClause += ` AND q.valid_until <= $${paramCount}`;
        queryParams.push(filters.validUntilTo);
      }

      if (filters.minAmount !== undefined) {
        paramCount++;
        whereClause += ` AND q.total_amount >= $${paramCount}`;
        queryParams.push(filters.minAmount);
      }

      if (filters.maxAmount !== undefined) {
        paramCount++;
        whereClause += ` AND q.total_amount <= $${paramCount}`;
        queryParams.push(filters.maxAmount);
      }

      if (filters.createdBy) {
        paramCount++;
        whereClause += ` AND q.created_by = $${paramCount}`;
        queryParams.push(filters.createdBy);
      }

      // Query principal
      const mainQuery = `
        SELECT
          q.*,
          c.name as customer_name,
          c.company_name as customer_company,
          o.name as opportunity_name,
          (SELECT COUNT(*) FROM quote_items qi WHERE qi.quote_id = q.id) as item_count
        FROM quotes q
        LEFT JOIN contacts c ON q.customer_id = c.id
        LEFT JOIN opportunities o ON q.opportunity_id = o.id
        ${whereClause}
      `;

      // Contar total
      const countQuery = `SELECT COUNT(*) FROM quotes q LEFT JOIN contacts c ON q.customer_id = c.id LEFT JOIN opportunities o ON q.opportunity_id = o.id ${whereClause}`;
      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].count);

      // Aplicar ordenamiento
      const sortBy = filters.sortBy || 'created_at';
      const sortOrder = filters.sortOrder || 'desc';
      const sortClause = ` ORDER BY q.${sortBy} ${sortOrder.toUpperCase()}`;

      // Aplicar paginación
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const offset = (page - 1) * limit;

      paramCount++;
      const limitClause = ` LIMIT $${paramCount}`;
      queryParams.push(limit);

      paramCount++;
      const offsetClause = ` OFFSET $${paramCount}`;
      queryParams.push(offset);

      const finalQuery = mainQuery + sortClause + limitClause + offsetClause;
      const result = await client.query(finalQuery, queryParams);

      // Calcular estadísticas
      const statsQuery = `
        SELECT
          COUNT(*) as total_quotes,
          COALESCE(SUM(total_amount), 0) as total_value,
          COALESCE(AVG(total_amount), 0) as avg_value,
          COALESCE(SUM(margin_amount), 0) as total_margin,
          COALESCE(AVG(margin_percentage), 0) as avg_margin
        FROM quotes q
        LEFT JOIN contacts c ON q.customer_id = c.id
        LEFT JOIN opportunities o ON q.opportunity_id = o.id
        ${whereClause}
      `;
      const statsResult = await client.query(statsQuery, queryParams.slice(0, -2));
      const stats = statsResult.rows[0];

      const statistics: QuoteStatistics = {
        total_value: parseFloat(stats.total_value) || 0,
        item_count: parseInt(stats.total_quotes) || 0,
        margin: parseFloat(stats.total_margin) || 0,
        discount: 0 // Calculado en frontend si es necesario
      };

      return {
        quotes: result.rows.map(row => this.mapToQuote(row)),
        total,
        statistics
      };
    } finally {
      client.release();
    }
  }

  /**
   * Actualizar cotización
   */
  async update(id: number, data: UpdateQuoteDto): Promise<Quote> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Actualizar cotización principal
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 0;

      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id' && key !== 'items') {
          paramCount++;
          updateFields.push(`${key} = $${paramCount}`);
          values.push(value);
        }
      });

      if (updateFields.length > 0) {
        paramCount++;
        values.push(id);
        updateFields.push('updated_at = CURRENT_TIMESTAMP');

        const updateQuery = `
          UPDATE quotes
          SET ${updateFields.join(', ')}
          WHERE id = $${paramCount}
        `;

        await client.query(updateQuery, values);
      }

      // Actualizar items si se proporcionan
      if (data.items) {
        // Eliminar items existentes
        await client.query('DELETE FROM quote_items WHERE quote_id = $1', [id]);

        // Insertar nuevos items
        for (const item of data.items) {
          await this.addQuoteItem(client, id, item);
        }
      }

      // Crear nueva versión si hay cambios significativos
      if (data.items || updateFields.length > 1) {
        await this.createQuoteVersion(
          client,
          id,
          data.version_notes || 'Quote updated',
          data.updated_by || 1
        );
      }

      await client.query('COMMIT');

      return this.findById(id);
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error updating quote', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Eliminar cotización (soft delete)
   */
  async delete(id: number): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const query = `
        UPDATE quotes
        SET
          status = 'cancelled',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;

      const result = await client.query(query, [id]);
      return result.rowCount > 0;
    } catch (error) {
      this.logger.error('Error deleting quote', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Duplicar cotización
   */
  async duplicate(id: number, newQuoteNumber: string, userId: number): Promise<Quote> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Obtener cotización original
      const originalQuote = await this.findById(id);
      if (!originalQuote) {
        throw new Error('Quote not found');
      }

      // Crear nueva cotización
      const duplicateData: CreateQuoteDto = {
        quote_number: newQuoteNumber,
        customer_id: originalQuote.customer_id,
        opportunity_id: originalQuote.opportunity_id,
        status: 'draft',
        type: originalQuote.type,
        currency: originalQuote.currency,
        language: originalQuote.language,
        payment_terms: originalQuote.payment_terms,
        delivery_terms: originalQuote.delivery_terms,
        notes: originalQuote.notes + ' (Copy)',
        internal_notes: originalQuote.internal_notes,
        terms_conditions: originalQuote.terms_conditions,
        items: originalQuote.items?.map(item => ({
          product_id: item.product_id,
          variant_id: item.variant_id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percentage: item.discount_percentage,
          position: item.position
        })),
        created_by: userId,
        updated_by: userId
      };

      const newQuote = await this.create(duplicateData);

      await client.query('COMMIT');

      return newQuote;
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error duplicating quote', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Obtener historial de versiones
   */
  async getVersionHistory(quoteId: number): Promise<QuoteVersion[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT
          qv.*,
          u.name as created_by_name
        FROM quote_versions qv
        LEFT JOIN users u ON qv.created_by = u.id
        WHERE qv.quote_id = $1
        ORDER BY qv.version_number DESC
      `;

      const result = await client.query(query, [quoteId]);
      return result.rows.map(row => ({
        id: row.id,
        quote_id: row.quote_id,
        version_number: row.version_number,
        changes_summary: row.changes_summary,
        data_snapshot: row.data_snapshot,
        created_at: row.created_at,
        created_by: row.created_by,
        created_by_name: row.created_by_name
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Obtener solicitudes de aprobación
   */
  async getApprovalRequests(quoteId: number): Promise<ApprovalRequest[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT
          ar.*,
          wf.name as workflow_name,
          u1.name as requested_by_name,
          u2.name as approved_by_name
        FROM approval_requests ar
        LEFT JOIN approval_workflows wf ON ar.workflow_id = wf.id
        LEFT JOIN users u1 ON ar.requested_by = u1.id
        LEFT JOIN users u2 ON ar.approved_by = u2.id
        WHERE ar.entity_type = 'quote' AND ar.entity_id = $1
        ORDER BY ar.created_at DESC
      `;

      const result = await client.query(query, [quoteId]);
      return result.rows.map(row => ({
        id: row.id,
        workflow_id: row.workflow_id,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        status: row.status,
        requested_by: row.requested_by,
        approved_by: row.approved_by,
        reason: row.reason,
        comments: row.comments,
        requested_at: row.requested_at,
        responded_at: row.responded_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
        workflow_name: row.workflow_name,
        requested_by_name: row.requested_by_name,
        approved_by_name: row.approved_by_name
      }));
    } finally {
      client.release();
    }
  }

  // Métodos auxiliares privados

  private async addQuoteItem(
    client: PoolClient,
    quoteId: number,
    item: any
  ): Promise<void> {
    const itemQuery = `
      INSERT INTO quote_items (
        quote_id, product_id, variant_id, description, quantity,
        unit_price, discount_percentage, discount_amount, line_total, position
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;

    const lineTotal = (item.quantity * item.unit_price) - (item.discount_amount || 0);

    await client.query(itemQuery, [
      quoteId,
      item.product_id,
      item.variant_id,
      item.description,
      item.quantity,
      item.unit_price,
      item.discount_percentage || 0,
      item.discount_amount || 0,
      lineTotal,
      item.position || 1
    ]);
  }

  private async createQuoteVersion(
    client: PoolClient,
    quoteId: number,
    changesSummary: string,
    userId: number
  ): Promise<void> {
    // Obtener número de versión siguiente
    const versionQuery = `
      SELECT COALESCE(MAX(version_number), 0) + 1 as next_version
      FROM quote_versions
      WHERE quote_id = $1
    `;
    const versionResult = await client.query(versionQuery, [quoteId]);
    const nextVersion = versionResult.rows[0].next_version;

    // Obtener snapshot actual de la cotización
    const snapshotQuery = `
      SELECT row_to_json(q.*) as quote_data
      FROM quotes q
      WHERE q.id = $1
    `;
    const snapshotResult = await client.query(snapshotQuery, [quoteId]);
    const dataSnapshot = snapshotResult.rows[0].quote_data;

    // Crear versión
    const insertVersionQuery = `
      INSERT INTO quote_versions (
        quote_id, version_number, changes_summary, data_snapshot, created_by
      ) VALUES ($1, $2, $3, $4, $5)
    `;

    await client.query(insertVersionQuery, [
      quoteId,
      nextVersion,
      changesSummary,
      JSON.stringify(dataSnapshot),
      userId
    ]);
  }

  private mapToQuote(row: any): Quote {
    return {
      id: row.id,
      quote_number: row.quote_number,
      customer_id: row.customer_id,
      opportunity_id: row.opportunity_id,
      status: row.status,
      type: row.type,
      currency: row.currency,
      language: row.language,
      valid_until: row.valid_until,
      payment_terms: row.payment_terms,
      delivery_terms: row.delivery_terms,
      notes: row.notes,
      internal_notes: row.internal_notes,
      terms_conditions: row.terms_conditions,
      subtotal: parseFloat(row.subtotal) || 0,
      tax_amount: parseFloat(row.tax_amount) || 0,
      discount_amount: parseFloat(row.discount_amount) || 0,
      total_amount: parseFloat(row.total_amount) || 0,
      margin_amount: parseFloat(row.margin_amount) || 0,
      margin_percentage: parseFloat(row.margin_percentage) || 0,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by,
      updated_by: row.updated_by,
      // Campos adicionales del join
      customer_name: row.customer_name,
      customer_email: row.customer_email,
      customer_company: row.customer_company,
      opportunity_name: row.opportunity_name,
      opportunity_value: row.opportunity_value,
      items: row.items || [],
      versions: row.versions || [],
      item_count: row.item_count ? parseInt(row.item_count) : 0
    };
  }
}