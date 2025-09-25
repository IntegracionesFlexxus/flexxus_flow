/**
 * Debug Logger Utility
 * Centralized logging utility for debugging with module-specific control
 * Can be enabled/disabled per module via localStorage
 */

export interface LogLevel {
  log: 'log';
  warn: 'warn';
  error: 'error';
  info: 'info';
}

export class DebugLogger {
  private module: string;
  private enabled: boolean;
  private color: string;

  constructor(module: string, color: string = '#007bff') {
    this.module = module;
    this.color = color;
    this.enabled = this.isEnabled();
  }

  /**
   * Check if logging is enabled for this module
   */
  private isEnabled(): boolean {
    // Always enabled in development
    if (import.meta.env.DEV) return true;

    // Check global debug flag
    if (localStorage.getItem('DEBUG_ALL') === 'true') return true;

    // Check module-specific flag
    if (localStorage.getItem(`DEBUG_${this.module.toUpperCase()}`) === 'true') return true;

    return false;
  }

  /**
   * Format the prefix for log messages
   */
  private getPrefix(): string {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    return `[${this.module}] ${timestamp}`;
  }

  /**
   * Log a message
   */
  log(message: string, data?: any): void {
    if (!this.enabled) return;

    console.log(
      `%c${this.getPrefix()} ${message}`,
      `color: ${this.color}; font-weight: bold;`,
      data || ''
    );
  }

  /**
   * Log an error
   */
  error(message: string, error?: any): void {
    if (!this.enabled) return;

    console.error(
      `%c${this.getPrefix()} ❌ ${message}`,
      'color: #dc3545; font-weight: bold;',
      error || ''
    );

    // If it's an axios error, log additional details
    if (error?.response) {
      this.error('Server Response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers
      });
    }
  }

  /**
   * Log a warning
   */
  warn(message: string, data?: any): void {
    if (!this.enabled) return;

    console.warn(
      `%c${this.getPrefix()} ⚠️ ${message}`,
      'color: #ffc107; font-weight: bold;',
      data || ''
    );
  }

  /**
   * Log info message
   */
  info(message: string, data?: any): void {
    if (!this.enabled) return;

    console.info(
      `%c${this.getPrefix()} ℹ️ ${message}`,
      'color: #17a2b8; font-weight: bold;',
      data || ''
    );
  }

  /**
   * Log success message
   */
  success(message: string, data?: any): void {
    if (!this.enabled) return;

    console.log(
      `%c${this.getPrefix()} ✅ ${message}`,
      'color: #28a745; font-weight: bold;',
      data || ''
    );
  }

  /**
   * Start a group
   */
  group(title: string): void {
    if (!this.enabled) return;

    console.group(
      `%c${this.getPrefix()} ${title}`,
      `color: ${this.color}; font-weight: bold;`
    );
  }

  /**
   * Start a collapsed group
   */
  groupCollapsed(title: string): void {
    if (!this.enabled) return;

    console.groupCollapsed(
      `%c${this.getPrefix()} ${title}`,
      `color: ${this.color}; font-weight: bold;`
    );
  }

  /**
   * End a group
   */
  groupEnd(): void {
    if (!this.enabled) return;
    console.groupEnd();
  }

  /**
   * Start a timer
   */
  time(label: string): void {
    if (!this.enabled) return;
    console.time(`${this.getPrefix()} ${label}`);
  }

  /**
   * End a timer
   */
  timeEnd(label: string): void {
    if (!this.enabled) return;
    console.timeEnd(`${this.getPrefix()} ${label}`);
  }

  /**
   * Create a table
   */
  table(data: any): void {
    if (!this.enabled) return;

    console.log(
      `%c${this.getPrefix()} Table:`,
      `color: ${this.color}; font-weight: bold;`
    );
    console.table(data);
  }

  /**
   * Enable debugging for this module
   */
  enable(): void {
    localStorage.setItem(`DEBUG_${this.module.toUpperCase()}`, 'true');
    this.enabled = true;
    this.success(`Debugging enabled for ${this.module}`);
  }

  /**
   * Disable debugging for this module
   */
  disable(): void {
    localStorage.removeItem(`DEBUG_${this.module.toUpperCase()}`);
    this.enabled = false;
    console.log(`Debugging disabled for ${this.module}`);
  }

  /**
   * Check if debugging is enabled
   */
  isDebugEnabled(): boolean {
    return this.enabled;
  }
}

