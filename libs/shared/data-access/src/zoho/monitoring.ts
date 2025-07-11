/**
 * Zoho Campaigns Monitoring and Logging System
 * Comprehensive monitoring, logging, and alerting for campaign operations
 */

import { EventEmitter } from 'events';

// Conditionally import fs and path only in Node.js environment
let writeFileSync: typeof import('fs').writeFileSync | undefined;
let appendFileSync: typeof import('fs').appendFileSync | undefined;
let existsSync: typeof import('fs').existsSync | undefined;
let mkdirSync: typeof import('fs').mkdirSync | undefined;
let join: typeof import('path').join | undefined;

if (typeof window === 'undefined' && typeof process !== 'undefined') {
  // We're in a Node.js environment
  try {
    const fs = require('fs');
    const path = require('path');
    writeFileSync = fs.writeFileSync;
    appendFileSync = fs.appendFileSync;
    existsSync = fs.existsSync;
    mkdirSync = fs.mkdirSync;
    join = path.join;
  } catch (error) {
    // In case modules are not available
    console.warn('Node.js modules not available in this environment');
  }
}

export interface LogEntry {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  category: string;
  message: string;
  data?: any;
  userId?: string;
  campaignId?: string;
  listId?: string;
  error?: Error;
}

export interface MetricData {
  timestamp: Date;
  metric: string;
  value: number;
  tags?: { [key: string]: string };
  campaignId?: string;
  listId?: string;
}

export interface AlertConfig {
  id: string;
  name: string;
  type: 'threshold' | 'rate' | 'anomaly';
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'ne';
  threshold: number;
  timeWindow: number; // minutes
  enabled: boolean;
  notifications: {
    email?: string[];
    webhook?: string;
    slack?: string;
  };
}

export interface MonitoringConfig {
  logDirectory: string;
  metricsDirectory: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableFileLogging: boolean;
  enableConsoleLogging: boolean;
  enableMetrics: boolean;
  enableAlerts: boolean;
  retentionDays: number;
  maxLogFileSize: number; // MB
  alertCheckInterval: number; // minutes
}

export interface CampaignMetrics {
  campaignId: string;
  campaignName: string;
  status: string;
  totalRecipients: number;
  deliveredCount: number;
  openCount: number;
  clickCount: number;
  bounceCount: number;
  unsubscribeCount: number;
  spamCount: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;
  spamRate: number;
  timestamp: Date;
}

