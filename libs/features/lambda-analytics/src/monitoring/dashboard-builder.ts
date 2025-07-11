/**
 * CloudWatch Dashboard Builder
 * Creates lean dashboards optimized for free tier
 */

import { 
  CloudWatchClient, 
  PutDashboardCommand,
  PutMetricAlarmCommand,
  PutMetricDataCommand,
  MetricDatum
} from '@aws-sdk/client-cloudwatch';
import { 
  DASHBOARD_CONFIGS, 
  ALARM_CONFIGS, 
  DashboardWidget,
  ESSENTIAL_METRICS 
} from './cloudwatch-config';

export class DashboardBuilder {
  private cloudwatch: CloudWatchClient;
  
  constructor(region: string = 'us-east-1') {
    this.cloudwatch = new CloudWatchClient({ region });
  }
  
  /**
   * Create all free tier dashboards
   */
  async createFreeTierDashboards(): Promise<void> {
    console.log('Creating free tier CloudWatch dashboards...');
    
    // Business Metrics Dashboard
    await this.createDashboard(
      DASHBOARD_CONFIGS.businessMetrics.name,
      DASHBOARD_CONFIGS.businessMetrics.widgets as DashboardWidget[]
    );
    
    // System Health Dashboard
    await this.createDashboard(
      DASHBOARD_CONFIGS.systemHealth.name,
      DASHBOARD_CONFIGS.systemHealth.widgets as DashboardWidget[]
    );
    
    // Cost Tracking Dashboard
    await this.createDashboard(
      DASHBOARD_CONFIGS.costTracking.name,
      DASHBOARD_CONFIGS.costTracking.widgets as DashboardWidget[]
    );
    
    console.log('Dashboards created successfully');
  }
  
  /**
   * Create a single dashboard
   */
  private async createDashboard(
    name: string, 
    widgets: DashboardWidget[]
  ): Promise<void> {
    const dashboardBody = {
      widgets: widgets.map((widget, index) => ({
        type: widget.type,
        x: (index % 3) * 8,
        y: Math.floor(index / 3) * 6,
        width: widget.width,
        height: widget.height,
        properties: widget.properties
      }))
    };
    
    const command = new PutDashboardCommand({
      DashboardName: name,
      DashboardBody: JSON.stringify(dashboardBody)
    });
    
    try {
      await this.cloudwatch.send(command);
      console.log(`Dashboard ${name} created`);
    } catch (error) {
      console.error(`Error creating dashboard ${name}:`, error);
    }
  }
  
  /**
   * Create critical alarms only
   */
  async createCriticalAlarms(): Promise<void> {
    console.log('Creating critical CloudWatch alarms...');
    
    for (const alarm of ALARM_CONFIGS) {
      const command = new PutMetricAlarmCommand({
        AlarmName: alarm.name,
        ComparisonOperator: (alarm as any).comparisonOperator || 'GreaterThanThreshold',
        EvaluationPeriods: alarm.evaluationPeriods,
        MetricName: alarm.metric,
        Namespace: 'IOC/System',
        Period: 300, // 5 minutes
        Statistic: 'Average',
        Threshold: alarm.threshold,
        ActionsEnabled: true,
        AlarmDescription: alarm.description,
        DatapointsToAlarm: alarm.evaluationPeriods,
        TreatMissingData: 'notBreaching'
      });
      
      try {
        await this.cloudwatch.send(command);
        console.log(`Alarm ${alarm.name} created`);
      } catch (error) {
        console.error(`Error creating alarm ${alarm.name}:`, error);
      }
    }
  }
  
  /**
   * Publish custom metrics (batch for efficiency)
   */
  async publishMetrics(metrics: MetricDatum[]): Promise<void> {
    // Batch metrics in groups of 20 (CloudWatch limit)
    const batchSize = 20;
    
    for (let i = 0; i < metrics.length; i += batchSize) {
      const batch = metrics.slice(i, i + batchSize);
      
      const command = new PutMetricDataCommand({
        Namespace: 'IOC/Business',
        MetricData: batch
      });
      
      try {
        await this.cloudwatch.send(command);
      } catch (error) {
        console.error('Error publishing metrics:', error);
      }
    }
  }
  
  /**
   * Generate dashboard JSON for manual creation
   */
  generateDashboardJSON(dashboardName: string): string {
    const config = DASHBOARD_CONFIGS[dashboardName as keyof typeof DASHBOARD_CONFIGS];
    if (!config) {
      throw new Error(`Dashboard ${dashboardName} not found`);
    }
    
    const dashboard = {
      widgets: config.widgets.map((widget, index) => ({
        type: widget.type,
        x: (index % 3) * 8,
        y: Math.floor(index / 3) * 6,
        width: widget.width,
        height: widget.height,
        properties: widget.properties
      }))
    };
    
    return JSON.stringify(dashboard, null, 2);
  }
  
  /**
   * Estimate monthly CloudWatch costs
   */
  estimateMonthlyCosts(
    customMetrics: number,
    dashboardRequests: number,
    logsIngestionGB: number,
    alarms: number
  ): { service: string; cost: number }[] {
    const costs = [
      {
        service: 'Custom Metrics',
        cost: Math.max(0, (customMetrics - 10) * 0.30) // First 10 free
      },
      {
        service: 'Dashboard Requests',
        cost: Math.max(0, (dashboardRequests - 1000000) * 0.30 / 1000000) // First 1M free
      },
      {
        service: 'Logs Ingestion',
        cost: Math.max(0, (logsIngestionGB - 5) * 0.50) // First 5GB free
      },
      {
        service: 'Alarms',
        cost: Math.max(0, (alarms - 10) * 0.10) // First 10 free
      }
    ];
    
    return costs.filter(c => c.cost > 0);
  }
}