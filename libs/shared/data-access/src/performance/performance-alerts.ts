/**
 * @fileoverview Performance alerts and monitoring integration
 * @description Centralized performance alert system with external monitoring integrations
 */

import { PerformanceAlert, PerformanceThreshold, PerformanceConfig } from './types';

export class PerformanceAlerts {
  private alerts: PerformanceAlert[] = [];
  private thresholds: PerformanceThreshold[] = [];
  private config: PerformanceConfig;
  private subscribers: ((alert: PerformanceAlert) => void)[] = [];
  private externalIntegrations: Map<string, ExternalIntegration> = new Map();
  private maxAlerts = 1000;

  constructor(config?: Partial<PerformanceConfig>) {
    this.config = this.mergeConfig(config);
    this.initializeDefaultThresholds();
    this.setupExternalIntegrations();
  }

  private mergeConfig(config?: Partial<PerformanceConfig>): PerformanceConfig {
    return {
      enableMonitoring: true,
      enableBundleAnalysis: true,
      enableMemoryProfiling: true,
      enableAlerts: true,
      reportingInterval: 60000, // 1 minute
      thresholds: [],
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      ...config,
    };
  }

  private initializeDefaultThresholds(): void {
    this.thresholds = [
      // Core Web Vitals
      { metric: 'cls', warning: 0.1, critical: 0.25, unit: 'score' },
      { metric: 'fcp', warning: 1800, critical: 3000, unit: 'ms' },
      { metric: 'fid', warning: 100, critical: 300, unit: 'ms' },
      { metric: 'lcp', warning: 2500, critical: 4000, unit: 'ms' },
      { metric: 'ttfb', warning: 800, critical: 1800, unit: 'ms' },
      { metric: 'inp', warning: 200, critical: 500, unit: 'ms' },
      
      // Performance Metrics
      { metric: 'pageLoadTime', warning: 3000, critical: 5000, unit: 'ms' },
      { metric: 'renderTime', warning: 1000, critical: 2000, unit: 'ms' },
      { metric: 'interactionTime', warning: 100, critical: 300, unit: 'ms' },
      { metric: 'memoryUsage', warning: 50 * 1024 * 1024, critical: 100 * 1024 * 1024, unit: 'bytes' },
      { metric: 'cpuUsage', warning: 70, critical: 90, unit: 'percent' },
      { metric: 'networkLatency', warning: 1000, critical: 2000, unit: 'ms' },
      { metric: 'errorRate', warning: 1, critical: 5, unit: 'percent' },
      
      // Build Metrics
      { metric: 'buildTime', warning: 120000, critical: 300000, unit: 'ms' },
      { metric: 'bundleSize', warning: 2 * 1024 * 1024, critical: 5 * 1024 * 1024, unit: 'bytes' },
      { metric: 'chunkSize', warning: 500 * 1024, critical: 1024 * 1024, unit: 'bytes' },
      
      // Memory Metrics
      { metric: 'heapUsed', warning: 50 * 1024 * 1024, critical: 100 * 1024 * 1024, unit: 'bytes' },
      { metric: 'heapTotal', warning: 80 * 1024 * 1024, critical: 150 * 1024 * 1024, unit: 'bytes' },
      { metric: 'memoryLeak', warning: 1024 * 1024, critical: 5 * 1024 * 1024, unit: 'bytes/s' },
    ];
  }

  private setupExternalIntegrations(): void {
    // Setup monitoring integrations based on environment
    if (this.config.environment === 'production') {
      this.setupDatadogIntegration();
      this.setupSentryIntegration();
      this.setupSlackIntegration();
    }
  }

