/**
 * Event Store Interface
 * Sprint 4 - Persistencia de eventos para Event Sourcing
 */
import { DomainEvent } from '@/shared/events/EventBus';
export interface StoredEvent extends DomainEvent {
  id: string;
  streamId: string;
  streamVersion: number;
  storedAt: Date;
  processedAt?: Date;
  retryCount?: number;
  error?: string;
}
export interface EventStream {
  streamId: string;
  aggregateType: string;
  aggregateId: string;
  version: number;
  events: StoredEvent[];
  createdAt: Date;
  updatedAt: Date;
}
export interface IEventStore {
  // Guardar evento
  append(event: DomainEvent, streamId: string): Promise<StoredEvent>;
  // Obtener eventos de un stream
  getEvents(streamId: string, fromVersion?: number): Promise<StoredEvent[]>;
  // Obtener eventos por agregado
  getEventsByAggregate(aggregateId: string, fromDate?: Date): Promise<StoredEvent[]>;
  // Obtener eventos para replay
  getEventsForReplay(fromDate: Date, toDate?: Date): Promise<StoredEvent[]>;
  // Marcar evento como procesado
  markAsProcessed(eventId: string): Promise<void>;
  // Obtener eventos fallidos (para DLQ)
  getFailedEvents(limit?: number): Promise<StoredEvent[]>;
  // Actualizar contador de reintentos
  incrementRetryCount(eventId: string, error: string): Promise<void>;
  // Obtener snapshot de un agregado
  getSnapshot(aggregateId: string): Promise<any>;
  // Guardar snapshot
  saveSnapshot(aggregateId: string, snapshot: any, version: number): Promise<void>;
}
