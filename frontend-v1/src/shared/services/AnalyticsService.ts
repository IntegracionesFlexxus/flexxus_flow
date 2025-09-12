/**
 * Analytics Service - Sprint 3
 * Servicio avanzado de analytics y telemetría
 * Implementación con principios SOLID y Clean Code
 */

import { BaseService } from './BaseService';

/**
 * Event types
 */
export type EventType = 
  | 'page_view'
  | 'user_action'
  | 'error'
  | 'performance'
  | 'custom'
  | 'conversion'
  | 'engagement';

/**
 * Event category
 */
export type EventCategory = 
  | 'navigation'
  | 'interaction'
  | 'transaction'
  | 'social'
  | 'form'
  | 'media'
  | 'search'
  | 'download';

/**
 * Analytics event
 */
export interface AnalyticsEvent {
  type: EventType;
  category?: EventCategory;
  action: string;
  label?: string;
  value?: number;
  properties?: Record<string, any>;
  timestamp?: Date;
  sessionId?: string;
  userId?: string;
}

/**
 * Page view data
 */
export interface PageView {
  path: string;
  title: string;
  referrer?: string;
  duration?: number;
  scrollDepth?: number;
  exitPage?: boolean;
}

/**
 * User profile for analytics
 */
export interface UserProfile {
  userId: string;
  traits?: {
    email?: string;
    name?: string;
    company?: string;
    plan?: string;
    role?: string;
    createdAt?: Date;
    [key: string]: any;
  };
  segments?: string[];
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  pageLoadTime?: number;
  domContentLoadedTime?: number;
  firstPaint?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  timeToInteractive?: number;
  totalBlockingTime?: number;
  cumulativeLayoutShift?: number;
  firstInputDelay?: number;
}

/**
 * Error tracking
 */
export interface ErrorEvent {
  message: string;
  stack?: string;
  type?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
  userAgent?: string;
  url?: string;
}

/**
 * Conversion tracking
 */
export interface ConversionEvent {
  goalId: string;
  goalName: string;
  value?: number;
  currency?: string;
  properties?: Record<string, any>;
}

/**
 * Analytics provider interface
 * Strategy pattern for different analytics providers
 */
interface AnalyticsProvider {
  name: string;
  initialize(config: any): Promise<void>;
  track(event: AnalyticsEvent): Promise<void>;
  identify(profile: UserProfile): Promise<void>;
  page(data: PageView): Promise<void>;
  setUserProperties(properties: Record<string, any>): void;
  reset(): void;
}

/**
 * Google Analytics provider
 */
class GoogleAnalyticsProvider implements AnalyticsProvider {
  name = 'Google Analytics';
  private gtag: any;

  async initialize(config: { measurementId: string }): Promise<void> {
    if (typeof window === 'undefined') return;

    // Load gtag script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${config.measurementId}`;
    document.head.appendChild(script);

    // Initialize gtag
    (window as any).dataLayer = (window as any).dataLayer || [];
    this.gtag = function() {
      (window as any).dataLayer.push(arguments);
    };
    this.gtag('js', new Date());
    this.gtag('config', config.measurementId);
  }

  async track(event: AnalyticsEvent): Promise<void> {
    if (!this.gtag) return;

    this.gtag('event', event.action, {
      event_category: event.category,
      event_label: event.label,
      value: event.value,
      ...event.properties
    });
  }

  async identify(profile: UserProfile): Promise<void> {
    if (!this.gtag) return;

    this.gtag('set', {
      user_id: profile.userId,
      ...profile.traits
    });
  }

  async page(data: PageView): Promise<void> {
    if (!this.gtag) return;

    this.gtag('event', 'page_view', {
      page_path: data.path,
      page_title: data.title,
      page_referrer: data.referrer
    });
  }

  setUserProperties(properties: Record<string, any>): void {
    if (!this.gtag) return;
    this.gtag('set', properties);
  }

  reset(): void {
    if (!this.gtag) return;
    this.gtag('set', { user_id: null });
  }
}

/**
 * Custom analytics provider (internal)
 */
class CustomAnalyticsProvider implements AnalyticsProvider {
  name = 'Custom Analytics';
  private endpoint: string;
  private apiKey: string;
  private buffer: AnalyticsEvent[] = [];
  private flushInterval: number = 30000; // 30 seconds
  private flushTimer?: NodeJS.Timeout;

  async initialize(config: { endpoint: string; apiKey: string }): Promise<void> {
    this.endpoint = config.endpoint;
    this.apiKey = config.apiKey;
    this.startFlushTimer();
  }

  async track(event: AnalyticsEvent): Promise<void> {
    this.buffer.push({
      ...event,
      timestamp: new Date()
    });

    // Flush if buffer is large
    if (this.buffer.length >= 50) {
      await this.flush();
    }
  }

  async identify(profile: UserProfile): Promise<void> {
    await this.track({
      type: 'custom',
      action: 'identify',
      properties: profile
    });
  }

  async page(data: PageView): Promise<void> {
    await this.track({
      type: 'page_view',
      action: 'page_view',
      properties: data
    });
  }