  private setupDatadogIntegration(): void {
    this.externalIntegrations.set('datadog', {
      name: 'Datadog',
      enabled: Boolean(process.env.DATADOG_API_KEY),
      send: async (alert: PerformanceAlert) => {
        if (!process.env.DATADOG_API_KEY) return;
        
        try {
          await fetch('https://api.datadoghq.com/api/v1/events', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'DD-API-KEY': process.env.DATADOG_API_KEY,
            },
            body: JSON.stringify({
              title: alert.title,
              text: alert.message,
              alert_type: alert.type,
              priority: alert.severity === 'critical' ? 'high' : 'normal',
              tags: [
                `environment:${this.config.environment}`,
                `version:${this.config.version}`,
                `metric:${alert.metric}`,
              ],
              source_type_name: 'IOC Performance Monitor',
            }),
          });
        } catch (error) {
          console.error('Failed to send alert to Datadog:', error);
        }
      },
    });
  }

  private setupSentryIntegration(): void {
    this.externalIntegrations.set('sentry', {
      name: 'Sentry',
      enabled: Boolean(process.env.SENTRY_DSN),
      send: async (alert: PerformanceAlert) => {
        if (!process.env.SENTRY_DSN || typeof window === 'undefined') return;
        
        try {
          // Use Sentry SDK if available
          if ((window as any).Sentry) {
            const Sentry = (window as any).Sentry;
            
            Sentry.withScope((scope: any) => {
              scope.setTag('metric', alert.metric);
              scope.setTag('environment', this.config.environment);
              scope.setTag('version', this.config.version);
              scope.setLevel(alert.severity === 'critical' ? 'error' : 'warning');
              
              if (alert.severity === 'critical') {
                Sentry.captureException(new Error(alert.message));
              } else {
                Sentry.captureMessage(alert.message);
              }
            });
          }
        } catch (error) {
          console.error('Failed to send alert to Sentry:', error);
        }
      },
    });
  }

  private setupSlackIntegration(): void {
    this.externalIntegrations.set('slack', {
      name: 'Slack',
      enabled: Boolean(process.env.SLACK_WEBHOOK_URL),
      send: async (alert: PerformanceAlert) => {
        if (!process.env.SLACK_WEBHOOK_URL) return;
        
        try {
          const color = alert.severity === 'critical' ? '#ff0000' : 
                       alert.severity === 'high' ? '#ff9900' : '#ffcc00';
          
          await fetch(process.env.SLACK_WEBHOOK_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              attachments: [{
                color,
                title: alert.title,
                text: alert.message,
                fields: [
                  {
                    title: 'Metric',
                    value: alert.metric,
                    short: true,
                  },
                  {
                    title: 'Value',
                    value: this.formatValue(alert.metric, alert.value),
                    short: true,
                  },
                  {
                    title: 'Threshold',
                    value: this.formatValue(alert.metric, alert.threshold),
                    short: true,
                  },
                  {
                    title: 'Environment',
                    value: this.config.environment,
                    short: true,
                  },
                  {
                    title: 'URL',
                    value: alert.url || 'N/A',
                    short: false,
                  },
                ],
                footer: 'IOC Performance Monitor',
                ts: Math.floor(new Date(alert.timestamp).getTime() / 1000),
              }],
            }),
          });
        } catch (error) {
          console.error('Failed to send alert to Slack:', error);
        }
      },
    });
  }

  public createAlert(alert: Omit<PerformanceAlert, 'id' | 'timestamp'>): PerformanceAlert {
    const fullAlert: PerformanceAlert = {
      ...alert,
      id: this.generateAlertId(),
      timestamp: new Date().toISOString(),
    };

    this.alerts.push(fullAlert);
    
    // Trim alerts if needed
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(-this.maxAlerts);
    }

    // Process alert
    this.processAlert(fullAlert);
    
    return fullAlert;
  }

  private generateAlertId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private processAlert(alert: PerformanceAlert): void {
    // Notify subscribers
    this.subscribers.forEach(subscriber => {
      try {
        subscriber(alert);
      } catch (error) {
        console.error('Error notifying alert subscriber:', error);
      }
    });

    // Send to external integrations
    if (this.config.enableAlerts) {
      this.sendToExternalIntegrations(alert);
    }

    // Log alert
    this.logAlert(alert);
  }

  private async sendToExternalIntegrations(alert: PerformanceAlert): Promise<void> {
    const promises = Array.from(this.externalIntegrations.values())
      .filter(integration => integration.enabled)
      .map(integration => integration.send(alert));

    await Promise.allSettled(promises);
  }

  private logAlert(alert: PerformanceAlert): void {
    const logMethod = alert.severity === 'critical' ? 'error' : 
                     alert.severity === 'high' ? 'warn' : 'info';
    
    console[logMethod](`[Performance Alert] ${alert.title}: ${alert.message}`);
  }

  public checkThreshold(metric: string, value: number, url?: string, userId?: string): void {
    const threshold = this.thresholds.find(t => t.metric === metric);
    if (!threshold) return;

    let alertType: 'error' | 'warning' | 'info' = 'info';
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let thresholdValue = 0;

    if (value > threshold.critical) {
      alertType = 'error';
      severity = 'critical';
      thresholdValue = threshold.critical;
    } else if (value > threshold.warning) {
      alertType = 'warning';
      severity = 'high';
      thresholdValue = threshold.warning;
    } else {
      return; // No threshold exceeded
    }

    this.createAlert({
      type: alertType,
      title: `Performance Alert: ${metric}`,
      message: `${metric} (${this.formatValue(metric, value)}) exceeded ${severity} threshold (${this.formatValue(metric, thresholdValue)})`,
      severity,
      metric,
      value,
      threshold: thresholdValue,
      url,
      userId,
    });
  }

  private formatValue(metric: string, value: number): string {
    const threshold = this.thresholds.find(t => t.metric === metric);
    if (!threshold) return value.toString();

    switch (threshold.unit) {
      case 'ms':
        return `${value.toFixed(2)}ms`;
      case 'bytes':
        return this.formatBytes(value);
      case 'percent':
        return `${value.toFixed(2)}%`;
      case 'score':
        return value.toFixed(3);
      default:
        return value.toString();
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  public getAlerts(limit?: number): PerformanceAlert[] {
    const alerts = [...this.alerts].reverse(); // Most recent first
    return limit ? alerts.slice(0, limit) : alerts;
  }

  public getAlertsByMetric(metric: string, limit?: number): PerformanceAlert[] {
    const alerts = this.alerts.filter(alert => alert.metric === metric).reverse();
    return limit ? alerts.slice(0, limit) : alerts;
  }

  public getAlertsBySeverity(severity: 'low' | 'medium' | 'high' | 'critical', limit?: number): PerformanceAlert[] {
    const alerts = this.alerts.filter(alert => alert.severity === severity).reverse();
    return limit ? alerts.slice(0, limit) : alerts;
  }

  public getAlertsInTimeRange(startTime: string, endTime: string): PerformanceAlert[] {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    
    return this.alerts.filter(alert => {
      const alertTime = new Date(alert.timestamp).getTime();
      return alertTime >= start && alertTime <= end;
    });
  }

  public getAlertSummary(): {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    last24Hours: number;
    lastHour: number;
  } {
    const now = new Date().getTime();
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    return {
      total: this.alerts.length,
      critical: this.alerts.filter(a => a.severity === 'critical').length,
      high: this.alerts.filter(a => a.severity === 'high').length,
      medium: this.alerts.filter(a => a.severity === 'medium').length,
      low: this.alerts.filter(a => a.severity === 'low').length,
      last24Hours: this.alerts.filter(a => new Date(a.timestamp).getTime() > oneDayAgo).length,
      lastHour: this.alerts.filter(a => new Date(a.timestamp).getTime() > oneHourAgo).length,
    };
  }

  public subscribe(callback: (alert: PerformanceAlert) => void): void {
    this.subscribers.push(callback);
  }

  public unsubscribe(callback: (alert: PerformanceAlert) => void): void {
    const index = this.subscribers.indexOf(callback);
    if (index > -1) {
      this.subscribers.splice(index, 1);
    }
  }

  public setThreshold(metric: string, warning: number, critical: number, unit: string): void {
    const existingIndex = this.thresholds.findIndex(t => t.metric === metric);
    const threshold: PerformanceThreshold = { metric, warning, critical, unit };
    
    if (existingIndex > -1) {
      this.thresholds[existingIndex] = threshold;
    } else {
      this.thresholds.push(threshold);
    }
  }

  public getThresholds(): PerformanceThreshold[] {
    return [...this.thresholds];
  }

  public clearAlerts(): void {
    this.alerts = [];
  }

  public exportAlerts(): string {
    return JSON.stringify(this.alerts, null, 2);
  }

  public importAlerts(data: string): void {
    try {
      const alerts = JSON.parse(data);
      if (Array.isArray(alerts)) {
        this.alerts = alerts;
      }
    } catch (error) {
      console.error('Failed to import alerts:', error);
    }
  }
}

interface ExternalIntegration {
  name: string;
  enabled: boolean;
  send: (alert: PerformanceAlert) => Promise<void>;
}

// Singleton instance
export const performanceAlerts = new PerformanceAlerts();

// Helper functions
export const createPerformanceAlert = (alert: Omit<PerformanceAlert, 'id' | 'timestamp'>): PerformanceAlert => {
  return performanceAlerts.createAlert(alert);
};

export const checkPerformanceThreshold = (metric: string, value: number, url?: string, userId?: string): void => {
  performanceAlerts.checkThreshold(metric, value, url, userId);
};

export const getPerformanceAlerts = (limit?: number): PerformanceAlert[] => {
  return performanceAlerts.getAlerts(limit);
};

export const getAlertSummary = () => {
  return performanceAlerts.getAlertSummary();
};

export const subscribeToAlerts = (callback: (alert: PerformanceAlert) => void): void => {
  performanceAlerts.subscribe(callback);
};