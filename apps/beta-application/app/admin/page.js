'use client';

import React, { useState, useEffect } from 'react';
import { MetricCard, RevenueChart } from "@ioc/shared/ui";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalOrganizations: 0,
    activeUsers: 0,
    mrr: 0,
    arr: 0,
    assessmentCompletion: 0,
    systemHealth: 100
  });
  const [recentSignups, setRecentSignups] = useState([]);
  const [revenueData, setRevenueData] = useState([]);

  useEffect(() => {
    // Simulate data loading
    setTimeout(() => {
      setMetrics({
        totalOrganizations: 247,
        activeUsers: 12458,
        mrr: 186500,
        arr: 2238000,
        assessmentCompletion: 78.5,
        systemHealth: 99.8
      });

      setRecentSignups([
      { id: 1, name: 'Acme Corporation', plan: 'Enterprise', date: '2024-01-15', users: 150 },
      { id: 2, name: 'Tech Innovators', plan: 'Professional', date: '2024-01-14', users: 75 },
      { id: 3, name: 'Global Solutions', plan: 'Enterprise', date: '2024-01-14', users: 200 },
      { id: 4, name: 'StartUp Inc', plan: 'Starter', date: '2024-01-13', users: 25 },
      { id: 5, name: 'Digital Ventures', plan: 'Professional', date: '2024-01-13', users: 50 }]
      );

      setRevenueData([
      { label: 'Jan', value: 165000 },
      { label: 'Feb', value: 172000 },
      { label: 'Mar', value: 168000 },
      { label: 'Apr', value: 175000 },
      { label: 'May', value: 182000 },
      { label: 'Jun', value: 186500 }]
      );

      setLoading(false);
    }, 1000);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">IOC Admin Dashboard</h1>
              <p className="mt-1 text-sm text-gray-600">Welcome back, CEO</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Last updated: {new Date().toLocaleString()}</span>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Export Report
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Organizations"
            value={metrics.totalOrganizations}
            change="+12%"
            changeType="positive"
            icon="🏢"
            loading={loading} />

          <MetricCard
            title="Active Users"
            value={metrics.activeUsers.toLocaleString()}
            change="+8.5%"
            changeType="positive"
            icon="👥"
            loading={loading} />

          <MetricCard
            title="Monthly Recurring Revenue"
            value={`$${(metrics.mrr / 1000).toFixed(1)}k`}
            change="+15.3%"
            changeType="positive"
            icon="💰"
            loading={loading} />

          <MetricCard
            title="Annual Recurring Revenue"
            value={`$${(metrics.arr / 1000000).toFixed(2)}M`}
            change="+22.7%"
            changeType="positive"
            icon="📈"
            loading={loading} />

        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <MetricCard
            title="Assessment Completion Rate"
            value={`${metrics.assessmentCompletion}%`}
            change="+3.2%"
            changeType="positive"
            icon="✅"
            loading={loading} />

          <MetricCard
            title="System Health"
            value={`${metrics.systemHealth}%`}
            change="Stable"
            changeType="neutral"
            icon="💚"
            loading={loading} />

          <MetricCard
            title="Support Tickets"
            value="24"
            change="-18%"
            changeType="positive"
            icon="🎫"
            loading={loading} />

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <RevenueChart data={revenueData} loading={loading} />

          {/* Recent Signups */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Signups</h3>
            {loading ?
            <div className="space-y-3">
                {[...Array(5)].map((_, i) =>
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>
              )}
              </div> :

            <div className="space-y-3">
                {recentSignups.map((signup) =>
              <div key={signup.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{signup.name}</p>
                      <p className="text-sm text-gray-500">{signup.date} • {signup.users} users</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full 
                      ${signup.plan === 'Enterprise' ? 'bg-purple-100 text-purple-800' :
                signup.plan === 'Professional' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'}`}>
                      {signup.plan}
                    </span>
                  </div>
              )}
              </div>
            }
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-blue-700 font-medium">
              View All Organizations
            </button>
            <button className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-green-700 font-medium">
              User Management
            </button>
            <button className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-purple-700 font-medium">
              Analytics Dashboard
            </button>
            <button className="p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors text-yellow-700 font-medium">
              System Settings
            </button>
          </div>
        </div>
      </main>
    </div>);

}