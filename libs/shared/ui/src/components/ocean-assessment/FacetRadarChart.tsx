import React, { useRef, useEffect } from 'react';
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, ChartOptions } from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { OceanFacets, OceanTraits } from './types';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface FacetRadarChartProps {
  facets: OceanFacets;
}

const TRAIT_COLORS: Record<OceanTraits, string> = {
  openness: '#8b5cf6',
  conscientiousness: '#3b82f6',
  extraversion: '#f59e0b',
  agreeableness: '#10b981',
  neuroticism: '#ef4444'
};

const FACET_LABELS: Record<string, string> = {
  // Openness facets
  fantasy: 'Fantasy',
  aesthetics: 'Aesthetics',
  feelings: 'Feelings',
  actions: 'Actions',
  ideas: 'Ideas',
  values: 'Values',
  // Conscientiousness facets
  competence: 'Competence',
  order: 'Order',
  dutifulness: 'Dutifulness',
  achievementStriving: 'Achievement',
  selfDiscipline: 'Self-Discipline',
  deliberation: 'Deliberation',
  // Extraversion facets
  warmth: 'Warmth',
  gregariousness: 'Gregariousness',
  assertiveness: 'Assertiveness',
  activity: 'Activity',
  excitementSeeking: 'Excitement',
  positiveEmotions: 'Positive Emotions',
  // Agreeableness facets
  trust: 'Trust',
  straightforwardness: 'Straightforwardness',
  altruism: 'Altruism',
  compliance: 'Compliance',
  modesty: 'Modesty',
  tenderMindedness: 'Tender-Mindedness',
  // Neuroticism facets
  anxiety: 'Anxiety',
  angryHostility: 'Hostility',
  depression: 'Depression',
  selfConsciousness: 'Self-Consciousness',
  impulsiveness: 'Impulsiveness',
  vulnerability: 'Vulnerability'
};

export const FacetRadarChart: React.FC<FacetRadarChartProps> = ({ facets }) => {
  const chartRef = useRef<any>(null);

  const createChartData = (trait: OceanTraits) => {
    const traitFacets = facets[trait];
    if (!traitFacets) return null;

    const labels = Object.keys(traitFacets).map(facet => FACET_LABELS[facet] || facet);
    const data = Object.values(traitFacets);

    return {
      labels,
      datasets: [{
        label: trait.charAt(0).toUpperCase() + trait.slice(1),
        data,
        backgroundColor: TRAIT_COLORS[trait] + '20',
        borderColor: TRAIT_COLORS[trait],
        borderWidth: 2,
        pointBackgroundColor: TRAIT_COLORS[trait],
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: TRAIT_COLORS[trait],
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    };
  };

  const options: ChartOptions<'radar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed.r;
            return `${context.dataset.label}: ${value.toFixed(1)}`;
          }
        }
      }
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20,
          callback: (value) => value + '%'
        },
        grid: {
          circular: true
        },
        pointLabels: {
          font: {
            size: 11
          }
        }
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">30-Facet Personality Analysis</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {(Object.keys(facets) as OceanTraits[]).map(trait => {
          const chartData = createChartData(trait);
          if (!chartData) return null;

          return (
            <div key={trait} className="border rounded-lg p-4">
              <h3 
                className="text-lg font-semibold capitalize mb-4 text-center"
                style={{ color: TRAIT_COLORS[trait] }}
              >
                {trait} Facets
              </h3>
              <div className="h-80">
                <Radar data={chartData} options={options} />
              </div>
              
              {/* Facet Details */}
              <div className="mt-4 space-y-2">
                {Object.entries(facets[trait] || {}).map(([facet, score]) => (
                  <div key={facet} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{FACET_LABELS[facet]}:</span>
                    <div className="flex items-center">
                      <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${score}%`,
                            backgroundColor: TRAIT_COLORS[trait]
                          }}
                        />
                      </div>
                      <span className="font-medium text-gray-700 w-12 text-right">
                        {score.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Insights */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Highest Facets</h4>
          <div className="space-y-2">
            {(() => {
              const allFacets: Array<{ trait: OceanTraits; facet: string; score: number }> = [];
              (Object.keys(facets) as OceanTraits[]).forEach(trait => {
                Object.entries(facets[trait] || {}).forEach(([facet, score]) => {
                  allFacets.push({ trait, facet, score });
                });
              });
              
              return allFacets
                .sort((a, b) => b.score - a.score)
                .slice(0, 5)
                .map(({ trait, facet, score }) => (
                  <div key={`${trait}-${facet}`} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">
                      <span style={{ color: TRAIT_COLORS[trait] }}>●</span> {FACET_LABELS[facet]}
                    </span>
                    <span className="text-sm font-medium">{score.toFixed(0)}%</span>
                  </div>
                ));
            })()}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Lowest Facets</h4>
          <div className="space-y-2">
            {(() => {
              const allFacets: Array<{ trait: OceanTraits; facet: string; score: number }> = [];
              (Object.keys(facets) as OceanTraits[]).forEach(trait => {
                Object.entries(facets[trait] || {}).forEach(([facet, score]) => {
                  allFacets.push({ trait, facet, score });
                });
              });
              
              return allFacets
                .sort((a, b) => a.score - b.score)
                .slice(0, 5)
                .map(({ trait, facet, score }) => (
                  <div key={`${trait}-${facet}`} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">
                      <span style={{ color: TRAIT_COLORS[trait] }}>●</span> {FACET_LABELS[facet]}
                    </span>
                    <span className="text-sm font-medium">{score.toFixed(0)}%</span>
                  </div>
                ));
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};