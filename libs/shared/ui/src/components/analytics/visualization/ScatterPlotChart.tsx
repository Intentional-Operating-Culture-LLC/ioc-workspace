import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ScatterPlotChartProps {
  data: any[];
  xKey: string;
  yKey: string;
  height?: number;
}

export const ScatterPlotChart: React.FC<ScatterPlotChartProps> = ({ 
  data, 
  xKey, 
  yKey,
  height = 300 
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
        <YAxis dataKey={yKey} tick={{ fontSize: 12 }} />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
        <Scatter data={data} fill="#6366F1" />
      </ScatterChart>
    </ResponsiveContainer>
  );
};