import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { format } from 'date-fns';

interface KPITrendChartProps {
  organizationId: string;
  dateRange: { start: Date; end: Date };
  height?: number;
  kpiType?: 'all' | 'assessments' | 'users' | 'engagement' | 'performance';
}

export const KPITrendChart: React.FC<KPITrendChartProps> = ({
  organizationId,
  dateRange,
  height = 300,
  kpiType = 'all',
}) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKPIData();
  }, [organizationId, dateRange, kpiType]);

  const fetchKPIData = async () => {
    try {
      setLoading(true);
      // Simulate API call with mock data
      const days = Math.ceil(
        (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      const mockData = Array.from({ length: Math.min(days, 30) }, (_, i) => {
        const date = new Date(dateRange.start);
        date.setDate(date.getDate() + i);
        
        return {
          date: format(date, 'MMM dd'),
          assessments: Math.floor(Math.random() * 50) + 30,
          users: Math.floor(Math.random() * 100) + 150,
          engagement: Math.floor(Math.random() * 30) + 60,
          performance: Math.floor(Math.random() * 20) + 75,
        };
      });
      
      setData(mockData);
    } catch (error) {
      console.error('Error fetching KPI data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border">
          <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    if (kpiType === 'all') {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="assessments"
              stroke="#6366F1"
              strokeWidth={2}
              dot={false}
              name="Assessments"
            />
            <Line
              type="monotone"
              dataKey="users"
              stroke="#10B981"
              strokeWidth={2}
              dot={false}
              name="Active Users"
            />
            <Line
              type="monotone"
              dataKey="engagement"
              stroke="#F59E0B"
              strokeWidth={2}
              dot={false}
              name="Engagement %"
            />
            <Line
              type="monotone"
              dataKey="performance"
              stroke="#EF4444"
              strokeWidth={2}
              dot={false}
              name="Performance"
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    // Single KPI area chart
    const dataKey = kpiType === 'assessments' ? 'assessments' :
                   kpiType === 'users' ? 'users' :
                   kpiType === 'engagement' ? 'engagement' : 'performance';
    
    const color = kpiType === 'assessments' ? '#6366F1' :
                  kpiType === 'users' ? '#10B981' :
                  kpiType === 'engagement' ? '#F59E0B' : '#EF4444';

    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            fill={color}
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  return renderChart();
};