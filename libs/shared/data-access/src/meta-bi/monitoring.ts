// Monitoring and Alerting System
// Comprehensive monitoring for Meta BI system health and performance

import { EventEmitter } from 'events';
import { DataQualityMetrics, SystemHealthMetrics } from './types';

export interface MonitoringConfig {
  metrics: {
    collector: 'prometheus' | 'datadog' | 'new-relic' | 'custom';
    endpoint?: string;
    apiKey?: string;
    interval: number;
    retention: string;
  };
  alerting: {
    enabled: boolean;
    channels: AlertChannel[];
    rules: AlertRule[];
    throttleMs: number;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    structured: boolean;
    destination: 'console' | 'file' | 'elasticsearch' | 'loki';
    endpoint?: string;
  };
  tracing: {
    enabled: boolean;
    system: 'jaeger' | 'zipkin' | 'datadog';
    endpoint?: string;
    sampling: number;
  };
}

export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'pagerduty';
  config: {
    url?: string;
    apiKey?: string;
    recipients?: string[];
    severity?: AlertSeverity[];
  };
}

export interface AlertRule {
  name: string;
  condition: string;
  severity: AlertSeverity;
  threshold: number;
  duration: number;
  channels: string[];
  metadata?: Record<string, any>;
}

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface Alert {
  id: string;
  rule: string;
  severity: AlertSeverity;
  message: string;
  timestamp: string;
  resolved?: boolean;
  resolvedAt?: string;
  metadata?: Record<string, any>;
}

export interface MetricData {
  name: string;
  value: number;
  timestamp: string;
  labels?: Record<string, string>;
  unit?: string;
}

export class MonitoringSystem extends EventEmitter {
  private config: MonitoringConfig;
  private metrics: Map<string, MetricData[]> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private lastAlertTime: Map<string, number> = new Map();
  private running: boolean = false;
  
  constructor(config: MonitoringConfig) {
    super();
    this.config = config;
  }
  
  /**
   * Start monitoring system
   */
  public async start(): Promise<void> {
    if (this.running) {
      throw new Error('Monitoring system is already running');
    }
    
    this.running = true;
    
    // Start metrics collection
    this.startMetricsCollection();
    
    // Start alert evaluation
    this.startAlertEvaluation();
    
    // Start metric cleanup
    this.startMetricCleanup();
    
    this.emit('started');
    this.log('info', 'Monitoring system started');
  }
  
  /**
   * Stop monitoring system
   */
  public async stop(): Promise<void> {
    this.running = false;
    this.emit('stopped');
    this.log('info', 'Monitoring system stopped');
  }
  
  /**
   * Record metric
   */
  public recordMetric(metric: MetricData): void {
    if (!this.metrics.has(metric.name)) {
      this.metrics.set(metric.name, []);
    }
    
    this.metrics.get(metric.name)!.push(metric);
    
    // Limit metric history
    const maxHistory = 1000;
    const metricHistory = this.metrics.get(metric.name)!;
    if (metricHistory.length > maxHistory) {
      metricHistory.splice(0, metricHistory.length - maxHistory);
    }
    
    this.emit('metricRecorded', metric);
  }
  
  /**
   * Record multiple metrics
   */
  public recordMetrics(metrics: MetricData[]): void {
    for (const metric of metrics) {
      this.recordMetric(metric);
    }
  }
  
  /**
   * Get metric history
   */
  public getMetricHistory(name: string, limit?: number): MetricData[] {
    const history = this.metrics.get(name) || [];
    return limit ? history.slice(-limit) : history;
  }
  
  /**
   * Get latest metric value
   */
  public getLatestMetric(name: string): MetricData | null {
    const history = this.metrics.get(name);
    return history && history.length > 0 ? history[history.length - 1] : null;
  }
  
  /**
   * Get all metric names
   */
  public getMetricNames(): string[] {
    return Array.from(this.metrics.keys());
  }
  
  /**
   * Create alert
   */
  public createAlert(alert: Omit<Alert, 'id' | 'timestamp'>): string {
    const id = this.generateAlertId();
    const fullAlert: Alert = {
      ...alert,
      id,
      timestamp: new Date().toISOString()
    };
    
    this.alerts.set(id, fullAlert);
    this.emit('alertCreated', fullAlert);
    
    // Send alert notifications
    this.sendAlertNotifications(fullAlert);
    
    this.log('warn', `Alert created: ${alert.message}`, { alertId: id, severity: alert.severity });
    
    return id;
  }
  