  setUserProperties(properties: Record<string, any>): void {
    // Store in session for future events
    sessionStorage.setItem('analytics_user_props', JSON.stringify(properties));
  }

  reset(): void {
    sessionStorage.removeItem('analytics_user_props');
    this.buffer = [];
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const events = [...this.buffer];
    this.buffer = [];

    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify({ events })
      });
    } catch (error) {
      console.error('Failed to flush analytics events:', error);
      // Re-add events to buffer for retry
      this.buffer.unshift(...events);
    }
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}

/**
 * AnalyticsService
 * Principios aplicados:
 * - S: Responsabilidad única de gestión de analytics
 * - O: Extensible con nuevos providers
 * - L: Los providers son intercambiables
 * - I: Interface segregada para providers
 * - D: Depende de abstracciones (AnalyticsProvider)
 */
export class AnalyticsService extends BaseService {
  private static instance: AnalyticsService;
  private providers: AnalyticsProvider[] = [];
  private sessionId: string;
  private pageStartTime: number = 0;
  private currentPage: string = '';
  private isInitialized = false;
  private queue: Array<() => Promise<void>> = [];
  private userProfile?: UserProfile;

  private constructor() {
    super('/api/v1/analytics');
    this.sessionId = this.generateSessionId();
    this.setupPageTracking();
    this.setupErrorTracking();
    this.setupPerformanceTracking();
  }

  /**
   * Singleton pattern
   */
  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * Initialize analytics service
   */
  async initialize(config: {
    googleAnalytics?: { measurementId: string };
    customAnalytics?: { endpoint: string; apiKey: string };
    enabledProviders?: string[];
  }): Promise<void> {
    if (this.isInitialized) return;

    // Initialize Google Analytics
    if (config.googleAnalytics) {
      const ga = new GoogleAnalyticsProvider();
      await ga.initialize(config.googleAnalytics);
      this.providers.push(ga);
    }

    // Initialize Custom Analytics
    if (config.customAnalytics) {
      const custom = new CustomAnalyticsProvider();
      await custom.initialize(config.customAnalytics);
      this.providers.push(custom);
    }

    this.isInitialized = true;

    // Process queued events
    await this.processQueue();
  }

  /**
   * Process queued events
   */
  private async processQueue(): Promise<void> {
    while (this.queue.length > 0) {
      const action = this.queue.shift();
      if (action) {
        await action();
      }
    }
  }

  /**
   * Track event
   */
  async track(
    action: string,
    category?: EventCategory,
    label?: string,
    value?: number,
    properties?: Record<string, any>
  ): Promise<void> {
    const event: AnalyticsEvent = {
      type: 'user_action',
      category,
      action,
      label,
      value,
      properties: {
        ...properties,
        sessionId: this.sessionId,
        userId: this.userProfile?.userId,
        timestamp: new Date().toISOString()
      }
    };

    if (!this.isInitialized) {
      this.queue.push(() => this.sendToProviders(event));
      return;
    }

    await this.sendToProviders(event);
    await this.sendToBackend(event);
  }

  /**
   * Track page view
   */
  async page(path?: string, title?: string): Promise<void> {
    const pageView: PageView = {
      path: path || window.location.pathname,
      title: title || document.title,
      referrer: document.referrer,
      duration: this.pageStartTime ? Date.now() - this.pageStartTime : 0
    };

    // Update tracking
    this.currentPage = pageView.path;
    this.pageStartTime = Date.now();

    if (!this.isInitialized) {
      this.queue.push(() => this.sendPageView(pageView));
      return;
    }

    await this.sendPageView(pageView);
  }

  /**
   * Identify user
   */
  async identify(userId: string, traits?: Record<string, any>): Promise<void> {
    this.userProfile = {
      userId,
      traits
    };

    if (!this.isInitialized) {
      this.queue.push(() => this.sendIdentify(this.userProfile!));
      return;
    }

    await this.sendIdentify(this.userProfile);
  }

  /**
   * Track conversion
   */
  async trackConversion(conversion: ConversionEvent): Promise<void> {
    await this.track(
      'conversion',
      'transaction',
      conversion.goalName,
      conversion.value,
      {
        goalId: conversion.goalId,
        currency: conversion.currency,
        ...conversion.properties
      }
    );
  }

  /**
   * Track error
   */
  async trackError(error: ErrorEvent): Promise<void> {
    const event: AnalyticsEvent = {
      type: 'error',
      action: 'error',
      label: error.message,
      properties: {
        ...error,
        sessionId: this.sessionId,
        userId: this.userProfile?.userId,
        timestamp: new Date().toISOString()
      }
    };

    await this.sendToProviders(event);
    await this.sendToBackend(event);
  }

  /**
   * Track performance
   */
  async trackPerformance(metrics: PerformanceMetrics): Promise<void> {
    const event: AnalyticsEvent = {
      type: 'performance',
      action: 'performance_metrics',
      properties: {
        ...metrics,
        page: this.currentPage,
        sessionId: this.sessionId,
        userId: this.userProfile?.userId
      }
    };

    await this.sendToProviders(event);
    await this.sendToBackend(event);
  }

