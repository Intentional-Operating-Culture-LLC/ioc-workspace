import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Users, 
  TrendingUp, 
  Target,
  BarChart3,
  PieChart,
  Brain,
  Shield
} from 'lucide-react';
import { MetricCard } from './shared/MetricCard';
import { ChartContainer } from './shared/ChartContainer';
import { KPITrendChart } from './visualization/KPITrendChart';
import { AssessmentPerformanceChart } from './visualization/AssessmentPerformanceChart';
import { DualAIValidationChart } from './visualization/DualAIValidationChart';
import { CompetitiveBenchmarkChart } from './visualization/CompetitiveBenchmarkChart';
import { DateRangePicker } from './shared/DateRangePicker';

interface ExecutiveDashboardProps {
  organizationId: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  organizationId,
  dateRange,
}) => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalAssessments: 0,
    completionRate: 0,
    avgScore: 0,
    activeUsers: 0,
    aiAccuracy: 0,
    dataQuality: 0,
  });
  const [selectedDateRange, setSelectedDateRange] = useState(dateRange || {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
  });

  useEffect(() => {
    fetchExecutiveMetrics();
  }, [organizationId, selectedDateRange]);

  const fetchExecutiveMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/analytics/executive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          dateRange: selectedDateRange,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setMetrics(data.metrics);
      }
    } catch (error) {
      console.error('Error fetching executive metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Executive Dashboard</h1>
          <p className="text-gray-500 mt-1">High-level insights and key performance indicators</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <DateRangePicker
            value={selectedDateRange}
            onChange={setSelectedDateRange}
          />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Assessments"
          value={metrics.totalAssessments.toLocaleString()}
          subtitle="All time"
          trend={{ value: 12.5, direction: 'up', label: 'vs last period' }}
          icon={<BarChart3 className="w-5 h-5" />}
          color="blue"
          loading={loading}
        />
        
        <MetricCard
          title="Completion Rate"
          value={`${metrics.completionRate}%`}
          subtitle="Current period"
          trend={{ value: 5.2, direction: 'up' }}
          icon={<Target className="w-5 h-5" />}
          color="green"
          loading={loading}
        />
        
        <MetricCard
          title="Active Users"
          value={metrics.activeUsers.toLocaleString()}
          subtitle="Last 30 days"
          trend={{ value: 8.1, direction: 'up' }}
          icon={<Users className="w-5 h-5" />}
          color="purple"
          loading={loading}
        />
        
        <MetricCard
          title="AI Accuracy"
          value={`${metrics.aiAccuracy}%`}
          subtitle="Dual validation"
          trend={{ value: 2.3, direction: 'up' }}
          icon={<Brain className="w-5 h-5" />}
          color="indigo"
          loading={loading}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* KPI Trends */}
        <ChartContainer
          title="KPI Performance Trends"
          subtitle="Key metrics over time"
          loading={loading}
          onRefresh={fetchExecutiveMetrics}
          onExport={() => console.log('Export KPI trends')}
        >
          <KPITrendChart
            organizationId={organizationId}
            dateRange={selectedDateRange}
            height={300}
          />
        </ChartContainer>

        {/* Assessment Performance */}
        <ChartContainer
          title="Assessment Performance"
          subtitle="Completion and scoring trends"
          loading={loading}
          onRefresh={fetchExecutiveMetrics}
          onExport={() => console.log('Export assessment performance')}
        >
          <AssessmentPerformanceChart
            organizationId={organizationId}
            dateRange={selectedDateRange}
            height={300}
          />
        </ChartContainer>

        {/* AI Validation Effectiveness */}
        <ChartContainer
          title="Dual-AI Validation"
          subtitle="Validation accuracy and confidence"
          loading={loading}
          onRefresh={fetchExecutiveMetrics}
          onExport={() => console.log('Export AI validation')}
        >
          <DualAIValidationChart
            organizationId={organizationId}
            dateRange={selectedDateRange}
            height={300}
          />
        </ChartContainer>

        {/* Competitive Benchmarking */}
        <ChartContainer
          title="Industry Benchmarking"
          subtitle="Performance vs industry standards"
          loading={loading}
          onRefresh={fetchExecutiveMetrics}
          onExport={() => console.log('Export benchmarking')}
        >
          <CompetitiveBenchmarkChart
            organizationId={organizationId}
            dateRange={selectedDateRange}
            height={300}
          />
        </ChartContainer>
      </div>

      {/* Platform Usage Analytics */}
      <ChartContainer
        title="Platform Usage Analytics"
        subtitle="User engagement and activity patterns"
        loading={loading}
        onRefresh={fetchExecutiveMetrics}
        onExport={() => console.log('Export usage analytics')}
        className="mt-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <Activity className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">87%</p>
            <p className="text-sm text-gray-600">Daily Active Users</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">4.2 min</p>
            <p className="text-sm text-gray-600">Avg. Session Duration</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <Shield className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">99.9%</p>
            <p className="text-sm text-gray-600">Data Compliance</p>
          </div>
        </div>
      </ChartContainer>
    </div>
  );
};