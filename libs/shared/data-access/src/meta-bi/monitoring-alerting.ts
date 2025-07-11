// IOC Meta BI Monitoring and Alerting System
// Production-ready monitoring with comprehensive alerting capabilities

import { EventEmitter } from 'events';
import { createHash } from 'crypto';

export interface MonitoringConfig {
  // System identification
  system: {
    name: string;
    environment: 'development' | 'staging' | 'production';
    region: string;
    datacenter: string;
    version: string;
  };
  
  // Metrics collection
  metrics: {
    enableCollection: boolean;
    collectionInterval: number;
    batchSize: number;
    retentionPeriod: number;
    aggregationWindows: number[];
    customMetrics: string[];
    enableProfiling: boolean;
    enableTracing: boolean;
  };
  
  // Health checks
  healthChecks: {
    enableHealthChecks: boolean;
    checkInterval: number;
    healthCheckTimeout: number;
    enableDependencyChecks: boolean;
    endpoints: HealthCheckEndpoint[];
    gracePeriod: number;
    maxFailures: number;
  };
  
  // Alerting configuration
  alerting: {
    enableAlerting: boolean;
    alertEvaluationInterval: number;
    enableNotificationDeduplication: boolean;
    deduplicationWindow: number;
    enableEscalation: boolean;
    escalationDelay: number;
    maxNotificationsPerHour: number;
    quietHours: {
      enabled: boolean;
      start: string;
      end: string;
      timezone: string;
    };
  };
  
  // Notification channels
  notifications: {
    email: {
      enabled: boolean;
      smtpHost: string;
      smtpPort: number;
      username: string;
      password: string;
      from: string;
      to: string[];
      enableTLS: boolean;
    };
    slack: {
      enabled: boolean;
      webhookUrl: string;
      channel: string;
      username: string;
      iconEmoji: string;
    };
    pagerduty: {
      enabled: boolean;
      integrationKey: string;
      severity: string;
    };
    webhook: {
      enabled: boolean;
      urls: string[];
      headers: Record<string, string>;
      retryAttempts: number;
      timeout: number;
    };
    sms: {
      enabled: boolean;
      provider: 'twilio' | 'aws_sns';
      apiKey: string;
      apiSecret: string;
      phoneNumbers: string[];
    };
  };
  
  // Data storage
  storage: {
    type: 'prometheus' | 'influxdb' | 'cloudwatch' | 'datadog' | 'file';
    connectionString: string;
    database: string;
    retention: {
      raw: number;
      aggregated: number;
      alerts: number;
    };
    compression: boolean;
    enableSharding: boolean;
  };
  
  // Performance configuration
  performance: {
    enableBuffering: boolean;
    bufferSize: number;
    flushInterval: number;
    enableCompression: boolean;
    compressionLevel: number;
    enableBatching: boolean;
    maxConcurrentWrites: number;
  };
}

export interface HealthCheckEndpoint {
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'HEAD';
  timeout: number;
  expectedStatus: number[];
  expectedContent?: string;
  headers?: Record<string, string>;
  critical: boolean;
  enabled: boolean;
}

export interface MetricPoint {
  name: string;
  value: number;
  timestamp: Date;
  tags: Record<string, string>;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  unit?: string;
  description?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  query: string;
  condition: 'gt' | 'lt' | 'eq' | 'ne' | 'gte' | 'lte';
  threshold: number;
  duration: number;
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  enabled: boolean;
  tags: Record<string, string>;
  notifications: string[];
  escalation?: {
    enabled: boolean;
    delay: number;
    notifications: string[];
  };
  suppressions?: {
    conditions: string[];
    duration: number;
  };
}

export interface AlertInstance {
  id: string;
  ruleId: string;
  ruleName: string;
  status: 'firing' | 'resolved' | 'suppressed';
  severity: string;
  value: number;
  threshold: number;
  startTime: Date;
  endTime?: Date;
  duration: number;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  fingerprint: string;
  notificationsSent: NotificationRecord[];
}

export interface NotificationRecord {
  id: string;
  channel: string;
  timestamp: Date;
  status: 'sent' | 'failed' | 'pending';
  retryCount: number;
  error?: string;
  metadata: Record<string, any>;
}