  /**
   * Resolve alert
   */
  public resolveAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.resolved) {
      return;
    }
    
    alert.resolved = true;
    alert.resolvedAt = new Date().toISOString();
    
    this.emit('alertResolved', alert);
    this.log('info', `Alert resolved: ${alert.message}`, { alertId });
  }
  
  /**
   * Get active alerts
   */
  public getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }
  
  /**
   * Get all alerts
   */
  public getAllAlerts(): Alert[] {
    return Array.from(this.alerts.values());
  }
  
  /**
   * Record data quality metrics
   */
  public recordDataQualityMetrics(metrics: DataQualityMetrics): void {
    this.recordMetrics([
      { name: 'data_quality_completeness', value: metrics.completeness, timestamp: metrics.timestamp, unit: 'percent' },
      { name: 'data_quality_accuracy', value: metrics.accuracy, timestamp: metrics.timestamp, unit: 'percent' },
      { name: 'data_quality_consistency', value: metrics.consistency, timestamp: metrics.timestamp, unit: 'percent' },
      { name: 'data_quality_validity', value: metrics.validity, timestamp: metrics.timestamp, unit: 'percent' },
      { name: 'data_quality_timeliness', value: metrics.timeliness, timestamp: metrics.timestamp, unit: 'percent' },
      { name: 'data_quality_anomaly_count', value: metrics.anomaly_count, timestamp: metrics.timestamp, unit: 'count' },
      { name: 'data_quality_freshness_hours', value: metrics.data_freshness_hours, timestamp: metrics.timestamp, unit: 'hours' }
    ]);
    
    // Check data quality thresholds
    this.checkDataQualityAlerts(metrics);
  }
  
  /**
   * Record system health metrics
   */
  public recordSystemHealthMetrics(metrics: SystemHealthMetrics): void {
    this.recordMetrics([
      { name: 'system_cpu_usage', value: metrics.cpu_usage, timestamp: metrics.timestamp, unit: 'percent' },
      { name: 'system_memory_usage', value: metrics.memory_usage, timestamp: metrics.timestamp, unit: 'percent' },
      { name: 'system_disk_usage', value: metrics.disk_usage, timestamp: metrics.timestamp, unit: 'percent' },
      { name: 'system_network_io', value: metrics.network_io, timestamp: metrics.timestamp, unit: 'bytes' },
      { name: 'system_active_connections', value: metrics.active_connections, timestamp: metrics.timestamp, unit: 'count' },
      { name: 'system_avg_response_time', value: metrics.query_performance.avg_response_time, timestamp: metrics.timestamp, unit: 'ms' },
      { name: 'system_slow_queries', value: metrics.query_performance.slow_queries, timestamp: metrics.timestamp, unit: 'count' },
      { name: 'system_failed_queries', value: metrics.query_performance.failed_queries, timestamp: metrics.timestamp, unit: 'count' },
      { name: 'system_cache_hit_rate', value: metrics.cache_hit_rate, timestamp: metrics.timestamp, unit: 'percent' },
      { name: 'system_error_rate', value: metrics.error_rate, timestamp: metrics.timestamp, unit: 'percent' }
    ]);
    
    // Check system health thresholds
    this.checkSystemHealthAlerts(metrics);
  }
  
  /**
   * Check data quality alerts
   */
  private checkDataQualityAlerts(metrics: DataQualityMetrics): void {
    const rules = this.config.alerting.rules.filter(rule => rule.name.includes('data_quality'));
    
    for (const rule of rules) {
      let shouldAlert = false;
      let value = 0;
      let message = '';
      
      switch (rule.name) {
        case 'data_quality_completeness_low':
          value = metrics.completeness;
          shouldAlert = value < rule.threshold;
          message = `Data completeness is ${value}% (threshold: ${rule.threshold}%)`;
          break;
        case 'data_quality_accuracy_low':
          value = metrics.accuracy;
          shouldAlert = value < rule.threshold;
          message = `Data accuracy is ${value}% (threshold: ${rule.threshold}%)`;
          break;
        case 'data_quality_anomaly_high':
          value = metrics.anomaly_count;
          shouldAlert = value > rule.threshold;
          message = `High anomaly count: ${value} (threshold: ${rule.threshold})`;
          break;
      }
      
      if (shouldAlert && this.shouldCreateAlert(rule.name)) {
        this.createAlert({
          rule: rule.name,
          severity: rule.severity,
          message,
          metadata: { value, threshold: rule.threshold, dataset: metrics.dataset }
        });
      }
    }
  }
  
  /**
   * Check system health alerts
   */
  private checkSystemHealthAlerts(metrics: SystemHealthMetrics): void {
    const rules = this.config.alerting.rules.filter(rule => rule.name.includes('system_'));
    
    for (const rule of rules) {
      let shouldAlert = false;
      let value = 0;
      let message = '';
      
      switch (rule.name) {
        case 'system_cpu_high':
          value = metrics.cpu_usage;
          shouldAlert = value > rule.threshold;
          message = `High CPU usage: ${value}% (threshold: ${rule.threshold}%)`;
          break;
        case 'system_memory_high':
          value = metrics.memory_usage;
          shouldAlert = value > rule.threshold;
          message = `High memory usage: ${value}% (threshold: ${rule.threshold}%)`;
          break;
        case 'system_error_rate_high':
          value = metrics.error_rate;
          shouldAlert = value > rule.threshold;
          message = `High error rate: ${value}% (threshold: ${rule.threshold}%)`;
          break;
        case 'system_response_time_high':
          value = metrics.query_performance.avg_response_time;
          shouldAlert = value > rule.threshold;
          message = `High response time: ${value}ms (threshold: ${rule.threshold}ms)`;
          break;
      }
      
      if (shouldAlert && this.shouldCreateAlert(rule.name)) {
        this.createAlert({
          rule: rule.name,
          severity: rule.severity,
          message,
          metadata: { value, threshold: rule.threshold }
        });
      }
    }
  }
  
  /**
   * Check if alert should be created (throttling)
   */
  private shouldCreateAlert(ruleName: string): boolean {
    const lastTime = this.lastAlertTime.get(ruleName) || 0;
    const now = Date.now();
    
    if (now - lastTime < this.config.alerting.throttleMs) {
      return false;
    }
    
    this.lastAlertTime.set(ruleName, now);
    return true;
  }
  
  /**
   * Send alert notifications
   */
  private async sendAlertNotifications(alert: Alert): Promise<void> {
    if (!this.config.alerting.enabled) {
      return;
    }
    
    const rule = this.config.alerting.rules.find(r => r.name === alert.rule);
    if (!rule) {
      return;
    }
    
    for (const channelName of rule.channels) {
      const channel = this.config.alerting.channels.find(c => c.type === channelName);
      if (!channel) {
        continue;
      }
      
      try {
        await this.sendAlertToChannel(alert, channel);
      } catch (error) {
        this.log('error', `Failed to send alert to ${channelName}`, { error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
  }
  
  /**
   * Send alert to specific channel
   */
  private async sendAlertToChannel(alert: Alert, channel: AlertChannel): Promise<void> {
    switch (channel.type) {
      case 'slack':
        await this.sendSlackAlert(alert, channel);
        break;
      case 'webhook':
        await this.sendWebhookAlert(alert, channel);
        break;
      case 'email':
        await this.sendEmailAlert(alert, channel);
        break;
      case 'pagerduty':
        await this.sendPagerDutyAlert(alert, channel);
        break;
    }
  }
  
  /**
   * Send Slack alert
   */
  private async sendSlackAlert(alert: Alert, channel: AlertChannel): Promise<void> {
    if (!channel.config.url) {
      throw new Error('Slack webhook URL not configured');
    }
    
    const color = this.getAlertColor(alert.severity);
    const payload = {
      attachments: [{
        color,
        title: `${alert.severity.toUpperCase()}: ${alert.rule}`,
        text: alert.message,
        fields: [
          { title: 'Severity', value: alert.severity, short: true },
          { title: 'Time', value: alert.timestamp, short: true }
        ],
        footer: 'IOC Meta BI Monitoring',
        ts: Math.floor(new Date(alert.timestamp).getTime() / 1000)
      }]
    };
    
    const response = await fetch(channel.config.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`Slack API error: ${response.statusText}`);
    }
  }
  
  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(alert: Alert, channel: AlertChannel): Promise<void> {
    if (!channel.config.url) {
      throw new Error('Webhook URL not configured');
    }
    
    const payload = {
      alert,
      timestamp: new Date().toISOString(),
      source: 'ioc-meta-bi'
    };
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (channel.config.apiKey) {
      headers['Authorization'] = `Bearer ${channel.config.apiKey}`;
    }
    
    const response = await fetch(channel.config.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`Webhook error: ${response.statusText}`);
    }
  }
  
  /**
   * Send email alert
   */
  private async sendEmailAlert(alert: Alert, channel: AlertChannel): Promise<void> {
    // Email implementation would depend on email service (SendGrid, SES, etc.)
    this.log('info', 'Email alert would be sent', { alert: alert.id, recipients: channel.config.recipients });
  }
  
  /**
   * Send PagerDuty alert
   */
  private async sendPagerDutyAlert(alert: Alert, channel: AlertChannel): Promise<void> {
    // PagerDuty implementation
    this.log('info', 'PagerDuty alert would be sent', { alert: alert.id });
  }
  
  /**
   * Get alert color for Slack
   */
  private getAlertColor(severity: AlertSeverity): string {
    switch (severity) {
      case 'info': return 'good';
      case 'warning': return 'warning';
      case 'critical': return 'danger';
      default: return 'warning';
    }
  }
  
  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    setInterval(() => {
      if (this.running) {
        this.collectSystemMetrics();
      }
    }, this.config.metrics.interval);
  }
  
  /**
   * Collect system metrics
   */
  private collectSystemMetrics(): void {
    const timestamp = new Date().toISOString();
    const memUsage = process.memoryUsage();
    
    // Collect Node.js process metrics
    this.recordMetrics([
      { name: 'nodejs_memory_heap_used', value: memUsage.heapUsed, timestamp, unit: 'bytes' },
      { name: 'nodejs_memory_heap_total', value: memUsage.heapTotal, timestamp, unit: 'bytes' },
      { name: 'nodejs_memory_external', value: memUsage.external, timestamp, unit: 'bytes' },
      { name: 'nodejs_uptime', value: process.uptime(), timestamp, unit: 'seconds' }
    ]);
    
    // Collect custom metrics
    this.recordMetrics([
      { name: 'monitoring_active_alerts', value: this.getActiveAlerts().length, timestamp, unit: 'count' },
      { name: 'monitoring_total_metrics', value: this.metrics.size, timestamp, unit: 'count' }
    ]);
  }
  
  /**
   * Start alert evaluation
   */
  private startAlertEvaluation(): void {
    setInterval(() => {
      if (this.running) {
        this.evaluateAlertRules();
      }
    }, 30000); // Every 30 seconds
  }
  
  /**
   * Evaluate alert rules
   */
  private evaluateAlertRules(): void {
    for (const rule of this.config.alerting.rules) {
      try {
        this.evaluateRule(rule);
      } catch (error) {
        this.log('error', `Error evaluating alert rule ${rule.name}`, { error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
  }
  
  /**
   * Evaluate single alert rule
   */
  private evaluateRule(rule: AlertRule): void {
    // Custom rule evaluation logic would go here
    // For now, this is handled in the data quality and system health checks
  }
  
  /**
   * Start metric cleanup
   */
  private startMetricCleanup(): void {
    setInterval(() => {
      if (this.running) {
        this.cleanupOldMetrics();
      }
    }, 3600000); // Every hour
  }
  
  /**
   * Cleanup old metrics
   */
  private cleanupOldMetrics(): void {
    const retentionMs = this.parseRetention(this.config.metrics.retention);
    const cutoffTime = Date.now() - retentionMs;
    
    for (const [name, metrics] of this.metrics.entries()) {
      const filteredMetrics = metrics.filter(m => 
        new Date(m.timestamp).getTime() > cutoffTime
      );
      this.metrics.set(name, filteredMetrics);
    }
    
    // Clean up old resolved alerts
    const oldAlerts = Array.from(this.alerts.entries()).filter(([id, alert]) => 
      alert.resolved && 
      new Date(alert.resolvedAt!).getTime() < cutoffTime
    );
    
    for (const [id] of oldAlerts) {
      this.alerts.delete(id);
    }
  }
  
  /**
   * Parse retention string to milliseconds
   */
  private parseRetention(retention: string): number {
    const match = retention.match(/(\d+)([hdwm])/);
    if (!match) {
      return 24 * 60 * 60 * 1000; // Default 1 day
    }
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      case 'w': return value * 7 * 24 * 60 * 60 * 1000;
      case 'm': return value * 30 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }
  
  /**
   * Generate alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Log message
   */
  private log(level: string, message: string, metadata?: Record<string, any>): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      source: 'monitoring-system',
      ...metadata
    };
    
    if (this.config.logging.structured) {
      console.log(JSON.stringify(logEntry));
    } else {
      console.log(`[${logEntry.timestamp}] ${level.toUpperCase()}: ${message}`);
    }
    
    this.emit('log', logEntry);
  }
  
  /**
   * Get monitoring statistics
   */
  public getStatistics(): {
    metrics: {
      total: number;
      names: string[];
      dataPoints: number;
    };
    alerts: {
      active: number;
      total: number;
      bySeveity: Record<AlertSeverity, number>;
    };
    system: {
      uptime: number;
      memoryUsage: NodeJS.MemoryUsage;
    };
  } {
    const totalDataPoints = Array.from(this.metrics.values())
      .reduce((sum, metrics) => sum + metrics.length, 0);
    
    const alerts = this.getAllAlerts();
    const activeAlerts = this.getActiveAlerts();
    
    const alertsBySeverity = alerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<AlertSeverity, number>);
    
    return {
      metrics: {
        total: this.metrics.size,
        names: this.getMetricNames(),
        dataPoints: totalDataPoints
      },
      alerts: {
        active: activeAlerts.length,
        total: alerts.length,
        bySeveity: alertsBySeverity
      },
      system: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      }
    };
  }
}

