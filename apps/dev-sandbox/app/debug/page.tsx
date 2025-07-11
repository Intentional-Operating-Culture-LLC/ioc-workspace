'use client';

import { useState, useEffect } from 'react';
import { 
  CpuChipIcon,
  GlobeAltIcon,
  ServerIcon,
  ChartBarIcon,
  BugAntIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

interface EnvVariable {
  key: string;
  value: string;
  source: 'process' | 'runtime';
  sensitive?: boolean;
}

interface NetworkRequest {
  id: string;
  method: string;
  url: string;
  status?: number;
  duration?: number;
  timestamp: Date;
  size?: string;
}

interface LogEntry {
  id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: Date;
  source?: string;
  details?: any;
}

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  status: 'good' | 'warning' | 'critical';
}

export default function DebugPage() {
  const [activeTab, setActiveTab] = useState<'env' | 'network' | 'performance' | 'logs'>('env');
  const [envVars, setEnvVars] = useState<EnvVariable[]>([]);
  const [networkRequests, setNetworkRequests] = useState<NetworkRequest[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [showSensitive, setShowSensitive] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [filterLevel, setFilterLevel] = useState<string>('all');

  // Load environment variables
  useEffect(() => {
    const loadEnvVars = () => {
      const vars: EnvVariable[] = [
        { key: 'NODE_ENV', value: process.env.NODE_ENV || 'development', source: 'process' },
        { key: 'NEXT_PUBLIC_APP_URL', value: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3009', source: 'process' },
        { key: 'NEXT_PUBLIC_SUPABASE_URL', value: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co', source: 'process', sensitive: true },
        { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key', source: 'process', sensitive: true },
        { key: 'DATABASE_URL', value: process.env.DATABASE_URL || 'postgresql://...', source: 'process', sensitive: true },
        { key: 'API_VERSION', value: '1.0.0', source: 'runtime' },
        { key: 'BUILD_TIME', value: new Date().toISOString(), source: 'runtime' },
        { key: 'USER_AGENT', value: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A', source: 'runtime' },
      ];
      setEnvVars(vars);
    };

    loadEnvVars();
  }, []);

  // Simulate network monitoring
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = Date.now();
      const id = Math.random().toString(36).substr(2, 9);
      
      const request: NetworkRequest = {
        id,
        method: args[1]?.method || 'GET',
        url: args[0].toString(),
        timestamp: new Date()
      };

      setNetworkRequests(prev => [request, ...prev].slice(0, 50));

      try {
        const response = await originalFetch(...args);
        const duration = Date.now() - startTime;
        
        setNetworkRequests(prev => 
          prev.map(req => 
            req.id === id 
              ? { ...req, status: response.status, duration }
              : req
          )
        );

        return response;
      } catch (error) {
        setNetworkRequests(prev => 
          prev.map(req => 
            req.id === id 
              ? { ...req, status: 0, duration: Date.now() - startTime }
              : req
          )
        );
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  // Simulate performance metrics
  useEffect(() => {
    const updateMetrics = () => {
      const metrics: PerformanceMetric[] = [
        {
          name: 'Page Load Time',
          value: Math.random() * 2000 + 500,
          unit: 'ms',
          status: Math.random() > 0.7 ? 'warning' : 'good'
        },
        {
          name: 'Memory Usage',
          value: Math.random() * 50 + 30,
          unit: 'MB',
          status: Math.random() > 0.8 ? 'critical' : Math.random() > 0.5 ? 'warning' : 'good'
        },
        {
          name: 'CPU Usage',
          value: Math.random() * 60 + 10,
          unit: '%',
          status: Math.random() > 0.8 ? 'critical' : Math.random() > 0.5 ? 'warning' : 'good'
        },
        {
          name: 'Network Latency',
          value: Math.random() * 100 + 20,
          unit: 'ms',
          status: Math.random() > 0.7 ? 'warning' : 'good'
        },
        {
          name: 'Render Time',
          value: Math.random() * 50 + 10,
          unit: 'ms',
          status: 'good'
        },
        {
          name: 'Bundle Size',
          value: 2.4,
          unit: 'MB',
          status: 'good'
        }
      ];
      setPerformanceMetrics(metrics);
    };

    updateMetrics();
    if (autoRefresh) {
      const interval = setInterval(updateMetrics, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Simulate logs
  useEffect(() => {
    const sampleLogs: LogEntry[] = [
      {
        id: '1',
        level: 'info',
        message: 'Application started successfully',
        timestamp: new Date(Date.now() - 60000),
        source: 'app'
      },
      {
        id: '2',
        level: 'debug',
        message: 'Database connection established',
        timestamp: new Date(Date.now() - 50000),
        source: 'database'
      },
      {
        id: '3',
        level: 'warn',
        message: 'API rate limit approaching threshold',
        timestamp: new Date(Date.now() - 30000),
        source: 'api',
        details: { current: 450, limit: 500 }
      },
      {
        id: '4',
        level: 'error',
        message: 'Failed to fetch user profile',
        timestamp: new Date(Date.now() - 10000),
        source: 'api',
        details: { error: 'Network timeout', userId: '12345' }
      },
      {
        id: '5',
        level: 'info',
        message: 'Cache cleared successfully',
        timestamp: new Date(),
        source: 'cache'
      }
    ];
    setLogs(sampleLogs);
  }, []);

  const filteredLogs = filterLevel === 'all' 
    ? logs 
    : logs.filter(log => log.level === filterLevel);

  const getStatusColor = (status: 'good' | 'warning' | 'critical') => {
    switch (status) {
      case 'good': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'critical': return 'text-red-400';
    }
  };

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'error': return <ExclamationTriangleIcon className="h-4 w-4 text-red-400" />;
      case 'warn': return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-400" />;
      case 'info': return <CheckCircleIcon className="h-4 w-4 text-blue-400" />;
      case 'debug': return <BugAntIcon className="h-4 w-4 text-gray-400" />;
      default: return null;
    }
  };

  const maskSensitiveValue = (value: string) => {
    if (value.length <= 8) return '••••••••';
    return value.substring(0, 4) + '••••' + value.substring(value.length - 4);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600">
            Debug Tools
          </h1>
          <p className="text-gray-400 text-lg">
            Monitor environment variables, network activity, performance metrics, and application logs
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('env')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'env' 
                ? 'bg-cyan-500 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <ServerIcon className="h-5 w-5" />
            Environment
          </button>
          <button
            onClick={() => setActiveTab('network')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'network' 
                ? 'bg-cyan-500 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <GlobeAltIcon className="h-5 w-5" />
            Network
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'performance' 
                ? 'bg-cyan-500 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <ChartBarIcon className="h-5 w-5" />
            Performance
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'logs' 
                ? 'bg-cyan-500 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <BugAntIcon className="h-5 w-5" />
            Logs
          </button>
        </div>

        {/* Content */}
        <div className="dev-card">
          {/* Environment Variables */}
          {activeTab === 'env' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Environment Variables</h2>
                <button
                  onClick={() => setShowSensitive(!showSensitive)}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  {showSensitive ? (
                    <>
                      <EyeSlashIcon className="h-4 w-4" />
                      Hide Sensitive
                    </>
                  ) : (
                    <>
                      <EyeIcon className="h-4 w-4" />
                      Show Sensitive
                    </>
                  )}
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 text-gray-400">Variable</th>
                      <th className="text-left py-3 px-4 text-gray-400">Value</th>
                      <th className="text-left py-3 px-4 text-gray-400">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {envVars.map(envVar => (
                      <tr key={envVar.key} className="border-b border-gray-800">
                        <td className="py-3 px-4 font-mono text-sm text-purple-400">
                          {envVar.key}
                        </td>
                        <td className="py-3 px-4 font-mono text-sm text-gray-300">
                          {envVar.sensitive && !showSensitive 
                            ? maskSensitiveValue(envVar.value)
                            : envVar.value}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            envVar.source === 'process' 
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-green-500/20 text-green-400'
                          }`}>
                            {envVar.source}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Network Activity */}
          {activeTab === 'network' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Network Activity</h2>
                <button
                  onClick={() => setNetworkRequests([])}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Clear
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 text-gray-400">Method</th>
                      <th className="text-left py-3 px-4 text-gray-400">URL</th>
                      <th className="text-left py-3 px-4 text-gray-400">Status</th>
                      <th className="text-left py-3 px-4 text-gray-400">Duration</th>
                      <th className="text-left py-3 px-4 text-gray-400">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {networkRequests.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-500">
                          No network activity yet. Make some API calls to see them here.
                        </td>
                      </tr>
                    ) : (
                      networkRequests.map(request => (
                        <tr key={request.id} className="border-b border-gray-800">
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              request.method === 'GET' ? 'bg-green-500/20 text-green-400' :
                              request.method === 'POST' ? 'bg-blue-500/20 text-blue-400' :
                              request.method === 'PUT' ? 'bg-yellow-500/20 text-yellow-400' :
                              request.method === 'DELETE' ? 'bg-red-500/20 text-red-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {request.method}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-sm text-gray-300 max-w-md truncate">
                            {request.url}
                          </td>
                          <td className="py-3 px-4">
                            {request.status !== undefined ? (
                              <span className={`${
                                request.status >= 200 && request.status < 300 ? 'text-green-400' :
                                request.status >= 400 ? 'text-red-400' :
                                'text-yellow-400'
                              }`}>
                                {request.status}
                              </span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-gray-400">
                            {request.duration ? `${request.duration}ms` : '-'}
                          </td>
                          <td className="py-3 px-4 text-gray-400 text-sm">
                            {request.timestamp.toLocaleTimeString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Performance Metrics */}
          {activeTab === 'performance' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Performance Metrics</h2>
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`flex items-center gap-2 text-sm ${
                    autoRefresh ? 'text-cyan-400' : 'text-gray-400'
                  } hover:text-white transition-colors`}
                >
                  <ArrowPathIcon className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                  Auto Refresh
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {performanceMetrics.map(metric => (
                  <div key={metric.name} className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400 text-sm">{metric.name}</span>
                      <CpuChipIcon className={`h-5 w-5 ${getStatusColor(metric.status)}`} />
                    </div>
                    <div className="text-2xl font-bold">
                      {metric.value.toFixed(metric.unit === '%' ? 1 : 0)}
                      <span className="text-lg text-gray-400 ml-1">{metric.unit}</span>
                    </div>
                    <div className={`text-sm mt-2 ${getStatusColor(metric.status)}`}>
                      {metric.status.charAt(0).toUpperCase() + metric.status.slice(1)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Application Logs */}
          {activeTab === 'logs' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Application Logs</h2>
                <div className="flex items-center gap-4">
                  <select
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value)}
                    className="dev-input text-sm"
                  >
                    <option value="all">All Levels</option>
                    <option value="error">Errors</option>
                    <option value="warn">Warnings</option>
                    <option value="info">Info</option>
                    <option value="debug">Debug</option>
                  </select>
                  <button
                    onClick={() => setLogs([])}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                {filteredLogs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No logs to display
                  </div>
                ) : (
                  filteredLogs.map(log => (
                    <div 
                      key={log.id} 
                      className={`p-3 rounded-lg border ${
                        log.level === 'error' ? 'bg-red-500/10 border-red-500/20' :
                        log.level === 'warn' ? 'bg-yellow-500/10 border-yellow-500/20' :
                        log.level === 'info' ? 'bg-blue-500/10 border-blue-500/20' :
                        'bg-gray-800 border-gray-700'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {getLogIcon(log.level)}
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-1">
                            <span className="text-sm text-gray-400">
                              <ClockIcon className="inline h-3 w-3 mr-1" />
                              {log.timestamp.toLocaleTimeString()}
                            </span>
                            {log.source && (
                              <span className="text-xs px-2 py-0.5 bg-gray-700 rounded">
                                {log.source}
                              </span>
                            )}
                          </div>
                          <div className="text-white">{log.message}</div>
                          {log.details && (
                            <pre className="mt-2 p-2 bg-gray-800/50 rounded text-xs text-gray-400 overflow-x-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}