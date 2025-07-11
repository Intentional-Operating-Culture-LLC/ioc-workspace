import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface StatisticalDistributionChartProps {
  data: any[];
  mean: number;
  stdDev: number;
  height?: number;
}

export const StatisticalDistributionChart: React.FC<StatisticalDistributionChartProps> = ({ 
  data, 
  mean,
  stdDev,
  height = 300 
}) => {
  // Generate normal distribution curve
  const distributionData = Array.from({ length: 100 }, (_, i) => {
    const x = (i - 50) / 10;
    const y = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * 
              Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));
    return { x, y: y * 1000 }; // Scale for visibility
  });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={distributionData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis dataKey="x" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Area 
          type="monotone" 
          dataKey="y" 
          stroke="#6366F1" 
          fill="#6366F1" 
          fillOpacity={0.3} 
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};