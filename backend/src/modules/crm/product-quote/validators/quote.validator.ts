import { IsString, IsNumber, IsOptional, IsDateString, IsEnum, IsInt, Min, MaxLength, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class QuoteItemDTO {
  @IsInt()
  product_id: number;

  @IsNumber()
  @Min(0.001)
  @Type(() => Number)
  quantity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  unit_price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  discount_percentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  discount_amount?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateQuoteDTO {
  @IsOptional()
  @IsInt()
  company_id?: number;

  @IsInt()
  customer_id: number;

  @IsOptional()
  @IsInt()
  contact_id?: number;

  @IsOptional()
  @IsInt()
  opportunity_id?: number;

  @IsOptional()
  @IsDateString()
  quote_date?: string;

  @IsOptional()
  @IsDateString()
  expiry_date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  payment_terms?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  delivery_terms?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  tax_percentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  discount_percentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  discount_amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  shipping_amount?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  internal_notes?: string;

  @IsOptional()
  @IsString()
  terms_conditions?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDTO)
  items?: QuoteItemDTO[];

  @IsOptional()
  @IsInt()
  salesperson_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  subject?: string;

  @IsOptional()
  billing_address?: any;

  @IsOptional()
  shipping_address?: any;
}

export class UpdateQuoteDTO extends CreateQuoteDTO {
  @IsOptional()
  @IsInt()
  customer_id: number;
}

export class UpdateQuoteStatusDTO {
  @IsEnum(['draft', 'sent', 'accepted', 'rejected', 'cancelled', 'expired'])
  status: string;
}

export class ApplyPromotionDTO {
  @IsString()
  @MaxLength(50)
  promotionCode: string;
}

export class QuoteFiltersDTO {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  customer_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  salesperson_id?: number;

  @IsOptional()
  @IsEnum(['draft', 'sent', 'accepted', 'rejected', 'cancelled', 'expired'])
  status?: string;

  @IsOptional()
  @IsDateString()
  date_from?: string;

  @IsOptional()
  @IsDateString()
  date_to?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  min_amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  max_amount?: number;

  @IsOptional()
  @IsEnum(['quote_number', 'quote_date', 'expiry_date', 'total_amount', 'created_at'])
  sortBy?: string;

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}