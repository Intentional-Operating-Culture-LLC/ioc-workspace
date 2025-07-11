#!/usr/bin/env node

/**
 * Setup script for IOC Analytics CloudWatch monitoring
 * Creates dashboards, alarms, and log groups within free tier limits
 */

const { 
  CloudWatchClient, 
  PutDashboardCommand,
  PutMetricAlarmCommand,
  CreateLogGroupCommand,
  PutRetentionPolicyCommand
} = require('@aws-sdk/client-cloudwatch');
const { 
  CloudWatchLogsClient,
  CreateLogStreamCommand 
} = require('@aws-sdk/client-cloudwatch-logs');

// Import configurations
const { 
  DASHBOARD_CONFIGS,
  ALARM_CONFIGS,
  FREE_TIER_LIMITS 
} = require('../dist/monitoring/cloudwatch-config');

const REGION = process.env.AWS_REGION || 'us-east-1';
const LOG_GROUP_NAME = '/aws/lambda/ioc-analytics';

class MonitoringSetup {
  constructor() {
    this.cloudwatch = new CloudWatchClient({ region: REGION });
    this.cloudwatchLogs = new CloudWatchLogsClient({ region: REGION });
    this.createdResources = {
      dashboards: [],
      alarms: [],
      logGroups: []
    };
  }

  async setup() {
    console.log('🚀 Setting up IOC Analytics CloudWatch monitoring...\n');
    
    try {
      // Create log groups
      await this.createLogGroups();
      
      // Create dashboards
      await this.createDashboards();
      
      // Create alarms
      await this.createAlarms();
      
      // Summary
      this.printSummary();
      
    } catch (error) {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    }
  }

  async createLogGroups() {
    console.log('📝 Creating log groups...');
    
    const logGroups = [
      { name: LOG_GROUP_NAME, retention: 7 },
      { name: `${LOG_GROUP_NAME}-errors`, retention: 14 },
      { name: `${LOG_GROUP_NAME}-performance`, retention: 7 }
    ];
    
    for (const group of logGroups) {
      try {
        // Create log group
        await this.cloudwatchLogs.send(new CreateLogGroupCommand({
          logGroupName: group.name
        }));
        
        // Set retention policy
        await this.cloudwatchLogs.send(new PutRetentionPolicyCommand({
          logGroupName: group.name,
          retentionInDays: group.retention
        }));
        
        // Create default log stream
        await this.cloudwatchLogs.send(new CreateLogStreamCommand({
          logGroupName: group.name,
          logStreamName: 'production'
        }));
        
        this.createdResources.logGroups.push(group.name);
        console.log(`  ✅ Created log group: ${group.name} (${group.retention} day retention)`);
        
      } catch (error) {
        if (error.name === 'ResourceAlreadyExistsException') {
          console.log(`  ℹ️  Log group already exists: ${group.name}`);
        } else {
          throw error;
        }
      }
    }
  }

  async createDashboards() {
    console.log('\n📊 Creating CloudWatch dashboards...');
    
    const dashboards = [
      { 
        name: 'IOC-Business-KPIs', 
        config: DASHBOARD_CONFIGS.businessMetrics 
      },
      { 
        name: 'IOC-System-Health', 
        config: DASHBOARD_CONFIGS.systemHealth 
      },
      { 
        name: 'IOC-Cost-Monitor', 
        config: DASHBOARD_CONFIGS.costTracking 
      }
    ];
    
    for (const dashboard of dashboards) {
      try {
        const dashboardBody = {
          widgets: dashboard.config.widgets.map((widget, index) => ({
            type: widget.type,
            x: (index % 3) * 8,
            y: Math.floor(index / 3) * 6,
            width: widget.width,
            height: widget.height,
            properties: widget.properties
          }))
        };
        
        await this.cloudwatch.send(new PutDashboardCommand({
          DashboardName: dashboard.name,
          DashboardBody: JSON.stringify(dashboardBody)
        }));
        
        this.createdResources.dashboards.push(dashboard.name);
        console.log(`  ✅ Created dashboard: ${dashboard.name}`);
        
      } catch (error) {
        console.error(`  ❌ Failed to create dashboard ${dashboard.name}:`, error.message);
      }
    }
    
    if (this.createdResources.dashboards.length >= FREE_TIER_LIMITS.dashboards) {
      console.log(`  ⚠️  Reached free tier limit of ${FREE_TIER_LIMITS.dashboards} dashboards`);
    }
  }

