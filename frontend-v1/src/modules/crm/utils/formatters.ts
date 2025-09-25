/**
 * Formatters - Sprint 15
 * Format utilities for CRM module
 */

/**
 * Format currency
 */
export const formatCurrency = (
  amount: number,
  currency: string = 'ARS',
  locale: string = 'es-AR'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Format phone number (Argentina)
 */
export const formatPhoneNumber = (phone: string): string => {
  const clean = phone.replace(/[^0-9]/g, '');

  // Mobile with country code (54 9 11 XXXX XXXX)
  if (clean.startsWith('549') && clean.length === 13) {
    return `+${clean.slice(0, 2)} ${clean.slice(2, 3)} ${clean.slice(3, 5)} ${clean.slice(5, 9)} ${clean.slice(9)}`;
  }

  // Mobile without country code (11 XXXX XXXX)
  if (clean.startsWith('11') && clean.length === 10) {
    return `${clean.slice(0, 2)} ${clean.slice(2, 6)} ${clean.slice(6)}`;
  }

  // Landline with area code
  if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  }

  // Default formatting
  if (clean.length >= 8) {
    return `${clean.slice(0, 4)}-${clean.slice(4)}`;
  }

  return phone;
};

/**
 * Format date
 */
export const formatDate = (
  date: string | Date,
  format: 'short' | 'medium' | 'long' | 'full' = 'medium'
): string => {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) {
    return '';
  }

  const options: Intl.DateTimeFormatOptions = {
    short: { day: '2-digit', month: '2-digit', year: 'numeric' },
    medium: { day: '2-digit', month: 'short', year: 'numeric' },
    long: { day: 'numeric', month: 'long', year: 'numeric' },
    full: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
  }[format];

  return new Intl.DateTimeFormat('es-AR', options).format(d);
};

/**
 * Format date time
 */
export const formatDateTime = (
  date: string | Date,
  includeSeconds: boolean = false
): string => {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) {
    return '';
  }

  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...(includeSeconds && { second: '2-digit' })
  };

  return new Intl.DateTimeFormat('es-AR', options).format(d);
};

/**
 * Format relative time
 */
export const formatRelativeTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Hace un momento';
  if (diffMin < 60) return `Hace ${diffMin} minuto${diffMin !== 1 ? 's' : ''}`;
  if (diffHour < 24) return `Hace ${diffHour} hora${diffHour !== 1 ? 's' : ''}`;
  if (diffDay < 7) return `Hace ${diffDay} día${diffDay !== 1 ? 's' : ''}`;
  if (diffDay < 30) return `Hace ${Math.floor(diffDay / 7)} semana${Math.floor(diffDay / 7) !== 1 ? 's' : ''}`;
  if (diffDay < 365) return `Hace ${Math.floor(diffDay / 30)} mes${Math.floor(diffDay / 30) !== 1 ? 'es' : ''}`;
  return `Hace ${Math.floor(diffDay / 365)} año${Math.floor(diffDay / 365) !== 1 ? 's' : ''}`;
};

/**
 * Format percentage
 */
export const formatPercentage = (value: number, decimals: number = 0): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Format number
 */
export const formatNumber = (
  value: number,
  decimals?: number,
  locale: string = 'es-AR'
): string => {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
};

/**
 * Format file size
 */
export const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

/**
 * Format name (capitalize)
 */
export const formatName = (firstName?: string, lastName?: string): string => {
  const parts = [];

  if (firstName) {
    parts.push(firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase());
  }

  if (lastName) {
    parts.push(lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase());
  }

  return parts.join(' ');
};

/**
 * Format initials
 */
export const formatInitials = (firstName?: string, lastName?: string): string => {
  let initials = '';

  if (firstName && firstName.length > 0) {
    initials += firstName[0].toUpperCase();
  }

  if (lastName && lastName.length > 0) {
    initials += lastName[0].toUpperCase();
  }

  return initials || '?';
};

/**
 * Truncate text
 */
export const truncateText = (text: string, maxLength: number, suffix: string = '...'): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
};

/**
 * Get days until a date
 */
export const getDaysUntil = (date: string | Date): number => {
  if (!date) return 0;

  const target = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};

/**
 * Get days ago from a date
 */
export const getDaysAgo = (date: string | Date): number => {
  return -getDaysUntil(date);
};

/**
 * Get relative time in English
 */
export const getRelativeTime = (date: string | Date): string => {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) {
    return formatDate(d);
  } else if (days > 1) {
    return `${days} days ago`;
  } else if (days === 1) {
    return 'Yesterday';
  } else if (hours > 1) {
    return `${hours} hours ago`;
  } else if (hours === 1) {
    return '1 hour ago';
  } else if (minutes > 1) {
    return `${minutes} minutes ago`;
  } else if (minutes === 1) {
    return '1 minute ago';
  } else {
    return 'Just now';
  }
};

/**
 * Abbreviate large numbers
 */
export const abbreviateNumber = (value: number): string => {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}B`;
  } else if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
};

/**
 * Get initials from name
 */
export const getInitials = (name: string): string => {
  if (!name) return '';

  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return parts
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();
};

/**
 * Slugify text for URLs
 */
export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

/**
 * Parse query string filters
 */
export const parseFilters = (queryString: string): Record<string, any> => {
  const params = new URLSearchParams(queryString);
  const filters: Record<string, any> = {};

  params.forEach((value, key) => {
    if (value.includes(',')) {
      filters[key] = value.split(',');
    } else if (value === 'true' || value === 'false') {
      filters[key] = value === 'true';
    } else if (!isNaN(Number(value))) {
      filters[key] = Number(value);
    } else {
      filters[key] = value;
    }
  });

  return filters;
};

/**
 * Build query string from filters
 */
export const buildQueryString = (filters: Record<string, any>): string => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      return;
    }

    if (Array.isArray(value)) {
      params.set(key, value.join(','));
    } else {
      params.set(key, String(value));
    }
  });

  return params.toString();
};