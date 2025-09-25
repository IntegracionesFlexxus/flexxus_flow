/**
 * CUIT Validator - Sprint 15
 * Validation utilities for Argentine tax ID (CUIT)
 */

/**
 * Validate CUIT format and checksum
 * @param cuit - CUIT string to validate
 * @returns boolean indicating if CUIT is valid
 */
export const validateCUIT = (cuit: string): boolean => {
  // Remove any non-numeric characters
  const cleanCuit = cuit.replace(/[^0-9]/g, '');

  // CUIT must be exactly 11 digits
  if (cleanCuit.length !== 11) {
    return false;
  }

  // Validate prefix (20, 23, 24, 27, 30, 33, 34)
  const validPrefixes = ['20', '23', '24', '27', '30', '33', '34'];
  const prefix = cleanCuit.substring(0, 2);
  if (!validPrefixes.includes(prefix)) {
    return false;
  }

  // Calculate checksum using modulo 11
  const multiplicadores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let suma = 0;

  for (let i = 0; i < 10; i++) {
    suma += parseInt(cleanCuit[i]) * multiplicadores[i];
  }

  let digitoVerificador = 11 - (suma % 11);

  // Handle special cases
  if (digitoVerificador === 11) {
    digitoVerificador = 0;
  } else if (digitoVerificador === 10) {
    digitoVerificador = 9;
  }

  return digitoVerificador === parseInt(cleanCuit[10]);
};

/**
 * Format CUIT for display
 * @param cuit - CUIT string to format
 * @returns formatted CUIT string (XX-XXXXXXXX-X)
 */
export const formatCUIT = (cuit: string): string => {
  const clean = cuit.replace(/[^0-9]/g, '');

  if (clean.length !== 11) {
    return cuit; // Return original if invalid length
  }

  return `${clean.substr(0, 2)}-${clean.substr(2, 8)}-${clean.substr(10, 1)}`;
};

/**
 * Clean CUIT string
 * @param cuit - CUIT string to clean
 * @returns CUIT with only numbers
 */
export const cleanCUIT = (cuit: string): string => {
  return cuit.replace(/[^0-9]/g, '');
};

/**
 * Get CUIT type description
 * @param cuit - CUIT string
 * @returns Type description
 */
export const getCUITType = (cuit: string): string => {
  const clean = cleanCUIT(cuit);
  if (clean.length < 2) return 'Inválido';

  const prefix = clean.substring(0, 2);
  const types: Record<string, string> = {
    '20': 'Persona Física - Masculino',
    '23': 'Persona Física - Genérico',
    '24': 'Persona Física - Empresa Unipersonal',
    '27': 'Persona Física - Femenino',
    '30': 'Persona Jurídica',
    '33': 'Persona Jurídica',
    '34': 'Persona Jurídica'
  };

  return types[prefix] || 'Desconocido';
};

/**
 * Validate and format CUIT input in real-time
 * @param value - Input value
 * @returns Object with formatted value and validation status
 */
export const validateAndFormatCUIT = (value: string): {
  value: string;
  formatted: string;
  isValid: boolean;
  error?: string;
} => {
  const clean = cleanCUIT(value);

  // Allow partial input
  if (clean.length === 0) {
    return { value: '', formatted: '', isValid: true };
  }

  if (clean.length < 11) {
    return {
      value: clean,
      formatted: clean,
      isValid: false,
      error: `Faltan ${11 - clean.length} dígitos`
    };
  }

  if (clean.length > 11) {
    return {
      value: clean.substring(0, 11),
      formatted: formatCUIT(clean.substring(0, 11)),
      isValid: false,
      error: 'CUIT no puede tener más de 11 dígitos'
    };
  }

  const isValid = validateCUIT(clean);
  return {
    value: clean,
    formatted: formatCUIT(clean),
    isValid,
    error: isValid ? undefined : 'CUIT inválido'
  };
};