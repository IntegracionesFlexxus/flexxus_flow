/**
 * Cache Service Interface
 * Interfaz para servicios de caché del sistema
 */
export interface ICacheService {
  /**
   * Almacena un valor en caché
   */
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  /**
   * Obtiene un valor del caché
   */
  get<T>(key: string): Promise<T | null>;
  /**
   * Verifica si existe una clave en el caché
   */
  has(key: string): Promise<boolean>;
  /**
   * Elimina una clave del caché
   */
  delete(key: string): Promise<boolean>;
  /**
   * Limpia todo el caché
   */
  clear(): Promise<void>;
  /**
   * Obtiene múltiples valores del caché
   */
  mget<T>(keys: string[]): Promise<(T | null)[]>;
  /**
   * Almacena múltiples valores en caché
   */
  mset<T>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<void>;
  /**
   * Obtiene todas las claves que coincidan con un patrón
   */
  keys(pattern?: string): Promise<string[]>;
  /**
   * Obtiene el tamaño del caché
   */
  size(): Promise<number>;
  /**
   * Elimina todas las claves que coincidan con un patrón
   */
  deletePattern?(pattern: string): Promise<number>;
}
