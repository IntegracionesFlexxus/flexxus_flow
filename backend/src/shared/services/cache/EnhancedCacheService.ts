/**
 * EnhancedCacheService Re-export
 * This file re-exports CacheService as EnhancedCacheService for backward compatibility
 * After the refactoring, all enhanced functionality was consolidated into CacheService
 */

// Re-export CacheService as EnhancedCacheService
export { CacheService as EnhancedCacheService } from './CacheService';

// Re-export types
export type { 
  CacheConfig, 
  CacheStats, 
  CacheTag 
} from './CacheService';

// For default export compatibility
import { CacheService } from './CacheService';
export default CacheService;