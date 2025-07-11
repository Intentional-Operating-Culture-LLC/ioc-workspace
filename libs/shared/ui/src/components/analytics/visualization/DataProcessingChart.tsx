import React from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface DataProcessingChartProps {
  organizationId: string;
  height?: number;
  realTime?: boolean;
}

export const DataProcessingChart: React.FC<DataProcessingChartProps> = ({
  organizationId,
  height = 300,
  realTime = false,
}) => {
  // Mock data
  const data = [
    { time: '00:00', processed: 120, queued: 15, throughput: 95 },
    { time: '04:00', processed: 80, queued: 8, throughput: 88 },
    { time: '08:00', processed: 150, queued: 25, throughput: 85 },
    { time: '12:00', processed: 200, queued: 35, throughput: 82 },
    { time: '16:00', processed: 180, queued: 28, throughput: 87 },
    { time: '20:00', processed: 140, queued: 18, throughput: 92 },
  ];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis dataKey="time" tick={{ fontSize: 12 }} />
        <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        <Bar yAxisId="left" dataKey="processed" fill="#6366F1" name="Processed (GB)" />
        <Bar yAxisId="left" dataKey="queued" fill="#F59E0B" name="Queued (GB)" />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="throughput"
          stroke="#10B981"
          strokeWidth={2}
          name="Throughput %"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};