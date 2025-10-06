/**
 * Calendar Integration Service - Sprint 21
 * Manages external calendar integrations (Google, Outlook, etc.)
 */

import { injectable, inject } from 'inversify';
import { EventEmitter } from 'events';
import { TYPES } from '@/container/types';
import { AppError, ErrorCode } from '@/shared/errors/AppError';
import { Logger } from 'winston';
import axios, { AxiosInstance } from 'axios';
import { Activity } from '../types/activity.types';

// Calendar Integration Types
export interface CalendarIntegration {
  id: number;
  company_id: number;
  user_id: number;
  provider: 'google' | 'outlook' | 'apple' | 'caldav' | 'exchange';
  provider_account_id: string;
  provider_account_email: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: Date;
  calendar_id: string;
  calendar_name: string;
  is_primary: boolean;
  sync_enabled: boolean;
  sync_direction: 'bidirectional' | 'from_crm' | 'to_crm';
  last_sync_at?: Date;
  status: 'active' | 'paused' | 'error' | 'revoked';
}

export interface CalendarEvent {
  id?: string;
  title: string;
  description?: string;
  start: Date | string;
  end: Date | string;
  allDay?: boolean;
  location?: string;
  attendees?: CalendarAttendee[];
  reminders?: CalendarReminder[];
  recurrence?: RecurrenceRule;
  status?: 'confirmed' | 'tentative' | 'cancelled';
  visibility?: 'public' | 'private';
  colorId?: string;
  conferenceData?: ConferenceData;
}

export interface CalendarAttendee {
  email: string;
  displayName?: string;
  responseStatus?: 'accepted' | 'declined' | 'tentative' | 'needsAction';
  optional?: boolean;
  organizer?: boolean;
}

export interface CalendarReminder {
  method: 'email' | 'popup' | 'sms';
  minutes: number;
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval?: number;
  count?: number;
  until?: Date | string;
  byDay?: string[]; // ['MO', 'TU', 'WE', etc.]
  byMonth?: number[];
  byMonthDay?: number[];
}

export interface ConferenceData {
  type: 'zoom' | 'teams' | 'meet' | 'webex';
  conferenceId?: string;
  conferenceUrl?: string;
  accessCode?: string;
}

export interface CalendarSyncResult {
  success: boolean;
  events_synced: number;
  events_created: number;
  events_updated: number;
  events_deleted: number;
  errors: string[];
}

// Provider-specific configurations
const PROVIDER_CONFIGS = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    apiBaseUrl: 'https://www.googleapis.com/calendar/v3',
    scopes: ['https://www.googleapis.com/auth/calendar']
  },
  outlook: {
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    apiBaseUrl: 'https://graph.microsoft.com/v1.0',
    scopes: ['Calendars.ReadWrite', 'User.Read']
  }
};

@injectable()
export class CalendarIntegrationService {
  private googleClient?: AxiosInstance;
  private outlookClient?: AxiosInstance;

  constructor(
    @inject(TYPES.EventEmitter) private eventEmitter: EventEmitter,
    @inject(TYPES.Logger) private logger: Logger,
    @inject(TYPES.ActivityRepository) private activityRepository: any,
    @inject(TYPES.CalendarIntegrationRepository) private calendarRepository: any,
    @inject(TYPES.CRMDatabaseConnection) private db: any
  ) {}