export interface SystemMetrics {
  timestamp: Date;
  apiRequestCount: number;
  apiSuccessCount: number;
  apiErrorCount: number;
  rateLimitHits: number;
  averageResponseTime: number;
  activeConnections: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface AlertStatus {
  id: string;
  name: string;
  isActive: boolean;
  lastTriggered?: Date;
  triggerCount: number;
  currentValue: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class ZohoCampaignsMonitor extends EventEmitter {
  private config: MonitoringConfig;
  private logBuffer: LogEntry[] = [];
  private metricsBuffer: MetricData[] = [];
  private alerts: Map<string, AlertConfig> = new Map();
  private alertStatus: Map<string, AlertStatus> = new Map();
  private currentLogFile: string = '';
  private currentMetricsFile: string = '';
  private alertTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;
  private flushTimer?: NodeJS.Timeout;

  constructor(config: Partial<MonitoringConfig> = {}) {
    super();
    
    this.config = {
      logDirectory: join && typeof process !== 'undefined' ? join(process.cwd(), 'logs', 'zoho-campaigns') : 'logs/zoho-campaigns',
      metricsDirectory: join && typeof process !== 'undefined' ? join(process.cwd(), 'metrics', 'zoho-campaigns') : 'metrics/zoho-campaigns',
      logLevel: 'info',
      enableFileLogging: true,
      enableConsoleLogging: true,
      enableMetrics: true,
      enableAlerts: true,
      retentionDays: 30,
      maxLogFileSize: 100, // MB
      alertCheckInterval: 5, // minutes
      ...config
    };

    this.initialize();
  }

  private initialize(): void {
    // Create directories if they don't exist
    if (this.config.enableFileLogging) {
      this.ensureDirectoryExists(this.config.logDirectory);
    }
    
    if (this.config.enableMetrics) {
      this.ensureDirectoryExists(this.config.metricsDirectory);
    }

    // Set up log rotation
    this.setupLogRotation();

    // Start periodic tasks
    this.startPeriodicTasks();

    // Setup default alerts
    this.setupDefaultAlerts();
  }

  private ensureDirectoryExists(dir: string): void {
    if (existsSync && mkdirSync && !existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  private setupLogRotation(): void {
    const now = new Date();
    const dateString = now.toISOString().split('T')[0];
    
    this.currentLogFile = join ? join(this.config.logDirectory, `zoho-campaigns-${dateString}.log`) : `${this.config.logDirectory}/zoho-campaigns-${dateString}.log`;
    this.currentMetricsFile = join ? join(this.config.metricsDirectory, `metrics-${dateString}.json`) : `${this.config.metricsDirectory}/metrics-${dateString}.json`;
  }

  private startPeriodicTasks(): void {
    // Flush buffers every 30 seconds
    this.flushTimer = setInterval(() => {
      this.flushBuffers();
    }, 30000);

    // Check alerts every configured interval
    if (this.config.enableAlerts) {
      this.alertTimer = setInterval(() => {
        this.checkAlerts();
      }, this.config.alertCheckInterval * 60 * 1000);
    }

    // Cleanup old files daily
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldFiles();
    }, 24 * 60 * 60 * 1000);
  }

  private setupDefaultAlerts(): void {
    const defaultAlerts: AlertConfig[] = [
      {
        id: 'high-bounce-rate',
        name: 'High Bounce Rate Alert',
        type: 'threshold',
        metric: 'bounceRate',
        condition: 'gt',
        threshold: 5.0, // 5% bounce rate
        timeWindow: 15,
        enabled: true,
        notifications: {
          email: ['admin@iocframework.com']
        }
      },
      {
        id: 'low-delivery-rate',
        name: 'Low Delivery Rate Alert',
        type: 'threshold',
        metric: 'deliveryRate',
        condition: 'lt',
        threshold: 95.0, // 95% delivery rate
        timeWindow: 15,
        enabled: true,
        notifications: {
          email: ['admin@iocframework.com']
        }
      },
      {
        id: 'high-spam-rate',
        name: 'High Spam Rate Alert',
        type: 'threshold',
        metric: 'spamRate',
        condition: 'gt',
        threshold: 0.5, // 0.5% spam rate
        timeWindow: 15,
        enabled: true,
        notifications: {
          email: ['admin@iocframework.com']
        }
      },
      {
        id: 'rate-limit-exceeded',
        name: 'Rate Limit Exceeded',
        type: 'threshold',
        metric: 'rateLimitHits',
        condition: 'gt',
        threshold: 10,
        timeWindow: 5,
        enabled: true,
        notifications: {
          email: ['admin@iocframework.com']
        }
      },
      {
        id: 'api-error-rate',
        name: 'High API Error Rate',
        type: 'rate',
        metric: 'apiErrorCount',
        condition: 'gt',
        threshold: 20, // 20% error rate
        timeWindow: 10,
        enabled: true,
        notifications: {
          email: ['admin@iocframework.com']
        }
      }
    ];

    defaultAlerts.forEach(alert => {
      this.alerts.set(alert.id, alert);
      this.alertStatus.set(alert.id, {
        id: alert.id,
        name: alert.name,
        isActive: false,
        triggerCount: 0,
        currentValue: 0,
        threshold: alert.threshold,
        severity: 'medium'
      });
    });
  }

  // ========== LOGGING METHODS ==========

  public log(level: LogEntry['level'], category: string, message: string, data?: any, metadata?: {
    userId?: string;
    campaignId?: string;
    listId?: string;
    error?: Error;
  }): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      category,
      message,
      data,
      ...metadata
    };

    // Add to buffer
    this.logBuffer.push(entry);

    // Console logging if enabled
    if (this.config.enableConsoleLogging && this.shouldLog(level)) {
      this.logToConsole(entry);
    }

    // Emit event
    this.emit('log', entry);

    // Flush buffer if it's getting large
    if (this.logBuffer.length > 1000) {
      this.flushBuffers();
    }
  }

  public debug(category: string, message: string, data?: any, metadata?: any): void {
    this.log('debug', category, message, data, metadata);
  }

  public info(category: string, message: string, data?: any, metadata?: any): void {
    this.log('info', category, message, data, metadata);
  }

  public warn(category: string, message: string, data?: any, metadata?: any): void {
    this.log('warn', category, message, data, metadata);
  }

