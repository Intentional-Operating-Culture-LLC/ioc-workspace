import React from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

interface DualAIValidationChartProps {
  organizationId: string;
  dateRange: { start: Date; end: Date };
  height?: number;
}

export const DualAIValidationChart: React.FC<DualAIValidationChartProps> = ({
  organizationId,
  dateRange,
  height = 300,
}) => {
  // Mock data for AI validation metrics
  const data = [
    { metric: 'Accuracy', ai1: 96, ai2: 94, consensus: 95 },
    { metric: 'Consistency', ai1: 92, ai2: 93, consensus: 92.5 },
    { metric: 'Confidence', ai1: 88, ai2: 90, consensus: 89 },
    { metric: 'Speed', ai1: 85, ai2: 87, consensus: 86 },
    { metric: 'Coverage', ai1: 94, ai2: 92, consensus: 93 },
  ];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data}>
        <PolarGrid stroke="#E5E7EB" />
        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
        <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
        <Radar
          name="AI Model 1"
          dataKey="ai1"
          stroke="#6366F1"
          fill="#6366F1"
          fillOpacity={0.3}
        />
        <Radar
          name="AI Model 2"
          dataKey="ai2"
          stroke="#10B981"
          fill="#10B981"
          fillOpacity={0.3}
        />
        <Radar
          name="Consensus"
          dataKey="consensus"
          stroke="#F59E0B"
          fill="#F59E0B"
          fillOpacity={0.5}
        />
        <Tooltip />
        <Legend />
      </RadarChart>
    </ResponsiveContainer>
  );
};