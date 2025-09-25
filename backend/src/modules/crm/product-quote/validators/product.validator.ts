import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum, Min, MaxLength, IsDecimal, IsInt, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDTO {
  @IsOptional()
  @IsInt()
  company_id?: number;

  @IsString()
  @MaxLength(50)
  sku: string;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  category_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  product_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  unit_of_measure?: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  base_price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  cost_price?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  tax_percentage?: number;

  @IsOptional()
  @IsBoolean()
  track_inventory?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  stock_quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  min_stock_quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  reorder_point?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  reorder_quantity?: number;

  @IsOptional()
  @IsBoolean()
  allow_backorders?: boolean;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsBoolean()
  is_service?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  attributes?: any;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}

export class UpdateProductDTO extends CreateProductDTO {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sku: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  base_price: number;
}

export class UpdateStockDTO {
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantity: number;

  @IsEnum(['add', 'subtract'])
  operation: 'add' | 'subtract';
}

export class BulkPriceUpdateDTO {
  @IsArray()
  updates: Array<{
    id: number;
    price: number;
  }>;
}

export class ProductFiltersDTO {
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
  category_id?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_active?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_service?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  track_inventory?: boolean;

  @IsOptional()
  @IsEnum(['name', 'sku', 'price', 'created_at', 'updated_at'])
  sortBy?: string;

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}