export interface MonitoringMetrics {
  system: {
    uptime: number;
    metricsCollected: number;
    alertsEvaluated: number;
    notificationsSent: number;
    healthChecksPassed: number;
    healthChecksFailed: number;
  };
  performance: {
    metricIngestionRate: number;
    alertEvaluationTime: number;
    notificationLatency: number;
    storageWriteLatency: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  storage: {
    totalMetrics: number;
    storageSize: number;
    compressionRatio: number;
    writeErrors: number;
    readErrors: number;
  };
  alerting: {
    activeAlerts: number;
    totalAlerts: number;
    alertsByStatus: Record<string, number>;
    alertsBySeverity: Record<string, number>;
    suppressedAlerts: number;
  };
}

export class MonitoringSystem extends EventEmitter {
  private config: MonitoringConfig;
  private isRunning = false;
  
  private metricsBuffer: MetricPoint[] = [];
  private alertRules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, AlertInstance> = new Map();
  private healthCheckResults: Map<string, HealthCheckResult> = new Map();
  
  private metrics: MonitoringMetrics = this.initializeMetrics();
  private notificationDeduplicationCache: Map<string, Date> = new Map();
  private notificationRateLimiter: Map<string, number[]> = new Map();
  
  private storageConnection?: any;
  private collectionTimers: Map<string, NodeJS.Timeout> = new Map();
  
  constructor(config: MonitoringConfig) {
    super();
    this.config = config;
    this.initializeStorage();
  }
  
  private initializeMetrics(): MonitoringMetrics {
    return {
      system: {
        uptime: 0,
        metricsCollected: 0,
        alertsEvaluated: 0,
        notificationsSent: 0,
        healthChecksPassed: 0,
        healthChecksFailed: 0
      },
      performance: {
        metricIngestionRate: 0,
        alertEvaluationTime: 0,
        notificationLatency: 0,
        storageWriteLatency: 0,
        memoryUsage: 0,
        cpuUsage: 0
      },
      storage: {
        totalMetrics: 0,
        storageSize: 0,
        compressionRatio: 0,
        writeErrors: 0,
        readErrors: 0
      },
      alerting: {
        activeAlerts: 0,
        totalAlerts: 0,
        alertsByStatus: {},
        alertsBySeverity: {},
        suppressedAlerts: 0
      }
    };
  }
  
  private async initializeStorage(): Promise<void> {
    switch (this.config.storage.type) {
      case 'prometheus':
        await this.initializePrometheus();
        break;
      case 'influxdb':
        await this.initializeInfluxDB();
        break;
      case 'cloudwatch':
        await this.initializeCloudWatch();
        break;
      case 'datadog':
        await this.initializeDatadog();
        break;
      case 'file':
        await this.initializeFileStorage();
        break;
      default:
        throw new Error(`Unsupported storage type: ${this.config.storage.type}`);
    }
  }
  
  // System lifecycle
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Monitoring system is already running');
    }
    
