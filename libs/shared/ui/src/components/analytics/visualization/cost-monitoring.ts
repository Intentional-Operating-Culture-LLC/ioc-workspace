import { CloudWatch } from 'aws-sdk';
import { EventFilter } from './PinpointEventTracker';

// Initialize CloudWatch client
const cloudWatch = new CloudWatch({
  region: process.env.AWS_REGION || 'us-east-1',
});

// Cost breakdown interface
export interface CostBreakdown {
  pinpoint: number;
  s3: number;
  kinesis: number;
  quicksight: number;
  total: number;
  date: Date;
}

// Cost thresholds by MRR tier
export interface CostThresholds {
  warning: number;  // Percentage of MRR
  critical: number; // Percentage of MRR
  absolute: number; // Absolute dollar amount
}

// MRR-based configuration
export interface MRRConfiguration {
  tier: 'startup' | 'growth' | 'scale' | 'enterprise';
  minMRR: number;
  maxMRR: number;
  eventLimits: Record<string, number>;
  features: string[];
  costTarget: number; // Target percentage of MRR for analytics
}

// MRR tier configurations
export const MRR_TIERS: Record<string, MRRConfiguration> = {
  startup: {
    tier: 'startup',
    minMRR: 0,
    maxMRR: 500,
    eventLimits: {
      'user.registered': 100,
      'assessment.started': 500,
      'assessment.completed': 500,
      'subscription.created': 50,
      'subscription.cancelled': 50,
      'payment.failed': 100,
    },
    features: ['basic-tracking', 's3-storage'],
    costTarget: 0.03, // 3% of MRR
  },
  growth: {
    tier: 'growth',
    minMRR: 500,
    maxMRR: 2000,
    eventLimits: {
      'user.registered': 500,
      'assessment.started': 2000,
      'assessment.completed': 2000,
      'subscription.created': 200,
      'subscription.cancelled': 200,
      'payment.failed': 500,
      'feature.*.used': 5000,
      'user.login': 3000,
    },
    features: ['enhanced-tracking', 'quicksight-basic', 'weekly-reports'],
    costTarget: 0.025, // 2.5% of MRR
  },
  scale: {
    tier: 'scale',
    minMRR: 2000,
    maxMRR: 10000,
    eventLimits: {
      'user.registered': 2000,
      'assessment.started': 10000,
      'assessment.completed': 10000,
      'subscription.created': 1000,
      'subscription.cancelled': 1000,
      'payment.failed': 2000,
      'feature.*.used': 50000,
      'user.login': 20000,
      'api.*.called': 100000,
      'error.occurred': 5000,
    },
    features: ['full-tracking', 'quicksight-advanced', 'daily-reports', 'predictive-analytics'],
    costTarget: 0.02, // 2% of MRR
  },
  enterprise: {
    tier: 'enterprise',
    minMRR: 10000,
    maxMRR: Infinity,
    eventLimits: {}, // No limits, use sampling instead
    features: ['unlimited-tracking', 'quicksight-ml', 'realtime-analytics', 'multi-region'],
    costTarget: 0.015, // 1.5% of MRR
  },
};

// Main cost monitoring class
export class AnalyticsCostMonitor {
  private currentMRR: number = 0;
  private currentTier: MRRConfiguration;
  
  constructor(initialMRR: number = 0) {
    this.currentMRR = initialMRR;
    this.currentTier = this.getTierForMRR(initialMRR);
    this.applyTierConfiguration();
  }
  
  // Get appropriate tier based on MRR
  private getTierForMRR(mrr: number): MRRConfiguration {
    for (const tier of Object.values(MRR_TIERS)) {
      if (mrr >= tier.minMRR && mrr < tier.maxMRR) {
        return tier;
      }
    }
    return MRR_TIERS.startup;
  }
  
  // Apply tier configuration
  private applyTierConfiguration(): void {
    // Update event limits
    EventFilter.setDailyLimits(this.currentTier.eventLimits);
    
    console.log(`Analytics tier updated to: ${this.currentTier.tier} (MRR: $${this.currentMRR})`);
  }
  