  public error(category: string, message: string, error?: Error, data?: any, metadata?: any): void {
    this.log('error', category, message, data, { ...metadata, error });
  }

  private shouldLog(level: LogEntry['level']): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevel = levels.indexOf(this.config.logLevel);
    const entryLevel = levels.indexOf(level);
    return entryLevel >= configLevel;
  }

  private logToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.category}]`;
    
    switch (entry.level) {
      case 'debug':
        console.debug(prefix, entry.message, entry.data || '');
        break;
      case 'info':
        console.info(prefix, entry.message, entry.data || '');
        break;
      case 'warn':
        console.warn(prefix, entry.message, entry.data || '');
        break;
      case 'error':
        console.error(prefix, entry.message, entry.error || entry.data || '');
        break;
    }
  }

  // ========== METRICS METHODS ==========

  public recordMetric(metric: string, value: number, tags?: { [key: string]: string }, metadata?: {
    campaignId?: string;
    listId?: string;
  }): void {
    if (!this.config.enableMetrics) return;

    const entry: MetricData = {
      timestamp: new Date(),
      metric,
      value,
      tags,
      ...metadata
    };

    this.metricsBuffer.push(entry);
    this.emit('metric', entry);
  }

  public recordCampaignMetrics(metrics: CampaignMetrics): void {
    if (!this.config.enableMetrics) return;

    const baseMetrics = [
      { name: 'totalRecipients', value: metrics.totalRecipients },
      { name: 'deliveredCount', value: metrics.deliveredCount },
      { name: 'openCount', value: metrics.openCount },
      { name: 'clickCount', value: metrics.clickCount },
      { name: 'bounceCount', value: metrics.bounceCount },
      { name: 'unsubscribeCount', value: metrics.unsubscribeCount },
      { name: 'spamCount', value: metrics.spamCount },
      { name: 'deliveryRate', value: metrics.deliveryRate },
      { name: 'openRate', value: metrics.openRate },
      { name: 'clickRate', value: metrics.clickRate },
      { name: 'bounceRate', value: metrics.bounceRate },
      { name: 'unsubscribeRate', value: metrics.unsubscribeRate },
      { name: 'spamRate', value: metrics.spamRate }
    ];

    const tags = {
      campaignId: metrics.campaignId,
      campaignName: metrics.campaignName,
      status: metrics.status
    };

    baseMetrics.forEach(metric => {
      this.recordMetric(metric.name, metric.value, tags, {
        campaignId: metrics.campaignId
      });
    });
  }

  public recordSystemMetrics(metrics: SystemMetrics): void {
    if (!this.config.enableMetrics) return;

    const systemMetrics = [
      { name: 'apiRequestCount', value: metrics.apiRequestCount },
      { name: 'apiSuccessCount', value: metrics.apiSuccessCount },
      { name: 'apiErrorCount', value: metrics.apiErrorCount },
      { name: 'rateLimitHits', value: metrics.rateLimitHits },
      { name: 'averageResponseTime', value: metrics.averageResponseTime },
      { name: 'activeConnections', value: metrics.activeConnections },
      { name: 'memoryUsage', value: metrics.memoryUsage },
      { name: 'cpuUsage', value: metrics.cpuUsage }
    ];

    const tags = {
      type: 'system',
      timestamp: metrics.timestamp.toISOString()
    };

    systemMetrics.forEach(metric => {
      this.recordMetric(metric.name, metric.value, tags);
    });
  }

  // ========== ALERT METHODS ==========

  public addAlert(alert: AlertConfig): void {
    this.alerts.set(alert.id, alert);
    this.alertStatus.set(alert.id, {
      id: alert.id,
      name: alert.name,
      isActive: false,
      triggerCount: 0,
      currentValue: 0,
      threshold: alert.threshold,
      severity: 'medium'
    });
  }

  public removeAlert(alertId: string): void {
    this.alerts.delete(alertId);
    this.alertStatus.delete(alertId);
  }

  public getAlertStatus(alertId?: string): AlertStatus | AlertStatus[] | null {
    if (alertId) {
      return this.alertStatus.get(alertId) || null;
    }
    return Array.from(this.alertStatus.values());
  }

  private checkAlerts(): void {
    if (!this.config.enableAlerts) return;

    for (const [alertId, alert] of this.alerts) {
      if (!alert.enabled) continue;

      const status = this.alertStatus.get(alertId);
      if (!status) continue;

      const currentValue = this.getMetricValue(alert.metric, alert.timeWindow);
      status.currentValue = currentValue;

      const shouldTrigger = this.evaluateAlertCondition(alert, currentValue);

      if (shouldTrigger && !status.isActive) {
        // Trigger alert
        status.isActive = true;
        status.lastTriggered = new Date();
        status.triggerCount++;
        status.severity = this.calculateSeverity(alert, currentValue);

        this.triggerAlert(alert, status);
      } else if (!shouldTrigger && status.isActive) {
        // Resolve alert
        status.isActive = false;
        this.resolveAlert(alert, status);
      }
    }
  }

  private getMetricValue(metric: string, timeWindowMinutes: number): number {
    const cutoff = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    const recentMetrics = this.metricsBuffer.filter(m => 
      m.metric === metric && m.timestamp > cutoff
    );

    if (recentMetrics.length === 0) return 0;

    // For rate calculations, return average
    if (metric.includes('Rate')) {
      return recentMetrics.reduce((sum, m) => sum + m.value, 0) / recentMetrics.length;
    }

    // For counts, return sum
    return recentMetrics.reduce((sum, m) => sum + m.value, 0);
  }

  private evaluateAlertCondition(alert: AlertConfig, currentValue: number): boolean {
    switch (alert.condition) {
      case 'gt':
        return currentValue > alert.threshold;
      case 'lt':
        return currentValue < alert.threshold;
      case 'eq':
        return currentValue === alert.threshold;
      case 'ne':
        return currentValue !== alert.threshold;
      default:
        return false;
    }
  }

  private calculateSeverity(alert: AlertConfig, currentValue: number): AlertStatus['severity'] {
    const deviation = Math.abs(currentValue - alert.threshold) / alert.threshold;
    
    if (deviation > 0.5) return 'critical';
    if (deviation > 0.3) return 'high';
    if (deviation > 0.1) return 'medium';
    return 'low';
  }

  private triggerAlert(alert: AlertConfig, status: AlertStatus): void {
    const alertData = {
      alert,
      status,
      timestamp: new Date()
    };

    this.emit('alertTriggered', alertData);
    
    // Log the alert
    this.error('ALERT', `Alert triggered: ${alert.name}`, undefined, {
      alertId: alert.id,
      currentValue: status.currentValue,
      threshold: alert.threshold,
      severity: status.severity
    });

    // Send notifications
    this.sendAlertNotifications(alert, status);
  }

  private resolveAlert(alert: AlertConfig, status: AlertStatus): void {
    const alertData = {
      alert,
      status,
      timestamp: new Date()
    };

    this.emit('alertResolved', alertData);
    
    // Log the resolution
    this.info('ALERT', `Alert resolved: ${alert.name}`, {
      alertId: alert.id,
      currentValue: status.currentValue,
      threshold: alert.threshold
    });
  }

  private sendAlertNotifications(alert: AlertConfig, status: AlertStatus): void {
    // This is a placeholder - implement actual notification logic
    if (alert.notifications.email) {
      this.info('NOTIFICATION', `Would send email alert to: ${alert.notifications.email.join(', ')}`, {
        alertId: alert.id,
        alertName: alert.name,
        severity: status.severity
      });
    }

    if (alert.notifications.webhook) {
      this.info('NOTIFICATION', `Would send webhook alert to: ${alert.notifications.webhook}`, {
        alertId: alert.id,
        alertName: alert.name,
        severity: status.severity
      });
    }

    if (alert.notifications.slack) {
      this.info('NOTIFICATION', `Would send Slack alert to: ${alert.notifications.slack}`, {
        alertId: alert.id,
        alertName: alert.name,
        severity: status.severity
      });
    }
  }

  // ========== BUFFER MANAGEMENT ==========

  private flushBuffers(): void {
    if (this.config.enableFileLogging && this.logBuffer.length > 0) {
      this.flushLogBuffer();
    }

    if (this.config.enableMetrics && this.metricsBuffer.length > 0) {
      this.flushMetricsBuffer();
    }
  }

  private flushLogBuffer(): void {
    const logEntries = this.logBuffer.splice(0);
    const logLines = logEntries.map(entry => {
      const data = {
        timestamp: entry.timestamp.toISOString(),
        level: entry.level,
        category: entry.category,
        message: entry.message,
        data: entry.data,
        userId: entry.userId,
        campaignId: entry.campaignId,
        listId: entry.listId,
        error: entry.error ? {
          name: entry.error.name,
          message: entry.error.message,
          stack: entry.error.stack
        } : undefined
      };
      return JSON.stringify(data);
    });

    try {
      if (appendFileSync) {
        appendFileSync(this.currentLogFile, logLines.join('\n') + '\n');
      }
    } catch (error) {
      console.error('Failed to write log file:', error);
    }
  }

  private flushMetricsBuffer(): void {
    const metricEntries = this.metricsBuffer.splice(0);
    const metricsData = {
      timestamp: new Date().toISOString(),
      metrics: metricEntries
    };

    try {
      if (appendFileSync) {
        appendFileSync(this.currentMetricsFile, JSON.stringify(metricsData) + '\n');
      }
    } catch (error) {
      console.error('Failed to write metrics file:', error);
    }
  }

  private cleanupOldFiles(): void {
    const cutoffDate = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000);
    
    // This is a placeholder - implement actual file cleanup logic
    this.info('CLEANUP', `Would clean up files older than ${cutoffDate.toISOString()}`);
  }

  // ========== REPORTING METHODS ==========

  public generateDailyReport(): {
    summary: any;
    campaigns: any[];
    alerts: any[];
    metrics: any;
  } {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const todayLogs = this.logBuffer.filter(log => log.timestamp >= startOfDay);
    const todayMetrics = this.metricsBuffer.filter(metric => metric.timestamp >= startOfDay);

    return {
      summary: {
        date: today.toISOString().split('T')[0],
        totalLogs: todayLogs.length,
        totalMetrics: todayMetrics.length,
        errorCount: todayLogs.filter(log => log.level === 'error').length,
        warnCount: todayLogs.filter(log => log.level === 'warn').length,
        activeAlerts: Array.from(this.alertStatus.values()).filter(status => status.isActive).length
      },
      campaigns: this.getCampaignSummary(todayMetrics),
      alerts: Array.from(this.alertStatus.values()),
      metrics: this.getMetricsSummary(todayMetrics)
    };
  }

  private getCampaignSummary(metrics: MetricData[]): any[] {
    const campaignMetrics = metrics.filter(m => m.campaignId);
    const campaignGroups = new Map<string, MetricData[]>();
    
    campaignMetrics.forEach(metric => {
      const key = metric.campaignId!;
      if (!campaignGroups.has(key)) {
        campaignGroups.set(key, []);
      }
      campaignGroups.get(key)!.push(metric);
    });

    return Array.from(campaignGroups.entries()).map(([campaignId, metrics]) => ({
      campaignId,
      totalMetrics: metrics.length,
      lastUpdated: Math.max(...metrics.map(m => m.timestamp.getTime()))
    }));
  }

  private getMetricsSummary(metrics: MetricData[]): any {
    const summary: any = {};
    
    metrics.forEach(metric => {
      if (!summary[metric.metric]) {
        summary[metric.metric] = {
          count: 0,
          sum: 0,
          min: metric.value,
          max: metric.value,
          avg: 0
        };
      }
      
      const metricSummary = summary[metric.metric];
      metricSummary.count++;
      metricSummary.sum += metric.value;
      metricSummary.min = Math.min(metricSummary.min, metric.value);
      metricSummary.max = Math.max(metricSummary.max, metric.value);
      metricSummary.avg = metricSummary.sum / metricSummary.count;
    });

    return summary;
  }

  // ========== CLEANUP ==========

  public async destroy(): Promise<void> {
    // Clear timers
    if (this.alertTimer) clearInterval(this.alertTimer);
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    if (this.flushTimer) clearInterval(this.flushTimer);

    // Flush remaining buffers
    this.flushBuffers();

    // Clear data
    this.logBuffer = [];
    this.metricsBuffer = [];
    this.alerts.clear();
    this.alertStatus.clear();

    // Remove listeners
    this.removeAllListeners();
  }

  // ========== GETTERS ==========

  public getConfig(): MonitoringConfig {
    return { ...this.config };
  }

  public getLogBuffer(): LogEntry[] {
    return [...this.logBuffer];
  }

  public getMetricsBuffer(): MetricData[] {
    return [...this.metricsBuffer];
  }

  public getAlerts(): AlertConfig[] {
    return Array.from(this.alerts.values());
  }
}

export default ZohoCampaignsMonitor;