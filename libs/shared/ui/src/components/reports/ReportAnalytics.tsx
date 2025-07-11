'use client';

import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  DocumentTextIcon,
  ShareIcon,
  EyeIcon,
  ThumbUpIcon,
  ThumbDownIcon,
  ClockIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

interface ReportAnalyticsProps {
  organizationId: string;
  user: any;
}

export function ReportAnalytics({ organizationId, user }: ReportAnalyticsProps) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [insights, setInsights] = useState<any[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, [organizationId, timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/reports/analytics?organizationId=${organizationId}&timeRange=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.overall_analytics);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = async () => {
    try {
      const response = await fetch('/api/reports/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_insights',
          organizationId,
          timeRange,
          focusArea: 'all'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setInsights(data.insights || []);
      }
    } catch (error) {
      console.error('Error generating insights:', error);
    }
  };

  const exportAnalytics = async (format: 'csv' | 'json' | 'xlsx') => {
    try {
      const response = await fetch('/api/reports/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'export_analytics',
          organizationId,
          format,
          timeRange,
          includeDetails: true
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Handle download
        console.log('Export data:', data);
      }
    } catch (error) {
      console.error('Error exporting analytics:', error);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Report Analytics</h3>
          <p className="text-gray-600">Analyze report performance and engagement</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="input"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button
            onClick={generateInsights}
            className="btn-secondary"
          >
            Generate Insights
          </button>
          <div className="relative group">
            <button className="btn-primary">
              <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
              Export
            </button>
            <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-md shadow-lg border border-gray-200 z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <div className="py-1">
                <button
                  onClick={() => exportAnalytics('csv')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Export CSV
                </button>
                <button
                  onClick={() => exportAnalytics('json')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Export JSON
                </button>
                <button
                  onClick={() => exportAnalytics('xlsx')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Export Excel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Generation Metrics */}
          {analytics.generation && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
              <div className="flex items-center justify-between mb-4">
                <DocumentTextIcon className="h-8 w-8 text-blue-600" />
                <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                  Generation
                </span>
              </div>
              <p className="text-3xl font-bold text-blue-900 mb-2">
                {analytics.generation.total_reports}
              </p>
              <p className="text-sm text-blue-700">Reports Generated</p>
              <div className="mt-3 flex items-center text-sm text-blue-600">
                <span className="mr-1">
                  {analytics.generation.completion_rate > 80 ? '↗' : '→'}
                </span>
                {analytics.generation.completion_rate.toFixed(1)}% completion rate
              </div>
            </div>
          )}

          {/* Delivery Metrics */}
          {analytics.delivery && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
              <div className="flex items-center justify-between mb-4">
                <ShareIcon className="h-8 w-8 text-green-600" />
                <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                  Delivery
                </span>
              </div>
              <p className="text-3xl font-bold text-green-900 mb-2">
                {analytics.delivery.total_deliveries}
              </p>
              <p className="text-sm text-green-700">Reports Delivered</p>
              <div className="mt-3 flex items-center text-sm text-green-600">
                <span className="mr-1">
                  {analytics.delivery.delivery_success_rate > 90 ? '↗' : '↘'}
                </span>
                {analytics.delivery.delivery_success_rate.toFixed(1)}% success rate
              </div>
            </div>
          )}

          {/* Engagement Metrics */}
          {analytics.engagement && (
            <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-6 border border-purple-100">
              <div className="flex items-center justify-between mb-4">
                <EyeIcon className="h-8 w-8 text-purple-600" />
                <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                  Engagement
                </span>
              </div>
              <p className="text-3xl font-bold text-purple-900 mb-2">
                {analytics.engagement.total_interactions}
              </p>
              <p className="text-sm text-purple-700">Total Interactions</p>
              <div className="mt-3 flex items-center text-sm text-purple-600">
                <span className="mr-1">👥</span>
                {analytics.engagement.unique_users} unique users
              </div>
            </div>
          )}

          {/* Feedback Metrics */}
          {analytics.feedback && (
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-100">
              <div className="flex items-center justify-between mb-4">
                <ThumbUpIcon className="h-8 w-8 text-orange-600" />
                <span className="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                  Feedback
                </span>
              </div>
              <p className="text-3xl font-bold text-orange-900 mb-2">
                {analytics.feedback.average_rating.toFixed(1)}
              </p>
              <p className="text-sm text-orange-700">Average Rating</p>
              <div className="mt-3 flex items-center text-sm text-orange-600">
                <span className="mr-1">💬</span>
                {analytics.feedback.total_feedback} total feedback
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Generation Performance */}
        {analytics?.generation && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-6">Generation Performance</h4>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Total Reports</p>
                  <p className="text-sm text-gray-600">Generated this period</p>
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  {analytics.generation.total_reports}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Completion Rate</p>
                  <p className="text-sm text-gray-600">Reports published vs created</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-gray-900">
                    {analytics.generation.completion_rate.toFixed(1)}%
                  </span>
                  <div className="flex items-center text-sm text-gray-600 mt-1">
                    {analytics.generation.completion_rate > 80 ? (
                      <TrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
                    ) : (
                      <TrendingDownIcon className="h-4 w-4 text-red-500 mr-1" />
                    )}
                    Target: 85%
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Templates Used</p>
                  <p className="text-sm text-gray-600">Unique templates</p>
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  {analytics.generation.templates_used}
                </span>
              </div>

              {analytics.generation.status_breakdown && (
                <div>
                  <p className="font-medium text-gray-900 mb-3">Status Breakdown</p>
                  <div className="space-y-2">
                    {Object.entries(analytics.generation.status_breakdown).map(([status, count]: [string, any]) => (
                      <div key={status} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 capitalize">{status}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Delivery Performance */}
        {analytics?.delivery && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-6">Delivery Performance</h4>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Success Rate</p>
                  <p className="text-sm text-gray-600">Successful deliveries</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-gray-900">
                    {analytics.delivery.delivery_success_rate.toFixed(1)}%
                  </span>
                  <div className="flex items-center text-sm text-gray-600 mt-1">
                    {analytics.delivery.delivery_success_rate > 95 ? (
                      <TrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
                    ) : (
                      <TrendingDownIcon className="h-4 w-4 text-red-500 mr-1" />
                    )}
                    Target: 98%
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Read Rate</p>
                  <p className="text-sm text-gray-600">Reports opened</p>
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  {analytics.delivery.read_rate.toFixed(1)}%
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Avg Delivery Time</p>
                  <p className="text-sm text-gray-600">Time to deliver</p>
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  {analytics.delivery.average_delivery_time.toFixed(0)}s
                </span>
              </div>

              {analytics.delivery.channels_used && (
                <div>
                  <p className="font-medium text-gray-900 mb-3">Channels Used</p>
                  <div className="flex flex-wrap gap-2">
                    {analytics.delivery.channels_used.map((channel: string) => (
                      <span key={channel} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {channel}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Template Performance */}
      {analytics?.template_performance && Object.keys(analytics.template_performance).length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-6">Template Performance</h4>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Template
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reports
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Published
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Completion Rate
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(analytics.template_performance).map(([templateId, performance]: [string, any]) => (
                  <tr key={templateId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {performance.template_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {performance.template_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {performance.total_reports}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {performance.published_reports}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                          <div 
                            className={`h-2 rounded-full ${
                              performance.completion_rate > 80 ? 'bg-green-500' : 
                              performance.completion_rate > 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${performance.completion_rate}%` }}
                          ></div>
                        </div>
                        <span>{performance.completion_rate.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-6">AI-Generated Insights</h4>
          
          <div className="space-y-4">
            {insights.map((insight, index) => (
              <div key={index} className={`p-4 rounded-lg border-l-4 ${
                insight.priority >= 8 ? 'border-red-400 bg-red-50' :
                insight.priority >= 6 ? 'border-yellow-400 bg-yellow-50' :
                'border-blue-400 bg-blue-50'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900 mb-2">{insight.title}</h5>
                    <p className="text-gray-700 mb-2">{insight.description}</p>
                    {insight.recommendation && (
                      <p className="text-sm text-gray-600">
                        <strong>Recommendation:</strong> {insight.recommendation}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      insight.type === 'performance' ? 'bg-blue-100 text-blue-800' :
                      insight.type === 'delivery' ? 'bg-green-100 text-green-800' :
                      insight.type === 'engagement' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {insight.type}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      insight.priority >= 8 ? 'bg-red-100 text-red-800' :
                      insight.priority >= 6 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      Priority {insight.priority}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!analytics && (
        <div className="text-center py-12">
          <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data</h3>
          <p className="text-gray-600">Generate some reports to see analytics data</p>
        </div>
      )}
    </div>
  );
}