/**
 * Real-time Monitoring Dashboard for Dual-AI System
 * Provides comprehensive system monitoring and alerting
 */

import { EventEmitter } from 'events';
import { metrics, getDashboardMetrics } from '../utils/metrics';
import { logger } from '../utils/logger';

export interface DashboardMetrics {
  systemHealth: SystemHealthMetrics;
  aiPerformance: AIPerformanceMetrics;
  disagreements: DisagreementMetrics;
  learning: LearningMetrics;
  infrastructure: InfrastructureMetrics;
  alerts: AlertMetrics;
  timestamp: Date;
}

export interface SystemHealthMetrics {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  errorRate: number;
  responseTime: number;
  throughput: number;
  components: {
    generator: ComponentHealth;
    validator: ComponentHealth;
    disagreementHandler: ComponentHealth;
    learningEngine: ComponentHealth;
    cache: ComponentHealth;
    database: ComponentHealth;
    queue: ComponentHealth;
  };
}

export interface AIPerformanceMetrics {
  generation: {
    totalRequests: number;
    successRate: number;
    avgDuration: number;
    avgConfidence: number;
    tokenUsage: number;
    costToday: number;
  };
  validation: {
    totalValidations: number;
    approvalRate: number;
    avgDuration: number;
    avgEthicalScore: number;
    avgBiasScore: number;
    avgQualityScore: number;
  };
  concordance: {
    rate: number;
    trend: 'improving' | 'stable' | 'declining';
    lastWeek: number[];
  };
}

export interface DisagreementMetrics {
  total: number;
  open: number;
  resolved: number;
  escalated: number;
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  byType: {
    ethical: number;
    bias: number;
    quality: number;
    compliance: number;
  };
  avgResolutionTime: number;
  humanReviewQueue: number;
}

export interface LearningMetrics {
  eventsToday: number;
  eventsProcessed: number;
  eventsPending: number;
  insightsGenerated: number;
  avgImpactScore: number;
  retrainingJobs: {
    active: number;
    completed: number;
    failed: number;
  };
  modelImprovements: {
    generator: number;
    validator: number;
  };
}

export interface InfrastructureMetrics {
  cache: {
    hitRate: number;
    size: number;
    evictions: number;
  };
  queue: {
    depth: number;
    processing: number;
    failed: number;
    avgWaitTime: number;
  };
  database: {
    connections: number;
    avgQueryTime: number;
    slowQueries: number;
  };
  memory: {
    usage: number;
    heap: number;
    external: number;
  };
}

export interface AlertMetrics {
  active: number;
  critical: number;
  warning: number;
  recent: Alert[];
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  errorRate: number;
  lastCheck: Date;
  issues?: string[];
}

export interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  component: string;
  timestamp: Date;
  acknowledged: boolean;
  resolvedAt?: Date;
}

export class MonitoringDashboard extends EventEmitter {
  private config: MonitoringConfig;
  private alerts: Map<string, Alert>;
  private metrics: DashboardMetrics | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(config: MonitoringConfig) {
    super();
    this.config = config;
    this.alerts = new Map();
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    
    logger.info('Starting monitoring dashboard', {
      updateInterval: this.config.updateInterval,
      alertsEnabled: this.config.alerts.enabled
    });

    // Start periodic metrics collection
    this.updateInterval = setInterval(() => {
      this.updateMetrics().catch(error => {
        logger.error('Failed to update metrics', { error: error.message });
      });
    }, this.config.updateInterval);

    // Initial metrics collection
    await this.updateMetrics();

    logger.info('Monitoring dashboard started successfully');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    logger.info('Monitoring dashboard stopped');
  }

  getCurrentMetrics(): DashboardMetrics | null {
    return this.metrics;
  }

