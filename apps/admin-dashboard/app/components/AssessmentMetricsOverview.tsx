'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ChartBarIcon, 
  UsersIcon, 
  ClockIcon, 
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { MetricCard } from './MetricCard';
import { AssessmentChart } from './AssessmentChart';
import { useRealtime } from './RealtimeProvider';

interface AssessmentMetrics {
  totalAssessments: number;
  activeAssessments: number;
  completedAssessments: number;
  completionRate: number;
  averageCompletionTime: number;
  participationRate: number;
  avgScore: number;
  improvement: number;
  dailyCompletions: Array<{ date: string; count: number }>;
  tierDistribution: Array<{ tier: string; count: number; percentage: number }>;
  oceanMetrics: {
    totalFacetsAnalyzed: number;
    avgConfidenceScore: number;
    darkSideDetections: number;
  };
}

export function AssessmentMetricsOverview() {
  const [metrics, setMetrics] = useState<AssessmentMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { isConnected, subscribe } = useRealtime();

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/admin/metrics/assessments');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch assessment metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Set initial date on client side only
    setLastUpdated(new Date());
    fetchMetrics();
    
    // Subscribe to real-time updates
    const unsubscribe = subscribe('assessment_metrics', (data) => {
      setMetrics(prev => prev ? { ...prev, ...data } : data);
      setLastUpdated(new Date());
    });

    return () => unsubscribe();
  }, [subscribe]);

  const handleRefresh = () => {
    setIsLoading(true);
    fetchMetrics();
  };

  if (isLoading || !metrics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Assessment Metrics Overview</h2>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="metric-card">
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded loading-shimmer"></div>
                <div className="h-8 bg-gray-200 rounded loading-shimmer"></div>
                <div className="h-3 bg-gray-200 rounded loading-shimmer w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const formatChange = (value: number) => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getChangeColor = (value: number) => {
    if (value > 0) return 'positive';
    if (value < 0) return 'negative';
    return 'neutral';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Assessment Metrics Overview</h2>
          <p className="text-sm text-gray-500 mt-1">
            Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Loading...'}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className={`realtime-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            <div className="pulse-dot mr-2"></div>
            {isConnected ? 'Live' : 'Offline'}
          </div>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Assessments"
          value={metrics.totalAssessments.toLocaleString()}
          change={formatChange(12.3)}
          changeType={getChangeColor(12.3)}
          icon={ChartBarIcon}
          color="blue"
        />
        <MetricCard
          title="Active Assessments"
          value={metrics.activeAssessments.toLocaleString()}
          change={formatChange(5.7)}
          changeType={getChangeColor(5.7)}
          icon={UsersIcon}
          color="green"
        />
        <MetricCard
          title="Completion Rate"
          value={`${metrics.completionRate.toFixed(1)}%`}
          change={formatChange(metrics.improvement)}
          changeType={getChangeColor(metrics.improvement)}
          icon={CheckCircleIcon}
          color="purple"
        />
        <MetricCard
          title="Avg Completion Time"
          value={`${metrics.averageCompletionTime}m`}
          change={formatChange(-8.2)}
          changeType={getChangeColor(-8.2)}
          icon={ClockIcon}
          color="yellow"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Participation Rate"
          value={`${metrics.participationRate.toFixed(1)}%`}
          change={formatChange(3.1)}
          changeType={getChangeColor(3.1)}
          icon={ArrowTrendingUpIcon}
          color="indigo"
        />
        <MetricCard
          title="Average Score"
          value={`${metrics.avgScore.toFixed(1)}`}
          change={formatChange(1.8)}
          changeType={getChangeColor(1.8)}
          icon={ArrowTrendingUpIcon}
          color="green"
        />
        <MetricCard
          title="OCEAN Facets Analyzed"
          value={metrics.oceanMetrics.totalFacetsAnalyzed.toLocaleString()}
          change={formatChange(15.4)}
          changeType={getChangeColor(15.4)}
          icon={ChartBarIcon}
          color="blue"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assessment Completions Chart */}
        <div className="chart-container">
          <div className="flex items-center justify-between mb-4">
            <h3 className="chart-title">Daily Assessment Completions</h3>
            <div className="text-sm text-gray-500">Last 30 days</div>
          </div>
          <AssessmentChart 
            data={metrics.dailyCompletions}
            type="line"
            color="#3B82F6"
          />
        </div>

        {/* Assessment Tier Distribution */}
        <div className="chart-container">
          <div className="flex items-center justify-between mb-4">
            <h3 className="chart-title">Assessment Tier Distribution</h3>
            <div className="text-sm text-gray-500">Current period</div>
          </div>
          <AssessmentChart 
            data={metrics.tierDistribution}
            type="pie"
            colors={['#3B82F6', '#8B5CF6', '#10B981']}
          />
        </div>
      </div>

      {/* OCEAN Metrics */}
      <div className="chart-container">
        <h3 className="chart-title">OCEAN Assessment Analytics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {metrics.oceanMetrics.totalFacetsAnalyzed.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500 mt-1">Total Facets Analyzed</div>
            <div className="text-xs text-gray-400 mt-1">30 facets per complete assessment</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {(metrics.oceanMetrics.avgConfidenceScore * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500 mt-1">Avg Confidence Score</div>
            <div className="text-xs text-gray-400 mt-1">Quality of assessments</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">
              {metrics.oceanMetrics.darkSideDetections}
            </div>
            <div className="text-sm text-gray-500 mt-1">Dark Side Detections</div>
            <div className="text-xs text-gray-400 mt-1">Leadership risk indicators</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}