  // Update MRR and reconfigure if needed
  async updateMRR(newMRR: number): Promise<void> {
    const oldTier = this.currentTier;
    this.currentMRR = newMRR;
    this.currentTier = this.getTierForMRR(newMRR);
    
    if (oldTier.tier !== this.currentTier.tier) {
      this.applyTierConfiguration();
      await this.createCostAlerts();
    }
  }
  
  // Get daily costs breakdown
  async getDailyCosts(): Promise<CostBreakdown> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 86400000); // 24 hours ago
    
    try {
      // Get Pinpoint costs
      const pinpointCosts = await this.getServiceCost('AmazonPinpoint', startTime, endTime);
      
      // Get S3 costs
      const s3Costs = await this.getServiceCost('AmazonS3', startTime, endTime);
      
      // Get Kinesis costs
      const kinesisCosts = await this.getServiceCost('AmazonKinesis', startTime, endTime);
      
      // Get QuickSight costs
      const quicksightCosts = await this.getServiceCost('AmazonQuickSight', startTime, endTime);
      
      const total = pinpointCosts + s3Costs + kinesisCosts + quicksightCosts;
      
      return {
        pinpoint: pinpointCosts,
        s3: s3Costs,
        kinesis: kinesisCosts,
        quicksight: quicksightCosts,
        total,
        date: new Date(),
      };
    } catch (error) {
      console.error('Failed to get cost breakdown:', error);
      return {
        pinpoint: 0,
        s3: 0,
        kinesis: 0,
        quicksight: 0,
        total: 0,
        date: new Date(),
      };
    }
  }
  
  // Get service-specific costs
  private async getServiceCost(
    serviceName: string, 
    startTime: Date, 
    endTime: Date
  ): Promise<number> {
    try {
      const metrics = await cloudWatch.getMetricStatistics({
        Namespace: 'AWS/Billing',
        MetricName: 'EstimatedCharges',
        Dimensions: [
          { Name: 'ServiceName', Value: serviceName },
          { Name: 'Currency', Value: 'USD' }
        ],
        StartTime: startTime,
        EndTime: endTime,
        Period: 86400, // Daily
        Statistics: ['Maximum']
      }).promise();
      
      if (metrics.Datapoints && metrics.Datapoints.length > 0) {
        return metrics.Datapoints[metrics.Datapoints.length - 1].Maximum || 0;
      }
      
      return 0;
    } catch (error) {
      console.error(`Failed to get ${serviceName} costs:`, error);
      return 0;
    }
  }
  
  // Get monthly costs projection
  async getMonthlyProjection(): Promise<{
    projected: number;
    percentOfMRR: number;
    withinTarget: boolean;
  }> {
    const dailyCosts = await this.getDailyCosts();
    const daysInMonth = 30;
    const projected = dailyCosts.total * daysInMonth;
    const percentOfMRR = this.currentMRR > 0 ? (projected / this.currentMRR) : 0;
    const withinTarget = percentOfMRR <= this.currentTier.costTarget;
    
    return {
      projected,
      percentOfMRR,
      withinTarget,
    };
  }
  
  // Check if we should expand tracking
  async shouldExpandTracking(): Promise<boolean> {
    const projection = await this.getMonthlyProjection();
    
    // Only expand if we're using less than 80% of our cost target
    return projection.percentOfMRR < (this.currentTier.costTarget * 0.8);
  }
  
  // Create CloudWatch alarms for cost monitoring
  async createCostAlerts(): Promise<void> {
    const costThresholds = this.getCostThresholds();
    
    // Warning alarm (e.g., 80% of target)
    await this.createCostAlarm(
      'analytics-cost-warning',
      costThresholds.warning,
      'Analytics costs approaching target'
    );
    
    // Critical alarm (e.g., 100% of target)
    await this.createCostAlarm(
      'analytics-cost-critical',
      costThresholds.critical,
      'Analytics costs exceeded target!'
    );
    
    // Absolute limit alarm
    await this.createCostAlarm(
      'analytics-cost-absolute',
      costThresholds.absolute,
      'Analytics costs exceeded absolute limit!'
    );
  }
  
  // Create individual cost alarm
  private async createCostAlarm(
    alarmName: string,
    threshold: number,
    description: string
  ): Promise<void> {
    try {
      await cloudWatch.putMetricAlarm({
        AlarmName: alarmName,
        ComparisonOperator: 'GreaterThanThreshold',
        EvaluationPeriods: 1,
        MetricName: 'EstimatedCharges',
        Namespace: 'AWS/Billing',
        Period: 86400, // Daily
        Statistic: 'Maximum',
        Threshold: threshold,
        ActionsEnabled: true,
        AlarmDescription: description,
        Dimensions: [
          { Name: 'Currency', Value: 'USD' }
        ],
        TreatMissingData: 'notBreaching'
      }).promise();
      
      console.log(`Created cost alarm: ${alarmName} (threshold: $${threshold})`);
    } catch (error) {
      console.error(`Failed to create alarm ${alarmName}:`, error);
    }
  }
  
  // Get cost thresholds based on current MRR
  private getCostThresholds(): CostThresholds {
    const targetSpend = this.currentMRR * this.currentTier.costTarget;
    
    return {
      warning: targetSpend * 0.8,   // 80% of target
      critical: targetSpend,         // 100% of target
      absolute: Math.max(targetSpend * 1.5, 100), // 150% or minimum $100
    };
  }
  
  // Get optimization recommendations
  async getOptimizationRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];
    const costs = await this.getDailyCosts();
    const projection = await this.getMonthlyProjection();
    
    // Check if costs are too high
    if (!projection.withinTarget) {
      recommendations.push(
        `Reduce event tracking: costs are ${projection.percentOfMRR.toFixed(1)}% of MRR (target: ${(this.currentTier.costTarget * 100).toFixed(1)}%)`
      );
      
      // Specific service recommendations
      if (costs.pinpoint > costs.total * 0.5) {
        recommendations.push('Consider reducing Pinpoint event volume or increasing batch sizes');
      }
      
      if (costs.quicksight > 50 && this.currentMRR < 2000) {
        recommendations.push('Consider pausing QuickSight until MRR reaches $2000');
      }
    }
    
    // Check if we can expand
    if (await this.shouldExpandTracking()) {
      recommendations.push('You can safely expand event tracking - costs are well within budget');
      
      // Suggest next features
      const nextTier = this.getTierForMRR(this.currentMRR * 1.5);
      const newFeatures = nextTier.features.filter(f => !this.currentTier.features.includes(f));
      if (newFeatures.length > 0) {
        recommendations.push(`Consider enabling: ${newFeatures.join(', ')}`);
      }
    }
    
    // Event volume recommendations
    const eventStats = EventFilter.getEventStats();
    for (const [eventType, count] of Object.entries(eventStats)) {
      const limit = this.currentTier.eventLimits[eventType];
      if (limit && count >= limit * 0.9) {
        recommendations.push(`${eventType} approaching daily limit (${count}/${limit})`);
      }
    }
    
    return recommendations;
  }
  
  // Generate cost report
  async generateCostReport(): Promise<{
    summary: CostBreakdown;
    projection: any;
    recommendations: string[];
    tierInfo: MRRConfiguration;
  }> {
    const summary = await this.getDailyCosts();
    const projection = await this.getMonthlyProjection();
    const recommendations = await this.getOptimizationRecommendations();
    
    return {
      summary,
      projection,
      recommendations,
      tierInfo: this.currentTier,
    };
  }
}

// Singleton instance
let monitorInstance: AnalyticsCostMonitor | null = null;

export function initializeCostMonitor(currentMRR: number): AnalyticsCostMonitor {
  if (!monitorInstance) {
    monitorInstance = new AnalyticsCostMonitor(currentMRR);
  }
  return monitorInstance;
}

export function getCostMonitor(): AnalyticsCostMonitor {
  if (!monitorInstance) {
    throw new Error('CostMonitor not initialized. Call initializeCostMonitor first.');
  }
  return monitorInstance;
}