/**
 * Performance monitoring for queries and operations
 */
export class PerformanceMonitor {
  private operations: Map<string, OperationMetrics> = new Map();
  private monitoringSystem: MonitoringSystem;
  
  constructor(monitoringSystem: MonitoringSystem) {
    this.monitoringSystem = monitoringSystem;
  }
  
  /**
   * Start timing an operation
   */
  public startOperation(operationId: string, type: string, metadata?: Record<string, any>): void {
    this.operations.set(operationId, {
      id: operationId,
      type,
      startTime: Date.now(),
      metadata: metadata || {}
    });
  }
  
  /**
   * End timing an operation
   */
  public endOperation(operationId: string, success: boolean = true, error?: string): void {
    const operation = this.operations.get(operationId);
    if (!operation) {
      return;
    }
    
    const endTime = Date.now();
    const duration = endTime - operation.startTime;
    
    // Record metrics
    this.monitoringSystem.recordMetrics([
      {
        name: `operation_duration`,
        value: duration,
        timestamp: new Date().toISOString(),
        labels: { type: operation.type, success: success.toString() },
        unit: 'ms'
      },
      {
        name: `operation_count`,
        value: 1,
        timestamp: new Date().toISOString(),
        labels: { type: operation.type, success: success.toString() },
        unit: 'count'
      }
    ]);
    
    // Remove from active operations
    this.operations.delete(operationId);
    
    // Log slow operations
    const slowThreshold = 5000; // 5 seconds
    if (duration > slowThreshold) {
      this.monitoringSystem.createAlert({
        rule: 'operation_slow',
        severity: 'warning',
        message: `Slow operation detected: ${operation.type} took ${duration}ms`,
        metadata: { operationId, type: operation.type, duration, threshold: slowThreshold }
      });
    }
    
    // Log failed operations
    if (!success) {
      this.monitoringSystem.createAlert({
        rule: 'operation_failed',
        severity: 'warning',
        message: `Operation failed: ${operation.type}`,
        metadata: { operationId, type: operation.type, duration, error }
      });
    }
  }
  