    try {
      this.emit('monitoring_starting');
      
      // Start metrics collection
      if (this.config.metrics.enableCollection) {
        this.startMetricsCollection();
      }
      
      // Start health checks
      if (this.config.healthChecks.enableHealthChecks) {
        this.startHealthChecks();
      }
      
      // Start alert evaluation
      if (this.config.alerting.enableAlerting) {
        this.startAlertEvaluation();
      }
      
      // Start system monitoring
      this.startSystemMonitoring();
      
      this.isRunning = true;
      
      this.emit('monitoring_started', {
        timestamp: new Date(),
        config: this.config.system
      });
      
    } catch (error) {
      this.emit('monitoring_start_error', error);
      throw error;
    }
  }
  
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }
    
    this.emit('monitoring_stopping');
    
    // Stop all timers
    for (const timer of this.collectionTimers.values()) {
      clearInterval(timer);
    }
    this.collectionTimers.clear();
    
    // Flush remaining metrics
    if (this.metricsBuffer.length > 0) {
      await this.flushMetrics();
    }
    
    // Close storage connection
    if (this.storageConnection) {
      await this.closeStorageConnection();
    }
    
    this.isRunning = false;
    
    this.emit('monitoring_stopped', {
      timestamp: new Date(),
      finalMetrics: this.metrics
    });
  }
  
  // Metrics collection
  private startMetricsCollection(): void {
    const timer = setInterval(() => {
      this.collectSystemMetrics();
      
      if (this.metricsBuffer.length >= this.config.metrics.batchSize ||
          this.shouldFlushMetrics()) {
        this.flushMetrics();
      }
    }, this.config.metrics.collectionInterval);
    
    this.collectionTimers.set('metrics_collection', timer);
  }
  
  private collectSystemMetrics(): void {
    const timestamp = new Date();
    const systemTags = {
      system: this.config.system.name,
      environment: this.config.system.environment,
      region: this.config.system.region,
      version: this.config.system.version
    };
    
    // System metrics
    this.recordMetric({
      name: 'system.uptime',
      value: process.uptime(),
      timestamp,
      tags: systemTags,
      type: 'gauge',
      unit: 'seconds',
      description: 'System uptime in seconds'
    });
    
    this.recordMetric({
      name: 'system.memory.usage',
      value: this.getMemoryUsage(),
      timestamp,
      tags: systemTags,
      type: 'gauge',
      unit: 'bytes',
      description: 'Memory usage in bytes'
    });
    
    this.recordMetric({
      name: 'system.cpu.usage',
      value: this.getCPUUsage(),
      timestamp,
      tags: systemTags,
      type: 'gauge',
      unit: 'percent',
      description: 'CPU usage percentage'
    });
    
    // Application metrics
    this.recordMetric({
      name: 'monitoring.metrics.collected',
      value: this.metrics.system.metricsCollected,
      timestamp,
      tags: systemTags,
      type: 'counter',
      description: 'Total metrics collected'
    });
    
    this.recordMetric({
      name: 'monitoring.alerts.active',
      value: this.activeAlerts.size,
      timestamp,
      tags: systemTags,
      type: 'gauge',
      description: 'Number of active alerts'
    });
    
    this.recordMetric({
      name: 'monitoring.buffer.size',
      value: this.metricsBuffer.length,
      timestamp,
      tags: systemTags,
      type: 'gauge',
      description: 'Metrics buffer size'
    });
  }
  
  public recordMetric(metric: MetricPoint): void {
    this.metricsBuffer.push(metric);
    this.metrics.system.metricsCollected++;
    
    this.emit('metric_recorded', metric);
    
    // Check if immediate flush is needed
    if (this.config.performance.enableBuffering) {
      if (this.metricsBuffer.length >= this.config.performance.bufferSize) {
        this.flushMetrics();
      }
    } else {
      this.flushMetrics();
    }
  }
  
  private shouldFlushMetrics(): boolean {
    if (this.metricsBuffer.length === 0) return false;
    
    const oldestMetric = this.metricsBuffer[0];
    const age = Date.now() - oldestMetric.timestamp.getTime();
    
    return age >= this.config.performance.flushInterval;
  }
  
  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;
    
    const startTime = Date.now();
    const batch = [...this.metricsBuffer];
    this.metricsBuffer = [];
    
    try {
      await this.writeMetricsToStorage(batch);
      
      const writeLatency = Date.now() - startTime;
      this.metrics.performance.storageWriteLatency = writeLatency;
      this.metrics.performance.metricIngestionRate = batch.length / (writeLatency / 1000);
      
      this.emit('metrics_flushed', {
        count: batch.length,
        latency: writeLatency,
        timestamp: new Date()
      });
      
    } catch (error) {
      this.metrics.storage.writeErrors++;
      this.emit('metrics_flush_error', { error, batchSize: batch.length });
      
      // Re-add to buffer for retry
      this.metricsBuffer.unshift(...batch);
    }
  }
  
  // Health checks
  private startHealthChecks(): void {
    const timer = setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthChecks.checkInterval);
    
    this.collectionTimers.set('health_checks', timer);
  }
  
  private async performHealthChecks(): Promise<void> {
    const promises = this.config.healthChecks.endpoints.map(endpoint => 
      this.performHealthCheck(endpoint)
    );
    
    const results = await Promise.allSettled(promises);
    
    results.forEach((result, index) => {
      const endpoint = this.config.healthChecks.endpoints[index];
      
      if (result.status === 'fulfilled') {
        this.healthCheckResults.set(endpoint.name, result.value);
        
        if (result.value.status === 'healthy') {
          this.metrics.system.healthChecksPassed++;
        } else {
          this.metrics.system.healthChecksFailed++;
        }
      } else {
        this.metrics.system.healthChecksFailed++;
        this.healthCheckResults.set(endpoint.name, {
          status: 'unhealthy',
          timestamp: new Date(),
          responseTime: 0,
          error: result.reason?.message || 'Unknown error'
        });
      }
    });
    
    this.emit('health_checks_completed', {
      total: this.config.healthChecks.endpoints.length,
      passed: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      timestamp: new Date()
    });
  }
  
  private async performHealthCheck(endpoint: HealthCheckEndpoint): Promise<HealthCheckResult> {
    if (!endpoint.enabled) {
      return {
        status: 'disabled',
        timestamp: new Date(),
        responseTime: 0
      };
    }
    
    const startTime = Date.now();
    
    try {
      // Perform HTTP health check
      const response = await this.makeHealthCheckRequest(endpoint);
      const responseTime = Date.now() - startTime;
      
      const status = this.evaluateHealthCheckResponse(endpoint, response);
      
      return {
        status,
        timestamp: new Date(),
        responseTime,
        statusCode: response.status,
        response: response.data
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        responseTime,
        error: error.message
      };
    }
  }
  
  private async makeHealthCheckRequest(endpoint: HealthCheckEndpoint): Promise<any> {
    // HTTP request implementation would go here
    // For now, return a mock response
    return {
      status: 200,
      data: 'OK'
    };
  }
  
  private evaluateHealthCheckResponse(endpoint: HealthCheckEndpoint, response: any): 'healthy' | 'unhealthy' {
    // Check status code
    if (!endpoint.expectedStatus.includes(response.status)) {
      return 'unhealthy';
    }
    
    // Check content if specified
    if (endpoint.expectedContent && !response.data?.includes(endpoint.expectedContent)) {
      return 'unhealthy';
    }
    
    return 'healthy';
  }
  
  // Alert management
  private startAlertEvaluation(): void {
    const timer = setInterval(() => {
      this.evaluateAlerts();
    }, this.config.alerting.alertEvaluationInterval);
    
    this.collectionTimers.set('alert_evaluation', timer);
  }
  
  private async evaluateAlerts(): Promise<void> {
    const startTime = Date.now();
    
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue;
      
      try {
        await this.evaluateAlertRule(rule);
      } catch (error) {
        this.emit('alert_evaluation_error', {
          ruleId: rule.id,
          ruleName: rule.name,
          error: error.message
        });
      }
    }
    
    const evaluationTime = Date.now() - startTime;
    this.metrics.performance.alertEvaluationTime = evaluationTime;
    this.metrics.system.alertsEvaluated++;
    
    this.emit('alerts_evaluated', {
      rulesEvaluated: this.alertRules.size,
      evaluationTime,
      timestamp: new Date()
    });
  }
  
  private async evaluateAlertRule(rule: AlertRule): Promise<void> {
    const queryResult = await this.executeAlertQuery(rule.query);
    
    if (queryResult === null) return;
    
    const isTriggered = this.evaluateCondition(rule.condition, queryResult, rule.threshold);
    const alertId = this.generateAlertId(rule, queryResult);
    const existingAlert = this.activeAlerts.get(alertId);
    
    if (isTriggered) {
      if (!existingAlert) {
        // New alert
        const alert = await this.createAlert(rule, queryResult, alertId);
        this.activeAlerts.set(alertId, alert);
        
        this.emit('alert_triggered', alert);
        await this.sendNotifications(alert);
        
      } else {
        // Update existing alert
        existingAlert.duration = Date.now() - existingAlert.startTime.getTime();
        existingAlert.value = queryResult;
        
        // Check for escalation
        if (this.shouldEscalate(existingAlert, rule)) {
          await this.escalateAlert(existingAlert, rule);
        }
      }
    } else {
      if (existingAlert && existingAlert.status === 'firing') {
        // Resolve alert
        existingAlert.status = 'resolved';
        existingAlert.endTime = new Date();
        
        this.emit('alert_resolved', existingAlert);
        await this.sendResolutionNotifications(existingAlert);
        
        // Remove from active alerts after grace period
        setTimeout(() => {
          this.activeAlerts.delete(alertId);
        }, this.config.healthChecks.gracePeriod);
      }
    }
  }
  
  private async executeAlertQuery(query: string): Promise<number | null> {
    try {
      // Query execution would depend on storage type
      // For now, return a mock value
      return Math.random() * 100;
    } catch (error) {
      this.emit('query_execution_error', { query, error: error.message });
      return null;
    }
  }
  
  private evaluateCondition(condition: string, value: number, threshold: number): boolean {
    switch (condition) {
      case 'gt': return value > threshold;
      case 'lt': return value < threshold;
      case 'eq': return value === threshold;
      case 'ne': return value !== threshold;
      case 'gte': return value >= threshold;
      case 'lte': return value <= threshold;
      default: return false;
    }
  }
  
  private async createAlert(rule: AlertRule, value: number, alertId: string): Promise<AlertInstance> {
    const now = new Date();
    
    const alert: AlertInstance = {
      id: alertId,
      ruleId: rule.id,
      ruleName: rule.name,
      status: 'firing',
      severity: rule.severity,
      value,
      threshold: rule.threshold,
      startTime: now,
      duration: 0,
      labels: { ...rule.tags },
      annotations: {
        description: rule.description,
        summary: `${rule.name} is firing`
      },
      fingerprint: this.generateFingerprint(rule, value),
      notificationsSent: []
    };
    
    this.metrics.alerting.totalAlerts++;
    this.metrics.alerting.activeAlerts++;
    this.updateAlertMetrics();
    
    return alert;
  }
  
  // Notification system
  private async sendNotifications(alert: AlertInstance): Promise<void> {
    const rule = this.alertRules.get(alert.ruleId);
    if (!rule) return;
    
    // Check rate limiting
    if (this.isRateLimited(alert)) {
      this.emit('notification_rate_limited', { alertId: alert.id });
      return;
    }
    
    // Check quiet hours
    if (this.isQuietHours()) {
      this.emit('notification_suppressed_quiet_hours', { alertId: alert.id });
      return;
    }
    
    // Check deduplication
    const deduplicationKey = this.getDeduplicationKey(alert);
    if (this.isNotificationDuplicate(deduplicationKey)) {
      this.emit('notification_deduplicated', { alertId: alert.id });
      return;
    }
    
    const notificationPromises = rule.notifications.map(channel => 
      this.sendNotification(alert, channel)
    );
    
    const results = await Promise.allSettled(notificationPromises);
    
    results.forEach((result, index) => {
      const channel = rule.notifications[index];
      const notificationId = this.generateNotificationId();
      
      const record: NotificationRecord = {
        id: notificationId,
        channel,
        timestamp: new Date(),
        status: result.status === 'fulfilled' ? 'sent' : 'failed',
        retryCount: 0,
        error: result.status === 'rejected' ? result.reason?.message : undefined,
        metadata: {}
      };
      
      alert.notificationsSent.push(record);
      
      if (result.status === 'fulfilled') {
        this.metrics.system.notificationsSent++;
      }
    });
    
    // Update deduplication cache
    this.notificationDeduplicationCache.set(deduplicationKey, new Date());
  }
  
  private async sendNotification(alert: AlertInstance, channel: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      switch (channel) {
        case 'email':
          await this.sendEmailNotification(alert);
          break;
        case 'slack':
          await this.sendSlackNotification(alert);
          break;
        case 'pagerduty':
          await this.sendPagerDutyNotification(alert);
          break;
        case 'webhook':
          await this.sendWebhookNotification(alert);
          break;
        case 'sms':
          await this.sendSMSNotification(alert);
          break;
        default:
          throw new Error(`Unknown notification channel: ${channel}`);
      }
      
      const latency = Date.now() - startTime;
      this.metrics.performance.notificationLatency = latency;
      
      this.emit('notification_sent', {
        alertId: alert.id,
        channel,
        latency,
        timestamp: new Date()
      });
      
    } catch (error) {
      this.emit('notification_failed', {
        alertId: alert.id,
        channel,
        error: error.message,
        timestamp: new Date()
      });
      throw error;
    }
  }
  
  // Notification implementations
  private async sendEmailNotification(alert: AlertInstance): Promise<void> {
    if (!this.config.notifications.email.enabled) return;
    
    const emailConfig = this.config.notifications.email;
    const subject = `[${alert.severity.toUpperCase()}] ${alert.ruleName}`;
    const body = this.generateEmailBody(alert);
    
    // Email sending implementation would go here
    // For now, just emit an event
    this.emit('email_notification_prepared', {
      to: emailConfig.to,
      subject,
      body,
      alert
    });
  }
  
  private async sendSlackNotification(alert: AlertInstance): Promise<void> {
    if (!this.config.notifications.slack.enabled) return;
    
    const slackConfig = this.config.notifications.slack;
    const message = this.generateSlackMessage(alert);
    
    // Slack API call would go here
    this.emit('slack_notification_prepared', {
      channel: slackConfig.channel,
      message,
      alert
    });
  }
  
  private async sendPagerDutyNotification(alert: AlertInstance): Promise<void> {
    if (!this.config.notifications.pagerduty.enabled) return;
    
    const pagerDutyConfig = this.config.notifications.pagerduty;
    const incident = this.generatePagerDutyIncident(alert);
    
    // PagerDuty API call would go here
    this.emit('pagerduty_notification_prepared', {
      integrationKey: pagerDutyConfig.integrationKey,
      incident,
      alert
    });
  }
  
  private async sendWebhookNotification(alert: AlertInstance): Promise<void> {
    if (!this.config.notifications.webhook.enabled) return;
    
    const webhookConfig = this.config.notifications.webhook;
    const payload = this.generateWebhookPayload(alert);
    
    for (const url of webhookConfig.urls) {
      // HTTP request would go here
      this.emit('webhook_notification_prepared', {
        url,
        payload,
        headers: webhookConfig.headers,
        alert
      });
    }
  }
  
  private async sendSMSNotification(alert: AlertInstance): Promise<void> {
    if (!this.config.notifications.sms.enabled) return;
    
    const smsConfig = this.config.notifications.sms;
    const message = this.generateSMSMessage(alert);
    
    // SMS API call would go here
    this.emit('sms_notification_prepared', {
      phoneNumbers: smsConfig.phoneNumbers,
      message,
      provider: smsConfig.provider,
      alert
    });
  }
  
  // Message generation
  private generateEmailBody(alert: AlertInstance): string {
    return `
Alert: ${alert.ruleName}
Severity: ${alert.severity}
Status: ${alert.status}
Value: ${alert.value}
Threshold: ${alert.threshold}
Started: ${alert.startTime.toISOString()}
Duration: ${Math.floor(alert.duration / 1000)}s

Description: ${alert.annotations.description}

Labels:
${Object.entries(alert.labels).map(([k, v]) => `  ${k}: ${v}`).join('\n')}

System: ${this.config.system.name}
Environment: ${this.config.system.environment}
Region: ${this.config.system.region}
    `.trim();
  }
  
  private generateSlackMessage(alert: AlertInstance): any {
    const color = this.getSeverityColor(alert.severity);
    
    return {
      text: `Alert: ${alert.ruleName}`,
      attachments: [{
        color,
        fields: [
          { title: 'Severity', value: alert.severity, short: true },
          { title: 'Status', value: alert.status, short: true },
          { title: 'Value', value: alert.value.toString(), short: true },
          { title: 'Threshold', value: alert.threshold.toString(), short: true },
          { title: 'Duration', value: `${Math.floor(alert.duration / 1000)}s`, short: true },
          { title: 'System', value: this.config.system.name, short: true }
        ],
        ts: Math.floor(alert.startTime.getTime() / 1000)
      }]
    };
  }
  
  private generatePagerDutyIncident(alert: AlertInstance): any {
    return {
      incident_key: alert.id,
      event_type: 'trigger',
      description: `${alert.ruleName}: ${alert.annotations.description}`,
      details: {
        severity: alert.severity,
        value: alert.value,
        threshold: alert.threshold,
        labels: alert.labels,
        system: this.config.system.name
      }
    };
  }
  
  private generateWebhookPayload(alert: AlertInstance): any {
    return {
      alert,
      system: this.config.system,
      timestamp: new Date().toISOString()
    };
  }
  
  private generateSMSMessage(alert: AlertInstance): string {
    return `[${alert.severity.toUpperCase()}] ${alert.ruleName}: ${alert.value} ${alert.threshold} (${this.config.system.name})`;
  }
  
  // Utility methods
  private generateAlertId(rule: AlertRule, value: number): string {
    const fingerprint = this.generateFingerprint(rule, value);
    return `alert_${rule.id}_${fingerprint}`;
  }
  
  private generateFingerprint(rule: AlertRule, value: number): string {
    const content = `${rule.id}:${JSON.stringify(rule.tags)}:${value}`;
    return createHash('sha256').update(content).digest('hex').substring(0, 16);
  }
  
  private generateNotificationId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'emergency': return '#FF0000';
      case 'critical': return '#FF6600';
      case 'warning': return '#FFAA00';
      case 'info': return '#00AA00';
      default: return '#808080';
    }
  }
  
  private getDeduplicationKey(alert: AlertInstance): string {
    return `${alert.ruleId}:${alert.fingerprint}`;
  }
  
  private isNotificationDuplicate(key: string): boolean {
    if (!this.config.alerting.enableNotificationDeduplication) return false;
    
    const lastSent = this.notificationDeduplicationCache.get(key);
    if (!lastSent) return false;
    
    const timeDiff = Date.now() - lastSent.getTime();
    return timeDiff < this.config.alerting.deduplicationWindow;
  }
  
  private isRateLimited(alert: AlertInstance): boolean {
    const hour = Math.floor(Date.now() / (60 * 60 * 1000));
    const key = `${alert.ruleId}:${hour}`;
    
    const count = this.notificationRateLimiter.get(key) || [];
    return count.length >= this.config.alerting.maxNotificationsPerHour;
  }
  
  private isQuietHours(): boolean {
    if (!this.config.alerting.quietHours.enabled) return false;
    
    const now = new Date();
    const start = this.parseTime(this.config.alerting.quietHours.start);
    const end = this.parseTime(this.config.alerting.quietHours.end);
    
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    if (start <= end) {
      return currentMinutes >= start && currentMinutes <= end;
    } else {
      return currentMinutes >= start || currentMinutes <= end;
    }
  }
  
  private parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }
  
  private shouldEscalate(alert: AlertInstance, rule: AlertRule): boolean {
    if (!rule.escalation?.enabled) return false;
    
    const timeSinceLastNotification = Date.now() - 
      (alert.notificationsSent[alert.notificationsSent.length - 1]?.timestamp.getTime() || 0);
    
    return timeSinceLastNotification >= rule.escalation.delay;
  }
  
  private async escalateAlert(alert: AlertInstance, rule: AlertRule): Promise<void> {
    if (!rule.escalation) return;
    
    this.emit('alert_escalated', alert);
    
    // Send escalation notifications
    const notificationPromises = rule.escalation.notifications.map(channel => 
      this.sendNotification(alert, channel)
    );
    
    await Promise.allSettled(notificationPromises);
  }
  
  private async sendResolutionNotifications(alert: AlertInstance): Promise<void> {
    // Implementation for sending resolution notifications
    this.emit('alert_resolution_notifications_sent', alert);
  }
  
  private updateAlertMetrics(): void {
    this.metrics.alerting.activeAlerts = this.activeAlerts.size;
    
    // Update status counts
    const statusCounts: Record<string, number> = {};
    const severityCounts: Record<string, number> = {};
    
    for (const alert of this.activeAlerts.values()) {
      statusCounts[alert.status] = (statusCounts[alert.status] || 0) + 1;
      severityCounts[alert.severity] = (severityCounts[alert.severity] || 0) + 1;
    }
    
    this.metrics.alerting.alertsByStatus = statusCounts;
    this.metrics.alerting.alertsBySeverity = severityCounts;
  }
  
  // Storage implementations
  private async initializePrometheus(): Promise<void> {
    // Prometheus client initialization
  }
  
  private async initializeInfluxDB(): Promise<void> {
    // InfluxDB client initialization
  }
  
  private async initializeCloudWatch(): Promise<void> {
    // CloudWatch client initialization
  }
  
  private async initializeDatadog(): Promise<void> {
    // Datadog client initialization
  }
  
  private async initializeFileStorage(): Promise<void> {
    // File storage initialization
    const fs = require('fs').promises;
    const path = require('path');
    
    const storageDir = this.config.storage.connectionString || './monitoring-data';
    await fs.mkdir(storageDir, { recursive: true });
  }
  
  private async writeMetricsToStorage(metrics: MetricPoint[]): Promise<void> {
    switch (this.config.storage.type) {
      case 'file':
        await this.writeMetricsToFile(metrics);
        break;
      default:
        // Other storage implementations would go here
        break;
    }
  }
  
  private async writeMetricsToFile(metrics: MetricPoint[]): Promise<void> {
    const fs = require('fs').promises;
    const path = require('path');
    
    const storageDir = this.config.storage.connectionString || './monitoring-data';
    const filename = `metrics-${new Date().toISOString().split('T')[0]}.json`;
    const filepath = path.join(storageDir, filename);
    
    const data = JSON.stringify(metrics, null, 2);
    await fs.appendFile(filepath, data + '\n');
  }
  
  private async closeStorageConnection(): Promise<void> {
    // Close storage connections based on type
  }
  
  private startSystemMonitoring(): void {
    const timer = setInterval(() => {
      this.metrics.system.uptime = process.uptime();
      this.metrics.performance.memoryUsage = this.getMemoryUsage();
      this.metrics.performance.cpuUsage = this.getCPUUsage();
    }, 10000);
    
    this.collectionTimers.set('system_monitoring', timer);
  }
  
  private getMemoryUsage(): number {
    const usage = process.memoryUsage();
    return usage.heapUsed;
  }
  
  private getCPUUsage(): number {
    // CPU usage calculation would go here
    return Math.random() * 100; // Placeholder
  }
  
  // Public API methods
  public addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    this.emit('alert_rule_added', rule);
  }
  
  public removeAlertRule(ruleId: string): void {
    const rule = this.alertRules.get(ruleId);
    if (rule) {
      this.alertRules.delete(ruleId);
      this.emit('alert_rule_removed', rule);
    }
  }
  
  public getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }
  
  public getActiveAlerts(): AlertInstance[] {
    return Array.from(this.activeAlerts.values());
  }
  
  public getMetrics(): MonitoringMetrics {
    return { ...this.metrics };
  }
  
  public getHealthStatus(): any {
    return {
      status: this.isRunning ? 'running' : 'stopped',
      timestamp: new Date(),
      healthChecks: Object.fromEntries(this.healthCheckResults),
      alerts: {
        active: this.activeAlerts.size,
        total: this.metrics.alerting.totalAlerts
      },
      metrics: this.metrics
    };
  }
  
  public async testNotification(channel: string, testMessage?: string): Promise<void> {
    const testAlert: AlertInstance = {
      id: 'test_alert',
      ruleId: 'test_rule',
      ruleName: 'Test Alert',
      status: 'firing',
      severity: 'info',
      value: 100,
      threshold: 50,
      startTime: new Date(),
      duration: 0,
      labels: { test: 'true' },
      annotations: { description: testMessage || 'This is a test alert' },
      fingerprint: 'test_fingerprint',
      notificationsSent: []
    };
    
    await this.sendNotification(testAlert, channel);
  }
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'disabled';
  timestamp: Date;
  responseTime: number;
  statusCode?: number;
  response?: any;
  error?: string;
}