  /**
   * Track user timing
   */
  async trackTiming(
    category: string,
    variable: string,
    time: number,
    label?: string
  ): Promise<void> {
    await this.track('timing', 'performance' as EventCategory, label, time, {
      timingCategory: category,
      timingVariable: variable
    });
  }

  /**
   * Set user properties
   */
  setUserProperties(properties: Record<string, any>): void {
    this.providers.forEach(provider => {
      provider.setUserProperties(properties);
    });
  }

  /**
   * Reset analytics (logout)
   */
  reset(): void {
    this.userProfile = undefined;
    this.sessionId = this.generateSessionId();
    this.providers.forEach(provider => provider.reset());
  }

  // ==================== Private Methods ====================

  /**
   * Send event to all providers
   */
  private async sendToProviders(event: AnalyticsEvent): Promise<void> {
    await Promise.all(
      this.providers.map(provider => 
        provider.track(event).catch(err => 
          console.error(`Failed to track in ${provider.name}:`, err)
        )
      )
    );
  }

  /**
   * Send page view to all providers
   */
  private async sendPageView(pageView: PageView): Promise<void> {
    await Promise.all(
      this.providers.map(provider => 
        provider.page(pageView).catch(err => 
          console.error(`Failed to track page in ${provider.name}:`, err)
        )
      )
    );
  }

  /**
   * Send identify to all providers
   */
  private async sendIdentify(profile: UserProfile): Promise<void> {
    await Promise.all(
      this.providers.map(provider => 
        provider.identify(profile).catch(err => 
          console.error(`Failed to identify in ${provider.name}:`, err)
        )
      )
    );
  }

  /**
   * Send event to backend
   */
  private async sendToBackend(event: AnalyticsEvent): Promise<void> {
    try {
      await this.post('/events', event, { silent: true });
    } catch (error) {
      console.error('Failed to send analytics to backend:', error);
    }
  }

  /**
   * Setup automatic page tracking
   */
  private setupPageTracking(): void {
    if (typeof window === 'undefined') return;

    // Track initial page
    this.page();

    // Track route changes (for SPAs)
    const originalPushState = history.pushState;
    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      this.page();
    };

    window.addEventListener('popstate', () => {
      this.page();
    });

    // Track page visibility
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.track('page_hidden', 'engagement');
      } else {
        this.track('page_visible', 'engagement');
      }
    });
  }

  /**
   * Setup error tracking
   */
  private setupErrorTracking(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('error', (event) => {
      this.trackError({
        message: event.message,
        stack: event.error?.stack,
        type: 'javascript_error',
        severity: 'high',
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        message: event.reason?.message || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        type: 'unhandled_rejection',
        severity: 'high'
      });
    });
  }

  /**
   * Setup performance tracking
   */
  private setupPerformanceTracking(): void {
    if (typeof window === 'undefined' || !window.performance) return;

    // Track Web Vitals
    if ('PerformanceObserver' in window) {
      try {
        // LCP
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          this.trackPerformance({
            largestContentfulPaint: lastEntry.renderTime || lastEntry.loadTime
          });
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

        // FID
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const firstEntry = entries[0] as any;
          this.trackPerformance({
            firstInputDelay: firstEntry.processingStart - firstEntry.startTime
          });
        });
        fidObserver.observe({ type: 'first-input', buffered: true });

        // CLS
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          this.trackPerformance({
            cumulativeLayoutShift: clsValue
          });
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });
      } catch (error) {
        console.error('Failed to setup performance observers:', error);
      }
    }

    // Track page load metrics
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as any;
        if (navigation) {
          this.trackPerformance({
            pageLoadTime: navigation.loadEventEnd - navigation.fetchStart,
            domContentLoadedTime: navigation.domContentLoadedEventEnd - navigation.fetchStart,
            timeToInteractive: navigation.domInteractive - navigation.fetchStart
          });
        }
      }, 0);
    });
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ==================== Analytics Utilities ====================

  /**
   * Get analytics dashboard data
   */
  async getDashboard(
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<{
    overview: {
      totalEvents: number;
      uniqueUsers: number;
      avgSessionDuration: number;
      bounceRate: number;
    };
    events: Array<{ date: string; count: number }>;
    topPages: Array<{ path: string; views: number }>;
    userFlow: Array<{ from: string; to: string; count: number }>;
  }> {
    return this.get('/dashboard', {
      params: { dateFrom, dateTo },
      cache: true,
      cacheTime: 300000
    });
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(
    userId: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<{
    sessions: number;
    events: number;
    avgSessionDuration: number;
    lastSeen: Date;
    devices: string[];
    locations: string[];
    timeline: Array<{ date: string; events: number }>;
  }> {
    return this.get(`/users/${userId}`, {
      params: { dateFrom, dateTo },
      cache: true
    });
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(
    format: 'csv' | 'json',
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<void> {
    await this.downloadFile(
      `/export?format=${format}&dateFrom=${dateFrom}&dateTo=${dateTo}`,
      `analytics.${format}`
    );
  }
}

// Export singleton instance
export const analyticsService = AnalyticsService.getInstance();