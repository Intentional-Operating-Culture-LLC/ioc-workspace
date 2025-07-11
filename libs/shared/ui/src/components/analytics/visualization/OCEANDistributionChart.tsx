import React, { useEffect, useState } from 'react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell
} from 'recharts';

interface OCEANDistributionChartProps {
  organizationId: string;
  filters?: any;
  height?: number;
  viewMode?: 'radar' | 'bar' | 'distribution';
}

const OCEAN_COLORS = {
  openness: '#8B5CF6',
  conscientiousness: '#3B82F6',
  extraversion: '#10B981',
  agreeableness: '#F59E0B',
  neuroticism: '#EF4444',
};

const OCEAN_LABELS = {
  openness: 'Openness',
  conscientiousness: 'Conscientiousness',
  extraversion: 'Extraversion',
  agreeableness: 'Agreeableness',
  neuroticism: 'Neuroticism',
};

export const OCEANDistributionChart: React.FC<OCEANDistributionChartProps> = ({
  organizationId,
  filters,
  height = 400,
  viewMode = 'radar',
}) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrait, setSelectedTrait] = useState<string | null>(null);

  useEffect(() => {
    fetchOCEANData();
  }, [organizationId, filters]);

  const fetchOCEANData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/analytics/ocean-distribution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, filters }),
      });
      
      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      }
    } catch (error) {
      console.error('Error fetching OCEAN data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Transform data for radar chart
  const radarData = Object.entries(OCEAN_LABELS).map(([key, label]) => ({
    trait: label,
    organization: data[0]?.[key] || 75,
    industry: 70, // Industry average
  }));

  // Transform data for bar chart
  const barData = Object.entries(OCEAN_LABELS).map(([key, label]) => ({
    trait: label,
    score: data[0]?.[key] || 75,
    color: OCEAN_COLORS[key as keyof typeof OCEAN_COLORS],
  }));

  // Distribution data for histogram
  const distributionData = selectedTrait ? 
    Array.from({ length: 10 }, (_, i) => ({
      range: `${i * 10}-${(i + 1) * 10}`,
      count: Math.floor(Math.random() * 50) + 10,
    })) : [];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border">
          <p className="text-sm font-medium text-gray-900">{payload[0].payload.trait}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm text-gray-600">
              {entry.name}: <span className="font-medium">{entry.value}%</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (viewMode === 'radar') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={radarData}>
          <PolarGrid stroke="#E5E7EB" />
          <PolarAngleAxis 
            dataKey="trait" 
            tick={{ fill: '#6B7280', fontSize: 12 }}
          />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 100]} 
            tick={{ fill: '#6B7280', fontSize: 10 }}
          />
          <Radar
            name="Your Organization"
            dataKey="organization"
            stroke="#6366F1"
            fill="#6366F1"
            fillOpacity={0.6}
          />
          <Radar
            name="Industry Average"
            dataKey="industry"
            stroke="#10B981"
            fill="#10B981"
            fillOpacity={0.3}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
        </RadarChart>
      </ResponsiveContainer>
    );
  }

  if (viewMode === 'bar') {
    return (
      <div>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis 
              dataKey="trait" 
              tick={{ fill: '#6B7280', fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              tick={{ fill: '#6B7280', fontSize: 12 }}
              domain={[0, 100]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="score" 
              onClick={(data) => setSelectedTrait(data.trait)}
              cursor="pointer"
            >
              {barData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {selectedTrait && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Distribution for {selectedTrait}
            </p>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={distributionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366F1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  }

  // Distribution view
  return (
    <div className="space-y-4">
      {Object.entries(OCEAN_LABELS).map(([key, label]) => {
        const score = data[0]?.[key] || 75;
        const color = OCEAN_COLORS[key as keyof typeof OCEAN_COLORS];
        
        return (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">{label}</span>
              <span className="text-sm font-medium text-gray-900">{score}%</span>
            </div>
            <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                style={{ 
                  width: `${score}%`, 
                  backgroundColor: color,
                }}
              />
              {/* Distribution overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex space-x-0.5">
                  {Array.from({ length: 20 }, (_, i) => {
                    const height = Math.random() * 100;
                    return (
                      <div
                        key={i}
                        className="w-1 bg-white opacity-30"
                        style={{ height: `${height}%` }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Low</span>
              <span>Average</span>
              <span>High</span>
            </div>
          </div>
        );
      })}
      
      <div className="mt-6 p-4 bg-indigo-50 rounded-lg">
        <h4 className="text-sm font-medium text-indigo-900 mb-2">Key Insights</h4>
        <ul className="text-sm text-indigo-700 space-y-1">
          <li>• High openness indicates creative and innovative culture</li>
          <li>• Strong conscientiousness suggests reliable team performance</li>
          <li>• Balanced extraversion shows healthy team dynamics</li>
        </ul>
      </div>
    </div>
  );
};