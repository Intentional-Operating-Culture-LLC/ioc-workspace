'use client';

import { useEffect, useState } from 'react';
import { 
  CurrencyDollarIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

interface BusinessMetric {
  id: string;
  name: string;
  value: number;
  formattedValue: string;
  change: number;
  changeDirection: 'up' | 'down' | 'neutral';
  changeFormatted: string;
  period: string;
  icon: string;
  source: string;
}

interface BusinessMetricsData {
  revenue: BusinessMetric;
  customers: BusinessMetric;
  ltv: BusinessMetric;
  cac: BusinessMetric;
  mrr: BusinessMetric;
  churn: BusinessMetric;
}

export function BusinessMetricsPanel() {
  const [metrics, setMetrics] = useState<BusinessMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    fetchBusinessMetrics();
  }, [selectedPeriod]);

  const fetchBusinessMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/business/metrics?period=${selectedPeriod}`);
      if (!response.ok) throw new Error('Failed to fetch business metrics');
      const data = await response.json();
      setMetrics(data.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      // Fallback to mock data for demo
      setMetrics({
        revenue: {
          id: 'revenue',
          name: 'Total Revenue',
          value: 125000,
          formattedValue: '$125,000',
          change: 15.2,
          changeDirection: 'up',
          changeFormatted: '+15.2%',
          period: selectedPeriod,
          icon: 'currency',
          source: 'Zoho Books'
        },
        customers: {
          id: 'customers',
          name: 'Active Customers',
          value: 1247,
          formattedValue: '1,247',
          change: 8.5,
          changeDirection: 'up',
          changeFormatted: '+8.5%',
          period: selectedPeriod,
          icon: 'users',
          source: 'Zoho CRM'
        },
        ltv: {
          id: 'ltv',
          name: 'Customer LTV',
          value: 2450,
          formattedValue: '$2,450',
          change: 12.1,
          changeDirection: 'up',
          changeFormatted: '+12.1%',
          period: selectedPeriod,
          icon: 'trend-up',
          source: 'Analytics'
        },
        cac: {
          id: 'cac',
          name: 'Customer CAC',
          value: 187,
          formattedValue: '$187',
          change: -5.3,
          changeDirection: 'down',
          changeFormatted: '-5.3%',
          period: selectedPeriod,
          icon: 'chart',
          source: 'Marketing'
        },
        mrr: {
          id: 'mrr',
          name: 'Monthly Recurring Revenue',
          value: 45000,
          formattedValue: '$45,000',
          change: 18.7,
          changeDirection: 'up',
          changeFormatted: '+18.7%',
          period: selectedPeriod,
          icon: 'currency',
          source: 'Zoho Subscriptions'
        },
        churn: {
          id: 'churn',
          name: 'Churn Rate',
          value: 3.2,
          formattedValue: '3.2%',
          change: -0.8,
          changeDirection: 'down',
          changeFormatted: '-0.8%',
          period: selectedPeriod,
          icon: 'trend-down',
          source: 'Analytics'
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (iconType: string) => {
    switch (iconType) {
      case 'currency':
        return CurrencyDollarIcon;
      case 'users':
        return UserGroupIcon;
      case 'trend-up':
        return ArrowTrendingUpIcon;
      case 'trend-down':
        return ArrowTrendingDownIcon;
      case 'chart':
        return ChartBarIcon;
      default:
        return ChartBarIcon;
    }
  };

  const getChangeColor = (direction: string) => {
    switch (direction) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getChangeIcon = (direction: string) => {
    switch (direction) {
      case 'up':
        return ArrowUpIcon;
      case 'down':
        return ArrowDownIcon;
      default:
        return null;
    }
  };

  const getBadgeColor = (metricId: string) => {
    switch (metricId) {
      case 'revenue':
      case 'mrr':
        return 'bg-green-100 text-green-800';
      case 'customers':
        return 'bg-blue-100 text-blue-800';
      case 'ltv':
        return 'bg-purple-100 text-purple-800';
      case 'cac':
        return 'bg-orange-100 text-orange-800';
      case 'churn':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Business Metrics</h2>
          <p className="mt-1 text-sm text-gray-500">
            Integrated business performance indicators
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-100 h-24 rounded-lg"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Business Metrics</h2>
          <p className="mt-1 text-sm text-gray-500">
            Integrated business performance indicators
          </p>
        </div>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-600">Error loading business metrics: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Business Metrics</h2>
            <p className="mt-1 text-sm text-gray-500">
              Integrated business performance indicators from Zoho and other sources
            </p>
          </div>
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {(['7d', '30d', '90d'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  selectedPeriod === period
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Object.values(metrics).map((metric) => {
            const Icon = getIcon(metric.icon);
            const ChangeIcon = getChangeIcon(metric.changeDirection);
            
            return (
              <div key={metric.id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Icon className="h-5 w-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">{metric.name}</span>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getBadgeColor(metric.id)}`}>
                    {metric.source}
                  </span>
                </div>
                
                <div className="mt-3">
                  <div className="text-2xl font-semibold text-gray-900">
                    {metric.formattedValue}
                  </div>
                  
                  <div className="mt-1 flex items-center space-x-1">
                    {ChangeIcon && (
                      <ChangeIcon className={`h-3 w-3 ${getChangeColor(metric.changeDirection)}`} />
                    )}
                    <span className={`text-sm ${getChangeColor(metric.changeDirection)}`}>
                      {metric.changeFormatted}
                    </span>
                    <span className="text-sm text-gray-500">
                      vs last {metric.period}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Card */}
        <div className="mt-6 bg-indigo-50 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <ChartBarIcon className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-indigo-900">Business Health Score</h3>
              <p className="mt-1 text-sm text-indigo-700">
                Based on revenue growth, customer acquisition, and retention metrics, your business health score is 
                <span className="font-semibold"> 8.2/10</span>. 
                Revenue is growing strongly, and customer acquisition costs are trending down.
              </p>
              <div className="mt-2">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-indigo-200 rounded-full h-2">
                    <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '82%' }}></div>
                  </div>
                  <span className="text-sm font-medium text-indigo-900">82%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}