  /**
   * Initialize OAuth flow for calendar provider
   */
  async initializeOAuth(
    provider: 'google' | 'outlook',
    userId: number,
    redirectUri: string
  ): Promise<string> {
    const config = PROVIDER_CONFIGS[provider];
    if (!config) {
      throw new AppError(ErrorCode.INVALID_INPUT, `Unsupported calendar provider: ${provider}`, 400);
    }

    // Generate state token for security
    const state = this.generateStateToken(userId, provider);

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: process.env[`${provider.toUpperCase()}_CLIENT_ID`] || '',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state: state,
      access_type: 'offline', // For Google
      prompt: 'consent' // Force consent to get refresh token
    });

    return `${config.authUrl}?${params.toString()}`;
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleOAuthCallback(
    provider: 'google' | 'outlook',
    code: string,
    userId: number,
    redirectUri: string
  ): Promise<CalendarIntegration> {
    try {
      const config = PROVIDER_CONFIGS[provider];
      const tokens = await this.exchangeCodeForTokens(provider, code, redirectUri);

      // Get user profile and calendar info
      const profile = await this.getUserProfile(provider, tokens.access_token);
      const calendars = await this.listCalendars(provider, tokens.access_token);

      // Store integration in database
      const integration = await this.saveIntegration({
        user_id: userId,
        company_id: 1, // Get from user context
        provider,
        provider_account_id: profile.id,
        provider_account_email: profile.email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000),
        calendar_id: calendars[0]?.id || 'primary',
        calendar_name: calendars[0]?.name || 'Primary Calendar',
        is_primary: true,
        sync_enabled: true,
        sync_direction: 'bidirectional',
        status: 'active'
      });

      // Trigger initial sync
      this.performInitialSync(integration).catch(error => {
        this.logger.error('Initial sync failed', { error, integration });
      });

      return integration;
    } catch (error) {
      this.logger.error('OAuth callback failed', { error, provider, userId });
      throw new AppError(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to connect calendar', 500);
    }
  }

  /**
   * Sync activities with external calendar
   */
  async syncCalendar(integrationId: number): Promise<CalendarSyncResult> {
    const result: CalendarSyncResult = {
      success: false,
      events_synced: 0,
      events_created: 0,
      events_updated: 0,
      events_deleted: 0,
      errors: []
    };

    try {
      // Get integration details
      const integration = await this.getIntegration(integrationId);
      if (!integration) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Calendar integration not found', 404);
      }

      // Check and refresh token if needed
      await this.ensureValidToken(integration);

      // Get activities from CRM
      const activities = await this.getActivitiesToSync(integration.user_id);

      // Get events from external calendar
      const externalEvents = await this.getExternalEvents(integration);

      // Perform bidirectional sync
      if (integration.sync_direction === 'bidirectional' || integration.sync_direction === 'to_crm') {
        await this.syncFromExternalToCRM(integration, externalEvents, result);
      }

      if (integration.sync_direction === 'bidirectional' || integration.sync_direction === 'from_crm') {
        await this.syncFromCRMToExternal(integration, activities, result);
      }

      // Update last sync timestamp
      await this.updateLastSync(integrationId);

      result.success = true;
      result.events_synced = result.events_created + result.events_updated;

      // Emit sync completed event
      this.eventEmitter.emit('calendar:sync:completed', {
        integrationId,
        result,
        timestamp: new Date()
      });

      return result;
    } catch (error: any) {
      this.logger.error('Calendar sync failed', { error, integrationId });
      result.errors.push(error.message);

      // Update integration status if error
      await this.updateIntegrationStatus(integrationId, 'error', error.message);

      return result;
    }
  }

  /**
   * Create event in external calendar
   */
  async createExternalEvent(
    integration: CalendarIntegration,
    activity: Activity
  ): Promise<string> {
    const event = this.activityToCalendarEvent(activity);

    switch (integration.provider) {
      case 'google':
        return this.createGoogleEvent(integration, event);
      case 'outlook':
        return this.createOutlookEvent(integration, event);
      default:
        throw new AppError(ErrorCode.INVALID_INPUT, `Unsupported provider: ${integration.provider}`, 400);
    }
  }

  /**
   * Update event in external calendar
   */
  async updateExternalEvent(
    integration: CalendarIntegration,
    eventId: string,
    activity: Activity
  ): Promise<void> {
    const event = this.activityToCalendarEvent(activity);

    switch (integration.provider) {
      case 'google':
        await this.updateGoogleEvent(integration, eventId, event);
        break;
      case 'outlook':
        await this.updateOutlookEvent(integration, eventId, event);
        break;
      default:
        throw new AppError(ErrorCode.INVALID_INPUT, `Unsupported provider: ${integration.provider}`, 400);
    }
  }

  /**
   * Delete event from external calendar
   */
  async deleteExternalEvent(
    integration: CalendarIntegration,
    eventId: string
  ): Promise<void> {
    switch (integration.provider) {
      case 'google':
        await this.deleteGoogleEvent(integration, eventId);
        break;
      case 'outlook':
        await this.deleteOutlookEvent(integration, eventId);
        break;
      default:
        throw new AppError(ErrorCode.INVALID_INPUT, `Unsupported provider: ${integration.provider}`, 400);
    }
  }

  /**
   * Get available time slots for scheduling
   */
  async getAvailableSlots(
    userId: number,
    startDate: Date,
    endDate: Date,
    duration: number,
    workingHours?: { start: string; end: string }
  ): Promise<Array<{ start: Date; end: Date }>> {
    const slots: Array<{ start: Date; end: Date }> = [];

    // Get user's calendar integrations
    const integrations = await this.getUserIntegrations(userId);

    // Get busy times from all calendars
    const busyTimes = await this.getBusyTimes(integrations, startDate, endDate);

    // Calculate available slots
    const defaultWorkingHours = workingHours || { start: '09:00', end: '17:00' };

    const currentDate = new Date(startDate);
    while (currentDate < endDate) {
      if (this.isWorkingDay(currentDate)) {
        const daySlots = this.findDaySlots(
          currentDate,
          busyTimes,
          duration,
          defaultWorkingHours
        );
        slots.push(...daySlots);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return slots;
  }

  // Private helper methods

  private generateStateToken(userId: number, provider: string): string {
    // In production, use a more secure method with encryption
    const data = `${userId}:${provider}:${Date.now()}`;
    return Buffer.from(data).toString('base64');
  }

  private async exchangeCodeForTokens(
    provider: string,
    code: string,
    redirectUri: string
  ): Promise<any> {
    const config = PROVIDER_CONFIGS[provider as keyof typeof PROVIDER_CONFIGS];

    const response = await axios.post(config.tokenUrl, {
      code,
      client_id: process.env[`${provider.toUpperCase()}_CLIENT_ID`],
      client_secret: process.env[`${provider.toUpperCase()}_CLIENT_SECRET`],
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    });

    return response.data;
  }

  private async getUserProfile(provider: string, accessToken: string): Promise<any> {
    switch (provider) {
      case 'google':
        const googleResponse = await axios.get(
          'https://www.googleapis.com/oauth2/v2/userinfo',
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        return googleResponse.data;

      case 'outlook':
        const outlookResponse = await axios.get(
          'https://graph.microsoft.com/v1.0/me',
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        return outlookResponse.data;

      default:
        throw new AppError(ErrorCode.INVALID_INPUT, `Unsupported provider: ${provider}`, 400);
    }
  }

  private async listCalendars(provider: string, accessToken: string): Promise<any[]> {
    switch (provider) {
      case 'google':
        const googleResponse = await axios.get(
          'https://www.googleapis.com/calendar/v3/users/me/calendarList',
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        return googleResponse.data.items;

      case 'outlook':
        const outlookResponse = await axios.get(
          'https://graph.microsoft.com/v1.0/me/calendars',
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        return outlookResponse.data.value;

      default:
        return [];
    }
  }

  private async saveIntegration(data: Partial<CalendarIntegration>): Promise<CalendarIntegration> {
    const query = `
      INSERT INTO calendar_integrations (
        company_id, user_id, provider, provider_account_id,
        provider_account_email, access_token, refresh_token,
        token_expires_at, calendar_id, calendar_name,
        is_primary, sync_enabled, sync_direction, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (user_id, provider, calendar_id)
      DO UPDATE SET
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        token_expires_at = EXCLUDED.token_expires_at,
        status = EXCLUDED.status,
        updated_at = NOW()
      RETURNING *
    `;

    const result = await this.db.query(query, [
      data.company_id,
      data.user_id,
      data.provider,
      data.provider_account_id,
      data.provider_account_email,
      data.access_token,
      data.refresh_token,
      data.token_expires_at,
      data.calendar_id,
      data.calendar_name,
      data.is_primary,
      data.sync_enabled,
      data.sync_direction,
      data.status
    ]);

    return result.rows[0];
  }

  private async getIntegration(id: number): Promise<CalendarIntegration | null> {
    const query = 'SELECT * FROM calendar_integrations WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.rows[0] || null;
  }

  private async getUserIntegrations(userId: number): Promise<CalendarIntegration[]> {
    const query = 'SELECT * FROM calendar_integrations WHERE user_id = $1 AND sync_enabled = true';
    const result = await this.db.query(query, [userId]);
    return result.rows;
  }

  private async ensureValidToken(integration: CalendarIntegration): Promise<void> {
    const now = new Date();
    if (integration.token_expires_at && new Date(integration.token_expires_at) <= now) {
      await this.refreshAccessToken(integration);
    }
  }

  private async refreshAccessToken(integration: CalendarIntegration): Promise<void> {
    const config = PROVIDER_CONFIGS[integration.provider as keyof typeof PROVIDER_CONFIGS];

    try {
      const response = await axios.post(config.tokenUrl, {
        refresh_token: integration.refresh_token,
        client_id: process.env[`${integration.provider.toUpperCase()}_CLIENT_ID`],
        client_secret: process.env[`${integration.provider.toUpperCase()}_CLIENT_SECRET`],
        grant_type: 'refresh_token'
      });

      // Update tokens in database
      await this.db.query(
        `UPDATE calendar_integrations
         SET access_token = $1, token_expires_at = $2, updated_at = NOW()
         WHERE id = $3`,
        [
          response.data.access_token,
          new Date(Date.now() + response.data.expires_in * 1000),
          integration.id
        ]
      );

      // Update the integration object
      integration.access_token = response.data.access_token;
      integration.token_expires_at = new Date(Date.now() + response.data.expires_in * 1000);
    } catch (error) {
      this.logger.error('Token refresh failed', { error, integration });
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Failed to refresh calendar token', 401);
    }
  }

  private async getActivitiesToSync(userId: number): Promise<Activity[]> {
    // Get activities that should be synced to calendar
    const query = `
      SELECT * FROM activities
      WHERE assigned_to = $1
      AND type IN ('meeting', 'call', 'event')
      AND status NOT IN ('cancelled', 'completed')
      AND (start_time IS NOT NULL OR due_date IS NOT NULL)
      ORDER BY COALESCE(start_time, due_date)
    `;

    const result = await this.db.query(query, [userId]);
    return result.rows;
  }

  private async getExternalEvents(integration: CalendarIntegration): Promise<CalendarEvent[]> {
    switch (integration.provider) {
      case 'google':
        return this.getGoogleEvents(integration);
      case 'outlook':
        return this.getOutlookEvents(integration);
      default:
        return [];
    }
  }

  private async performInitialSync(integration: CalendarIntegration): Promise<void> {
    await this.syncCalendar(integration.id);
  }

  private async syncFromExternalToCRM(
    integration: CalendarIntegration,
    events: CalendarEvent[],
    result: CalendarSyncResult
  ): Promise<void> {
    for (const event of events) {
      try {
        // Check if event already exists in CRM
        const existingActivity = await this.findActivityByExternalId(event.id!);

        if (existingActivity) {
          // Update existing activity
          await this.updateActivityFromEvent(existingActivity.id, event, integration);
          result.events_updated++;
        } else {
          // Create new activity
          await this.createActivityFromEvent(event, integration);
          result.events_created++;
        }
      } catch (error: any) {
        this.logger.error('Failed to sync event to CRM', { error, event });
        result.errors.push(`Event ${event.title}: ${error.message}`);
      }
    }
  }

  private async syncFromCRMToExternal(
    integration: CalendarIntegration,
    activities: Activity[],
    result: CalendarSyncResult
  ): Promise<void> {
    for (const activity of activities) {
      try {
        if (activity.calendar_event_id) {
          // Update existing event
          await this.updateExternalEvent(integration, activity.calendar_event_id, activity);
          result.events_updated++;
        } else {
          // Create new event
          const eventId = await this.createExternalEvent(integration, activity);

          // Update activity with external event ID
          await this.db.query(
            'UPDATE activities SET calendar_event_id = $1 WHERE id = $2',
            [eventId, activity.id]
          );

          result.events_created++;
        }
      } catch (error: any) {
        this.logger.error('Failed to sync activity to calendar', { error, activity });
        result.errors.push(`Activity ${activity.subject}: ${error.message}`);
      }
    }
  }

  private activityToCalendarEvent(activity: Activity): CalendarEvent {
    return {
      title: activity.subject,
      description: activity.description,
      start: activity.start_time || activity.due_date,
      end: activity.end_time || activity.due_date,
      allDay: activity.all_day,
      location: activity.location,
      attendees: activity.attendees?.map((a: any) => ({
        email: a.email,
        displayName: a.name,
        responseStatus: a.status || 'needsAction'
      })),
      reminders: activity.reminder_minutes_before ? [{
        method: 'popup',
        minutes: activity.reminder_minutes_before
      }] : undefined
    };
  }

  private async findActivityByExternalId(externalId: string): Promise<Activity | null> {
    const query = 'SELECT * FROM activities WHERE calendar_event_id = $1';
    const result = await this.db.query(query, [externalId]);
    return result.rows[0] || null;
  }

  private async createActivityFromEvent(
    event: CalendarEvent,
    integration: CalendarIntegration
  ): Promise<void> {
    const activityData = {
      company_id: integration.company_id,
      type: 'meeting',
      subject: event.title,
      description: event.description,
      start_time: event.start,
      end_time: event.end,
      all_day: event.allDay,
      location: event.location,
      assigned_to: integration.user_id,
      calendar_event_id: event.id,
      calendar_provider: integration.provider,
      status: 'pending',
      attendees: event.attendees
    };

    await this.activityRepository.create(activityData, integration.user_id);
  }

  private async updateActivityFromEvent(
    activityId: number,
    event: CalendarEvent,
    integration: CalendarIntegration
  ): Promise<void> {
    const updateData = {
      subject: event.title,
      description: event.description,
      start_time: event.start,
      end_time: event.end,
      all_day: event.allDay,
      location: event.location,
      attendees: event.attendees
    };

    await this.activityRepository.update(
      activityId,
      integration.company_id,
      updateData,
      integration.user_id
    );
  }

  private async updateLastSync(integrationId: number): Promise<void> {
    await this.db.query(
      'UPDATE calendar_integrations SET last_sync_at = NOW() WHERE id = $1',
      [integrationId]
    );
  }

  private async updateIntegrationStatus(
    integrationId: number,
    status: string,
    errorMessage?: string
  ): Promise<void> {
    await this.db.query(
      `UPDATE calendar_integrations
       SET status = $1, error_message = $2, updated_at = NOW()
       WHERE id = $3`,
      [status, errorMessage, integrationId]
    );
  }

  // Google Calendar specific methods

  private async createGoogleEvent(
    integration: CalendarIntegration,
    event: CalendarEvent
  ): Promise<string> {
    const response = await axios.post(
      `https://www.googleapis.com/calendar/v3/calendars/${integration.calendar_id}/events`,
      this.transformToGoogleEvent(event),
      {
        headers: { Authorization: `Bearer ${integration.access_token}` }
      }
    );

    return response.data.id;
  }

  private async updateGoogleEvent(
    integration: CalendarIntegration,
    eventId: string,
    event: CalendarEvent
  ): Promise<void> {
    await axios.patch(
      `https://www.googleapis.com/calendar/v3/calendars/${integration.calendar_id}/events/${eventId}`,
      this.transformToGoogleEvent(event),
      {
        headers: { Authorization: `Bearer ${integration.access_token}` }
      }
    );
  }

  private async deleteGoogleEvent(
    integration: CalendarIntegration,
    eventId: string
  ): Promise<void> {
    await axios.delete(
      `https://www.googleapis.com/calendar/v3/calendars/${integration.calendar_id}/events/${eventId}`,
      {
        headers: { Authorization: `Bearer ${integration.access_token}` }
      }
    );
  }

  private async getGoogleEvents(integration: CalendarIntegration): Promise<CalendarEvent[]> {
    const response = await axios.get(
      `https://www.googleapis.com/calendar/v3/calendars/${integration.calendar_id}/events`,
      {
        headers: { Authorization: `Bearer ${integration.access_token}` },
        params: {
          timeMin: new Date().toISOString(),
          maxResults: 100,
          singleEvents: true,
          orderBy: 'startTime'
        }
      }
    );

    return response.data.items.map((item: any) => this.transformFromGoogleEvent(item));
  }

  private transformToGoogleEvent(event: CalendarEvent): any {
    return {
      summary: event.title,
      description: event.description,
      start: event.allDay
        ? { date: event.start }
        : { dateTime: event.start, timeZone: 'UTC' },
      end: event.allDay
        ? { date: event.end }
        : { dateTime: event.end, timeZone: 'UTC' },
      location: event.location,
      attendees: event.attendees?.map(a => ({
        email: a.email,
        displayName: a.displayName,
        responseStatus: a.responseStatus,
        optional: a.optional
      })),
      reminders: event.reminders ? {
        useDefault: false,
        overrides: event.reminders.map(r => ({
          method: r.method,
          minutes: r.minutes
        }))
      } : undefined
    };
  }

  private transformFromGoogleEvent(googleEvent: any): CalendarEvent {
    return {
      id: googleEvent.id,
      title: googleEvent.summary,
      description: googleEvent.description,
      start: googleEvent.start?.dateTime || googleEvent.start?.date,
      end: googleEvent.end?.dateTime || googleEvent.end?.date,
      allDay: !!googleEvent.start?.date,
      location: googleEvent.location,
      attendees: googleEvent.attendees?.map((a: any) => ({
        email: a.email,
        displayName: a.displayName,
        responseStatus: a.responseStatus,
        optional: a.optional,
        organizer: a.organizer
      }))
    };
  }

  // Outlook Calendar specific methods

  private async createOutlookEvent(
    integration: CalendarIntegration,
    event: CalendarEvent
  ): Promise<string> {
    const response = await axios.post(
      'https://graph.microsoft.com/v1.0/me/events',
      this.transformToOutlookEvent(event),
      {
        headers: { Authorization: `Bearer ${integration.access_token}` }
      }
    );

    return response.data.id;
  }

  private async updateOutlookEvent(
    integration: CalendarIntegration,
    eventId: string,
    event: CalendarEvent
  ): Promise<void> {
    await axios.patch(
      `https://graph.microsoft.com/v1.0/me/events/${eventId}`,
      this.transformToOutlookEvent(event),
      {
        headers: { Authorization: `Bearer ${integration.access_token}` }
      }
    );
  }

  private async deleteOutlookEvent(
    integration: CalendarIntegration,
    eventId: string
  ): Promise<void> {
    await axios.delete(
      `https://graph.microsoft.com/v1.0/me/events/${eventId}`,
      {
        headers: { Authorization: `Bearer ${integration.access_token}` }
      }
    );
  }

  private async getOutlookEvents(integration: CalendarIntegration): Promise<CalendarEvent[]> {
    const response = await axios.get(
      'https://graph.microsoft.com/v1.0/me/events',
      {
        headers: { Authorization: `Bearer ${integration.access_token}` },
        params: {
          $filter: `start/dateTime ge '${new Date().toISOString()}'`,
          $top: 100,
          $orderby: 'start/dateTime'
        }
      }
    );

    return response.data.value.map((item: any) => this.transformFromOutlookEvent(item));
  }

  private transformToOutlookEvent(event: CalendarEvent): any {
    return {
      subject: event.title,
      body: {
        contentType: 'HTML',
        content: event.description || ''
      },
      start: {
        dateTime: event.start,
        timeZone: 'UTC'
      },
      end: {
        dateTime: event.end,
        timeZone: 'UTC'
      },
      location: {
        displayName: event.location
      },
      attendees: event.attendees?.map(a => ({
        emailAddress: {
          address: a.email,
          name: a.displayName
        },
        type: a.optional ? 'optional' : 'required'
      })),
      isAllDay: event.allDay
    };
  }

  private transformFromOutlookEvent(outlookEvent: any): CalendarEvent {
    return {
      id: outlookEvent.id,
      title: outlookEvent.subject,
      description: outlookEvent.body?.content,
      start: outlookEvent.start?.dateTime,
      end: outlookEvent.end?.dateTime,
      allDay: outlookEvent.isAllDay,
      location: outlookEvent.location?.displayName,
      attendees: outlookEvent.attendees?.map((a: any) => ({
        email: a.emailAddress?.address,
        displayName: a.emailAddress?.name,
        responseStatus: a.status?.response?.toLowerCase(),
        optional: a.type === 'optional'
      }))
    };
  }

  // Utility methods

  private async getBusyTimes(
    integrations: CalendarIntegration[],
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ start: Date; end: Date }>> {
    const busyTimes: Array<{ start: Date; end: Date }> = [];

    for (const integration of integrations) {
      try {
        const events = await this.getExternalEvents(integration);
        events.forEach(event => {
          if (event.start && event.end) {
            busyTimes.push({
              start: new Date(event.start),
              end: new Date(event.end)
            });
          }
        });
      } catch (error) {
        this.logger.warn('Failed to get busy times from integration', { integration, error });
      }
    }

    // Also get busy times from CRM activities
    const activities = await this.getActivitiesToSync(integrations[0]?.user_id);
    activities.forEach(activity => {
      if (activity.start_time && activity.end_time) {
        busyTimes.push({
          start: new Date(activity.start_time),
          end: new Date(activity.end_time)
        });
      }
    });

    return busyTimes.sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  private isWorkingDay(date: Date): boolean {
    const day = date.getDay();
    return day >= 1 && day <= 5; // Monday to Friday
  }

  private findDaySlots(
    date: Date,
    busyTimes: Array<{ start: Date; end: Date }>,
    duration: number,
    workingHours: { start: string; end: string }
  ): Array<{ start: Date; end: Date }> {
    const slots: Array<{ start: Date; end: Date }> = [];

    // Set working hours for the day
    const [startHour, startMinute] = workingHours.start.split(':').map(Number);
    const [endHour, endMinute] = workingHours.end.split(':').map(Number);

    const dayStart = new Date(date);
    dayStart.setHours(startHour, startMinute, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(endHour, endMinute, 0, 0);

    // Filter busy times for this day
    const dayBusyTimes = busyTimes.filter(bt =>
      bt.start >= dayStart && bt.start < dayEnd
    );

    // Find available slots
    let currentTime = dayStart;

    for (const busyTime of dayBusyTimes) {
      // Check if there's a gap before this busy time
      if (busyTime.start.getTime() - currentTime.getTime() >= duration * 60 * 1000) {
        slots.push({
          start: new Date(currentTime),
          end: new Date(busyTime.start)
        });
      }
      currentTime = new Date(busyTime.end);
    }

    // Check if there's time after the last busy period
    if (dayEnd.getTime() - currentTime.getTime() >= duration * 60 * 1000) {
      slots.push({
        start: new Date(currentTime),
        end: dayEnd
      });
    }

    return slots;
  }
}

export default CalendarIntegrationService;