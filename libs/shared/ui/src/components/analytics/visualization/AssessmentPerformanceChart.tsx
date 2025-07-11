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
} from 'recharts';

interface AssessmentPerformanceChartProps {
  organizationId: string;
  dateRange: { start: Date; end: Date };
  height?: number;
}

export const AssessmentPerformanceChart: React.FC<AssessmentPerformanceChartProps> = ({
  organizationId,
  dateRange,
  height = 300,
}) => {
  // Mock data
  const data = [
    { month: 'Jan', completed: 85, started: 95, avgScore: 78 },
    { month: 'Feb', completed: 88, started: 98, avgScore: 82 },
    { month: 'Mar', completed: 92, started: 102, avgScore: 85 },
    { month: 'Apr', completed: 90, started: 105, avgScore: 83 },
    { month: 'May', completed: 94, started: 110, avgScore: 86 },
    { month: 'Jun', completed: 96, started: 115, avgScore: 88 },
  ];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        <Bar dataKey="started" fill="#CBD5E1" name="Started" />
        <Bar dataKey="completed" fill="#6366F1" name="Completed" />
        <Bar dataKey="avgScore" fill="#10B981" name="Avg Score" />
      </BarChart>
    </ResponsiveContainer>
  );
};