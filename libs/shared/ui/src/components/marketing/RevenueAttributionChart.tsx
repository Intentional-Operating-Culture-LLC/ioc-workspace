'use client';

import { useEffect, useState } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { 
  FunnelIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface RevenueStage {
  stage: string;
  visitors: number;
  leads: number;
  opportunities: number;
  customers: number;
  revenue: number;
  conversion_rate: number;
}

interface ChannelAttribution {
  channel: string;
  revenue: number;
  percentage: number;
  color: string;
}

interface TimeSeriesData {
  date: string;
  marketing_generated_revenue: number;
  direct_sales_revenue: number;
  total_revenue: number;
}

export function RevenueAttributionChart() {
  const [funnelData, setFunnelData] = useState<RevenueStage[]>([]);
  const [channelData, setChannelData] = useState<ChannelAttribution[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'funnel' | 'channels' | 'trends'>('funnel');
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    fetchRevenueData();
  }, [selectedPeriod]);

  const fetchRevenueData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/marketing/revenue-attribution?period=${selectedPeriod}`);
      if (!response.ok) throw new Error('Failed to fetch revenue attribution data');
      const data = await response.json();
      
      setFunnelData(data.funnel);
      setChannelData(data.channels);
      setTimeSeriesData(data.timeSeries);
    } catch (error) {
      console.error('Error fetching revenue attribution data:', error);
      // Fallback to mock data
      setFunnelData([
        {
          stage: 'Website Visitors',
          visitors: 15420,
          leads: 0,
          opportunities: 0,
          customers: 0,
          revenue: 0,
          conversion_rate: 100
        },
        {
          stage: 'Marketing Qualified Leads',
          visitors: 0,
          leads: 1854,
          opportunities: 0,
          customers: 0,
          revenue: 0,
          conversion_rate: 12.0
        },
        {
          stage: 'Sales Qualified Leads',
          visitors: 0,
          leads: 0,
          opportunities: 742,
          customers: 0,
          revenue: 0,
          conversion_rate: 40.0
        },
        {
          stage: 'Customers',
          visitors: 0,
          leads: 0,
          opportunities: 0,
          customers: 89,
          revenue: 125000,
          conversion_rate: 12.0
        }
      ]);

      setChannelData([
        { channel: 'Organic Search', revenue: 45000, percentage: 36, color: '#10B981' },
        { channel: 'Paid Social', revenue: 28000, percentage: 22.4, color: '#3B82F6' },
        { channel: 'Email Marketing', revenue: 22000, percentage: 17.6, color: '#8B5CF6' },
        { channel: 'Direct', revenue: 18000, percentage: 14.4, color: '#F59E0B' },
        { channel: 'Referral', revenue: 12000, percentage: 9.6, color: '#EF4444' }
      ]);

      const today = new Date();
      const mockTimeSeries = Array.from({ length: 30 }, (_, i) => {
        const date = new Date(today);
        date.setDate(date.getDate() - (29 - i));
        return {
          date: date.toISOString().split('T')[0],
          marketing_generated_revenue: Math.floor(Math.random() * 5000) + 2000,
          direct_sales_revenue: Math.floor(Math.random() * 3000) + 1000,
          total_revenue: 0
        };
      });
      
      mockTimeSeries.forEach(item => {
        item.total_revenue = item.marketing_generated_revenue + item.direct_sales_revenue;
      });
      
      setTimeSeriesData(mockTimeSeries);
    } finally {
      setLoading(false);
    }
  };

  // Chart configurations
  const funnelChartData = {
    labels: funnelData.map(stage => stage.stage),
    datasets: [
      {
        label: 'Conversion Count',
        data: funnelData.map(stage => 
          stage.visitors || stage.leads || stage.opportunities || stage.customers
        ),
        backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'],
        borderWidth: 0,
      },
    ],
  };

  const channelChartData = {
    labels: channelData.map(channel => channel.channel),
    datasets: [
      {
        label: 'Revenue by Channel',
        data: channelData.map(channel => channel.revenue),
        backgroundColor: channelData.map(channel => channel.color),
        borderWidth: 0,
      },
    ],
  };

  const timeSeriesChartData = {
    labels: timeSeriesData.map(item => new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: 'Marketing Generated Revenue',
        data: timeSeriesData.map(item => item.marketing_generated_revenue),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Direct Sales Revenue',
        data: timeSeriesData.map(item => item.direct_sales_revenue),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const chartOptions: ChartOptions<any> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return selectedView === 'trends' ? `$${Number(value).toLocaleString()}` : Number(value).toLocaleString();
          },
        },
      },
    },
  };

  const doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed;
            const total = context.dataset.data.reduce((a, b) => (a as number) + (b as number), 0) as number;
            const percentage = ((value / total) * 100).toFixed(1);
            return `${context.label}: $${value.toLocaleString()} (${percentage}%)`;
          },
        },
      },
    },
  };

  const calculateTotalRevenue = () => {
    return channelData.reduce((total, channel) => total + channel.revenue, 0);
  };

  const calculateMarketingImpact = () => {
    const totalRevenue = calculateTotalRevenue();
    const directRevenue = channelData.find(c => c.channel === 'Direct')?.revenue || 0;
    const marketingRevenue = totalRevenue - directRevenue;
    return totalRevenue > 0 ? (marketingRevenue / totalRevenue) * 100 : 0;
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-96 bg-gray-100 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {(['funnel', 'channels', 'trends'] as const).map((view) => (
            <button
              key={view}
              onClick={() => setSelectedView(view)}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                selectedView === view
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </button>
          ))}
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

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
          <div className="flex items-center">
            <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-600">Total Revenue</p>
              <p className="text-2xl font-semibold text-green-900">
                ${calculateTotalRevenue().toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
          <div className="flex items-center">
            <ArrowTrendingUpIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-600">Marketing Impact</p>
              <p className="text-2xl font-semibold text-blue-900">
                {calculateMarketingImpact().toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4">
          <div className="flex items-center">
            <FunnelIcon className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-purple-600">Conversion Rate</p>
              <p className="text-2xl font-semibold text-purple-900">
                {funnelData.length > 0 ? (
                  ((funnelData[funnelData.length - 1]?.customers || 0) / (funnelData[0]?.visitors || 1) * 100).toFixed(2)
                ) : 0}%
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-orange-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-orange-600">Avg Revenue/Customer</p>
              <p className="text-2xl font-semibold text-orange-900">
                ${funnelData.length > 0 && funnelData[funnelData.length - 1]?.customers ? 
                  Math.round((funnelData[funnelData.length - 1]?.revenue || 0) / (funnelData[funnelData.length - 1]?.customers || 1)).toLocaleString() : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Display */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="h-96">
          {selectedView === 'funnel' && (
            <Bar data={funnelChartData} options={chartOptions} />
          )}
          {selectedView === 'channels' && (
            <Doughnut data={channelChartData} options={doughnutOptions} />
          )}
          {selectedView === 'trends' && (
            <Line data={timeSeriesChartData} options={chartOptions} />
          )}
        </div>
      </div>

      {/* Conversion Funnel Table */}
      {selectedView === 'funnel' && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stage
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Count
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conversion Rate
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {funnelData.map((stage, index) => (
                <tr key={stage.stage}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {stage.stage}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    {(stage.visitors || stage.leads || stage.opportunities || stage.customers).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    {stage.conversion_rate.toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                    {stage.revenue > 0 ? `$${stage.revenue.toLocaleString()}` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}