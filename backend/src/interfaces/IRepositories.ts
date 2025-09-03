// Repository interfaces following Dependency Inversion Principle (DIP)

import { Pool, PoolClient } from 'pg';

// Base repository interface
export interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  findOne(criteria: Partial<T>): Promise<T | null>;
  findMany(criteria: Partial<T>, options?: IQueryOptions): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  count(criteria?: Partial<T>): Promise<number>;
  exists(id: string): Promise<boolean>;
  transaction<R>(callback: (client: PoolClient) => Promise<R>): Promise<R>;
}

// User Repository
export interface IUserRepository extends IRepository<IUserEntity> {
  findByEmail(email: string): Promise<IUserEntity | null>;
  findByRole(role: string, options?: IQueryOptions): Promise<IUserEntity[]>;
  findActiveUsers(options?: IQueryOptions): Promise<IUserEntity[]>;
  updateLastLogin(userId: string): Promise<void>;
  softDelete(id: string): Promise<boolean>;
}

// Company Repository
export interface ICompanyRepository extends IRepository<ICompanyEntity> {
  findByName(name: string): Promise<ICompanyEntity | null>;
  findUserCompanies(userId: string, options?: IQueryOptions): Promise<ICompanyEntity[]>;
  addUserToCompany(companyId: string, userId: string, role: string): Promise<void>;
  removeUserFromCompany(companyId: string, userId: string): Promise<void>;
  getCompanyUsers(companyId: string, options?: IQueryOptions): Promise<IUserEntity[]>;
  softDelete(id: string): Promise<boolean>;
}

// Product Repository
export interface IProductRepository extends IRepository<IProductEntity> {
  findByCategory(category: string, options?: IQueryOptions): Promise<IProductEntity[]>;
  findByPriceRange(min: number, max: number, options?: IQueryOptions): Promise<IProductEntity[]>;
  updateStock(productId: string, quantity: number): Promise<void>;
  getOutOfStock(options?: IQueryOptions): Promise<IProductEntity[]>;
}

// Order Repository
export interface IOrderRepository extends IRepository<IOrderEntity> {
  findByUserId(userId: string, options?: IQueryOptions): Promise<IOrderEntity[]>;
  findByCompanyId(companyId: string, options?: IQueryOptions): Promise<IOrderEntity[]>;
  findByStatus(status: string, options?: IQueryOptions): Promise<IOrderEntity[]>;
  updateStatus(orderId: string, status: string): Promise<void>;
  getOrderItems(orderId: string): Promise<IOrderItemEntity[]>;
  addOrderItem(orderId: string, item: IOrderItemEntity): Promise<void>;
}

// Database Manager interface
export interface IDatabaseManager {
  getPool(database: DatabaseName): Pool;
  getClient(database: DatabaseName): Promise<PoolClient>;
  releaseClient(client: PoolClient): void;
  checkConnection(database: DatabaseName): Promise<boolean>;
  closeAll(): Promise<void>;
  executeQuery<T>(database: DatabaseName, query: string, params?: any[]): Promise<T[]>;
  executeTransaction<T>(database: DatabaseName, callback: (client: PoolClient) => Promise<T>): Promise<T>;
}

// Entity interfaces
export interface IUserEntity {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: string;
  is_active: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface ICompanyEntity {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface IProductEntity {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  category: string;
  company_id: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface IOrderEntity {
  id: string;
  user_id: string;
  company_id: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  total_amount: number;
  shipping_address?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface IOrderItemEntity {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: Date;
}

// Query options
export interface IQueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  include?: string[];
  select?: string[];
}

// Database names
export type DatabaseName = 'shared' | 'omni' | 'personas' | 'notificaciones' | 'organizaciones';