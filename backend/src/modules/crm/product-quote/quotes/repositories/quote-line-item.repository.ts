/**
 * Quote Line Item Repository
 * Sprint 20 Implementation
 */

import { Pool } from 'pg';
import {
  IQuoteLineItem,
  AddLineItemDto,
  UpdateLineItemDto
} from '../../shared/interfaces/quote.interfaces';

export class QuoteLineItemRepository {
  constructor(private pool: Pool) {}

  async create(data: AddLineItemDto & { quote_id: number }): Promise<IQuoteLineItem> {
    // Get the next line number
    const lineNumberQuery = `
      SELECT COALESCE(MAX(line_number), 0) + 1 as next_line_number
      FROM quote_line_items
      WHERE quote_id = $1
    `;
    const lineNumberResult = await this.pool.query(lineNumberQuery, [data.quote_id]);
    const lineNumber = lineNumberResult.rows[0].next_line_number;

    // Calculate totals
    const subtotal = (data.unit_price || 0) * (data.quantity || 1);
    const discountAmount = data.discount_amount || (subtotal * (data.discount_percentage || 0) / 100);
    const totalAmount = subtotal - discountAmount;

    const query = `
      INSERT INTO quote_line_items (
        quote_id, section_id, product_id, variation_id, bundle_id,
        line_number, sku, name, description, quantity, unit_of_measure,
        list_price, unit_price, discount_percentage, discount_amount,
        subtotal, total_discount, total_amount, unit_cost, total_cost,
        margin_amount, margin_percentage, is_optional, is_selected,
        requires_configuration, configuration, notes, sort_order,
        custom_fields, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
      )
      RETURNING *
    `;

    // Calculate cost and margin if unit_cost is provided
    let unitCost = data.unit_cost;
    let totalCost: number | undefined;
    let marginAmount: number | undefined;
    let marginPercentage: number | undefined;

    if (unitCost) {
      totalCost = unitCost * data.quantity;
      marginAmount = totalAmount - totalCost;
      marginPercentage = totalAmount > 0 ? (marginAmount / totalAmount * 100) : 0;
    }

    const values = [
      data.quote_id,
      data.section_id || null,
      data.product_id || null,
      data.variation_id || null,
      data.bundle_id || null,
      lineNumber,
      data.sku || null,
      data.name,
      data.description || null,
      data.quantity,
      data.unit_of_measure || 'unit',
      data.unit_price || data.unit_price,
      data.unit_price,
      data.discount_percentage || 0,
      discountAmount,
      subtotal,
      discountAmount,
      totalAmount,
      unitCost || null,
      totalCost || null,
      marginAmount || null,
      marginPercentage || null,
      data.is_optional || false,
      data.is_selected !== false,
      data.requires_configuration || false,
      data.configuration ? JSON.stringify(data.configuration) : null,
      data.notes || null,
      data.sort_order || lineNumber,
      data.custom_fields ? JSON.stringify(data.custom_fields) : null,
      1 // TODO: Get from auth context
    ];

    const result = await this.pool.query(query, values);
    return this.mapToLineItem(result.rows[0]);
  }

  async findById(lineItemId: number): Promise<IQuoteLineItem | null> {
    const query = `
      SELECT li.*, p.name as product_name, p.sku as product_sku
      FROM quote_line_items li
      LEFT JOIN products p ON li.product_id = p.product_id
      WHERE li.line_item_id = $1
    `;

    const result = await this.pool.query(query, [lineItemId]);
    return result.rows[0] ? this.mapToLineItem(result.rows[0]) : null;
  }

  async findByQuoteId(quoteId: number): Promise<IQuoteLineItem[]> {
    const query = `
      SELECT li.*, p.name as product_name, p.sku as product_sku
      FROM quote_line_items li
      LEFT JOIN products p ON li.product_id = p.product_id
      WHERE li.quote_id = $1
      ORDER BY li.section_id NULLS FIRST, li.sort_order, li.line_number
    `;

    const result = await this.pool.query(query, [quoteId]);
    return result.rows.map(row => this.mapToLineItem(row));
  }

  async findBySectionId(sectionId: number): Promise<IQuoteLineItem[]> {
    const query = `
      SELECT li.*, p.name as product_name, p.sku as product_sku
      FROM quote_line_items li
      LEFT JOIN products p ON li.product_id = p.product_id
      WHERE li.section_id = $1
      ORDER BY li.sort_order, li.line_number
    `;

    const result = await this.pool.query(query, [sectionId]);
    return result.rows.map(row => this.mapToLineItem(row));
  }

  async update(lineItemId: number, data: UpdateLineItemDto): Promise<IQuoteLineItem> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    // Recalculate totals if quantity or price changes
    let recalculate = false;
    if (data.quantity !== undefined || data.unit_price !== undefined ||
        data.discount_percentage !== undefined || data.discount_amount !== undefined) {
      recalculate = true;
    }

