/**
 * Dead Letter Queue Interface
 * Sprint 4 - Manejo de eventos fallidos
 */
import { DomainEvent } from '@/shared/events/EventBus';
export interface DeadLetterEvent {
  id: string;
  originalEvent: DomainEvent;
  failureReason: string;
  failureCount: number;
  firstFailedAt: Date;
  lastFailedAt: Date;
  nextRetryAt?: Date;
  status: 'pending' | 'retrying' | 'failed' | 'resolved';
  metadata?: {
    stackTrace?: string;
    contextData?: any;
  };
}
export interface RetryPolicy {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: string[];
}
export interface IDeadLetterQueue {
  // Enviar evento a DLQ
  send(event: DomainEvent, error: Error): Promise<void>;
  // Obtener eventos para reintentar
  getEventsToRetry(limit?: number): Promise<DeadLetterEvent[]>;
  // Reintentar evento
  retry(eventId: string): Promise<boolean>;
  // Reintentar todos los eventos pendientes
  retryAll(): Promise<{ success: number; failed: number }>;
  // Marcar evento como resuelto
  resolve(eventId: string, resolution?: string): Promise<void>;
  // Eliminar eventos antiguos
  purge(olderThanDays: number): Promise<number>;
  // Obtener estadísticas
  getStats(): Promise<{
    pending: number;
    retrying: number;
    failed: number;
    resolved: number;
  }>;
  // Configurar política de reintentos
  setRetryPolicy(eventType: string, policy: RetryPolicy): void;
}
