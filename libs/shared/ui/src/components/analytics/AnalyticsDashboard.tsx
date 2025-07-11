import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Users,
  Brain,
  Target,
  Activity,
  Filter
} from 'lucide-react';
import { MetricCard } from './shared/MetricCard';
import { ChartContainer } from './shared/ChartContainer';
import { OCEANDistributionChart } from './visualization/OCEANDistributionChart';
import { IndustryBenchmarkChart } from './visualization/IndustryBenchmarkChart';
import { AssessmentPatternChart } from './visualization/AssessmentPatternChart';
import { EngagementMetricsChart } from './visualization/EngagementMetricsChart';
import { PredictiveInsightsChart } from './visualization/PredictiveInsightsChart';
import { FilterPanel } from './shared/FilterPanel';
import { DateRangePicker } from './shared/DateRangePicker';

interface AnalyticsDashboardProps {
  organizationId: string;
  initialFilters?: {
    dateRange?: { start: Date; end: Date };
    industry?: string;
    assessmentType?: string;
    department?: string;
  };
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  organizationId,
  initialFilters,
}) => {
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    dateRange: initialFilters?.dateRange || {
      start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      end: new Date(),
    },
    industry: initialFilters?.industry || 'all',
    assessmentType: initialFilters?.assessmentType || 'all',
    department: initialFilters?.department || 'all',
  });
  
  const [analytics, setAnalytics] = useState({
    oceanScores: {
      openness: 0,
      conscientiousness: 0,
      extraversion: 0,
      agreeableness: 0,
      neuroticism: 0,
    },
    totalAssessments: 0,
    uniqueParticipants: 0,
    avgCompletionTime: 0,
    engagementRate: 0,
    repeatRate: 0,
    industryRank: 0,
    predictiveAccuracy: 0,
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, [organizationId, filters]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/analytics/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          filters,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-500 mt-1">Deep insights into assessment patterns and trends</p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-4">
          <DateRangePicker
            value={filters.dateRange}
            onChange={(dateRange) => setFilters({ ...filters, dateRange })}
          />
          <FilterPanel
            filters={filters}
            onChange={setFilters}
            options={{
              industry: ['Technology', 'Finance', 'Healthcare', 'Education', 'Retail'],
              assessmentType: ['OCEAN', 'Leadership', 'Team Dynamics', 'Skills'],
              department: ['Engineering', 'Sales', 'Marketing', 'HR', 'Operations'],
            }}
          />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Assessments"
          value={analytics.totalAssessments.toLocaleString()}
          subtitle="In selected period"
          trend={{ value: 23.5, direction: 'up' }}
          icon={<BarChart3 className="w-5 h-5" />}
          color="blue"
          loading={loading}
        />
        
        <MetricCard
          title="Unique Participants"
          value={analytics.uniqueParticipants.toLocaleString()}
          subtitle="Active users"
          trend={{ value: 18.2, direction: 'up' }}
          icon={<Users className="w-5 h-5" />}
          color="green"
          loading={loading}
        />
        
        <MetricCard
          title="Engagement Rate"
          value={`${analytics.engagementRate}%`}
          subtitle="User participation"
          trend={{ value: 5.7, direction: 'up' }}
          icon={<Activity className="w-5 h-5" />}
          color="purple"
          loading={loading}
        />
        
        <MetricCard
          title="Industry Rank"
          value={`#${analytics.industryRank}`}
          subtitle="Performance ranking"
          trend={{ value: 3, direction: 'up', label: 'positions' }}
          icon={<Target className="w-5 h-5" />}
          color="indigo"
          loading={loading}
        />
      </div>

      {/* OCEAN Distribution */}
      <ChartContainer
        title="OCEAN Trait Distribution"
        subtitle="Personality trait analysis across your organization"
        loading={loading}
        onRefresh={fetchAnalyticsData}
        onExport={() => console.log('Export OCEAN data')}
        className="lg:col-span-2"
      >
        <OCEANDistributionChart
          organizationId={organizationId}
          filters={filters}
          height={400}
        />
      </ChartContainer>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Industry Benchmarking */}
        <ChartContainer
          title="Industry Benchmarking"
          subtitle="Compare your metrics with industry standards"
          loading={loading}
          onRefresh={fetchAnalyticsData}
          onExport={() => console.log('Export benchmarking data')}
        >
          <IndustryBenchmarkChart
            organizationId={organizationId}
            filters={filters}
            height={300}
          />
        </ChartContainer>

        {/* Assessment Patterns */}
        <ChartContainer
          title="Assessment Patterns"
          subtitle="Completion times and scoring patterns"
          loading={loading}
          onRefresh={fetchAnalyticsData}
          onExport={() => console.log('Export pattern data')}
        >
          <AssessmentPatternChart
            organizationId={organizationId}
            filters={filters}
            height={300}
          />
        </ChartContainer>

        {/* User Engagement */}
        <ChartContainer
          title="User Engagement Metrics"
          subtitle="Participation and interaction analysis"
          loading={loading}
          onRefresh={fetchAnalyticsData}
          onExport={() => console.log('Export engagement data')}
        >
          <EngagementMetricsChart
            organizationId={organizationId}
            filters={filters}
            height={300}
          />
        </ChartContainer>

        {/* Predictive Insights */}
        <ChartContainer
          title="Predictive Insights"
          subtitle="AI-powered trend predictions"
          loading={loading}
          onRefresh={fetchAnalyticsData}
          onExport={() => console.log('Export predictions')}
        >
          <PredictiveInsightsChart
            organizationId={organizationId}
            filters={filters}
            height={300}
          />
        </ChartContainer>
      </div>

      {/* Detailed Statistics */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistical Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-2">Completion Metrics</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Avg. Time</span>
                <span className="font-medium">{analytics.avgCompletionTime} min</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Completion Rate</span>
                <span className="font-medium">92.3%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Drop-off Rate</span>
                <span className="font-medium">7.7%</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-2">Engagement Analysis</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Repeat Rate</span>
                <span className="font-medium">{analytics.repeatRate}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Referral Rate</span>
                <span className="font-medium">31.2%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">NPS Score</span>
                <span className="font-medium">72</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-2">Data Quality</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Response Quality</span>
                <span className="font-medium">96.5%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Consistency Score</span>
                <span className="font-medium">94.8%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Validity Index</span>
                <span className="font-medium">0.92</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-2">AI Insights</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Prediction Accuracy</span>
                <span className="font-medium">{analytics.predictiveAccuracy}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Anomaly Detection</span>
                <span className="font-medium">99.2%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Pattern Recognition</span>
                <span className="font-medium">97.8%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI-Powered Insights */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-start space-x-4">
          <Brain className="w-8 h-8 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold mb-2">AI-Powered Insights</h3>
            <ul className="space-y-2 text-sm">
              <li>• Your organization shows 23% higher openness traits compared to industry average</li>
              <li>• Engagement patterns suggest optimal assessment timing is Tuesday-Thursday, 10am-2pm</li>
              <li>• Teams with balanced OCEAN profiles show 15% higher performance metrics</li>
              <li>• Predictive model indicates 18% growth in participation over next quarter</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};