/**
 * @fileoverview Core Web Vitals monitoring for IOC Core
 * @description Tracks and reports Core Web Vitals metrics
 */

import { PerformanceMetric, WebVitalsMetrics } from './types';

export interface WebVitalsConfig {
  reportingEndpoint?: string;
  sampleRate?: number;
  enableConsoleLogging?: boolean;
}

export class CoreWebVitals {
  private config: WebVitalsConfig;
  private metrics: WebVitalsMetrics = {};
  private observer?: PerformanceObserver;

  constructor(config: WebVitalsConfig = {}) {
    this.config = {
      sampleRate: 1,
      enableConsoleLogging: false,
      ...config
    };
    this.initializeObserver();
  }

  private initializeObserver(): void {
    if (typeof window === 'undefined') return;

    this.observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.handlePerformanceEntry(entry);
      }
    });

    try {
      this.observer.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint'] });
    } catch (error) {
      console.warn('Performance observer not supported:', error);
    }
  }

  private handlePerformanceEntry(entry: PerformanceEntry): void {
    switch (entry.entryType) {
      case 'navigation':
        this.handleNavigationEntry(entry as PerformanceNavigationTiming);
        break;
      case 'paint':
        this.handlePaintEntry(entry as PerformancePaintTiming);
        break;
      case 'largest-contentful-paint':
        this.handleLCPEntry(entry as PerformanceEntry);
        break;
    }
  }

  private handleNavigationEntry(entry: PerformanceNavigationTiming): void {
    const ttfb = entry.responseStart - entry.fetchStart;
    this.metrics.ttfb = ttfb;
    this.reportMetric('TTFB', ttfb);
  }

  private handlePaintEntry(entry: PerformancePaintTiming): void {
    if (entry.name === 'first-contentful-paint') {
      this.metrics.fcp = entry.startTime;
      this.reportMetric('FCP', entry.startTime);
    }
  }

  private handleLCPEntry(entry: PerformanceEntry): void {
    this.metrics.lcp = entry.startTime;
    this.reportMetric('LCP', entry.startTime);
  }

  private reportMetric(name: string, value: number): void {
    if (Math.random() > (this.config.sampleRate || 1)) return;

    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      connection: this.getConnectionInfo()
    };

    if (this.config.enableConsoleLogging) {
      console.log(`[WebVitals] ${name}: ${value}ms`);
    }

    if (this.config.reportingEndpoint) {
      this.sendToEndpoint(metric);
    }
  }

  private getConnectionInfo(): string {
    const connection = (navigator as any).connection;
    return connection ? connection.effectiveType : 'unknown';
  }

  private async sendToEndpoint(metric: PerformanceMetric): Promise<void> {
    try {
      await fetch(this.config.reportingEndpoint!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metric)
      });
    } catch (error) {
      console.error('Failed to send metric:', error);
    }
  }

  public getMetrics(): WebVitalsMetrics {
    return { ...this.metrics };
  }

  public getCLS(): Promise<number> {
    return new Promise((resolve) => {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
      });
      
      observer.observe({ entryTypes: ['layout-shift'] });
      
      setTimeout(() => {
        observer.disconnect();
        resolve(clsValue);
      }, 5000);
    });
  }

  public getFID(): Promise<number> {
    return new Promise((resolve) => {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          resolve((entry as any).processingStart - entry.startTime);
          observer.disconnect();
          break;
        }
      });
      
      observer.observe({ entryTypes: ['first-input'] });
    });
  }

  public destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

export const webVitals = new CoreWebVitals();