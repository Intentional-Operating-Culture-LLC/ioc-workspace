'use client';
import { useEffect, useState } from 'react';
import { DashboardMetrics as DashboardMetricsType } from "@ioc/shared/types";
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/20/solid';
type ChangeType = 'positive' | 'negative' | 'neutral';
export function DashboardMetrics() {
    const [metrics, setMetrics] = useState<DashboardMetricsType | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        fetchMetrics();
        // Refresh metrics every 30 seconds
        const interval = setInterval(fetchMetrics, 30000);
        return () => clearInterval(interval);
    }, []);
    const fetchMetrics = async () => {
        try {
            const response = await fetch('/api/marketing/metrics');
            if (!response.ok)
                throw new Error('Failed to fetch metrics');
            const data = await response.json();
            setMetrics(data.data);
            setError(null);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        }
        finally {
            setLoading(false);
        }
    };
    if (loading) {
        return (<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (<div key={i} className="bg-white overflow-hidden shadow rounded-lg animate-pulse">
            <div className="px-4 py-5 sm:p-6">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>))}
      </div>);
    }
    if (error || !metrics) {
        return (<div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-sm text-red-600">Error loading metrics: {error}</p>
      </div>);
    }
    const metricCards: {
        name: string;
        value: string;
        change: string;
        changeType: ChangeType;
        bgColor: string;
        textColor: string;
    }[] = [
        {
            name: 'Total Revenue',
            value: `$${metrics.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            change: '+12.5%',
            changeType: 'positive',
            bgColor: 'bg-green-50',
            textColor: 'text-green-800',
        },
        {
            name: 'Total Spend',
            value: `$${metrics.total_spend.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            change: '+3.2%',
            changeType: 'neutral',
            bgColor: 'bg-blue-50',
            textColor: 'text-blue-800',
        },
        {
            name: 'ROI',
            value: `${metrics.roi.toFixed(1)}%`,
            change: '+8.1%',
            changeType: 'positive',
            bgColor: 'bg-purple-50',
            textColor: 'text-purple-800',
        },
        {
            name: 'Active Campaigns',
            value: metrics.active_campaigns.toString(),
            change: `${metrics.total_campaigns} total`,
            changeType: 'neutral',
            bgColor: 'bg-yellow-50',
            textColor: 'text-yellow-800',
        },
    ];
    return (<div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((metric) => (<div key={metric.name} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {metric.name}
                  </dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">
                    {metric.value}
                  </dd>
                </div>
                <div className={`ml-4 flex-shrink-0 ${metric.bgColor} rounded-full p-3`}>
                  <div className={`h-8 w-8 ${metric.textColor}`}>
                    {metric.changeType === 'positive' && (<ArrowUpIcon className="h-6 w-6"/>)}
                    {metric.changeType === 'negative' && (<ArrowDownIcon className="h-6 w-6"/>)}
                    {metric.changeType === 'neutral' && (<span className="text-xs font-medium">{metric.change}</span>)}
                  </div>
                </div>
              </div>
              {metric.changeType !== 'neutral' && (<div className="mt-2">
                  <span className={`text-sm ${metric.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                    {metric.change}
                  </span>
                  <span className="text-sm text-gray-500"> from last month</span>
                </div>)}
            </div>
          </div>))}
      </div>

      {/* Additional metrics row */}
      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Conversion Rate
            </dt>
            <dd className="mt-1 flex items-baseline">
              <span className="text-2xl font-semibold text-gray-900">
                {metrics.avg_conversion_rate.toFixed(2)}%
              </span>
              <span className="ml-2 text-sm text-gray-500">
                {metrics.total_conversions.toLocaleString()} conversions
              </span>
            </dd>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Click-Through Rate
            </dt>
            <dd className="mt-1 flex items-baseline">
              <span className="text-2xl font-semibold text-gray-900">
                {metrics.avg_ctr.toFixed(2)}%
              </span>
              <span className="ml-2 text-sm text-gray-500">
                {metrics.total_clicks.toLocaleString()} clicks
              </span>
            </dd>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Budget Utilization
            </dt>
            <dd className="mt-1">
              <div className="flex items-center">
                <span className="text-2xl font-semibold text-gray-900">
                  {metrics.budget_utilization.toFixed(0)}%
                </span>
                <div className="ml-4 flex-1">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${metrics.budget_utilization}%` }}/>
                  </div>
                </div>
              </div>
            </dd>
          </div>
        </div>
      </div>
    </div>);
}
