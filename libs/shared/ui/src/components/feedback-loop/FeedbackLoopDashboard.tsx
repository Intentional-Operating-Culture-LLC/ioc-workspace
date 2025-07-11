/**
 * Feedback Loop Real-time Monitoring Dashboard
 * React component for monitoring feedback loop status, metrics, and performance
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Zap,
  RefreshCw,
  Settings,
  Download,
  Filter
} from 'lucide-react';

interface FeedbackLoopDashboardProps {
  refreshInterval?: number;
  enableRealTimeUpdates?: boolean;
  showDetailedMetrics?: boolean;
  theme?: 'light' | 'dark';
  onLoopSelect?: (loopId: string) => void;
}

interface LoopMetrics {
  totalLoops: number;
  activeLoops: number;
  completedLoops: number;
  cancelledLoops: number;
  errorLoops: number;
  averageIterations: number;
  averageProcessingTime: number;
  convergenceRate: number;
  averageConfidenceImprovement: number;
  oscillationRate: number;
  timeoutRate: number;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  activeLoops: number;
  queueDepth: number;
  avgResponseTime: number;
  errorRate: number;
  convergenceRate: number;
  lastUpdated: Date;
  issues: string[];
  recommendations: string[];
}

interface ActiveLoop {
  loopId: string;
  requestId: string;
  contentType: string;
  status: string;
  currentIteration: number;
  maxIterations: number;
  confidence: number;
  confidenceThreshold: number;
  startedAt: Date;
  elapsedTime: number;
  priority: string;
}

export const FeedbackLoopDashboard: React.FC<FeedbackLoopDashboardProps> = ({
  refreshInterval = 5000,
  enableRealTimeUpdates = true,
  showDetailedMetrics = true,
  theme = 'light',
  onLoopSelect
}) => {
  // State management
  const [metrics, setMetrics] = useState<LoopMetrics | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [activeLoops, setActiveLoops] = useState<ActiveLoop[]>([]);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');
  const [autoRefresh, setAutoRefresh] = useState(enableRealTimeUpdates);

  // Data fetching
  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [metricsResponse, healthResponse, activeLoopsResponse, historyResponse] = 
        await Promise.all([
          fetch('/api/feedback-loops/metrics'),
          fetch('/api/feedback-loops/health'),
          fetch('/api/feedback-loops/active'),
          fetch(`/api/feedback-loops/history?range=${selectedTimeRange}`)
        ]);

      if (!metricsResponse.ok || !healthResponse.ok || !activeLoopsResponse.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const [metricsData, healthData, activeLoopsData, historyData] = await Promise.all([
        metricsResponse.json(),
        healthResponse.json(),
        activeLoopsResponse.json(),
        historyResponse.json()
      ]);

      setMetrics(metricsData.data);
      setSystemHealth(healthData.data);
      setActiveLoops(activeLoopsData.data.loops);
      setHistoricalData(historyData.data);

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [selectedTimeRange]);

  // Auto-refresh effect
  useEffect(() => {
    fetchDashboardData();

    if (autoRefresh) {
      const interval = setInterval(fetchDashboardData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchDashboardData, autoRefresh, refreshInterval]);

  // Real-time updates via WebSocket (if enabled)
  useEffect(() => {
    if (!enableRealTimeUpdates) return;

    const ws = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/feedback-loops/ws`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'loop_started':
        case 'loop_completed':
        case 'loop_cancelled':
        case 'iteration_completed':
          fetchDashboardData();
          break;
        case 'metrics_update':
          setMetrics(data.metrics);
          break;
        case 'health_update':
          setSystemHealth(data.health);
          break;
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
  }, [enableRealTimeUpdates, fetchDashboardData]);

  // Computed values
  const healthStatusColor = useMemo(() => {
    if (!systemHealth) return 'gray';
    switch (systemHealth.status) {
      case 'healthy': return 'green';
      case 'degraded': return 'yellow';
      case 'unhealthy': return 'red';
      default: return 'gray';
    }
  }, [systemHealth]);

  const performanceData = useMemo(() => {
    return historicalData.map(point => ({
      time: new Date(point.timestamp).toLocaleTimeString(),
      avgProcessingTime: point.avgProcessingTime,
      convergenceRate: point.convergenceRate * 100,
      errorRate: point.errorRate * 100,
      activeLoops: point.activeLoops
    }));
  }, [historicalData]);

  const statusDistribution = useMemo(() => {
    if (!metrics) return [];
    return [
      { name: 'Completed', value: metrics.completedLoops, color: '#10b981' },
      { name: 'Active', value: metrics.activeLoops, color: '#3b82f6' },
      { name: 'Cancelled', value: metrics.cancelledLoops, color: '#f59e0b' },
      { name: 'Error', value: metrics.errorLoops, color: '#ef4444' }
    ];
  }, [metrics]);

  // Event handlers
  const handleRefresh = () => {
    fetchDashboardData();
  };

  const handleTimeRangeChange = (range: string) => {
    setSelectedTimeRange(range);
  };

  const handleExportData = () => {
    const data = {
      metrics,
      systemHealth,
      activeLoops,
      historicalData,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feedback-loop-metrics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading && !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load dashboard data: {error}
          <Button onClick={handleRefresh} variant="outline" size="sm" className="ml-2">
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`feedback-loop-dashboard ${theme}`} style={{ minHeight: '100vh', padding: '24px' }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Feedback Loop Monitor</h1>
          <p className="text-gray-600">Real-time monitoring and analytics</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-100' : ''}
          >
            <Activity className="h-4 w-4 mr-1" />
            {autoRefresh ? 'Live' : 'Paused'}
          </Button>
          
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          
          <Button variant="outline" size="sm" onClick={handleExportData}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* System Health Alert */}
      {systemHealth && systemHealth.status !== 'healthy' && (
        <Alert variant={systemHealth.status === 'unhealthy' ? 'destructive' : 'default'} className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div>
              <strong>System Status: {systemHealth.status.toUpperCase()}</strong>
              {systemHealth.issues.length > 0 && (
                <ul className="mt-2 list-disc list-inside">
                  {systemHealth.issues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <MetricCard
          title="Active Loops"
          value={metrics?.activeLoops || 0}
          icon={<Activity className="h-5 w-5" />}
          trend={systemHealth?.activeLoops ? 'up' : 'stable'}
          color="blue"
        />
        
        <MetricCard
          title="Avg Processing Time"
          value={`${metrics?.averageProcessingTime || 0}ms`}
          icon={<Clock className="h-5 w-5" />}
          trend={metrics?.averageProcessingTime && metrics.averageProcessingTime < 3000 ? 'down' : 'up'}
          color="green"
        />
        
        <MetricCard
          title="Convergence Rate"
          value={`${((metrics?.convergenceRate || 0) * 100).toFixed(1)}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          trend={metrics?.convergenceRate && metrics.convergenceRate > 0.8 ? 'up' : 'down'}
          color="purple"
        />
        
        <MetricCard
          title="System Health"
          value={systemHealth?.status || 'Unknown'}
          icon={systemHealth?.status === 'healthy' ? <CheckCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          trend="stable"
          color={healthStatusColor}
        />
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="active">Active Loops</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Processing Time Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="avgProcessingTime" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Loop Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Quality Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Quality Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Convergence Rate</span>
                    <span>{((metrics?.convergenceRate || 0) * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={(metrics?.convergenceRate || 0) * 100} />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Oscillation Rate</span>
                    <span>{((metrics?.oscillationRate || 0) * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={(metrics?.oscillationRate || 0) * 100} className="progress-warning" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Error Rate</span>
                    <span>{((systemHealth?.errorRate || 0) * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={(systemHealth?.errorRate || 0) * 100} className="progress-error" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Loops Tab */}
        <TabsContent value="active" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Feedback Loops ({activeLoops.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeLoops.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No active feedback loops
                  </div>
                ) : (
                  activeLoops.map((loop) => (
                    <ActiveLoopCard
                      key={loop.loopId}
                      loop={loop}
                      onSelect={() => onLoopSelect?.(loop.loopId)}
                    />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Performance Analysis</h3>
            <div className="flex gap-2">
              {['1h', '6h', '24h', '7d'].map((range) => (
                <Button
                  key={range}
                  variant={selectedTimeRange === range ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTimeRangeChange(range)}
                >
                  {range}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Processing Time Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Processing Time & Convergence</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="avgProcessingTime"
                      stackId="1"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.6}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="convergenceRate"
                      stroke="#10b981"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Active Loops Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Active Loops & Error Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Bar yAxisId="left" dataKey="activeLoops" fill="#8884d8" />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="errorRate"
                      stroke="#ef4444"
                      strokeWidth={2}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Average Iterations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {metrics?.averageIterations?.toFixed(1) || '0'}
                </div>
                <p className="text-sm text-gray-600">
                  Per feedback loop
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Confidence Improvement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  +{((metrics?.averageConfidenceImprovement || 0) * 100).toFixed(1)}%
                </div>
                <p className="text-sm text-gray-600">
                  Average per loop
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Timeout Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {((metrics?.timeoutRate || 0) * 100).toFixed(1)}%
                </div>
                <p className="text-sm text-gray-600">
                  Of all loops
                </p>
              </CardContent>
            </Card>
          </div>

          {showDetailedMetrics && (
            <Card>
              <CardHeader>
                <CardTitle>Detailed Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>Total Loops: {metrics?.totalLoops || 0}</div>
                    <div>Completed: {metrics?.completedLoops || 0}</div>
                    <div>Cancelled: {metrics?.cancelledLoops || 0}</div>
                    <div>Errors: {metrics?.errorLoops || 0}</div>
                  </div>
                  
                  {systemHealth?.recommendations && systemHealth.recommendations.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Recommendations:</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {systemHealth.recommendations.map((rec, index) => (
                          <li key={index}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Helper Components
const MetricCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend: 'up' | 'down' | 'stable';
  color: string;
}> = ({ title, value, icon, trend, color }) => {
  const trendIcon = trend === 'up' ? <TrendingUp className="h-4 w-4" /> :
                   trend === 'down' ? <TrendingDown className="h-4 w-4" /> :
                   <Activity className="h-4 w-4" />;

  const trendColor = trend === 'up' ? 'text-green-600' :
                    trend === 'down' ? 'text-red-600' :
                    'text-gray-600';

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className={`p-2 rounded-lg bg-${color}-100`}>
            {icon}
          </div>
          <div className={`flex items-center ${trendColor}`}>
            {trendIcon}
          </div>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm text-gray-600">{title}</div>
        </div>
      </CardContent>
    </Card>
  );
};

const ActiveLoopCard: React.FC<{
  loop: ActiveLoop;
  onSelect: () => void;
}> = ({ loop, onSelect }) => {
  const progress = (loop.currentIteration / loop.maxIterations) * 100;
  const confidenceProgress = (loop.confidence / loop.confidenceThreshold) * 100;

  const priorityColor = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800'
  }[loop.priority] || 'bg-gray-100 text-gray-800';

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onSelect}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="font-semibold">{loop.requestId}</div>
            <div className="text-sm text-gray-600">
              {loop.contentType} • Started {new Date(loop.startedAt).toLocaleTimeString()}
            </div>
          </div>
          <Badge className={priorityColor}>{loop.priority}</Badge>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Iteration Progress</span>
              <span>{loop.currentIteration}/{loop.maxIterations}</span>
            </div>
            <Progress value={progress} />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Confidence</span>
              <span>{(loop.confidence * 100).toFixed(1)}% / {(loop.confidenceThreshold * 100).toFixed(1)}%</span>
            </div>
            <Progress value={confidenceProgress} />
          </div>

          <div className="flex justify-between text-xs text-gray-500">
            <span>Elapsed: {Math.floor(loop.elapsedTime / 1000)}s</span>
            <span>Status: {loop.status}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FeedbackLoopDashboard;