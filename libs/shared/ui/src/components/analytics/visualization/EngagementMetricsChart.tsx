import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface EngagementMetricsChartProps {
  organizationId: string;
  filters?: any;
  height?: number;
}

export const EngagementMetricsChart: React.FC<EngagementMetricsChartProps> = ({ 
  organizationId, 
  filters,
  height = 300 
}) => {
  const data = [
    { date: 'Mon', sessions: 120, duration: 25, interactions: 450 },
    { date: 'Tue', sessions: 150, duration: 28, interactions: 520 },
    { date: 'Wed', sessions: 140, duration: 26, interactions: 480 },
    { date: 'Thu', sessions: 160, duration: 30, interactions: 580 },
    { date: 'Fri', sessions: 130, duration: 24, interactions: 440 },
    { date: 'Sat', sessions: 80, duration: 20, interactions: 280 },
    { date: 'Sun', sessions: 70, duration: 18, interactions: 240 },
  ];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Area type="monotone" dataKey="sessions" stackId="1" stroke="#6366F1" fill="#6366F1" fillOpacity={0.6} />
        <Area type="monotone" dataKey="duration" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
        <Area type="monotone" dataKey="interactions" stackId="1" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.6} />
      </AreaChart>
    </ResponsiveContainer>
  );
};