import React from 'react';

interface HeatmapChartProps {
  data: any[];
  xAxis: string;
  yAxis: string;
  valueField: string;
  height?: number;
}

export const HeatmapChart: React.FC<HeatmapChartProps> = ({ 
  data, 
  xAxis, 
  yAxis, 
  valueField,
  height = 300 
}) => {
  // Simplified heatmap implementation
  return (
    <div style={{ height }} className="relative">
      <div className="grid grid-cols-7 gap-1 p-4">
        {Array.from({ length: 24 }, (_, hour) => 
          Array.from({ length: 7 }, (_, day) => {
            const intensity = Math.random();
            return (
              <div
                key={`${hour}-${day}`}
                className="w-full h-4 rounded"
                style={{
                  backgroundColor: `rgba(99, 102, 241, ${intensity})`,
                }}
                title={`${intensity * 100}%`}
              />
            );
          })
        ).flat()}
      </div>
    </div>
  );
};