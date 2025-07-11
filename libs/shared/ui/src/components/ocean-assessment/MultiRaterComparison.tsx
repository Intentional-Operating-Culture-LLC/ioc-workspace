import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  UserGroupIcon,
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import { OceanScore, OceanTraits, RaterFeedback } from './types';
import { Radar } from 'react-chartjs-2';
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface MultiRaterComparisonProps {
  selfScore: OceanScore;
  raterFeedback: RaterFeedback[];
  userName: string;
}

const TRAIT_COLORS: Record<OceanTraits, string> = {
  openness: '#8b5cf6',
  conscientiousness: '#3b82f6',
  extraversion: '#f59e0b',
  agreeableness: '#10b981',
  neuroticism: '#ef4444'
};

const RELATIONSHIP_COLORS = {
  self: '#6366f1',
  peer: '#10b981',
  direct_report: '#f59e0b',
  manager: '#ef4444',
  other: '#8b5cf6'
};

export const MultiRaterComparison: React.FC<MultiRaterComparisonProps> = ({
  selfScore,
  raterFeedback,
  userName
}) => {
  const [selectedRelationships, setSelectedRelationships] = useState<Set<string>>(
    new Set(['self', 'peer', 'manager', 'direct_report'])
  );
  const [showGaps, setShowGaps] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'traits' | 'feedback'>('overview');

  // Calculate average scores by relationship type
  const getAverageScoresByRelationship = () => {
    const scoresByRelationship: Record<string, Record<OceanTraits, number[]>> = {};
    
    // Add self scores
    scoresByRelationship.self = {
      openness: [selfScore.percentile.openness],
      conscientiousness: [selfScore.percentile.conscientiousness],
      extraversion: [selfScore.percentile.extraversion],
      agreeableness: [selfScore.percentile.agreeableness],
      neuroticism: [selfScore.percentile.neuroticism]
    };

    // Group rater scores by relationship
    raterFeedback.forEach(feedback => {
      if (feedback.status === 'completed' && feedback.scores) {
        if (!scoresByRelationship[feedback.relationship]) {
          scoresByRelationship[feedback.relationship] = {
            openness: [],
            conscientiousness: [],
            extraversion: [],
            agreeableness: [],
            neuroticism: []
          };
        }
        
        const traits: OceanTraits[] = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];
        traits.forEach(trait => {
          scoresByRelationship[feedback.relationship][trait].push(feedback.scores!.percentile[trait]);
        });
      }
    });

    // Calculate averages
    const averages: Record<string, Record<OceanTraits, number>> = {};
    Object.entries(scoresByRelationship).forEach(([relationship, scores]) => {
      averages[relationship] = {} as Record<OceanTraits, number>;
      Object.entries(scores).forEach(([trait, values]) => {
        averages[relationship][trait as OceanTraits] = 
          values.reduce((sum, val) => sum + val, 0) / values.length;
      });
    });

    return averages;
  };

  const averageScores = getAverageScoresByRelationship();

  // Calculate perception gaps
  const calculateGaps = () => {
    const gaps: Record<OceanTraits, { selfOthers: number; managerPeers: number }> = {
      openness: { selfOthers: 0, managerPeers: 0 },
      conscientiousness: { selfOthers: 0, managerPeers: 0 },
      extraversion: { selfOthers: 0, managerPeers: 0 },
      agreeableness: { selfOthers: 0, managerPeers: 0 },
      neuroticism: { selfOthers: 0, managerPeers: 0 }
    };

    const traits: OceanTraits[] = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];
    
    traits.forEach(trait => {
      // Self vs Others gap
      const otherScores = Object.entries(averageScores)
        .filter(([rel]) => rel !== 'self')
        .map(([, scores]) => scores[trait]);
      
      if (otherScores.length > 0) {
        const othersAvg = otherScores.reduce((sum, val) => sum + val, 0) / otherScores.length;
        gaps[trait].selfOthers = averageScores.self?.[trait] - othersAvg;
      }

      // Manager vs Peers gap
      if (averageScores.manager && averageScores.peer) {
        gaps[trait].managerPeers = averageScores.manager[trait] - averageScores.peer[trait];
      }
    });

    return gaps;
  };

  const gaps = calculateGaps();

  // Prepare radar chart data
  const radarData = {
    labels: ['Openness', 'Conscientiousness', 'Extraversion', 'Agreeableness', 'Neuroticism'],
    datasets: Object.entries(averageScores)
      .filter(([relationship]) => selectedRelationships.has(relationship))
      .map(([relationship, scores]) => ({
        label: relationship.charAt(0).toUpperCase() + relationship.slice(1).replace('_', ' '),
        data: [
          scores.openness,
          scores.conscientiousness,
          scores.extraversion,
          scores.agreeableness,
          scores.neuroticism
        ],
        backgroundColor: RELATIONSHIP_COLORS[relationship as keyof typeof RELATIONSHIP_COLORS] + '20',
        borderColor: RELATIONSHIP_COLORS[relationship as keyof typeof RELATIONSHIP_COLORS],
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }))
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      }
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20
        }
      }
    }
  };

  const getGapIcon = (gap: number) => {
    if (Math.abs(gap) < 5) return <MinusIcon className="h-4 w-4 text-gray-400" />;
    if (gap > 0) return <ArrowUpIcon className="h-4 w-4 text-green-600" />;
    return <ArrowDownIcon className="h-4 w-4 text-red-600" />;
  };

  const getGapLabel = (gap: number) => {
    const absGap = Math.abs(gap);
    if (absGap < 5) return 'Aligned';
    if (absGap < 10) return 'Small Gap';
    if (absGap < 20) return 'Moderate Gap';
    return 'Large Gap';
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">360° Feedback Comparison</h2>
              <p className="mt-2 text-gray-600">
                Multi-rater comparison for {userName}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <UserGroupIcon className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-600">
                {raterFeedback.filter(f => f.status === 'completed').length} raters completed
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-6 border-b border-gray-200 -mb-px">
            <nav className="flex space-x-8">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'traits', label: 'Trait Analysis' },
                { id: 'feedback', label: 'Written Feedback' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Radar Chart */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">OCEAN Trait Comparison</h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowGaps(!showGaps)}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      {showGaps ? (
                        <>
                          <EyeSlashIcon className="h-4 w-4 mr-1" />
                          Hide Gaps
                        </>
                      ) : (
                        <>
                          <EyeIcon className="h-4 w-4 mr-1" />
                          Show Gaps
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Relationship Filters */}
                <div className="mb-4 flex flex-wrap gap-2">
                  {Object.entries(RELATIONSHIP_COLORS).map(([relationship, color]) => {
                    const hasData = !!averageScores[relationship];
                    return (
                      <label
                        key={relationship}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm cursor-pointer ${
                          !hasData ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedRelationships.has(relationship)}
                          onChange={(e) => {
                            const next = new Set(selectedRelationships);
                            if (e.target.checked) {
                              next.add(relationship);
                            } else {
                              next.delete(relationship);
                            }
                            setSelectedRelationships(next);
                          }}
                          disabled={!hasData}
                          className="sr-only"
                        />
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full font-medium ${
                            selectedRelationships.has(relationship) && hasData
                              ? 'text-white'
                              : 'text-gray-700 bg-gray-100'
                          }`}
                          style={{
                            backgroundColor: selectedRelationships.has(relationship) && hasData ? color : undefined
                          }}
                        >
                          {relationship.charAt(0).toUpperCase() + relationship.slice(1).replace('_', ' ')}
                          {hasData && relationship !== 'self' && (
                            <span className="ml-1">
                              ({relationship === 'peer' 
                                ? raterFeedback.filter(f => f.relationship === 'peer' && f.status === 'completed').length
                                : relationship === 'manager'
                                ? raterFeedback.filter(f => f.relationship === 'manager' && f.status === 'completed').length
                                : relationship === 'direct_report'
                                ? raterFeedback.filter(f => f.relationship === 'direct_report' && f.status === 'completed').length
                                : raterFeedback.filter(f => f.relationship === 'other' && f.status === 'completed').length
                              })
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>

                <div className="h-96">
                  <Radar data={radarData} options={radarOptions} />
                </div>
              </div>

              {/* Perception Gaps */}
              {showGaps && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white border rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Self vs Others Perception</h4>
                    <div className="space-y-3">
                      {Object.entries(gaps).map(([trait, gapData]) => (
                        <div key={trait} className="flex items-center justify-between">
                          <span className="capitalize text-gray-700">{trait}</span>
                          <div className="flex items-center space-x-2">
                            {getGapIcon(gapData.selfOthers)}
                            <span className={`text-sm font-medium ${
                              Math.abs(gapData.selfOthers) < 5 ? 'text-gray-600' :
                              gapData.selfOthers > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {gapData.selfOthers > 0 ? '+' : ''}{gapData.selfOthers.toFixed(1)}%
                            </span>
                            <span className="text-xs text-gray-500">
                              ({getGapLabel(gapData.selfOthers)})
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 text-sm text-gray-600">
                      Positive values indicate self-ratings higher than others' ratings
                    </p>
                  </div>

                  <div className="bg-white border rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Manager vs Peers Perception</h4>
                    <div className="space-y-3">
                      {Object.entries(gaps).map(([trait, gapData]) => (
                        <div key={trait} className="flex items-center justify-between">
                          <span className="capitalize text-gray-700">{trait}</span>
                          <div className="flex items-center space-x-2">
                            {getGapIcon(gapData.managerPeers)}
                            <span className={`text-sm font-medium ${
                              Math.abs(gapData.managerPeers) < 5 ? 'text-gray-600' :
                              gapData.managerPeers > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {gapData.managerPeers > 0 ? '+' : ''}{gapData.managerPeers.toFixed(1)}%
                            </span>
                            <span className="text-xs text-gray-500">
                              ({getGapLabel(gapData.managerPeers)})
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 text-sm text-gray-600">
                      Positive values indicate manager ratings higher than peer ratings
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'traits' && (
            <div className="space-y-6">
              {(['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'] as OceanTraits[]).map(trait => (
                <div key={trait} className="border rounded-lg p-6">
                  <h3 
                    className="text-lg font-semibold capitalize mb-4"
                    style={{ color: TRAIT_COLORS[trait] }}
                  >
                    {trait}
                  </h3>
                  
                  <div className="space-y-3">
                    {Object.entries(averageScores).map(([relationship, scores]) => (
                      <div key={relationship} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: RELATIONSHIP_COLORS[relationship as keyof typeof RELATIONSHIP_COLORS] }}
                          />
                          <span className="capitalize text-gray-700">
                            {relationship.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="w-48 bg-gray-200 rounded-full h-6">
                            <div
                              className="h-6 rounded-full flex items-center justify-end pr-2"
                              style={{
                                width: `${scores[trait]}%`,
                                backgroundColor: TRAIT_COLORS[trait]
                              }}
                            >
                              <span className="text-xs font-medium text-white">
                                {scores[trait].toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'feedback' && (
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  Written feedback is aggregated and anonymized to protect rater confidentiality
                </p>
              </div>

              {['strengths', 'improvements', 'additional'].map(category => {
                const feedbackItems = raterFeedback
                  .filter(f => f.status === 'completed' && f.comments?.[category as keyof typeof f.comments])
                  .map(f => ({
                    text: f.comments![category as keyof typeof f.comments],
                    relationship: f.relationship
                  }));

                return (
                  <div key={category} className="border rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 capitalize">
                      {category === 'improvements' ? 'Areas for Improvement' : category}
                    </h3>
                    
                    {feedbackItems.length > 0 ? (
                      <div className="space-y-3">
                        {feedbackItems.map((item, index) => (
                          <div key={index} className="flex items-start space-x-3">
                            <div 
                              className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                              style={{ 
                                backgroundColor: RELATIONSHIP_COLORS[item.relationship as keyof typeof RELATIONSHIP_COLORS] 
                              }}
                            />
                            <p className="text-gray-700">{item.text}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">No feedback provided in this category</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};