  /**
   * Get active operations
   */
  public getActiveOperations(): OperationMetrics[] {
    return Array.from(this.operations.values());
  }
}

export interface OperationMetrics {
  id: string;
  type: string;
  startTime: number;
  metadata: Record<string, any>;
}

/**
 * Create default monitoring configuration
 */
export function createDefaultMonitoringConfig(): MonitoringConfig {
  return {
    metrics: {
      collector: 'custom',
      interval: 30000, // 30 seconds
      retention: '7d'
    },
    alerting: {
      enabled: true,
      channels: [
        {
          type: 'slack',
          config: {
            url: process.env.SLACK_WEBHOOK_URL,
            severity: ['warning', 'critical']
          }
        }
      ],
      rules: [
        {
          name: 'data_quality_completeness_low',
          condition: 'completeness < threshold',
          severity: 'warning',
          threshold: 95,
          duration: 300000, // 5 minutes
          channels: ['slack']
        },
        {
          name: 'data_quality_accuracy_low',
          condition: 'accuracy < threshold',
          severity: 'warning',
          threshold: 98,
          duration: 300000,
          channels: ['slack']
        },
        {
          name: 'system_cpu_high',
          condition: 'cpu_usage > threshold',
          severity: 'warning',
          threshold: 80,
          duration: 300000,
          channels: ['slack']
        },
        {
          name: 'system_memory_high',
          condition: 'memory_usage > threshold',
          severity: 'warning',
          threshold: 85,
          duration: 300000,
          channels: ['slack']
        },
        {
          name: 'system_error_rate_high',
          condition: 'error_rate > threshold',
          severity: 'critical',
          threshold: 5,
          duration: 300000,
          channels: ['slack']
        }
      ],
      throttleMs: 300000 // 5 minutes
    },
    logging: {
      level: 'info',
      structured: true,
      destination: 'console'
    },
    tracing: {
      enabled: false,
      system: 'jaeger',
      sampling: 0.1
    }
  };
}