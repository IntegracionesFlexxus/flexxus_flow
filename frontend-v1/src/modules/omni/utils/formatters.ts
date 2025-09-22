// utils/formatters.ts
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';

export const formatMessageTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  // Menos de 1 minuto
  if (diff < 60000) {
    return 'ahora';
  }

  // Menos de 1 hora
  if (diff < 3600000) {
    return formatDistanceToNow(d, { locale: es, addSuffix: false });
  }

  // Mismo día
  if (d.toDateString() === now.toDateString()) {
    return format(d, 'HH:mm');
  }

  // Esta semana
  if (diff < 604800000) {
    return format(d, 'EEEE HH:mm', { locale: es });
  }

  // Más antiguo
  return format(d, 'dd/MM/yyyy HH:mm');
};

export const formatChannelName = (type: string): string => {
  const names: Record<string, string> = {
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    email: 'Correo',
    sms: 'SMS'
  };
  return names[type] || type;
};

export const getPriorityColor = (priority: string): string => {
  const colors: Record<string, string> = {
    urgent: '#d32f2f',
    high: '#f57c00',
    normal: '#388e3c',
    low: '#616161'
  };
  return colors[priority] || '#616161';
};

export const formatPhoneNumber = (phone: string): string => {
  // Formato básico para números de teléfono
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

export const truncateText = (text: string, length: number = 50): string => {
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
};

export const getInitials = (firstName?: string, lastName?: string): string => {
  const first = firstName?.charAt(0).toUpperCase() || '';
  const last = lastName?.charAt(0).toUpperCase() || '';
  return first + last || '?';
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getRelativeTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: es });
};