/**
 * @fileoverview Performance tracker for IOC Core
 * @description Comprehensive performance tracking and monitoring
 */

import { PerformanceMetric, PerformanceReport, ResourceTiming } from './types';

export interface PerformanceTrackerConfig {
  enableResourceTiming?: boolean;
  enableUserTiming?: boolean;
  enableNavigationTiming?: boolean;
  sampleRate?: number;
  bufferSize?: number;
  reportingEndpoint?: string;
}

export class PerformanceTracker {
  private config: PerformanceTrackerConfig;
  private metrics: PerformanceMetric[] = [];
  private resourceTimings: ResourceTiming[] = [];
  private startTime: number;

  constructor(config: PerformanceTrackerConfig = {}) {
    this.config = {
      enableResourceTiming: true,
      enableUserTiming: true,
      enableNavigationTiming: true,
      sampleRate: 1,
      bufferSize: 1000,
      ...config
    };
    
    this.startTime = performance.now();
    this.initializeObservers();
  }

  private initializeObservers(): void {
    if (typeof window === 'undefined') return;

    // Resource timing observer
    if (this.config.enableResourceTiming) {
      const resourceObserver = new PerformanceObserver((list) => {
        this.handleResourceEntries(list.getEntries());
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
    }

    // User timing observer
    if (this.config.enableUserTiming) {
      const userObserver = new PerformanceObserver((list) => {
        this.handleUserTiming(list.getEntries());
      });
      userObserver.observe({ entryTypes: ['measure', 'mark'] });
    }

    // Navigation timing observer
    if (this.config.enableNavigationTiming) {
      const navObserver = new PerformanceObserver((list) => {
        this.handleNavigationTiming(list.getEntries());
      });
      navObserver.observe({ entryTypes: ['navigation'] });
    }
  }

  private handleResourceEntries(entries: PerformanceEntry[]): void {
    for (const entry of entries) {
      const resourceEntry = entry as PerformanceResourceTiming;
      
      this.resourceTimings.push({
        name: resourceEntry.name,
        duration: resourceEntry.duration,
        size: resourceEntry.transferSize || 0,
        type: this.getResourceType(resourceEntry.name),
        startTime: resourceEntry.startTime,
        endTime: resourceEntry.responseEnd
      });

      // Check for slow resources
      if (resourceEntry.duration > 1000) {
        this.recordMetric({
          name: 'slow_resource',
          value: resourceEntry.duration,
          timestamp: Date.now(),
          url: resourceEntry.name,
          connection: this.getConnectionInfo()
        });
      }
    }
  }

  private handleUserTiming(entries: PerformanceEntry[]): void {
    for (const entry of entries) {
      this.recordMetric({
        name: entry.name,
        value: entry.duration || 0,
        timestamp: Date.now(),
        url: window.location.href,
        connection: this.getConnectionInfo()
      });
    }
  }

  private handleNavigationTiming(entries: PerformanceEntry[]): void {
    for (const entry of entries) {
      const navEntry = entry as PerformanceNavigationTiming;
      
      // Record key navigation metrics
      this.recordMetric({
        name: 'dns_lookup',
        value: navEntry.domainLookupEnd - navEntry.domainLookupStart,
        timestamp: Date.now(),
        url: window.location.href,
        connection: this.getConnectionInfo()
      });

      this.recordMetric({
        name: 'tcp_connect',
        value: navEntry.connectEnd - navEntry.connectStart,
        timestamp: Date.now(),
        url: window.location.href,
        connection: this.getConnectionInfo()
      });

      this.recordMetric({
        name: 'request_response',
        value: navEntry.responseEnd - navEntry.requestStart,
        timestamp: Date.now(),
        url: window.location.href,
        connection: this.getConnectionInfo()
      });

      this.recordMetric({
        name: 'dom_interactive',
        value: navEntry.domInteractive - navEntry.fetchStart,
        timestamp: Date.now(),
        url: window.location.href,
        connection: this.getConnectionInfo()
      });

      this.recordMetric({
        name: 'dom_complete',
        value: navEntry.domComplete - navEntry.fetchStart,
        timestamp: Date.now(),
        url: window.location.href,
        connection: this.getConnectionInfo()
      });
    }
  }

  private getResourceType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'js':
        return 'script';
      case 'css':
        return 'stylesheet';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
      case 'webp':
        return 'image';
      case 'woff':
      case 'woff2':
      case 'ttf':
      case 'otf':
        return 'font';
      case 'json':
        return 'fetch';
      default:
        return 'other';
    }
  }

  private getConnectionInfo(): string {
    const connection = (navigator as any).connection;
    return connection ? connection.effectiveType : 'unknown';
  }

  private recordMetric(metric: PerformanceMetric): void {
    if (Math.random() > this.config.sampleRate!) return;

    this.metrics.push(metric);

    // Maintain buffer size
    if (this.metrics.length > this.config.bufferSize!) {
      this.metrics.shift();
    }

    // Send to reporting endpoint if configured
    if (this.config.reportingEndpoint) {
      this.sendMetric(metric);
    }
  }

  private async sendMetric(metric: PerformanceMetric): Promise<void> {
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

  public mark(name: string): void {
    performance.mark(name);
  }

  public measure(name: string, startMark?: string, endMark?: string): void {
    performance.measure(name, startMark, endMark);
  }

  public getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  public getResourceTimings(): ResourceTiming[] {
    return [...this.resourceTimings];
  }

  public generateReport(): PerformanceReport {
    const now = performance.now();
    const sessionDuration = now - this.startTime;

    // Calculate aggregate metrics
    const aggregates = this.calculateAggregates();

    return {
      sessionDuration,
      totalMetrics: this.metrics.length,
      averageResourceLoadTime: aggregates.avgResourceTime,
      slowestResource: aggregates.slowestResource,
      totalResourcesLoaded: this.resourceTimings.length,
      connectionType: this.getConnectionInfo(),
      timestamp: Date.now(),
      aggregates
    };
  }

  private calculateAggregates(): any {
    const resourceTimes = this.resourceTimings.map(r => r.duration);
    const avgResourceTime = resourceTimes.length > 0 
      ? resourceTimes.reduce((a, b) => a + b, 0) / resourceTimes.length 
      : 0;

    const slowestResource = this.resourceTimings.reduce((slowest, current) => 
      current.duration > slowest.duration ? current : slowest,
      this.resourceTimings[0] || { duration: 0, name: 'none' }
    );

    return {
      avgResourceTime,
      slowestResource: slowestResource.name,
      totalResourceSize: this.resourceTimings.reduce((total, r) => total + r.size, 0),
      resourcesByType: this.groupResourcesByType()
    };
  }

  private groupResourcesByType(): { [key: string]: number } {
    return this.resourceTimings.reduce((groups, resource) => {
      groups[resource.type] = (groups[resource.type] || 0) + 1;
      return groups;
    }, {} as { [key: string]: number });
  }

  public clearMetrics(): void {
    this.metrics = [];
    this.resourceTimings = [];
  }

  public startSession(): void {
    this.startTime = performance.now();
    this.clearMetrics();
  }

  public endSession(): PerformanceReport {
    const report = this.generateReport();
    this.clearMetrics();
    return report;
  }
}

export const performanceTracker = new PerformanceTracker();