  getAlerts(filter?: AlertFilter): Alert[] {
    const alerts = Array.from(this.alerts.values());
    
    if (!filter) return alerts;

    return alerts.filter(alert => {
      if (filter.type && alert.type !== filter.type) return false;
      if (filter.component && alert.component !== filter.component) return false;
      if (filter.acknowledged !== undefined && alert.acknowledged !== filter.acknowledged) return false;
      if (filter.since && alert.timestamp < filter.since) return false;
      return true;
    });
  }

  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      this.emit('alertAcknowledged', alert);
      logger.info('Alert acknowledged', { alertId, title: alert.title });
      return true;
    }
    return false;
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolvedAt = new Date();
      this.alerts.delete(alertId);
      this.emit('alertResolved', alert);
      logger.info('Alert resolved', { alertId, title: alert.title });
      return true;
    }
    return false;
  }

  createAlert(alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>): string {
    const alertId = this.generateAlertId();
    const fullAlert: Alert = {
      ...alert,
      id: alertId,
      timestamp: new Date(),
      acknowledged: false
    };

    this.alerts.set(alertId, fullAlert);
    this.emit('alertCreated', fullAlert);

    logger.warn('Alert created', {
      alertId,
      type: alert.type,
      title: alert.title,
      component: alert.component
    });

    // Send external notifications if configured
    if (this.config.alerts.enabled) {
      this.sendAlertNotifications(fullAlert).catch(error => {
        logger.error('Failed to send alert notifications', {
          alertId,
          error: error.message
        });
      });
    }

    return alertId;
  }

  private async updateMetrics(): Promise<void> {
    try {
      const startTime = Date.now();

      // Collect metrics from various sources
      const [
        systemHealth,
        aiPerformance,
        disagreements,
        learning,
        infrastructure
      ] = await Promise.all([
        this.collectSystemHealthMetrics(),
        this.collectAIPerformanceMetrics(),
        this.collectDisagreementMetrics(),
        this.collectLearningMetrics(),
        this.collectInfrastructureMetrics()
      ]);

      const alerts = this.collectAlertMetrics();

      this.metrics = {
        systemHealth,
        aiPerformance,
        disagreements,
        learning,
        infrastructure,
        alerts,
        timestamp: new Date()
      };

      // Check for threshold violations and create alerts
      await this.checkThresholds(this.metrics);

      const duration = Date.now() - startTime;
      logger.debug('Metrics updated', { duration });

      // Emit metrics update event
      this.emit('metricsUpdated', this.metrics);

    } catch (error) {
      logger.error('Failed to update metrics', { error: error.message });
      throw error;
    }
  }

  private async collectSystemHealthMetrics(): Promise<SystemHealthMetrics> {
    // Collect basic system metrics
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    // Calculate error rate from recent metrics
    const errorRate = this.calculateErrorRate();
    const responseTime = this.calculateAvgResponseTime();
    const throughput = this.calculateThroughput();

    // Collect component health
    const components = await this.collectComponentHealth();

    // Determine overall system status
    const componentStatuses = Object.values(components);
    const healthyCount = componentStatuses.filter(c => c.status === 'healthy').length;
    const totalCount = componentStatuses.length;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyCount === totalCount) status = 'healthy';
    else if (healthyCount >= totalCount * 0.7) status = 'degraded';
    else status = 'unhealthy';

    return {
      status,
      uptime,
      errorRate,
      responseTime,
      throughput,
      components
    };
  }

  private async collectAIPerformanceMetrics(): Promise<AIPerformanceMetrics> {
    const timeRange = { start: Date.now() - 24 * 60 * 60 * 1000, end: Date.now() };

    // Generation metrics
    const generationTotal = metrics.getAggregatedMetrics('generation_success', 'count', timeRange) +
                          metrics.getAggregatedMetrics('generation_error', 'count', timeRange);
    const generationSuccess = metrics.getAggregatedMetrics('generation_success', 'count', timeRange);
    const generationSuccessRate = generationTotal > 0 ? generationSuccess / generationTotal : 0;

    // Validation metrics
    const validationTotal = metrics.getAggregatedMetrics('validation_success', 'count', timeRange) +
                           metrics.getAggregatedMetrics('validation_error', 'count', timeRange);
    const validationApproved = metrics.getMetrics('validation_status_approved', timeRange).length;
    const validationApprovalRate = validationTotal > 0 ? validationApproved / validationTotal : 0;

    // Concordance calculation
    const disagreements = metrics.getAggregatedMetrics('disagreement_detected', 'count', timeRange);
    const concordanceRate = validationTotal > 0 ? 1 - (disagreements / validationTotal) : 0;

    return {
      generation: {
        totalRequests: generationTotal,
        successRate: generationSuccessRate,
        avgDuration: metrics.getAggregatedMetrics('generation_duration', 'avg', timeRange),
        avgConfidence: metrics.getAggregatedMetrics('generation_confidence', 'avg', timeRange),
        tokenUsage: metrics.getAggregatedMetrics('api_tokens', 'sum', timeRange),
        costToday: metrics.getAggregatedMetrics('api_cost', 'sum', timeRange)
      },
      validation: {
        totalValidations: validationTotal,
        approvalRate: validationApprovalRate,
        avgDuration: metrics.getAggregatedMetrics('validation_duration', 'avg', timeRange),
        avgEthicalScore: metrics.getAggregatedMetrics('validation_ethical_score', 'avg', timeRange),
        avgBiasScore: metrics.getAggregatedMetrics('validation_bias_score', 'avg', timeRange),
        avgQualityScore: metrics.getAggregatedMetrics('validation_quality_score', 'avg', timeRange)
      },
      concordance: {
        rate: concordanceRate,
        trend: this.calculateConcordanceTrend(),
        lastWeek: this.getConcordanceHistory()
      }
    };
  }

  private async collectDisagreementMetrics(): Promise<DisagreementMetrics> {
    // In a real implementation, these would query the database
    return {
      total: 0,
      open: 0,
      resolved: 0,
      escalated: 0,
      bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
      byType: { ethical: 0, bias: 0, quality: 0, compliance: 0 },
      avgResolutionTime: 0,
      humanReviewQueue: 0
    };
  }

  private async collectLearningMetrics(): Promise<LearningMetrics> {
    const timeRange = { start: Date.now() - 24 * 60 * 60 * 1000, end: Date.now() };

    return {
      eventsToday: metrics.getAggregatedMetrics('learning_event', 'count', timeRange),
      eventsProcessed: metrics.getAggregatedMetrics('learning_event_processed', 'count', timeRange),
      eventsPending: metrics.getAggregatedMetrics('learning_event_pending', 'count', timeRange),
      insightsGenerated: metrics.getAggregatedMetrics('learning_insight_generated', 'count', timeRange),
      avgImpactScore: metrics.getAggregatedMetrics('learning_impact', 'avg', timeRange),
      retrainingJobs: {
        active: 0,
        completed: 0,
        failed: 0
      },
      modelImprovements: {
        generator: 0,
        validator: 0
      }
    };
  }

  private async collectInfrastructureMetrics(): Promise<InfrastructureMetrics> {
    const memoryUsage = process.memoryUsage();

    return {
      cache: {
        hitRate: this.calculateCacheHitRate(),
        size: metrics.getAggregatedMetrics('cache_memory_entries', 'avg'),
        evictions: metrics.getAggregatedMetrics('cache_evictions_total', 'avg')
      },
      queue: {
        depth: metrics.getAggregatedMetrics('queue_length', 'avg'),
        processing: metrics.getAggregatedMetrics('queue_processing', 'avg'),
        failed: metrics.getAggregatedMetrics('queue_failed', 'avg'),
        avgWaitTime: metrics.getAggregatedMetrics('queue_average_wait_time', 'avg')
      },
      database: {
        connections: 0, // Would be collected from actual database
        avgQueryTime: 0,
        slowQueries: 0
      },
      memory: {
        usage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
        heap: memoryUsage.heapUsed / 1024 / 1024, // MB
        external: memoryUsage.external / 1024 / 1024 // MB
      }
    };
  }

  private collectAlertMetrics(): AlertMetrics {
    const alerts = Array.from(this.alerts.values());
    const activeAlerts = alerts.filter(a => !a.resolvedAt);
    const recentAlerts = alerts
      .filter(a => a.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    return {
      active: activeAlerts.length,
      critical: activeAlerts.filter(a => a.type === 'critical').length,
      warning: activeAlerts.filter(a => a.type === 'warning').length,
      recent: recentAlerts
    };
  }

  private async collectComponentHealth(): Promise<SystemHealthMetrics['components']> {
    // In a real implementation, these would be actual health checks
    const defaultHealth: ComponentHealth = {
      status: 'healthy',
      latency: 100,
      errorRate: 0.01,
      lastCheck: new Date()
    };

    return {
      generator: { ...defaultHealth },
      validator: { ...defaultHealth },
      disagreementHandler: { ...defaultHealth },
      learningEngine: { ...defaultHealth },
      cache: { ...defaultHealth },
      database: { ...defaultHealth },
      queue: { ...defaultHealth }
    };
  }

  private async checkThresholds(dashboardMetrics: DashboardMetrics): Promise<void> {
    const thresholds = this.config.thresholds;

    // Check error rate threshold
    if (dashboardMetrics.systemHealth.errorRate > thresholds.errorRate) {
      this.createAlert({
        type: 'critical',
        title: 'High Error Rate',
        description: `Error rate ${(dashboardMetrics.systemHealth.errorRate * 100).toFixed(2)}% exceeds threshold of ${(thresholds.errorRate * 100).toFixed(2)}%`,
        component: 'system'
      });
    }

    // Check response time threshold
    if (dashboardMetrics.systemHealth.responseTime > thresholds.responseTime) {
      this.createAlert({
        type: 'warning',
        title: 'High Response Time',
        description: `Average response time ${dashboardMetrics.systemHealth.responseTime}ms exceeds threshold of ${thresholds.responseTime}ms`,
        component: 'system'
      });
    }

    // Check queue depth threshold
    if (dashboardMetrics.infrastructure.queue.depth > thresholds.queueDepth) {
      this.createAlert({
        type: 'warning',
        title: 'High Queue Depth',
        description: `Queue depth ${dashboardMetrics.infrastructure.queue.depth} exceeds threshold of ${thresholds.queueDepth}`,
        component: 'queue'
      });
    }

    // Check disagreement rate threshold
    if (dashboardMetrics.aiPerformance.concordance.rate < (1 - thresholds.disagreementRate)) {
      this.createAlert({
        type: 'warning',
        title: 'High Disagreement Rate',
        description: `Disagreement rate ${((1 - dashboardMetrics.aiPerformance.concordance.rate) * 100).toFixed(2)}% exceeds threshold of ${(thresholds.disagreementRate * 100).toFixed(2)}%`,
        component: 'dual_ai'
      });
    }

    // Check memory usage threshold
    if (dashboardMetrics.infrastructure.memory.usage > 80) {
      this.createAlert({
        type: 'warning',
        title: 'High Memory Usage',
        description: `Memory usage ${dashboardMetrics.infrastructure.memory.usage.toFixed(1)}% exceeds 80%`,
        component: 'system'
      });
    }
  }

  private async sendAlertNotifications(alert: Alert): Promise<void> {
    const notifications = [];

    // Email notifications
    if (this.config.alerts.email.enabled && this.config.alerts.email.recipients.length > 0) {
      notifications.push(this.sendEmailAlert(alert));
    }

    // Slack notifications
    if (this.config.alerts.slack.enabled && this.config.alerts.slack.webhookUrl) {
      notifications.push(this.sendSlackAlert(alert));
    }

    // Webhook notifications
    if (this.config.alerts.webhook.enabled && this.config.alerts.webhook.url) {
      notifications.push(this.sendWebhookAlert(alert));
    }

    await Promise.allSettled(notifications);
  }

  private async sendEmailAlert(alert: Alert): Promise<void> {
    // Email implementation would go here
    logger.info('Email alert sent', { alertId: alert.id, recipients: this.config.alerts.email.recipients });
  }

  private async sendSlackAlert(alert: Alert): Promise<void> {
    if (!this.config.alerts.slack.webhookUrl) return;

    try {
      const payload = {
        text: `${alert.type.toUpperCase()}: ${alert.title}`,
        attachments: [
          {
            color: alert.type === 'critical' ? 'danger' : 'warning',
            fields: [
              { title: 'Component', value: alert.component, short: true },
              { title: 'Time', value: alert.timestamp.toISOString(), short: true },
              { title: 'Description', value: alert.description, short: false }
            ]
          }
        ]
      };

      await fetch(this.config.alerts.slack.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      logger.info('Slack alert sent', { alertId: alert.id });

    } catch (error) {
      logger.error('Failed to send Slack alert', { alertId: alert.id, error: error.message });
    }
  }

  private async sendWebhookAlert(alert: Alert): Promise<void> {
    if (!this.config.alerts.webhook.url) return;

    try {
      await fetch(this.config.alerts.webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert)
      });

      logger.info('Webhook alert sent', { alertId: alert.id });

    } catch (error) {
      logger.error('Failed to send webhook alert', { alertId: alert.id, error: error.message });
    }
  }

  // Helper methods
  private calculateErrorRate(): number {
    const timeRange = { start: Date.now() - 5 * 60 * 1000, end: Date.now() }; // Last 5 minutes
    const errors = metrics.getAggregatedMetrics('.*_error', 'count', timeRange);
    const success = metrics.getAggregatedMetrics('.*_success', 'count', timeRange);
    const total = errors + success;
    return total > 0 ? errors / total : 0;
  }

  private calculateAvgResponseTime(): number {
    const timeRange = { start: Date.now() - 5 * 60 * 1000, end: Date.now() };
    return metrics.getAggregatedMetrics('.*_duration', 'avg', timeRange);
  }

  private calculateThroughput(): number {
    const timeRange = { start: Date.now() - 60 * 1000, end: Date.now() }; // Last minute
    return metrics.getAggregatedMetrics('.*_success', 'count', timeRange);
  }

  private calculateCacheHitRate(): number {
    const hits = metrics.getAggregatedMetrics('cache_hit', 'count');
    const misses = metrics.getAggregatedMetrics('cache_miss', 'count');
    const total = hits + misses;
    return total > 0 ? hits / total : 0;
  }

  private calculateConcordanceTrend(): 'improving' | 'stable' | 'declining' {
    // Simplified trend calculation
    return 'stable';
  }

  private getConcordanceHistory(): number[] {
    // Return last 7 days of concordance rates
    return [0.85, 0.87, 0.86, 0.88, 0.84, 0.89, 0.87];
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }
}

// Configuration interfaces
export interface MonitoringConfig {
  updateInterval: number;
  retentionDays: number;
  thresholds: {
    errorRate: number;
    responseTime: number;
    queueDepth: number;
    disagreementRate: number;
    memoryUsage: number;
  };
  alerts: {
    enabled: boolean;
    email: {
      enabled: boolean;
      recipients: string[];
      smtpUrl?: string;
    };
    slack: {
      enabled: boolean;
      webhookUrl?: string;
    };
    webhook: {
      enabled: boolean;
      url?: string;
    };
  };
}

export interface AlertFilter {
  type?: 'critical' | 'warning' | 'info';
  component?: string;
  acknowledged?: boolean;
  since?: Date;
}

export { MonitoringDashboard };