/**
 * Factory function to create loggers
 */
export function createLogger(module: string, color?: string): DebugLogger {
  return new DebugLogger(module, color);
}

/**
 * Global debug control functions
 */
export const globalDebug = {
  /**
   * Enable debugging for all modules
   */
  enableAll(): void {
    localStorage.setItem('DEBUG_ALL', 'true');
    console.log('%c🔍 Global debugging enabled', 'color: #28a745; font-weight: bold;');
    console.log('Refresh the page to see all debug logs');
  },

  /**
   * Disable debugging for all modules
   */
  disableAll(): void {
    localStorage.removeItem('DEBUG_ALL');
    // Remove all module-specific debug flags
    Object.keys(localStorage)
      .filter(key => key.startsWith('DEBUG_'))
      .forEach(key => localStorage.removeItem(key));
    console.log('%c🔍 Global debugging disabled', 'color: #dc3545; font-weight: bold;');
    console.log('Refresh the page to hide debug logs');
  },

  /**
   * Enable debugging for specific module
   */
  enableModule(module: string): void {
    localStorage.setItem(`DEBUG_${module.toUpperCase()}`, 'true');
    console.log(`%c🔍 Debugging enabled for ${module}`, 'color: #28a745; font-weight: bold;');
    console.log('Refresh the page to see debug logs');
  },

  /**
   * Disable debugging for specific module
   */
  disableModule(module: string): void {
    localStorage.removeItem(`DEBUG_${module.toUpperCase()}`);
    console.log(`%c🔍 Debugging disabled for ${module}`, 'color: #dc3545; font-weight: bold;');
    console.log('Refresh the page to hide debug logs');
  },

  /**
   * List all enabled debug modules
   */
  list(): void {
    const debugKeys = Object.keys(localStorage)
      .filter(key => key.startsWith('DEBUG_'));

    if (debugKeys.length === 0) {
      console.log('No debug modules enabled');
      return;
    }

    console.log('%c🔍 Enabled debug modules:', 'color: #007bff; font-weight: bold;');
    debugKeys.forEach(key => {
      const module = key.replace('DEBUG_', '');
      console.log(`  • ${module}`);
    });
  }
};

// Export for window object to enable console access
if (typeof window !== 'undefined') {
  (window as any).debugLogger = globalDebug;
  (window as any).createLogger = createLogger;

  // Log instructions on how to use
  if (import.meta.env.DEV) {
    console.log(
      '%c🔍 Debug Logger Available',
      'color: #007bff; font-weight: bold; font-size: 14px;'
    );
    console.log('Use the following commands in console:');
    console.log('  • debugLogger.enableAll() - Enable all debug logs');
    console.log('  • debugLogger.disableAll() - Disable all debug logs');
    console.log('  • debugLogger.enableModule("CRM") - Enable CRM debug logs');
    console.log('  • debugLogger.disableModule("CRM") - Disable CRM debug logs');
    console.log('  • debugLogger.list() - List enabled debug modules');
  }
}

/**
 * Pre-configured loggers for common modules
 */
export const loggers = {
  api: createLogger('API', '#9c27b0'),
  auth: createLogger('Auth', '#f44336'),
  crm: createLogger('CRM', '#4caf50'),
  omni: createLogger('Omni', '#2196f3'),
  workflow: createLogger('Workflow', '#ff9800'),
  analytics: createLogger('Analytics', '#00bcd4'),
  websocket: createLogger('WebSocket', '#795548'),
  storage: createLogger('Storage', '#607d8b'),
  notification: createLogger('Notification', '#e91e63')
};

export default DebugLogger;