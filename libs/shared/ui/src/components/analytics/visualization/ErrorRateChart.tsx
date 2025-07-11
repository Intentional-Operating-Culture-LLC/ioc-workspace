import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ErrorRateChartProps {
  organizationId: string;
  height?: number;
  realTime?: boolean;
}

export const ErrorRateChart: React.FC<ErrorRateChartProps> = ({ 
  organizationId, 
  height = 300,
  realTime = false 
}) => {
  const data = [
    { time: '00:00', errors: 0.02, warnings: 0.15 },
    { time: '04:00', errors: 0.01, warnings: 0.12 },
    { time: '08:00', errors: 0.03, warnings: 0.18 },
    { time: '12:00', errors: 0.05, warnings: 0.22 },
    { time: '16:00', errors: 0.04, warnings: 0.20 },
    { time: '20:00', errors: 0.02, warnings: 0.16 },
  ];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis dataKey="time" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Line type="monotone" dataKey="errors" stroke="#EF4444" strokeWidth={2} name="Error Rate %" />
        <Line type="monotone" dataKey="warnings" stroke="#F59E0B" strokeWidth={2} name="Warning Rate %" />
      </LineChart>
    </ResponsiveContainer>
  );
};