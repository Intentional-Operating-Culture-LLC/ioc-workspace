import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Database, 
  AlertCircle, 
  CheckCircle,
  Clock,
  Activity,
  Zap,
  Shield,
  RefreshCw
} from 'lucide-react';
import { MetricCard } from './shared/MetricCard';
import { ChartContainer } from './shared/ChartContainer';
import { SystemPerformanceChart } from './visualization/SystemPerformanceChart';
import { DataProcessingChart } from './visualization/DataProcessingChart';
import { ErrorRateChart } from './visualization/ErrorRateChart';
import { AnonymizationStatusChart } from './visualization/AnonymizationStatusChart';
import { RealTimeMonitor } from './visualization/RealTimeMonitor';

interface OperationalDashboardProps {
  organizationId: string;
  refreshInterval?: number; // in seconds
}

export const OperationalDashboard: React.FC<OperationalDashboardProps> = ({
  organizationId,
  refreshInterval = 30,
}) => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    systemUptime: 99.9,
    responseTime: 145,
    errorRate: 0.02,
    throughput: 1250,
    activeProcesses: 12,
    queueDepth: 3,
    dataProcessed: 0,
    anonymizationCompliance: 100,
  });
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchOperationalMetrics();
    
    if (autoRefresh) {
      const interval = setInterval(fetchOperationalMetrics, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [organizationId, autoRefresh, refreshInterval]);

  const fetchOperationalMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/analytics/operational', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setMetrics(data.metrics);
      }
    } catch (error) {
      console.error('Error fetching operational metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSystemStatus = () => {
    if (metrics.systemUptime >= 99.9 && metrics.errorRate < 0.1) {
      return { status: 'healthy', color: 'green', icon: CheckCircle };
    } else if (metrics.systemUptime >= 99 && metrics.errorRate < 1) {
      return { status: 'warning', color: 'yellow', icon: AlertCircle };
    } else {
      return { status: 'critical', color: 'red', icon: AlertCircle };
    }
  };

  const systemStatus = getSystemStatus();

  return (
    <div className="space-y-6">
      {/* Header with Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Operational Dashboard</h1>
          <p className="text-gray-500 mt-1">Real-time system performance and health monitoring</p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <systemStatus.icon className={`w-5 h-5 text-${systemStatus.color}-600`} />
            <span className={`font-medium text-${systemStatus.color}-600 capitalize`}>
              System {systemStatus.status}
            </span>
          </div>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border transition-colors ${
              autoRefresh 
                ? 'bg-green-50 border-green-200 text-green-700' 
                : 'bg-gray-50 border-gray-200 text-gray-700'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            <span className="text-sm">{autoRefresh ? 'Auto' : 'Manual'}</span>
          </button>
        </div>
      </div>

      {/* Real-time Status Bar */}
      <div className="bg-gray-900 text-white rounded-lg p-4">
        <RealTimeMonitor organizationId={organizationId} />
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="System Uptime"
          value={`${metrics.systemUptime}%`}
          subtitle="Last 30 days"
          trend={{ value: 0.1, direction: 'up' }}
          icon={<Server className="w-5 h-5" />}
          color="green"
          loading={loading}
        />
        
        <MetricCard
          title="Avg Response Time"
          value={`${metrics.responseTime}ms`}
          subtitle="P95 latency"
          trend={{ value: 2.5, direction: 'down', label: 'better' }}
          icon={<Clock className="w-5 h-5" />}
          color="blue"
          loading={loading}
        />
        
        <MetricCard
          title="Error Rate"
          value={`${metrics.errorRate}%`}
          subtitle="Last 24 hours"
          trend={{ value: 0.5, direction: 'down', label: 'better' }}
          icon={<AlertCircle className="w-5 h-5" />}
          color={metrics.errorRate > 1 ? 'red' : 'yellow'}
          loading={loading}
        />
        
        <MetricCard
          title="Throughput"
          value={`${metrics.throughput}/s`}
          subtitle="Requests per second"
          trend={{ value: 15.2, direction: 'up' }}
          icon={<Zap className="w-5 h-5" />}
          color="purple"
          loading={loading}
        />
      </div>

      {/* System Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Performance */}
        <ChartContainer
          title="System Performance"
          subtitle="CPU, Memory, and Network usage"
          loading={loading}
          onRefresh={fetchOperationalMetrics}
        >
          <SystemPerformanceChart
            organizationId={organizationId}
            height={300}
            realTime={autoRefresh}
          />
        </ChartContainer>

        {/* Data Processing Metrics */}
        <ChartContainer
          title="Data Processing"
          subtitle="Processing queue and throughput"
          loading={loading}
          onRefresh={fetchOperationalMetrics}
        >
          <DataProcessingChart
            organizationId={organizationId}
            height={300}
            realTime={autoRefresh}
          />
        </ChartContainer>

        {/* Error Rates */}
        <ChartContainer
          title="Error Analysis"
          subtitle="Error types and frequency"
          loading={loading}
          onRefresh={fetchOperationalMetrics}
        >
          <ErrorRateChart
            organizationId={organizationId}
            height={300}
            realTime={autoRefresh}
          />
        </ChartContainer>

        {/* Anonymization Status */}
        <ChartContainer
          title="Data Anonymization"
          subtitle="Compliance and processing status"
          loading={loading}
          onRefresh={fetchOperationalMetrics}
        >
          <AnonymizationStatusChart
            organizationId={organizationId}
            height={300}
          />
        </ChartContainer>
      </div>

      {/* Process Status */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Processes</h3>
        <div className="space-y-3">
          {[
            { name: 'Assessment Processing', status: 'running', cpu: 23, memory: 45 },
            { name: 'Data Anonymization', status: 'running', cpu: 12, memory: 28 },
            { name: 'AI Validation Engine', status: 'running', cpu: 67, memory: 82 },
            { name: 'Report Generation', status: 'idle', cpu: 0, memory: 15 },
            { name: 'Backup Service', status: 'running', cpu: 5, memory: 22 },
          ].map((process, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Activity className={`w-5 h-5 ${
                  process.status === 'running' ? 'text-green-600' : 'text-gray-400'
                }`} />
                <div>
                  <p className="font-medium text-gray-900">{process.name}</p>
                  <p className="text-sm text-gray-500 capitalize">{process.status}</p>
                </div>
              </div>
              <div className="flex items-center space-x-6">
                <div className="text-right">
                  <p className="text-sm text-gray-500">CPU</p>
                  <p className="font-medium">{process.cpu}%</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Memory</p>
                  <p className="font-medium">{process.memory}%</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quality Assurance Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">Data Quality</h4>
            <Shield className="w-5 h-5 text-green-600" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Validation Rate</span>
              <span className="font-medium">99.8%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Data Integrity</span>
              <span className="font-medium">100%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Schema Compliance</span>
              <span className="font-medium">99.9%</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">Processing Queue</h4>
            <Database className="w-5 h-5 text-blue-600" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Pending Items</span>
              <span className="font-medium">{metrics.queueDepth}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Processing Rate</span>
              <span className="font-medium">250/min</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Est. Clear Time</span>
              <span className="font-medium">~1 min</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">Compliance Status</h4>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Anonymization</span>
              <span className="font-medium text-green-600">Compliant</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Data Retention</span>
              <span className="font-medium text-green-600">Compliant</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Access Control</span>
              <span className="font-medium text-green-600">Compliant</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};