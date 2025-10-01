/**
 * Schedule Manager - Sprint 07
 * Manages time-based triggers and business hours
 */

import { injectable } from 'inversify';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';

interface IBusinessHours {
  monday?: { start: string; end: string; };
  tuesday?: { start: string; end: string; };
  wednesday?: { start: string; end: string; };
  thursday?: { start: string; end: string; };
  friday?: { start: string; end: string; };
  saturday?: { start: string; end: string; };
  sunday?: { start: string; end: string; };
}

interface ISchedule {
  timezone?: string;
  business_hours?: IBusinessHours;
  holidays?: string[];
  special_dates?: Array<{
    date: string;
    hours?: { start: string; end: string; };
    closed?: boolean;
  }>;
}

@injectable()
export class ScheduleManager {
  private logger: any;
  private defaultTimezone: string = 'UTC';

  constructor() {
    this.logger = LoggerFactory.create({ file: __filename });
  }

  /**
   * Check if current time is within schedule
   */
  isWithinSchedule(schedule: ISchedule): boolean {
    const now = this.getCurrentTime(schedule.timezone);
    const dayOfWeek = this.getDayName(now);
    const dateStr = this.getDateString(now);

    // Check if today is a holiday
    if (schedule.holidays?.includes(dateStr)) {
      return false;
    }

    // Check special dates
    const specialDate = schedule.special_dates?.find(sd => sd.date === dateStr);
    if (specialDate) {
      if (specialDate.closed) return false;
      if (specialDate.hours) {
        return this.isTimeInRange(now, specialDate.hours.start, specialDate.hours.end);
      }
    }

    // Check regular business hours
    if (schedule.business_hours) {
      const dayHours = schedule.business_hours[dayOfWeek as keyof IBusinessHours];
      if (dayHours) {
        return this.isTimeInRange(now, dayHours.start, dayHours.end);
      }
    }

    return false;
  }

  /**
   * Get next available time within schedule
   */
  getNextAvailableTime(schedule: ISchedule): Date | null {
    const timezone = schedule.timezone || this.defaultTimezone;
    let checkDate = this.getCurrentTime(timezone);
    const maxDays = 30; // Check up to 30 days ahead

    for (let i = 0; i < maxDays; i++) {
      checkDate = new Date(checkDate.getTime() + (i > 0 ? 86400000 : 0));
      const dayOfWeek = this.getDayName(checkDate);
      const dateStr = this.getDateString(checkDate);

      // Skip holidays
      if (schedule.holidays?.includes(dateStr)) {
        continue;
      }

      // Check special dates
      const specialDate = schedule.special_dates?.find(sd => sd.date === dateStr);
      if (specialDate?.closed) {
        continue;
      }

      // Get hours for this day
      let hours = specialDate?.hours;
      if (!hours && schedule.business_hours) {
        const dayHours = schedule.business_hours[dayOfWeek as keyof IBusinessHours];
        if (dayHours) {
          hours = dayHours;
        }
      }

      if (hours) {
        const startTime = this.parseTime(hours.start, checkDate);
        if (startTime > this.getCurrentTime(timezone)) {
          return startTime;
        }
      }
    }

    return null;
  }

  /**
   * Check if time is in range
   */
  private isTimeInRange(date: Date, startTime: string, endTime: string): boolean {
    const start = this.parseTime(startTime, date);
    const end = this.parseTime(endTime, date);
    const current = date.getTime();

    // Handle overnight ranges
    if (end < start) {
      return current >= start.getTime() || current <= end.getTime();
    }

    return current >= start.getTime() && current <= end.getTime();
  }

  /**
   * Parse time string to Date
   */
  private parseTime(timeStr: string, baseDate: Date): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const result = new Date(baseDate);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  /**
   * Get current time in timezone
   */
  private getCurrentTime(timezone?: string): Date {
    // For simplicity, using system time
    // In production, use a library like moment-timezone
    return new Date();
  }

  /**
   * Get day name from date
   */
  private getDayName(date: Date): string {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  }

  /**
   * Get date string in YYYY-MM-DD format
   */
  private getDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Calculate business hours overlap
   */
  calculateOverlap(schedule1: ISchedule, schedule2: ISchedule): IBusinessHours {
    const overlap: IBusinessHours = {};
    const days: Array<keyof IBusinessHours> = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    for (const day of days) {
      const hours1 = schedule1.business_hours?.[day];
      const hours2 = schedule2.business_hours?.[day];

      if (hours1 && hours2) {
        const start = this.maxTime(hours1.start, hours2.start);
        const end = this.minTime(hours1.end, hours2.end);

        if (start < end) {
          overlap[day] = { start, end };
        }
      }
    }

    return overlap;
  }

  /**
   * Get maximum time
   */
  private maxTime(time1: string, time2: string): string {
    return time1 > time2 ? time1 : time2;
  }

  /**
   * Get minimum time
   */
  private minTime(time1: string, time2: string): string {
    return time1 < time2 ? time1 : time2;
  }

  /**
   * Validate schedule format
   */
  validateSchedule(schedule: ISchedule): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate business hours
    if (schedule.business_hours) {
      for (const [day, hours] of Object.entries(schedule.business_hours)) {
        if (!this.isValidTimeFormat(hours.start)) {
          errors.push(`Invalid start time for ${day}: ${hours.start}`);
        }
        if (!this.isValidTimeFormat(hours.end)) {
          errors.push(`Invalid end time for ${day}: ${hours.end}`);
        }
      }
    }

    // Validate holidays
    if (schedule.holidays) {
      for (const holiday of schedule.holidays) {
        if (!this.isValidDateFormat(holiday)) {
          errors.push(`Invalid holiday date format: ${holiday}`);
        }
      }
    }

    // Validate special dates
    if (schedule.special_dates) {
      for (const special of schedule.special_dates) {
        if (!this.isValidDateFormat(special.date)) {
          errors.push(`Invalid special date format: ${special.date}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if time format is valid (HH:MM)
   */
  private isValidTimeFormat(time: string): boolean {
    const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return regex.test(time);
  }

  /**
   * Check if date format is valid (YYYY-MM-DD)
   */
  private isValidDateFormat(date: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    return regex.test(date);
  }
}