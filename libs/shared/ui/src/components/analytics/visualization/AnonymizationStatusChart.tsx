import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface AnonymizationStatusChartProps {
  organizationId: string;
  height?: number;
}

export const AnonymizationStatusChart: React.FC<AnonymizationStatusChartProps> = ({ 
  organizationId, 
  height = 300 
}) => {
  const data = [
    { name: 'Anonymized', value: 98.5, color: '#10B981' },
    { name: 'Pending', value: 1.2, color: '#F59E0B' },
    { name: 'Failed', value: 0.3, color: '#EF4444' },
  ];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};