    if (recalculate) {
      // Get current values
      const currentQuery = `SELECT * FROM quote_line_items WHERE line_item_id = $1`;
      const currentResult = await this.pool.query(currentQuery, [lineItemId]);
      const current = currentResult.rows[0];

      const quantity = data.quantity !== undefined ? data.quantity : current.quantity;
      const unitPrice = data.unit_price !== undefined ? data.unit_price : current.unit_price;
      const discountPercentage = data.discount_percentage !== undefined ? data.discount_percentage : current.discount_percentage;
      const discountAmount = data.discount_amount !== undefined ? data.discount_amount : current.discount_amount;

      const subtotal = unitPrice * quantity;
      const totalDiscount = discountAmount || (subtotal * discountPercentage / 100);
      const totalAmount = subtotal - totalDiscount;

      data.subtotal = subtotal;
      data.total_discount = totalDiscount;
      data.total_amount = totalAmount;

      // Recalculate margin if cost is available
      if (data.unit_cost !== undefined || current.unit_cost) {
        const unitCost = data.unit_cost !== undefined ? data.unit_cost : current.unit_cost;
        const totalCost = unitCost * quantity;
        const marginAmount = totalAmount - totalCost;
        const marginPercentage = totalAmount > 0 ? (marginAmount / totalAmount * 100) : 0;

        data.total_cost = totalCost;
        data.margin_amount = marginAmount;
        data.margin_percentage = marginPercentage;
      }
    }

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(typeof value === 'object' ? JSON.stringify(value) : value);
        paramIndex++;
      }
    });

    values.push(lineItemId);

    const query = `
      UPDATE quote_line_items
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP, updated_by = 1
      WHERE line_item_id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return this.mapToLineItem(result.rows[0]);
  }

  async delete(lineItemId: number): Promise<boolean> {
    const query = `
      DELETE FROM quote_line_items
      WHERE line_item_id = $1
    `;

    const result = await this.pool.query(query, [lineItemId]);
    return result.rowCount > 0;
  }

  async deleteByQuoteId(quoteId: number): Promise<number> {
    const query = `
      DELETE FROM quote_line_items
      WHERE quote_id = $1
    `;

    const result = await this.pool.query(query, [quoteId]);
    return result.rowCount;
  }

  async updateOrder(lineItemId: number, newOrder: number): Promise<boolean> {
    const query = `
      UPDATE quote_line_items
      SET sort_order = $2, updated_at = CURRENT_TIMESTAMP
      WHERE line_item_id = $1
    `;

    const result = await this.pool.query(query, [lineItemId, newOrder]);
    return result.rowCount > 0;
  }

  async toggleOptional(lineItemId: number): Promise<IQuoteLineItem> {
    const query = `
      UPDATE quote_line_items
      SET is_selected = NOT is_selected, updated_at = CURRENT_TIMESTAMP
      WHERE line_item_id = $1 AND is_optional = true
      RETURNING *
    `;

    const result = await this.pool.query(query, [lineItemId]);
    if (!result.rows[0]) {
      throw new Error('Line item not found or not optional');
    }
    return this.mapToLineItem(result.rows[0]);
  }

  async bulkCreate(quoteId: number, items: AddLineItemDto[]): Promise<IQuoteLineItem[]> {
    const createdItems: IQuoteLineItem[] = [];

    // Use transaction for bulk insert
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      for (const item of items) {
        const itemWithQuoteId = { ...item, quote_id: quoteId };
        const created = await this.create(itemWithQuoteId);
        createdItems.push(created);
      }

      await client.query('COMMIT');
      return createdItems;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getSectionTotals(sectionId: number): Promise<any> {
    const query = `
      SELECT
        COUNT(*) as item_count,
        SUM(subtotal) as subtotal,
        SUM(total_discount) as total_discount,
        SUM(total_amount) as total_amount,
        SUM(CASE WHEN is_selected THEN total_amount ELSE 0 END) as selected_amount,
        SUM(CASE WHEN is_optional AND is_selected THEN total_amount ELSE 0 END) as optional_selected_amount
      FROM quote_line_items
      WHERE section_id = $1
    `;

    const result = await this.pool.query(query, [sectionId]);
    return result.rows[0];
  }

  private mapToLineItem(row: any): IQuoteLineItem {
    return {
      line_item_id: row.line_item_id,
      quote_id: row.quote_id,
      section_id: row.section_id,
      product_id: row.product_id,
      variation_id: row.variation_id,
      bundle_id: row.bundle_id,
      line_number: row.line_number,
      sku: row.sku,
      name: row.name,
      description: row.description,
      quantity: parseFloat(row.quantity),
      unit_of_measure: row.unit_of_measure,
      list_price: row.list_price ? parseFloat(row.list_price) : undefined,
      unit_price: parseFloat(row.unit_price),
      discount_percentage: parseFloat(row.discount_percentage),
      discount_amount: parseFloat(row.discount_amount),
      subtotal: parseFloat(row.subtotal),
      total_discount: parseFloat(row.total_discount),
      total_amount: parseFloat(row.total_amount),
      unit_cost: row.unit_cost ? parseFloat(row.unit_cost) : undefined,
      total_cost: row.total_cost ? parseFloat(row.total_cost) : undefined,
      margin_amount: row.margin_amount ? parseFloat(row.margin_amount) : undefined,
      margin_percentage: row.margin_percentage ? parseFloat(row.margin_percentage) : undefined,
      is_optional: row.is_optional,
      is_selected: row.is_selected,
      requires_configuration: row.requires_configuration,
      configuration: row.configuration,
      notes: row.notes,
      sort_order: row.sort_order,
      custom_fields: row.custom_fields,
      created_at: row.created_at,
      created_by: row.created_by,
      updated_at: row.updated_at,
      updated_by: row.updated_by
    };
  }
}