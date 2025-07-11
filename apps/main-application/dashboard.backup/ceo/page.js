'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// Mock data for CEO dashboard
const mockCEOData = {
  revenue: {
    current: 8750,
    target: 10000,
    growth: 12.5,
    trend: 'up'
  },
  customers: {
    total: 87,
    target: 100,
    growth: 15.2,
    churn: 3.1
  },
  partners: {
    active: 6,
    target: 8,
    pipeline: 12,
    revenue: 2500
  },
  mvp: {
    readiness: 85,
    daysToLaunch: 56,
    criticalIssues: 3,
    completedFeatures: 34
  },
  kpis: {
    userAcquisition: 78,
    conversionRate: 4.2,
    ltv: 1250,
    cac: 85,
    systemHealth: 92,
    securityScore: 96
  }
};

export default function CEODashboard() {
  const [realTimeData, setRealTimeData] = useState(mockCEOData);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setRealTimeData(prev => ({
        ...prev,
        revenue: {
          ...prev.revenue,
          current: prev.revenue.current + Math.random() * 100 - 50
        },
        customers: {
          ...prev.customers,
          total: prev.customers.total + (Math.random() > 0.7 ? 1 : 0)
        },
        mvp: {
          ...prev.mvp,
          readiness: Math.min(100, prev.mvp.readiness + Math.random() * 0.5)
        }
      }));
      setLastUpdated(new Date());
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const metrics = realTimeData;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="px-4 py-5 sm:px-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">CEO Command Center</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Executive overview and key business metrics
                </p>
              </div>
              <Link 
                href="/"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="mt-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm">Live Data</span>
              </div>
              <span className="text-sm opacity-75">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-2xl font-bold">
                  {metrics.mvp.daysToLaunch}
                </div>
                <div className="text-sm opacity-75">Days to MVP Launch</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">
                  {metrics.mvp.readiness}%
                </div>
                <div className="text-sm opacity-75">MVP Readiness</div>
              </div>
            </div>
          </div>
        </div>

        {/* Top KPIs */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Revenue Progress</h3>
            <div className="text-2xl font-bold text-green-600">${metrics.revenue.current.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Target: ${metrics.revenue.target.toLocaleString()}</div>
            <div className="text-sm text-green-600">+{metrics.revenue.growth}%</div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">User Acquisition</h3>
            <div className="text-2xl font-bold text-blue-600">{metrics.customers.total}</div>
            <div className="text-sm text-gray-600">Target: {metrics.customers.target}</div>
            <div className="text-sm text-blue-600">+{metrics.customers.growth}%</div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Partner Network</h3>
            <div className="text-2xl font-bold text-purple-600">{metrics.partners.active}</div>
            <div className="text-sm text-gray-600">Target: {metrics.partners.target}</div>
            <div className="text-sm text-purple-600">+15.4%</div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">System Health</h3>
            <div className="text-2xl font-bold text-orange-600">{metrics.kpis.systemHealth}%</div>
            <div className="text-sm text-gray-600">Target: 95%</div>
            <div className="text-sm text-orange-600">+2.1%</div>
          </div>
        </div>

        {/* Critical Alerts */}
        <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Critical Alerts</h3>
          <div className="space-y-3">
            {metrics.mvp.criticalIssues > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-sm font-medium text-red-800">
                  {metrics.mvp.criticalIssues} Critical Issues
                </div>
                <div className="text-sm text-red-600">Require immediate attention</div>
              </div>
            )}
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm font-medium text-green-800">
                System Health: {metrics.kpis.systemHealth}%
              </div>
              <div className="text-sm text-green-600">All systems operational</div>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm font-medium text-blue-800">
                Security Score: {metrics.kpis.securityScore}%
              </div>
              <div className="text-sm text-blue-600">Security posture strong</div>
            </div>
          </div>
        </div>

        {/* Business Intelligence Summary */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Business Metrics</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Customer Lifetime Value</span>
                <span className="font-semibold">${metrics.kpis.ltv}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Customer Acquisition Cost</span>
                <span className="font-semibold">${metrics.kpis.cac}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Conversion Rate</span>
                <span className="font-semibold">{metrics.kpis.conversionRate}%</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Monthly Churn Rate</span>
                <span className="font-semibold">{metrics.customers.churn}%</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Partner Revenue</span>
                <span className="font-semibold">${metrics.partners.revenue}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">September MVP Goals</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Revenue Target</span>
                <span className="text-sm font-medium">
                  {((metrics.revenue.current / metrics.revenue.target) * 100).toFixed(0)}%
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">User Target</span>
                <span className="text-sm font-medium">
                  {((metrics.customers.total / metrics.customers.target) * 100).toFixed(0)}%
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Partner Target</span>
                <span className="text-sm font-medium">
                  {((metrics.partners.active / metrics.partners.target) * 100).toFixed(0)}%
                </span>
              </div>

              <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                <div className="text-sm text-purple-800">
                  <strong>Overall Progress:</strong> {metrics.mvp.readiness}%
                </div>
                <div className="text-xs text-purple-600 mt-1">
                  {metrics.mvp.daysToLaunch} days remaining
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}