import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface IndustryBenchmarkChartProps {
  organizationId: string;
  filters?: any;
  height?: number;
}

export const IndustryBenchmarkChart: React.FC<IndustryBenchmarkChartProps> = ({ 
  organizationId, 
  filters,
  height = 300 
}) => {
  const data = [
    { category: 'Assessment Quality', score: 92, benchmark: 78 },
    { category: 'User Engagement', score: 85, benchmark: 72 },
    { category: 'Data Accuracy', score: 96, benchmark: 85 },
    { category: 'Response Time', score: 88, benchmark: 75 },
    { category: 'Satisfaction', score: 90, benchmark: 80 },
  ];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis dataKey="category" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="score" fill="#6366F1" name="Your Score" />
        <Bar dataKey="benchmark" fill="#94A3B8" name="Industry Avg" />
      </BarChart>
    </ResponsiveContainer>
  );
};