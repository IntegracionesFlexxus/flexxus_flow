import { useState, useCallback, useMemo, useEffect } from 'react';
import { addDays, addWeeks, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, isSameMonth, isSameDay, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';

export type CalendarView = 'month' | 'week' | 'day' | 'agenda';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  allDay: boolean;
  type: 'call' | 'email' | 'meeting' | 'task' | 'note' | 'event';
  color?: string;
  location?: string;
  attendees?: string[];
  recurring?: {
    pattern: string;
    interval: number;
    endDate?: Date;
  };
  calendarId?: string;
  externalEventId?: string;
}

export interface UseCalendarViewOptions {
  initialView?: CalendarView;
  initialDate?: Date;
  events?: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onEventDrop?: (event: CalendarEvent, newStart: Date, newEnd: Date) => void;
  onDateClick?: (date: Date) => void;
  onViewChange?: (view: CalendarView) => void;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  locale?: Locale;
}

export interface CalendarState {
  view: CalendarView;
  currentDate: Date;
  selectedDate: Date | null;
  viewRange: { start: Date; end: Date };
  visibleEvents: CalendarEvent[];
  hoveredDate: Date | null;
  draggedEvent: CalendarEvent | null;
}

export const useCalendarView = ({
  initialView = 'month',
  initialDate = new Date(),
  events = [],
  onEventClick,
  onEventDrop,
  onDateClick,
  onViewChange,
  weekStartsOn = 1,
  locale = es
}: UseCalendarViewOptions = {}) => {
  const [view, setView] = useState<CalendarView>(initialView);
  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);
  const [filters, setFilters] = useState<{
    types?: string[];
    calendars?: string[];
    search?: string;
  }>({});

  // Calculate view range based on current view and date
  const viewRange = useMemo(() => {
    switch (view) {
      case 'day':
        return {
          start: new Date(currentDate.setHours(0, 0, 0, 0)),
          end: new Date(currentDate.setHours(23, 59, 59, 999))
        };
      case 'week':
        return {
          start: startOfWeek(currentDate, { weekStartsOn }),
          end: endOfWeek(currentDate, { weekStartsOn })
        };
      case 'month':
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        return {
          start: startOfWeek(monthStart, { weekStartsOn }),
          end: endOfWeek(monthEnd, { weekStartsOn })
        };
      case 'agenda':
        return {
          start: new Date(),
          end: addMonths(new Date(), 3)
        };
      default:
        return {
          start: new Date(),
          end: new Date()
        };
    }
  }, [view, currentDate, weekStartsOn]);

  // Filter events within view range
  const visibleEvents = useMemo(() => {
    return events.filter(event => {
      // Check if event is within view range
      const eventInRange = isWithinInterval(event.startTime, viewRange) ||
        isWithinInterval(event.endTime, viewRange) ||
        (event.startTime <= viewRange.start && event.endTime >= viewRange.end);

      if (!eventInRange) return false;

      // Apply filters
      if (filters.types && filters.types.length > 0 && !filters.types.includes(event.type)) {
        return false;
      }

      if (filters.calendars && filters.calendars.length > 0 && event.calendarId && !filters.calendars.includes(event.calendarId)) {
        return false;
      }

      if (filters.search && !event.title.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [events, viewRange, filters]);

  // Navigation functions
  const navigateNext = useCallback(() => {
    switch (view) {
      case 'day':
        setCurrentDate(prev => addDays(prev, 1));
        break;
      case 'week':
        setCurrentDate(prev => addWeeks(prev, 1));
        break;
      case 'month':
        setCurrentDate(prev => addMonths(prev, 1));
        break;
    }
  }, [view]);

  const navigatePrevious = useCallback(() => {
    switch (view) {
      case 'day':
        setCurrentDate(prev => addDays(prev, -1));
        break;
      case 'week':
        setCurrentDate(prev => addWeeks(prev, -1));
        break;
      case 'month':
        setCurrentDate(prev => addMonths(prev, -1));
        break;
    }
  }, [view]);

  const navigateToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const navigateToDate = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  // View change
  const changeView = useCallback((newView: CalendarView) => {
    setView(newView);
    if (onViewChange) {
      onViewChange(newView);
    }
  }, [onViewChange]);

  // Event handlers
  const handleEventClick = useCallback((event: CalendarEvent) => {
    if (onEventClick) {
      onEventClick(event);
    }
  }, [onEventClick]);

  const handleDateClick = useCallback((date: Date) => {
    setSelectedDate(date);
    if (onDateClick) {
      onDateClick(date);
    }
  }, [onDateClick]);

  const handleEventDragStart = useCallback((event: CalendarEvent) => {
    setDraggedEvent(event);
  }, []);

  const handleEventDragEnd = useCallback(() => {
    setDraggedEvent(null);
  }, []);

  const handleEventDrop = useCallback((targetDate: Date, targetTime?: { hours: number; minutes: number }) => {
    if (!draggedEvent || !onEventDrop) return;

    const duration = draggedEvent.endTime.getTime() - draggedEvent.startTime.getTime();
    let newStart: Date;

    if (targetTime) {
      newStart = new Date(targetDate);
      newStart.setHours(targetTime.hours, targetTime.minutes, 0, 0);
    } else {
      newStart = new Date(targetDate);
      if (!draggedEvent.allDay) {
        newStart.setHours(
          draggedEvent.startTime.getHours(),
          draggedEvent.startTime.getMinutes(),
          0,
          0
        );
      }
    }

    const newEnd = new Date(newStart.getTime() + duration);

    onEventDrop(draggedEvent, newStart, newEnd);
    setDraggedEvent(null);
  }, [draggedEvent, onEventDrop]);

  // Get events for a specific date
  const getEventsForDate = useCallback((date: Date) => {
    return visibleEvents.filter(event => {
      if (event.allDay) {
        return isSameDay(event.startTime, date) ||
          (event.startTime <= date && event.endTime >= date);
      }
      return isSameDay(event.startTime, date);
    });
  }, [visibleEvents]);

  // Get calendar grid for month view
  const getMonthGrid = useCallback(() => {
    const grid: Date[][] = [];
    let currentWeek: Date[] = [];
    let date = new Date(viewRange.start);

    while (date <= viewRange.end) {
      currentWeek.push(new Date(date));

      if (currentWeek.length === 7) {
        grid.push(currentWeek);
        currentWeek = [];
      }

      date = addDays(date, 1);
    }

    if (currentWeek.length > 0) {
      grid.push(currentWeek);
    }

    return grid;
  }, [viewRange]);

  // Get time slots for day/week view
  const getTimeSlots = useCallback((startHour = 0, endHour = 24, interval = 60) => {
    const slots: Date[] = [];
    const baseDate = new Date(currentDate);
    baseDate.setHours(startHour, 0, 0, 0);

    while (baseDate.getHours() < endHour) {
      slots.push(new Date(baseDate));
      baseDate.setMinutes(baseDate.getMinutes() + interval);
    }

    return slots;
  }, [currentDate]);

  // Format helpers
  const formatDate = useCallback((date: Date, formatStr: string) => {
    return format(date, formatStr, { locale });
  }, [locale]);

  const getViewTitle = useCallback(() => {
    switch (view) {
      case 'day':
        return format(currentDate, 'EEEE, d MMMM yyyy', { locale });
      case 'week':
        const weekStart = startOfWeek(currentDate, { weekStartsOn });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn });
        return `${format(weekStart, 'd MMM', { locale })} - ${format(weekEnd, 'd MMM yyyy', { locale })}`;
      case 'month':
        return format(currentDate, 'MMMM yyyy', { locale });
      case 'agenda':
        return 'Agenda';
      default:
        return '';
    }
  }, [view, currentDate, weekStartsOn, locale]);

  // Check helpers
  const isToday = useCallback((date: Date) => {
    return isSameDay(date, new Date());
  }, []);

  const isSelected = useCallback((date: Date) => {
    return selectedDate ? isSameDay(date, selectedDate) : false;
  }, [selectedDate]);

  const isInCurrentMonth = useCallback((date: Date) => {
    return isSameMonth(date, currentDate);
  }, [currentDate]);

  // Filter management
  const updateFilters = useCallback((newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  // Recurring events expansion
  const expandRecurringEvents = useCallback((event: CalendarEvent): CalendarEvent[] => {
    if (!event.recurring) return [event];

    const expanded: CalendarEvent[] = [];
    const { pattern, interval, endDate } = event.recurring;
    let currentStart = new Date(event.startTime);
    let currentEnd = new Date(event.endTime);
    const duration = currentEnd.getTime() - currentStart.getTime();
    const maxDate = endDate || addMonths(viewRange.end, 3);

    while (currentStart <= maxDate && currentStart <= viewRange.end) {
      if (currentStart >= viewRange.start) {
        expanded.push({
          ...event,
          id: `${event.id}_${currentStart.getTime()}`,
          startTime: new Date(currentStart),
          endTime: new Date(currentEnd)
        });
      }

      switch (pattern) {
        case 'daily':
          currentStart = addDays(currentStart, interval);
          break;
        case 'weekly':
          currentStart = addWeeks(currentStart, interval);
          break;
        case 'monthly':
          currentStart = addMonths(currentStart, interval);
          break;
      }
      currentEnd = new Date(currentStart.getTime() + duration);
    }

    return expanded;
  }, [viewRange]);

  return {
    // State
    state: {
      view,
      currentDate,
      selectedDate,
      viewRange,
      visibleEvents,
      hoveredDate,
      draggedEvent
    } as CalendarState,

    // Navigation
    navigation: {
      next: navigateNext,
      previous: navigatePrevious,
      today: navigateToday,
      goToDate: navigateToDate
    },

    // View management
    viewControl: {
      changeView,
      getViewTitle
    },

    // Event handlers
    handlers: {
      onEventClick: handleEventClick,
      onDateClick: handleDateClick,
      onEventDragStart: handleEventDragStart,
      onEventDragEnd: handleEventDragEnd,
      onEventDrop: handleEventDrop
    },

    // Data getters
    data: {
      getEventsForDate,
      getMonthGrid,
      getTimeSlots,
      expandRecurringEvents
    },

    // Helpers
    helpers: {
      formatDate,
      isToday,
      isSelected,
      isInCurrentMonth
    },

    // Filters
    filters: {
      current: filters,
      update: updateFilters,
      clear: clearFilters
    },

    // Hover state
    hover: {
      date: hoveredDate,
      setDate: setHoveredDate
    }
  };
};

export default useCalendarView;