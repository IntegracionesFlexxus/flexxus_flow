import { injectable, inject } from 'tsyringe';
import { IQuoteService } from '../interfaces/IQuoteService';
import { IQuoteRepository } from '../interfaces/IQuoteRepository';
import { IPricingService } from '../../pricing/interfaces/IPricingService';
import { Quote, QuoteInput, QuoteFilters, QuoteItem } from '../../../types/quote.types';
import { AppError } from '../../../../../shared/errors/AppError';
import { PaginatedResult } from '../../../../../shared/types/pagination.types';

@injectable()
export class QuoteService implements IQuoteService {
  constructor(
    @inject('QuoteRepository')
    private quoteRepository: IQuoteRepository,
    @inject('PricingService')
    private pricingService: IPricingService
  ) {}

  async create(data: QuoteInput): Promise<Quote> {
    try {
      // Generar número de cotización único
      data.quote_number = await this.generateQuoteNumber();
      
      // Establecer fechas por defecto
      if (!data.quote_date) {
        data.quote_date = new Date();
      }
      
      if (!data.expiry_date) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);
        data.expiry_date = expiryDate;
      }

      // Crear cotización
      const quote = await this.quoteRepository.create(data);

      // Si hay items, calcular precios y agregar
      if (data.items && data.items.length > 0) {
        const itemsWithPricing = await this.calculateItemsPricing(
          quote.quote_id,
          data.items,
          data.customer_id
        );
        
        // Agregar items a la cotización
        for (const item of itemsWithPricing) {
          await this.quoteRepository.addItem(quote.quote_id, item);
        }

        // Recalcular totales
        await this.recalculateTotals(quote.quote_id);
      }

