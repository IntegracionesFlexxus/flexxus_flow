import { injectable, inject } from 'tsyringe';
import { IPromotionService } from '../interfaces/IPromotionService';
import { Pool } from 'pg';
import { AppError } from '../../../../../shared/errors/AppError';

@injectable()
export class PromotionService implements IPromotionService {
  constructor(
    @inject('DatabasePool')
    private pool: Pool
  ) {}

  async createPromotion(data: any): Promise<any> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Validar código único
      if (data.promotion_code) {
        const existing = await client.query(
          'SELECT rule_id FROM promotion_rules WHERE promotion_code = $1',
          [data.promotion_code]
        );

        if (existing.rows.length > 0) {
          throw new AppError('Promotion code already exists', 409);
        }
      }

      // Crear promoción
      const result = await client.query(`
        INSERT INTO promotion_rules (
          company_id, promotion_code, promotion_name, description,
          promotion_type, target_type, target_products, target_categories,
          min_purchase_amount, min_purchase_quantity,
          discount_percentage, discount_amount,
          valid_from, valid_until, is_active, priority,
          max_uses_total, max_uses_per_customer,
          requires_code, is_combinable, conditions,
          created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
        ) RETURNING *
      `, [
        data.company_id || 1,
        data.promotion_code,
        data.promotion_name,
        data.description,
        data.promotion_type,
        data.target_type,
        data.target_products,
        data.target_categories,
        data.min_purchase_amount,
        data.min_purchase_quantity,
        data.discount_percentage,
        data.discount_amount,
        data.valid_from || 'NOW()',
        data.valid_until,
        data.is_active !== false,
        data.priority || 0,
        data.max_uses_total,
        data.max_uses_per_customer,
        data.requires_code !== false,
        data.is_combinable || false,
        JSON.stringify(data.conditions || {}),
        data.created_by
      ]);

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to create promotion: ${error.message}`, 500);
    } finally {
      client.release();
    }
  }

  async updatePromotion(id: number, data: any): Promise<any> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Verificar que existe
      const existing = await client.query(
        'SELECT rule_id FROM promotion_rules WHERE rule_id = $1',
        [id]
      );

      if (existing.rows.length === 0) {
        throw new AppError('Promotion not found', 404);
      }

      // Construir query de actualización dinámica
      const fields = [];
      const values = [];
      let paramCount = 1;

      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'rule_id' && key !== 'created_at' && key !== 'created_by') {
          fields.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      });

      if (fields.length === 0) {
        throw new AppError('No fields to update', 400);
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const result = await client.query(`
        UPDATE promotion_rules
        SET ${fields.join(', ')}
        WHERE rule_id = $${paramCount}
        RETURNING *
      `, values);

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to update promotion: ${error.message}`, 500);
    } finally {
      client.release();
    }
  }

  async deletePromotion(id: number): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Verificar si hay aplicaciones activas
      const applications = await client.query(
        'SELECT COUNT(*) as count FROM promotion_applications WHERE rule_id = $1',
        [id]
      );

      if (parseInt(applications.rows[0].count) > 0) {
        throw new AppError('Cannot delete promotion with existing applications', 409);
      }

      const result = await client.query(
        'DELETE FROM promotion_rules WHERE rule_id = $1',
        [id]
      );

      await client.query('COMMIT');
      return result.rowCount > 0;
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to delete promotion: ${error.message}`, 500);
    } finally {
      client.release();
    }
  }

  async getPromotionById(id: number): Promise<any> {
    const result = await this.pool.query(
      'SELECT * FROM promotion_rules WHERE rule_id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async getPromotionByCode(code: string): Promise<any> {
    const result = await this.pool.query(
      'SELECT * FROM promotion_rules WHERE promotion_code = $1 AND is_active = true',
      [code]
    );
    return result.rows[0] || null;
  }

  async getActivePromotions(filters?: any): Promise<any[]> {
    let query = `
      SELECT * FROM promotion_rules
      WHERE is_active = true
      AND valid_from <= CURRENT_TIMESTAMP
      AND (valid_until IS NULL OR valid_until >= CURRENT_TIMESTAMP)
    `;

    const params = [];
    let paramCount = 1;

    if (filters?.target_type) {
      query += ` AND target_type = $${paramCount}`;
      params.push(filters.target_type);
      paramCount++;
    }

    if (filters?.product_id) {
      query += ` AND (target_products IS NULL OR $${paramCount} = ANY(target_products))`;
      params.push(filters.product_id);
      paramCount++;
    }

    query += ' ORDER BY priority DESC, created_at DESC';

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async validatePromotion(code: string, context: any): Promise<any> {
    try {
      const promotion = await this.getPromotionByCode(code);

      if (!promotion) {
        return { valid: false, reason: 'Invalid promotion code' };
      }

      // Validar vigencia
      const now = new Date();
      const validFrom = new Date(promotion.valid_from);
      const validUntil = promotion.valid_until ? new Date(promotion.valid_until) : null;

      if (now < validFrom) {
        return { valid: false, reason: 'Promotion not yet active' };
      }

      if (validUntil && now > validUntil) {
        return { valid: false, reason: 'Promotion has expired' };
      }

      // Validar cantidad mínima de compra
      if (promotion.min_purchase_amount && context.amount < promotion.min_purchase_amount) {
        return {
          valid: false,
          reason: `Minimum purchase amount is ${promotion.min_purchase_amount}`
        };
      }

      // Validar cantidad mínima de items
      if (promotion.min_purchase_quantity && context.quantity < promotion.min_purchase_quantity) {
        return {
          valid: false,
          reason: `Minimum quantity is ${promotion.min_purchase_quantity}`
        };
      }

      // Validar usos máximos totales
      if (promotion.max_uses_total) {
        const usageResult = await this.pool.query(
          'SELECT COUNT(*) as count FROM promotion_applications WHERE rule_id = $1',
          [promotion.rule_id]
        );

        if (parseInt(usageResult.rows[0].count) >= promotion.max_uses_total) {
          return { valid: false, reason: 'Promotion usage limit reached' };
        }
      }

      // Validar usos máximos por cliente
      if (promotion.max_uses_per_customer && context.customer_id) {
        const customerUsageResult = await this.pool.query(
          'SELECT COUNT(*) as count FROM promotion_applications WHERE rule_id = $1 AND customer_id = $2',
          [promotion.rule_id, context.customer_id]
        );

        if (parseInt(customerUsageResult.rows[0].count) >= promotion.max_uses_per_customer) {
          return { valid: false, reason: 'Customer usage limit reached' };
        }
      }

      return {
        valid: true,
        promotion,
        discount: this.calculateDiscount(promotion, context)
      };
    } catch (error) {
      throw new AppError(`Failed to validate promotion: ${error.message}`, 500);
    }
  }

  async applyPromotionToQuote(quoteId: number, promotionCode: string): Promise<any> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Obtener datos de la cotización
      const quoteResult = await client.query(
        'SELECT * FROM quotes WHERE quote_id = $1',
        [quoteId]
      );

      if (quoteResult.rows.length === 0) {
        throw new AppError('Quote not found', 404);
      }

      const quote = quoteResult.rows[0];

      // Validar promoción
      const validation = await this.validatePromotion(promotionCode, {
        amount: quote.subtotal,
        quantity: quote.total_items,
        customer_id: quote.customer_id
      });

      if (!validation.valid) {
        throw new AppError(validation.reason, 400);
      }

      // Aplicar promoción usando función de BD
      const result = await client.query(
        'SELECT * FROM apply_promotion_to_quote($1, $2)',
        [quoteId, validation.promotion.rule_id]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to apply promotion: ${error.message}`, 500);
    } finally {
      client.release();
    }
  }

  async getPromotionUsage(promotionId: number): Promise<any> {
    const result = await this.pool.query(`
      SELECT
        COUNT(*) as total_uses,
        COUNT(DISTINCT customer_id) as unique_customers,
        SUM(discount_amount) as total_discount_given,
        MIN(applied_at) as first_use,
        MAX(applied_at) as last_use
      FROM promotion_applications
      WHERE rule_id = $1
    `, [promotionId]);

    return result.rows[0];
  }

  private calculateDiscount(promotion: any, context: any): number {
    let discount = 0;

    switch (promotion.promotion_type) {
      case 'discount_percentage':
        discount = (context.amount * promotion.discount_percentage) / 100;
        break;
      case 'discount_amount':
        discount = Math.min(promotion.discount_amount, context.amount);
        break;
      case 'buy_x_get_y':
        // Lógica para buy X get Y
        if (context.quantity >= promotion.buy_quantity) {
          const freeItems = Math.floor(context.quantity / promotion.buy_quantity) * promotion.get_quantity;
          discount = freeItems * (context.amount / context.quantity) * (promotion.get_percentage / 100);
        }
        break;
    }

    return discount;
  }
}