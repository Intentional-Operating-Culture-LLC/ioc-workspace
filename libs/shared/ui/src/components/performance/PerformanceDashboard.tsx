/**
 * @fileoverview Performance Dashboard Component
 * @description Real-time performance monitoring dashboard
 */
import React, { useState, useEffect } from 'react';
import { getDashboardData, getPerformanceSummary, subscribeToAlerts } from "@ioc/shared/data-access/performance";
interface DashboardData {
    vitals: {
        lcp: number;
        fid: number;
        cls: number;
        ttfb: number;
    };
    averagePerformanceScore: number;
    averageLoadTime: number;
    totalBundleSize: number;
    criticalAlerts: number;
    recommendations: string[];
}
interface Summary {
    score: number;
    improvements: number;
    alerts: number;
}
interface Alert {
    severity: 'warning' | 'error';
    title: string;
    message: string;
    timestamp: string;
}
export function PerformanceDashboard() {
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const loadData = async () => {
            try {
                const data = getDashboardData();
                const summaryData = getPerformanceSummary();
                setDashboardData(data);
                setSummary(summaryData);
                setLoading(false);
            }
            catch (error) {
                console.error('Failed to load performance data:', error);
                setLoading(false);
            }
        };
        loadData();
        // Subscribe to alerts
        const unsubscribe = subscribeToAlerts((alert: Alert) => {
            setAlerts(prev => [alert, ...prev].slice(0, 10));
        });
        // Refresh data every 30 seconds
        const interval = setInterval(loadData, 30000);
        return () => {
            unsubscribe();
            clearInterval(interval);
        };
    }, []);
    if (loading) {
        return (<div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading performance data...</div>
      </div>);
    }
    return (<div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Performance Dashboard</h1>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Performance Summary */}
      {dashboardData && (<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Performance Score</h3>
            <p className="text-2xl font-bold text-blue-600">
              {dashboardData.averagePerformanceScore.toFixed(1)}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Average Load Time</h3>
            <p className="text-2xl font-bold text-green-600">
              {dashboardData.averageLoadTime.toFixed(0)}ms
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Bundle Size</h3>
            <p className="text-2xl font-bold text-purple-600">
              {formatBytes(dashboardData.totalBundleSize)}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Critical Alerts</h3>
            <p className="text-2xl font-bold text-red-600">
              {dashboardData.criticalAlerts}
            </p>
          </div>
        </div>)}

      {/* Core Web Vitals */}
      {dashboardData && dashboardData.vitals && (<div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Core Web Vitals</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {dashboardData.vitals.lcp.toFixed(0)}ms
              </div>
              <div className="text-sm text-gray-500">LCP</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {dashboardData.vitals.fid.toFixed(0)}ms
              </div>
              <div className="text-sm text-gray-500">FID</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {dashboardData.vitals.cls.toFixed(3)}
              </div>
              <div className="text-sm text-gray-500">CLS</div>
            </div>
          </div>
        </div>)}

      {/* Recent Alerts */}
      {alerts.length > 0 && (<div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Recent Alerts</h2>
          <div className="space-y-2">
            {alerts.map((alert, index) => (<div key={index} className={`p-3 rounded ${alert.severity === 'error' ? 'bg-red-50 text-red-800' :
                    alert.severity === 'warning' ? 'bg-yellow-50 text-yellow-800' :
                        'bg-blue-50 text-blue-800'}`}>
                <div className="font-medium">{alert.title}</div>
                <div className="text-sm">{alert.message}</div>
                <div className="text-xs text-gray-500">
                  {new Date(alert.timestamp).toLocaleString()}
                </div>
              </div>))}
          </div>
        </div>)}

      {/* Recommendations */}
      {dashboardData && dashboardData.recommendations && (<div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Recommendations</h2>
          <div className="space-y-4">
            {dashboardData.recommendations.map((rec: string, index: number) => (<div key={index} className="border-l-4 border-blue-500 pl-4">
                <div className="text-sm">{rec}</div>
              </div>))}
          </div>
        </div>)}
    </div>);
}
function formatBytes(bytes: number) {
    if (bytes === 0)
        return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
