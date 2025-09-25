import { injectable, inject } from 'tsyringe';
import { IPricingService } from '../interfaces/IPricingService';
import { IPricingRepository } from '../interfaces/IPricingRepository';
import { PricingResult } from '../../../types/pricing.types';
import { AppError } from '../../../../../shared/errors/AppError';
import { Pool } from 'pg';

@injectable()
export class PricingService implements IPricingService {
  constructor(
    @inject('PricingRepository')
    private pricingRepository: IPricingRepository,
    @inject('DatabasePool')
    private pool: Pool
  ) {}

  async calculateItemPrice(
    productId: number,
    quantity: number,
    customerId?: number,
    options?: any
  ): Promise<PricingResult> {
    try {
      // Obtener precio base del producto
      const product = await this.getProductBasePrice(productId);
      if (!product) {
        throw new AppError('Product not found', 404);
      }

      let finalPrice = product.base_price;
      let discountPercentage = 0;
      let discountAmount = 0;
      const appliedDiscounts = [];

      // 1. Aplicar precio específico del cliente si existe
      if (customerId) {
        const customerPrice = await this.getCustomerSpecificPrice(
          productId,
          customerId,
          quantity
        );
        
        if (customerPrice) {
          finalPrice = customerPrice.price;
          appliedDiscounts.push({
            type: 'customer_specific',
            amount: product.base_price - customerPrice.price
          });
        }
      }

      // 2. Aplicar descuentos por volumen
      const volumeDiscount = await this.getVolumeDiscount(productId, quantity);
      if (volumeDiscount) {
        if (volumeDiscount.discount_percentage) {
          discountPercentage = volumeDiscount.discount_percentage;
          discountAmount = finalPrice * (discountPercentage / 100);
        } else if (volumeDiscount.discount_amount) {
          discountAmount = volumeDiscount.discount_amount;
          discountPercentage = (discountAmount / finalPrice) * 100;
        }
        
        finalPrice -= discountAmount;
        appliedDiscounts.push({
          type: 'volume',
          amount: discountAmount
        });
      }

      // 3. Aplicar promociones activas
      const promotions = await this.getActivePromotions(productId, customerId);
      for (const promo of promotions) {
        const promoDiscount = this.calculatePromotionDiscount(finalPrice, quantity, promo);
        if (promoDiscount > 0) {
          finalPrice -= promoDiscount;
          appliedDiscounts.push({
            type: 'promotion',
            code: promo.promotion_code,
            amount: promoDiscount
          });
        }
      }

      // Calcular total de línea
      const lineTotal = finalPrice * quantity;

      return {
        product_id: productId,
        base_price: product.base_price,
        unit_price: finalPrice,
        quantity,
        discount_percentage: discountPercentage,
        discount_amount: discountAmount * quantity,
        line_total: lineTotal,
        applied_discounts: appliedDiscounts,
        currency: product.currency || 'USD'
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to calculate item price: ${error.message}`, 500);
    }
  }

  async getBestPrice(
    productId: number,
    customerId: number,
    quantity: number
  ): Promise<number> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM get_customer_best_price($1, $2, $3, $4)',
        [1, customerId, productId, quantity] // company_id = 1 por defecto
      );

      if (result.rows.length > 0) {
        return result.rows[0].final_price;
      }

      // Si no hay precio específico, obtener precio base
      const product = await this.getProductBasePrice(productId);
      return product?.base_price || 0;
    } catch (error) {
      throw new AppError(`Failed to get best price: ${error.message}`, 500);
    }
  }

  async applyPromotion(
    quoteId: number,
    promotionCode: string
  ): Promise<any> {
    try {
      // Verificar que la promoción existe y está activa
      const promotion = await this.pricingRepository.getPromotionByCode(promotionCode);
      if (!promotion) {
        throw new AppError('Invalid promotion code', 404);
      }

      if (!promotion.is_active) {
        throw new AppError('Promotion is not active', 400);
      }

      // Verificar vigencia
      const now = new Date();
      if (promotion.valid_from > now || (promotion.valid_until && promotion.valid_until < now)) {
        throw new AppError('Promotion is not valid at this time', 400);
      }

      // Aplicar promoción usando función de base de datos
      const result = await this.pool.query(
        'SELECT * FROM apply_promotion_to_quote($1, $2)',
        [quoteId, promotion.rule_id]
      );

      return result.rows[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to apply promotion: ${error.message}`, 500);
    }
  }

