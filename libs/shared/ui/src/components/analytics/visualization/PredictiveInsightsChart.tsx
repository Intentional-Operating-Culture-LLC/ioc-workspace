import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

interface PredictiveInsightsChartProps {
  organizationId: string;
  filters?: any;
  height?: number;
}

export const PredictiveInsightsChart: React.FC<PredictiveInsightsChartProps> = ({ 
  organizationId, 
  filters,
  height = 300 
}) => {
  const data = [
    { month: 'Jan', actual: 85, predicted: 82, confidence: 90 },
    { month: 'Feb', actual: 88, predicted: 86, confidence: 92 },
    { month: 'Mar', actual: 92, predicted: 90, confidence: 94 },
    { month: 'Apr', actual: 90, predicted: 91, confidence: 93 },
    { month: 'May', actual: 94, predicted: 93, confidence: 95 },
    { month: 'Jun', actual: null, predicted: 96, confidence: 91 },
    { month: 'Jul', actual: null, predicted: 98, confidence: 88 },
    { month: 'Aug', actual: null, predicted: 100, confidence: 85 },
  ];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        <ReferenceLine x="May" stroke="#94A3B8" strokeDasharray="5 5" />
        <Line type="monotone" dataKey="actual" stroke="#6366F1" strokeWidth={2} name="Actual" />
        <Line type="monotone" dataKey="predicted" stroke="#10B981" strokeWidth={2} strokeDasharray="5 5" name="Predicted" />
        <Line type="monotone" dataKey="confidence" stroke="#F59E0B" strokeWidth={1} name="Confidence %" />
      </LineChart>
    </ResponsiveContainer>
  );
};