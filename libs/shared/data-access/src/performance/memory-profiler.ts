/**
 * @fileoverview Memory profiling and leak detection
 * @description Advanced memory monitoring and leak detection system
 */

import { MemoryProfile, PerformanceAlert } from './types';

export class MemoryProfiler {
  private profiles: MemoryProfile[] = [];
  private alertCallbacks: ((alert: PerformanceAlert) => void)[] = [];
  private maxProfiles = 200;
  private profilingInterval: NodeJS.Timeout | null = null;
  private isProfilerEnabled = false;

  constructor() {
    if (this.isMemoryAPIAvailable()) {
      this.initializeProfiler();
    }
  }

  private isMemoryAPIAvailable(): boolean {
    return typeof performance !== 'undefined' && 
           'memory' in performance &&
           typeof (performance as any).memory.usedJSHeapSize !== 'undefined';
  }

  private initializeProfiler(): void {
    this.isProfilerEnabled = true;
    this.startProfiling();
  }

  private startProfiling(): void {
    if (!this.isProfilerEnabled) return;
    
    // Profile memory every 10 seconds
    this.profilingInterval = setInterval(() => {
      this.captureMemoryProfile();
    }, 10000);
    
    // Capture initial profile
    this.captureMemoryProfile();
  }

  public captureMemoryProfile(): MemoryProfile {
    if (!this.isMemoryAPIAvailable()) {
      return {
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
        arrayBuffers: 0,
        timestamp: new Date().toISOString(),
      };
    }

    const memory = (performance as any).memory;
    
    const profile: MemoryProfile = {
      heapUsed: memory.usedJSHeapSize || 0,
      heapTotal: memory.totalJSHeapSize || 0,
      external: memory.externalMemory || 0,
      arrayBuffers: memory.arrayBuffers || 0,
      timestamp: new Date().toISOString(),
    };

    this.profiles.push(profile);
    
    // Keep only recent profiles
    if (this.profiles.length > this.maxProfiles) {
      this.profiles = this.profiles.slice(-this.maxProfiles);
    }

    // Check for memory issues
    this.checkMemoryThresholds(profile);
    this.checkMemoryLeaks();

    return profile;
  }

  private checkMemoryThresholds(profile: MemoryProfile): void {
    const thresholds = {
      heapUsed: { warning: 50 * 1024 * 1024, critical: 100 * 1024 * 1024 }, // 50MB, 100MB
      heapTotal: { warning: 80 * 1024 * 1024, critical: 150 * 1024 * 1024 }, // 80MB, 150MB
      external: { warning: 20 * 1024 * 1024, critical: 50 * 1024 * 1024 }, // 20MB, 50MB
    };

    Object.entries(thresholds).forEach(([metric, threshold]) => {
      const value = profile[metric as keyof MemoryProfile] as number;
      
      if (value > threshold.critical) {
        this.generateAlert(metric, value, threshold.critical, 'critical');
      } else if (value > threshold.warning) {
        this.generateAlert(metric, value, threshold.warning, 'warning');
      }
    });
  }

  private checkMemoryLeaks(): void {
    if (this.profiles.length < 10) return;
    
    const recent = this.profiles.slice(-10);
    const growthRate = this.calculateMemoryGrowthRate(recent);
    
    // Check for consistent memory growth (potential leak)
    if (growthRate > 1024 * 1024) { // 1MB per profile interval
      this.generateAlert(
        'memory-leak',
        growthRate,
        1024 * 1024,
        'warning'
      );
    }
    
    // Check for memory spikes
    const memorySpike = this.detectMemorySpikes(recent);
    if (memorySpike.detected) {
      this.generateAlert(
        'memory-spike',
        memorySpike.value,
        memorySpike.threshold,
        'warning'
      );
    }
  }

  private calculateMemoryGrowthRate(profiles: MemoryProfile[]): number {
    if (profiles.length < 2) return 0;
    
    const first = profiles[0];
    const last = profiles[profiles.length - 1];
    
    const timeDiff = new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime();
    const memoryDiff = last.heapUsed - first.heapUsed;
    
    return timeDiff > 0 ? (memoryDiff / timeDiff) * 1000 : 0; // Memory growth per second
  }

  private detectMemorySpikes(profiles: MemoryProfile[]): { detected: boolean; value: number; threshold: number } {
    if (profiles.length < 3) return { detected: false, value: 0, threshold: 0 };
    
    const avgMemory = profiles.reduce((sum, profile) => sum + profile.heapUsed, 0) / profiles.length;
    const maxMemory = Math.max(...profiles.map(p => p.heapUsed));
    
    const spikeThreshold = avgMemory * 1.5; // 50% above average
    
    return {
      detected: maxMemory > spikeThreshold,
      value: maxMemory,
      threshold: spikeThreshold,
    };
  }

