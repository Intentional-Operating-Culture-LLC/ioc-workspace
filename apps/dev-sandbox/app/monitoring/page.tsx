'use client';

import React, { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  ServerIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CpuChipIcon,
  CircleStackIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';

interface MetricData {
  timestamp: string;
  value: number;
  label: string;
}

interface HealthStatus {
  service: string;
  status: 'healthy' | 'warning' | 'error';
  lastChecked: string;
  responseTime: number;
  message?: string;
}

interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
}

const MonitoringDashboard = () => {
  const [healthChecks, setHealthChecks] = useState<HealthStatus[]>([
    {
      service: 'Production App',
      status: 'healthy',
      lastChecked: new Date().toISOString(),
      responseTime: 150,
    },
    {
      service: 'Beta App',
      status: 'healthy',
      lastChecked: new Date().toISOString(),
      responseTime: 120,
    },
    {
      service: 'Database',
      status: 'warning',
      lastChecked: new Date().toISOString(),
      responseTime: 350,
      message: 'High connection count',
    },
    {
      service: 'API Gateway',
      status: 'healthy',
      lastChecked: new Date().toISOString(),
      responseTime: 80,
    },
  ]);

  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    cpu: 65,
    memory: 78,
    disk: 45,
    network: 23,
  });

  const [alerts, setAlerts] = useState([
    {
      id: 1,
      type: 'warning',
      title: 'High Memory Usage',
      description: 'Beta application memory usage above 75%',
      timestamp: new Date().toISOString(),
    },
    {
      id: 2,
      type: 'info',
      title: 'Deployment Complete',
      description: 'Production deployment v1.2.3 completed successfully',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
  ]);

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      setSystemMetrics(prev => ({
        cpu: Math.max(0, Math.min(100, prev.cpu + (Math.random() - 0.5) * 10)),
        memory: Math.max(0, Math.min(100, prev.memory + (Math.random() - 0.5) * 5)),
        disk: Math.max(0, Math.min(100, prev.disk + (Math.random() - 0.5) * 2)),
        network: Math.max(0, Math.min(100, prev.network + (Math.random() - 0.5) * 15)),
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getMetricColor = (value: number) => {
    if (value < 50) return 'text-green-600';
    if (value < 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = (value: number) => {
    if (value < 50) return 'bg-green-500';
    if (value < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="dev-container max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Monitoring Dashboard</h1>
            <p className="text-gray-600">Real-time system monitoring and alerting</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">Live</span>
          </div>
        </div>

        {/* System Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="dev-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <CpuChipIcon className="w-8 h-8 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">CPU Usage</h3>
                  <p className="text-sm text-gray-600">Processing load</p>
                </div>
              </div>
              <span className={`text-2xl font-bold ${getMetricColor(systemMetrics.cpu)}`}>
                {systemMetrics.cpu.toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(systemMetrics.cpu)}`}
                style={{ width: `${systemMetrics.cpu}%` }}
              ></div>
            </div>
          </div>

          <div className="dev-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <CircleStackIcon className="w-8 h-8 text-purple-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">Memory</h3>
                  <p className="text-sm text-gray-600">RAM usage</p>
                </div>
              </div>
              <span className={`text-2xl font-bold ${getMetricColor(systemMetrics.memory)}`}>
                {systemMetrics.memory.toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(systemMetrics.memory)}`}
                style={{ width: `${systemMetrics.memory}%` }}
              ></div>
            </div>
          </div>

          <div className="dev-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <ServerIcon className="w-8 h-8 text-green-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">Disk Space</h3>
                  <p className="text-sm text-gray-600">Storage used</p>
                </div>
              </div>
              <span className={`text-2xl font-bold ${getMetricColor(systemMetrics.disk)}`}>
                {systemMetrics.disk.toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(systemMetrics.disk)}`}
                style={{ width: `${systemMetrics.disk}%` }}
              ></div>
            </div>
          </div>

          <div className="dev-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <GlobeAltIcon className="w-8 h-8 text-indigo-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">Network</h3>
                  <p className="text-sm text-gray-600">Bandwidth used</p>
                </div>
              </div>
              <span className={`text-2xl font-bold ${getMetricColor(systemMetrics.network)}`}>
                {systemMetrics.network.toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(systemMetrics.network)}`}
                style={{ width: `${systemMetrics.network}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Health Checks */}
          <div className="dev-card p-6">
            <div className="flex items-center space-x-3 mb-6">
              <ChartBarIcon className="w-6 h-6 text-dev-primary" />
              <h2 className="text-xl font-semibold text-gray-900">Service Health</h2>
            </div>
            <div className="space-y-4">
              {healthChecks.map((check, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(check.status)}
                    <div>
                      <h3 className="font-medium text-gray-900">{check.service}</h3>
                      <p className="text-sm text-gray-600">
                        Response: {check.responseTime}ms
                      </p>
                      {check.message && (
                        <p className="text-xs text-yellow-600 mt-1">{check.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`dev-badge ${
                      check.status === 'healthy' ? 'dev-badge-success' :
                      check.status === 'warning' ? 'dev-badge-warning' : 'dev-badge-error'
                    }`}>
                      {check.status}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(check.lastChecked).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Alerts */}
          <div className="dev-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <ExclamationTriangleIcon className="w-6 h-6 text-dev-warning" />
                <h2 className="text-xl font-semibold text-gray-900">Recent Alerts</h2>
              </div>
              <button className="text-sm text-dev-primary hover:text-dev-secondary">
                View all
              </button>
            </div>
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div key={alert.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`dev-badge ${
                          alert.type === 'warning' ? 'dev-badge-warning' :
                          alert.type === 'error' ? 'dev-badge-error' : 'dev-badge-info'
                        }`}>
                          {alert.type}
                        </span>
                        <h3 className="font-medium text-gray-900">{alert.title}</h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{alert.description}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Performance Metrics Chart Placeholder */}
        <div className="mt-8 dev-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <ChartBarIcon className="w-6 h-6 text-dev-accent" />
              <h2 className="text-xl font-semibold text-gray-900">Performance Trends</h2>
            </div>
            <div className="flex space-x-2">
              <button className="dev-button-secondary text-xs">1H</button>
              <button className="dev-button-primary text-xs">24H</button>
              <button className="dev-button-secondary text-xs">7D</button>
            </div>
          </div>
          <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <ChartBarIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Performance charts will be displayed here</p>
              <p className="text-sm text-gray-400">Integration with monitoring tools required</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonitoringDashboard;