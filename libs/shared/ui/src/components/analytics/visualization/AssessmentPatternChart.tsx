import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AssessmentPatternChartProps {
  organizationId: string;
  filters?: any;
  height?: number;
}

export const AssessmentPatternChart: React.FC<AssessmentPatternChartProps> = ({ 
  organizationId, 
  filters,
  height = 300 
}) => {
  // Generate mock scatter data
  const data = Array.from({ length: 50 }, () => ({
    completionTime: Math.floor(Math.random() * 30) + 5,
    score: Math.floor(Math.random() * 40) + 60,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis dataKey="completionTime" name="Time (min)" tick={{ fontSize: 12 }} />
        <YAxis dataKey="score" name="Score" tick={{ fontSize: 12 }} />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
        <Scatter name="Assessments" data={data} fill="#6366F1" />
      </ScatterChart>
    </ResponsiveContainer>
  );
};