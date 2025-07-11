import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface CompetitiveBenchmarkChartProps {
  organizationId: string;
  dateRange: { start: Date; end: Date };
  height?: number;
}

export const CompetitiveBenchmarkChart: React.FC<CompetitiveBenchmarkChartProps> = ({
  organizationId,
  dateRange,
  height = 300,
}) => {
  // Mock benchmark data
  const data = [
    { metric: 'Completion Rate', yours: 92, industry: 78, top10: 95 },
    { metric: 'Engagement', yours: 85, industry: 72, top10: 88 },
    { metric: 'Data Quality', yours: 96, industry: 85, top10: 98 },
    { metric: 'Response Time', yours: 88, industry: 75, top10: 92 },
    { metric: 'User Satisfaction', yours: 90, industry: 80, top10: 94 },
  ];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="horizontal">
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
        <YAxis dataKey="metric" type="category" tick={{ fontSize: 12 }} width={100} />
        <Tooltip />
        <Legend />
        <Bar dataKey="yours" fill="#6366F1" name="Your Organization" />
        <Bar dataKey="industry" fill="#94A3B8" name="Industry Average" />
        <Bar dataKey="top10" fill="#10B981" name="Top 10%" />
        <ReferenceLine x={85} stroke="#F59E0B" strokeDasharray="5 5" />
      </BarChart>
    </ResponsiveContainer>
  );
};