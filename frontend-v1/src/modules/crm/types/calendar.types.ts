export interface CalendarIntegration {
  id: number;
  provider: 'google' | 'outlook' | 'other';
  email: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  syncEnabled: boolean;
  syncDirection: 'import' | 'export' | 'both';
  lastSyncAt?: Date;
  settings?: Record<string, any>;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  allDay: boolean;
  location?: string;
  attendees?: string[];
  organizerEmail?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  recurrence?: string;
  reminders?: number[];
  meetingLink?: string;
  externalId?: string;
  source: 'local' | 'google' | 'outlook';
}

export interface AvailableSlot {
  start: Date;
  end: Date;
  duration: number;
  conflictingEvents?: CalendarEvent[];
}

export interface CalendarView {
  type: 'month' | 'week' | 'day' | 'agenda';
  startDate: Date;
  endDate: Date;
  events: CalendarEvent[];
}

export interface CalendarFilter {
  types?: string[];
  statuses?: string[];
  attendees?: string[];
  searchText?: string;
  showCompleted?: boolean;
  showCancelled?: boolean;
}