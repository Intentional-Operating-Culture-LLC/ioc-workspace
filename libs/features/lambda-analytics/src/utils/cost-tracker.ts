/**
 * Cost tracking utility for Lambda functions
 * Monitors usage and provides cost estimates
 */

interface CostMetrics {
  invocations: number;
  totalDuration: number;
  totalMemoryMB: number;
  estimatedCost: number;
}

class CostTracker {
  private metrics: Map<string, CostMetrics> = new Map();
  
  // AWS Lambda pricing (as of 2024)
  private readonly PRICE_PER_REQUEST = 0.0000002; // $0.20 per 1M requests
  private readonly PRICE_PER_GB_SECOND = 0.0000166667; // $0.0000166667 per GB-second
  
  async trackInvocation(functionName: string, memoryMB: number): Promise<void> {
    const current = this.metrics.get(functionName) || {
      invocations: 0,
      totalDuration: 0,
      totalMemoryMB: 0,
      estimatedCost: 0
    };
    
    current.invocations++;
    current.totalMemoryMB += memoryMB;
    
    this.metrics.set(functionName, current);
    
    // Log cost tracking data periodically
    if (current.invocations % 100 === 0) {
      this.logCostMetrics(functionName);
    }
  }
  
  trackDuration(functionName: string, durationMs: number): void {
    const current = this.metrics.get(functionName);
    if (current) {
      current.totalDuration += durationMs;
      current.estimatedCost = this.calculateCost(current);
      this.metrics.set(functionName, current);
    }
  }
  
  private calculateCost(metrics: CostMetrics): number {
    // Calculate request cost
    const requestCost = metrics.invocations * this.PRICE_PER_REQUEST;
    
    // Calculate compute cost
    const avgMemoryGB = (metrics.totalMemoryMB / metrics.invocations) / 1024;
    const totalGBSeconds = (metrics.totalDuration / 1000) * avgMemoryGB;
    const computeCost = totalGBSeconds * this.PRICE_PER_GB_SECOND;
    
    return requestCost + computeCost;
  }
  
  private logCostMetrics(functionName: string): void {
    const metrics = this.metrics.get(functionName);
    if (!metrics) return;
    
    console.log('COST_METRICS', JSON.stringify({
      function: functionName,
      invocations: metrics.invocations,
      avgDuration: Math.round(metrics.totalDuration / metrics.invocations),
      avgMemoryMB: Math.round(metrics.totalMemoryMB / metrics.invocations),
      estimatedCost: metrics.estimatedCost.toFixed(6),
      costPerInvocation: (metrics.estimatedCost / metrics.invocations).toFixed(8)
    }));
  }
  
  getCostReport(): Record<string, any> {
    const report: Record<string, any> = {};
    
    this.metrics.forEach((metrics, functionName) => {
      report[functionName] = {
        invocations: metrics.invocations,
        avgDurationMs: Math.round(metrics.totalDuration / metrics.invocations),
        avgMemoryMB: Math.round(metrics.totalMemoryMB / metrics.invocations),
        estimatedCost: metrics.estimatedCost.toFixed(4),
        costPerInvocation: (metrics.estimatedCost / metrics.invocations).toFixed(6),
        projectedMonthlyCost: (metrics.estimatedCost * 30).toFixed(2)
      };
    });
    
    report.total = {
      estimatedCost: Array.from(this.metrics.values())
        .reduce((sum, m) => sum + m.estimatedCost, 0)
        .toFixed(4),
      projectedMonthlyCost: (Array.from(this.metrics.values())
        .reduce((sum, m) => sum + m.estimatedCost, 0) * 30)
        .toFixed(2)
    };
    
    return report;
  }
  
  // MRR-based scaling recommendations
  getScalingRecommendations(currentMRR: number): Record<string, any> {
    const recommendations: Record<string, any> = {};
    
    this.metrics.forEach((metrics, functionName) => {
      const avgDuration = metrics.totalDuration / metrics.invocations;
      const avgMemory = metrics.totalMemoryMB / metrics.invocations;
      
      recommendations[functionName] = {
        currentMemory: avgMemory,
        recommendedMemory: this.getRecommendedMemory(avgDuration, avgMemory, currentMRR),
        enableXRay: currentMRR >= 5000,
        enableProvisionedConcurrency: currentMRR >= 10000 && metrics.invocations > 1000,
        enableEnhancedMonitoring: currentMRR >= 1000
      };
    });
    
    return recommendations;
  }
  
  private getRecommendedMemory(avgDuration: number, currentMemory: number, mrr: number): number {
    // Memory recommendations based on MRR and performance
    if (mrr < 1000) {
      // Stay minimal
      return 128;
    } else if (mrr < 5000) {
      // Optimize for performance/cost balance
      if (avgDuration > 3000) return 256;
      return 128;
    } else if (mrr < 10000) {
      // Prioritize performance
      if (avgDuration > 2000) return 512;
      if (avgDuration > 1000) return 256;
      return 128;
    } else {
      // Maximum performance
      if (avgDuration > 1000) return 1024;
      if (avgDuration > 500) return 512;
      return 256;
    }
  }
}

export const costTracker = new CostTracker();

// Cost optimization strategies
export const CostOptimizationStrategies = {
  // Batch processing thresholds
  getBatchSize(mrr: number): number {
    if (mrr < 1000) return 10;
    if (mrr < 5000) return 50;
    if (mrr < 10000) return 100;
    return 200;
  },
  
  // Concurrency limits
  getConcurrencyLimit(mrr: number): number {
    if (mrr < 1000) return 5;
    if (mrr < 5000) return 10;
    if (mrr < 10000) return 25;
    return 50;
  },
  
  // Cache TTL settings
  getCacheTTL(mrr: number): number {
    if (mrr < 1000) return 3600; // 1 hour
    if (mrr < 5000) return 1800; // 30 minutes
    if (mrr < 10000) return 900; // 15 minutes
    return 300; // 5 minutes
  },
  
  // Monitoring frequency
  getMonitoringInterval(mrr: number): number {
    if (mrr < 1000) return 300000; // 5 minutes
    if (mrr < 5000) return 60000; // 1 minute
    if (mrr < 10000) return 30000; // 30 seconds
    return 10000; // 10 seconds
  }
};