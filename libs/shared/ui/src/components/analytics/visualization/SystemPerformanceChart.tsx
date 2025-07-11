import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

interface SystemPerformanceChartProps {
  organizationId: string;
  height?: number;
  realTime?: boolean;
}

export const SystemPerformanceChart: React.FC<SystemPerformanceChartProps> = ({
  organizationId,
  height = 300,
  realTime = false,
}) => {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    // Initialize with mock data
    const initialData = Array.from({ length: 20 }, (_, i) => ({
      time: new Date(Date.now() - (20 - i) * 60000).toLocaleTimeString(),
      cpu: Math.floor(Math.random() * 30) + 40,
      memory: Math.floor(Math.random() * 20) + 60,
      network: Math.floor(Math.random() * 40) + 30,
    }));
    setData(initialData);

    if (realTime) {
      const interval = setInterval(() => {
        setData(prev => {
          const newData = [...prev.slice(1)];
          newData.push({
            time: new Date().toLocaleTimeString(),
            cpu: Math.floor(Math.random() * 30) + 40,
            memory: Math.floor(Math.random() * 20) + 60,
            network: Math.floor(Math.random() * 40) + 30,
          });
          return newData;
        });
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [realTime]);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis dataKey="time" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
        <Tooltip />
        <Area
          type="monotone"
          dataKey="cpu"
          stackId="1"
          stroke="#6366F1"
          fill="#6366F1"
          fillOpacity={0.6}
          name="CPU %"
        />
        <Area
          type="monotone"
          dataKey="memory"
          stackId="1"
          stroke="#10B981"
          fill="#10B981"
          fillOpacity={0.6}
          name="Memory %"
        />
        <Area
          type="monotone"
          dataKey="network"
          stackId="1"
          stroke="#F59E0B"
          fill="#F59E0B"
          fillOpacity={0.6}
          name="Network %"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};