  private generateAlert(metric: string, value: number, threshold: number, severity: 'warning' | 'critical'): void {
    const alert: PerformanceAlert = {
      id: `memory-${metric}-${Date.now()}`,
      type: severity === 'critical' ? 'error' : 'warning',
      title: `Memory Performance Alert: ${metric}`,
      message: `Memory ${metric} (${this.formatBytes(value)}) exceeded ${severity} threshold (${this.formatBytes(threshold)})`,
      severity: severity === 'critical' ? 'critical' : 'high',
      timestamp: new Date().toISOString(),
      metric,
      value,
      threshold,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    };

    this.alertCallbacks.forEach(callback => callback(alert));
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  public getMemoryProfile(): MemoryProfile {
    return this.captureMemoryProfile();
  }

  public getMemoryTrend(): MemoryProfile[] {
    return [...this.profiles];
  }

  public getMemoryGrowthRate(): number {
    return this.calculateMemoryGrowthRate(this.profiles);
  }

  public getMemoryStatistics(): {
    current: MemoryProfile;
    peak: MemoryProfile;
    average: MemoryProfile;
    growthRate: number;
    utilizationRate: number;
  } {
    if (this.profiles.length === 0) {
      const emptyProfile: MemoryProfile = {
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
        arrayBuffers: 0,
        timestamp: new Date().toISOString(),
      };
      
      return {
        current: emptyProfile,
        peak: emptyProfile,
        average: emptyProfile,
        growthRate: 0,
        utilizationRate: 0,
      };
    }

    const current = this.profiles[this.profiles.length - 1];
    const peak = this.profiles.reduce((max, profile) => 
      profile.heapUsed > max.heapUsed ? profile : max
    );
    
    const average: MemoryProfile = {
      heapUsed: this.profiles.reduce((sum, p) => sum + p.heapUsed, 0) / this.profiles.length,
      heapTotal: this.profiles.reduce((sum, p) => sum + p.heapTotal, 0) / this.profiles.length,
      external: this.profiles.reduce((sum, p) => sum + p.external, 0) / this.profiles.length,
      arrayBuffers: this.profiles.reduce((sum, p) => sum + p.arrayBuffers, 0) / this.profiles.length,
      timestamp: new Date().toISOString(),
    };

    const utilizationRate = current.heapTotal > 0 ? (current.heapUsed / current.heapTotal) * 100 : 0;

    return {
      current,
      peak,
      average,
      growthRate: this.getMemoryGrowthRate(),
      utilizationRate,
    };
  }

  public getMemoryLeakDetection(): {
    hasLeak: boolean;
    severity: 'low' | 'medium' | 'high';
    recommendation: string;
    details: {
      growthRate: number;
      consecutiveGrowth: number;
      memoryUtilization: number;
    };
  } {
    const growthRate = this.getMemoryGrowthRate();
    const consecutiveGrowth = this.getConsecutiveGrowthCount();
    const stats = this.getMemoryStatistics();
    
    let hasLeak = false;
    let severity: 'low' | 'medium' | 'high' = 'low';
    let recommendation = 'Memory usage is normal';
    
    if (growthRate > 1024 * 1024 && consecutiveGrowth > 5) { // 1MB/s growth for 5+ intervals
      hasLeak = true;
      severity = 'high';
      recommendation = 'Potential memory leak detected. Check for event listeners, timers, or global references.';
    } else if (growthRate > 512 * 1024 && consecutiveGrowth > 3) { // 512KB/s growth for 3+ intervals
      hasLeak = true;
      severity = 'medium';
      recommendation = 'Monitor memory usage closely. Consider profiling for potential leaks.';
    } else if (stats.utilizationRate > 90) {
      hasLeak = false;
      severity = 'medium';
      recommendation = 'High memory utilization. Consider optimizing memory usage.';
    }
    
    return {
      hasLeak,
      severity,
      recommendation,
      details: {
        growthRate,
        consecutiveGrowth,
        memoryUtilization: stats.utilizationRate,
      },
    };
  }

  private getConsecutiveGrowthCount(): number {
    if (this.profiles.length < 2) return 0;
    
    let count = 0;
    for (let i = this.profiles.length - 1; i > 0; i--) {
      if (this.profiles[i].heapUsed > this.profiles[i - 1].heapUsed) {
        count++;
      } else {
        break;
      }
    }
    
    return count;
  }

  public onAlert(callback: (alert: PerformanceAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  public enableProfiling(): void {
    if (!this.isProfilerEnabled && this.isMemoryAPIAvailable()) {
      this.isProfilerEnabled = true;
      this.startProfiling();
    }
  }

  public disableProfiling(): void {
    this.isProfilerEnabled = false;
    if (this.profilingInterval) {
      clearInterval(this.profilingInterval);
      this.profilingInterval = null;
    }
  }

  public clearProfiles(): void {
    this.profiles = [];
  }

  public exportProfiles(): string {
    return JSON.stringify(this.profiles, null, 2);
  }

  public importProfiles(data: string): void {
    try {
      const profiles = JSON.parse(data);
      if (Array.isArray(profiles)) {
        this.profiles = profiles;
      }
    } catch (error) {
      console.error('Failed to import memory profiles:', error);
    }
  }
}

// Singleton instance
export const memoryProfiler = new MemoryProfiler();

// Helper functions
export const getMemoryProfile = (): MemoryProfile => {
  return memoryProfiler.getMemoryProfile();
};

export const getMemoryTrend = (): MemoryProfile[] => {
  return memoryProfiler.getMemoryTrend();
};

export const getMemoryStatistics = () => {
  return memoryProfiler.getMemoryStatistics();
};

export const getMemoryLeakDetection = () => {
  return memoryProfiler.getMemoryLeakDetection();
};