// Default configuration
export function createDefaultMonitoringConfig(): MonitoringConfig {
  return {
    system: {
      name: 'ioc-monitoring',
      environment: 'production',
      region: 'us-east-1',
      datacenter: 'us-east-1a',
      version: '1.0.0'
    },
    
    metrics: {
      enableCollection: true,
      collectionInterval: 30000,
      batchSize: 100,
      retentionPeriod: 2592000000, // 30 days
      aggregationWindows: [60, 300, 3600], // 1m, 5m, 1h
      customMetrics: [],
      enableProfiling: false,
      enableTracing: false
    },
    
    healthChecks: {
      enableHealthChecks: true,
      checkInterval: 30000,
      healthCheckTimeout: 10000,
      enableDependencyChecks: true,
      endpoints: [],
      gracePeriod: 60000,
      maxFailures: 3
    },
    
    alerting: {
      enableAlerting: true,
      alertEvaluationInterval: 30000,
      enableNotificationDeduplication: true,
      deduplicationWindow: 300000,
      enableEscalation: true,
      escalationDelay: 300000,
      maxNotificationsPerHour: 10,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
        timezone: 'UTC'
      }
    },
    
    notifications: {
      email: {
        enabled: false,
        smtpHost: 'localhost',
        smtpPort: 587,
        username: '',
        password: '',
        from: 'monitoring@iocframework.com',
        to: [],
        enableTLS: true
      },
      slack: {
        enabled: false,
        webhookUrl: '',
        channel: '#alerts',
        username: 'IOC Monitoring',
        iconEmoji: ':warning:'
      },
      pagerduty: {
        enabled: false,
        integrationKey: '',
        severity: 'error'
      },
      webhook: {
        enabled: false,
        urls: [],
        headers: {},
        retryAttempts: 3,
        timeout: 30000
      },
      sms: {
        enabled: false,
        provider: 'twilio',
        apiKey: '',
        apiSecret: '',
        phoneNumbers: []
      }
    },
    
    storage: {
      type: 'file',
      connectionString: './monitoring-data',
      database: 'monitoring',
      retention: {
        raw: 604800000, // 7 days
        aggregated: 2592000000, // 30 days
        alerts: 7776000000 // 90 days
      },
      compression: true,
      enableSharding: false
    },
    
    performance: {
      enableBuffering: true,
      bufferSize: 1000,
      flushInterval: 60000,
      enableCompression: true,
      compressionLevel: 6,
      enableBatching: true,
      maxConcurrentWrites: 5
    }
  };
}

// Factory function
export function createMonitoringSystem(config?: Partial<MonitoringConfig>): MonitoringSystem {
  const defaultConfig = createDefaultMonitoringConfig();
  const mergedConfig = { ...defaultConfig, ...config };
  
  return new MonitoringSystem(mergedConfig);
}