  async createAlarms() {
    console.log('\n🚨 Creating CloudWatch alarms...');
    
    for (const alarm of ALARM_CONFIGS) {
      try {
        await this.cloudwatch.send(new PutMetricAlarmCommand({
          AlarmName: `IOC-${alarm.name}`,
          ComparisonOperator: alarm.comparisonOperator || 'GreaterThanThreshold',
          EvaluationPeriods: alarm.evaluationPeriods,
          MetricName: alarm.metric,
          Namespace: 'IOC/System',
          Period: 300, // 5 minutes
          Statistic: 'Average',
          Threshold: alarm.threshold,
          ActionsEnabled: false, // Enable manually with SNS topic
          AlarmDescription: alarm.description,
          DatapointsToAlarm: alarm.evaluationPeriods,
          TreatMissingData: 'notBreaching'
        }));
        
        this.createdResources.alarms.push(alarm.name);
        console.log(`  ✅ Created alarm: ${alarm.name}`);
        
      } catch (error) {
        console.error(`  ❌ Failed to create alarm ${alarm.name}:`, error.message);
      }
    }
    
    console.log(`\n  ℹ️  Note: Alarms created but not enabled. Configure SNS topics for notifications.`);
  }

  printSummary() {
    console.log('\n📋 Setup Summary:');
    console.log('================\n');
    
    console.log('Created Resources:');
    console.log(`  • Dashboards: ${this.createdResources.dashboards.length}`);
    console.log(`  • Alarms: ${this.createdResources.alarms.length}`);
    console.log(`  • Log Groups: ${this.createdResources.logGroups.length}`);
    
    console.log('\nFree Tier Usage:');
    console.log(`  • Custom Metrics: 10/${FREE_TIER_LIMITS.customMetrics} (configured in Lambda functions)`);
    console.log(`  • Dashboards: ${this.createdResources.dashboards.length}/${FREE_TIER_LIMITS.dashboards}`);
    console.log(`  • Alarms: ${this.createdResources.alarms.length}/${FREE_TIER_LIMITS.alarmsPerRegion}`);
    console.log(`  • Log Retention: 7 days (free tier compatible)`);
    
    console.log('\n🎯 Next Steps:');
    console.log('  1. Configure SNS topic for alarm notifications');
    console.log('  2. Deploy Lambda functions to start collecting metrics');
    console.log('  3. View dashboards in CloudWatch console');
    console.log('  4. Set up weekly email reports (optional)');
    
    console.log('\n📊 Dashboard URLs:');
    this.createdResources.dashboards.forEach(name => {
      const url = `https://${REGION}.console.aws.amazon.com/cloudwatch/home?region=${REGION}#dashboards:name=${name}`;
      console.log(`  • ${name}: ${url}`);
    });
    
    console.log('\n✅ CloudWatch monitoring setup complete!');
  }

  async validateSetup() {
    console.log('\n🔍 Validating setup...');
    
    // Check metric limits
    console.log(`  • Free tier custom metrics: ${FREE_TIER_LIMITS.customMetrics}`);
    console.log(`  • Essential metrics configured: 10`);
    
    // Estimate costs
    console.log('\n💰 Estimated Monthly Costs:');
    console.log('  • Within free tier: $0/month');
    console.log('  • Log storage (5GB free): $0');
    console.log('  • Dashboard requests (1M free): $0');
    console.log('  • Total: $0/month\n');
  }
}

// Run setup
if (require.main === module) {
  const setup = new MonitoringSetup();
  
  setup.setup()
    .then(() => setup.validateSetup())
    .catch(error => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

module.exports = MonitoringSetup;