      return await this.quoteRepository.findById(quote.quote_id);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to create quote: ${error.message}`, 500);
    }
  }

  async update(id: number, data: Partial<QuoteInput>): Promise<Quote> {
    try {
      const quote = await this.quoteRepository.findById(id);
      if (!quote) {
        throw new AppError('Quote not found', 404);
      }

      if (quote.status === 'accepted') {
        throw new AppError('Cannot update accepted quote', 400);
      }

      const updatedQuote = await this.quoteRepository.update(id, data);

      // Si se actualizan items, recalcular totales
      if (data.items) {
        await this.recalculateTotals(id);
      }

      return updatedQuote;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to update quote: ${error.message}`, 500);
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      const quote = await this.quoteRepository.findById(id);
      if (!quote) {
        throw new AppError('Quote not found', 404);
      }

      if (quote.status === 'accepted') {
        throw new AppError('Cannot delete accepted quote', 400);
      }

      return await this.quoteRepository.delete(id);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to delete quote: ${error.message}`, 500);
    }
  }

  async findById(id: number): Promise<Quote | null> {
    try {
      return await this.quoteRepository.findById(id);
    } catch (error) {
      throw new AppError(`Failed to find quote: ${error.message}`, 500);
    }
  }

  async findByNumber(quoteNumber: string): Promise<Quote | null> {
    try {
      return await this.quoteRepository.findByNumber(quoteNumber);
    } catch (error) {
      throw new AppError(`Failed to find quote by number: ${error.message}`, 500);
    }
  }

  async findAll(filters?: QuoteFilters): Promise<PaginatedResult<Quote>> {
    try {
      return await this.quoteRepository.findAll(filters);
    } catch (error) {
      throw new AppError(`Failed to find quotes: ${error.message}`, 500);
    }
  }

  async addItem(quoteId: number, item: QuoteItem): Promise<Quote> {
    try {
      const quote = await this.quoteRepository.findById(quoteId);
      if (!quote) {
        throw new AppError('Quote not found', 404);
      }

      if (quote.status !== 'draft') {
        throw new AppError('Can only add items to draft quotes', 400);
      }

      // Calcular precio del item
      const pricedItem = await this.pricingService.calculateItemPrice(
        item.product_id,
        item.quantity,
        quote.customer_id
      );

      await this.quoteRepository.addItem(quoteId, {
        ...item,
        unit_price: pricedItem.unit_price,
        discount_percentage: pricedItem.discount_percentage,
        discount_amount: pricedItem.discount_amount,
        line_total: pricedItem.line_total
      });

      await this.recalculateTotals(quoteId);

      return await this.quoteRepository.findById(quoteId);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to add item to quote: ${error.message}`, 500);
    }
  }

  async removeItem(quoteId: number, itemId: number): Promise<Quote> {
    try {
      const quote = await this.quoteRepository.findById(quoteId);
      if (!quote) {
        throw new AppError('Quote not found', 404);
      }

      if (quote.status !== 'draft') {
        throw new AppError('Can only remove items from draft quotes', 400);
      }

      await this.quoteRepository.removeItem(quoteId, itemId);
      await this.recalculateTotals(quoteId);

      return await this.quoteRepository.findById(quoteId);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to remove item from quote: ${error.message}`, 500);
    }
  }

  async updateStatus(id: number, status: string): Promise<Quote> {
    try {
      const quote = await this.quoteRepository.findById(id);
      if (!quote) {
        throw new AppError('Quote not found', 404);
      }

      // Validar transiciones de estado
      const validTransitions: Record<string, string[]> = {
        draft: ['sent', 'cancelled'],
        sent: ['accepted', 'rejected', 'cancelled'],
        accepted: ['cancelled'],
        rejected: ['draft'],
        cancelled: ['draft']
      };

      if (!validTransitions[quote.status]?.includes(status)) {
        throw new AppError(`Invalid status transition from ${quote.status} to ${status}`, 400);
      }

      return await this.quoteRepository.updateStatus(id, status);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to update quote status: ${error.message}`, 500);
    }
  }

  async convertToOrder(id: number): Promise<any> {
    try {
      const quote = await this.quoteRepository.findById(id);
      if (!quote) {
        throw new AppError('Quote not found', 404);
      }

      if (quote.status !== 'accepted') {
        throw new AppError('Only accepted quotes can be converted to orders', 400);
      }

      // Aquí se integraría con el módulo de órdenes
      // Por ahora solo retornamos la estructura
      return {
        quote_id: quote.quote_id,
        order_data: {
          customer_id: quote.customer_id,
          items: quote.items,
          total: quote.total_amount
        }
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to convert quote to order: ${error.message}`, 500);
    }
  }

  async duplicate(id: number): Promise<Quote> {
    try {
      const originalQuote = await this.quoteRepository.findById(id);
      if (!originalQuote) {
        throw new AppError('Quote not found', 404);
      }

      const newQuoteData: QuoteInput = {
        customer_id: originalQuote.customer_id,
        contact_id: originalQuote.contact_id,
        currency: originalQuote.currency,
        payment_terms: originalQuote.payment_terms,
        delivery_terms: originalQuote.delivery_terms,
        notes: `Duplicated from ${originalQuote.quote_number}`,
        items: originalQuote.items?.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          notes: item.notes
        }))
      };

      return await this.create(newQuoteData);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to duplicate quote: ${error.message}`, 500);
    }
  }

  private async generateQuoteNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    // Obtener el último número de cotización del mes
    const lastQuote = await this.quoteRepository.getLastQuoteNumber(year, parseInt(month));
    
    let sequence = 1;
    if (lastQuote) {
      const match = lastQuote.match(/-(\d{4})$/);
      if (match) {
        sequence = parseInt(match[1]) + 1;
      }
    }
    
    return `QT-${year}${month}-${String(sequence).padStart(4, '0')}`;
  }

  private async calculateItemsPricing(
    quoteId: number,
    items: any[],
    customerId: number
  ): Promise<any[]> {
    const pricedItems = [];
    
    for (const item of items) {
      const pricing = await this.pricingService.calculateItemPrice(
        item.product_id,
        item.quantity,
        customerId
      );
      
      pricedItems.push({
        ...item,
        unit_price: pricing.unit_price,
        discount_percentage: pricing.discount_percentage,
        discount_amount: pricing.discount_amount,
        line_total: pricing.line_total
      });
    }
    
    return pricedItems;
  }

  private async recalculateTotals(quoteId: number): Promise<void> {
    const quote = await this.quoteRepository.findById(quoteId);
    if (!quote || !quote.items) return;

    let subtotal = 0;
    let totalDiscount = 0;

    for (const item of quote.items) {
      subtotal += item.quantity * item.unit_price;
      totalDiscount += item.discount_amount || 0;
    }

    const taxAmount = subtotal * (quote.tax_percentage || 0) / 100;
    const totalAmount = subtotal - totalDiscount + taxAmount + (quote.shipping_amount || 0);

    await this.quoteRepository.update(quoteId, {
      subtotal,
      discount_amount: totalDiscount,
      tax_amount: taxAmount,
      total_amount: totalAmount
    });
  }
}