  async validatePricing(quoteId: number): Promise<boolean> {
    try {
      // Validar que no hay conflictos de promociones
      const result = await this.pool.query(
        'SELECT * FROM validate_promotion_conflicts($1)',
        [quoteId]
      );

      if (!result.rows[0].is_valid) {
        throw new AppError(result.rows[0].conflict_message, 400);
      }

      return true;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to validate pricing: ${error.message}`, 500);
    }
  }

  private async getProductBasePrice(productId: number): Promise<any> {
    const result = await this.pool.query(
      'SELECT product_id, base_price, currency FROM products WHERE product_id = $1',
      [productId]
    );
    return result.rows[0];
  }

  private async getCustomerSpecificPrice(
    productId: number,
    customerId: number,
    quantity: number
  ): Promise<any> {
    const result = await this.pool.query(`
      SELECT pricing_id, fixed_price as price, percentage_adjustment
      FROM customer_specific_pricing
      WHERE product_id = $1
        AND customer_id = $2
        AND min_quantity <= $3
        AND (max_quantity IS NULL OR max_quantity >= $3)
        AND is_active = true
        AND valid_from <= CURRENT_DATE
        AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
      ORDER BY priority DESC, created_at DESC
      LIMIT 1
    `, [productId, customerId, quantity]);

    return result.rows[0];
  }

  private async getVolumeDiscount(
    productId: number,
    quantity: number
  ): Promise<any> {
    const result = await this.pool.query(`
      SELECT vdt.discount_percentage, vdt.discount_amount, vdt.fixed_price
      FROM volume_discounts vd
      INNER JOIN volume_discount_tiers vdt ON vd.discount_id = vdt.discount_id
      WHERE vd.product_id = $1
        AND vdt.min_quantity <= $2
        AND (vdt.max_quantity IS NULL OR vdt.max_quantity >= $2)
        AND vd.is_active = true
        AND vd.valid_from <= CURRENT_DATE
        AND (vd.valid_until IS NULL OR vd.valid_until >= CURRENT_DATE)
      ORDER BY vdt.min_quantity DESC
      LIMIT 1
    `, [productId, quantity]);

    return result.rows[0];
  }

  private async getActivePromotions(
    productId: number,
    customerId?: number
  ): Promise<any[]> {
    const result = await this.pool.query(`
      SELECT rule_id, promotion_code, promotion_type,
             discount_percentage, discount_amount,
             min_purchase_quantity
      FROM promotion_rules
      WHERE is_active = true
        AND valid_from <= CURRENT_TIMESTAMP
        AND (valid_until IS NULL OR valid_until >= CURRENT_TIMESTAMP)
        AND (
          target_products IS NULL
          OR $1 = ANY(target_products)
        )
      ORDER BY priority DESC
    `, [productId]);

    return result.rows;
  }

  private calculatePromotionDiscount(
    price: number,
    quantity: number,
    promotion: any
  ): number {
    // Verificar cantidad mínima
    if (promotion.min_purchase_quantity && quantity < promotion.min_purchase_quantity) {
      return 0;
    }

    // Calcular descuento según tipo
    if (promotion.discount_percentage) {
      return price * (promotion.discount_percentage / 100);
    } else if (promotion.discount_amount) {
      return Math.min(promotion.discount_amount, price);
    }

    return 0;
  }
}