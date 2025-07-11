import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ChartBarIcon, 
  SparklesIcon, 
  DocumentTextIcon,
  ShareIcon,
  DownloadIcon,
  PrinterIcon
} from '@heroicons/react/24/outline';
import { OceanScore, OceanTraits } from './types';
import { FacetRadarChart } from './FacetRadarChart';
import { EmotionalRegulationSpectrum } from './EmotionalRegulationSpectrum';
import { ExecutiveLeadershipProfile } from './ExecutiveLeadershipProfile';
import { DarkSideRiskIndicators } from './DarkSideRiskIndicators';

interface OceanResultsDashboardProps {
  score: OceanScore;
  assessmentTitle: string;
  assessmentDate: string;
  userName: string;
  onGenerateReport?: () => void;
  onShare?: () => void;
  onPrint?: () => void;
}

const TRAIT_INFO: Record<OceanTraits, { color: string; description: string }> = {
  openness: {
    color: '#8b5cf6',
    description: 'Creativity, curiosity, and openness to new experiences'
  },
  conscientiousness: {
    color: '#3b82f6',
    description: 'Organization, dependability, and self-discipline'
  },
  extraversion: {
    color: '#f59e0b',
    description: 'Sociability, assertiveness, and positive emotions'
  },
  agreeableness: {
    color: '#10b981',
    description: 'Trust, cooperation, and empathy'
  },
  neuroticism: {
    color: '#ef4444',
    description: 'Emotional stability and stress management'
  }
};

export const OceanResultsDashboard: React.FC<OceanResultsDashboardProps> = ({
  score,
  assessmentTitle,
  assessmentDate,
  userName,
  onGenerateReport,
  onShare,
  onPrint
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'facets' | 'emotional' | 'executive' | 'darkside'>('overview');

  const getPercentileLabel = (percentile: number): string => {
    if (percentile >= 90) return 'Exceptional';
    if (percentile >= 75) return 'High';
    if (percentile >= 25) return 'Average';
    if (percentile >= 10) return 'Low';
    return 'Very Low';
  };

  const getPercentileColor = (percentile: number): string => {
    if (percentile >= 75) return 'text-green-600';
    if (percentile >= 25) return 'text-blue-600';
    return 'text-orange-600';
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{assessmentTitle} Results</h1>
            <p className="mt-2 text-gray-600">
              {userName} • Completed on {new Date(assessmentDate).toLocaleDateString()}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={onPrint}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <PrinterIcon className="h-4 w-4 mr-2" />
              Print
            </button>
            <button
              onClick={onShare}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <ShareIcon className="h-4 w-4 mr-2" />
              Share
            </button>
            <button
              onClick={onGenerateReport}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <DocumentTextIcon className="h-4 w-4 mr-2" />
              Generate Report
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: ChartBarIcon },
              { id: 'facets', label: '30 Facets', icon: SparklesIcon },
              { id: 'emotional', label: 'Emotional Regulation', icon: '❤️' },
              { id: 'executive', label: 'Executive Profile', icon: '👔' },
              { id: 'darkside', label: 'Risk Indicators', icon: '⚠️' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {typeof tab.icon === 'string' ? (
                  <span className="mr-2">{tab.icon}</span>
                ) : (
                  <tab.icon className="h-5 w-5 mr-2" />
                )}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <>
            {/* Big Five Overview */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Big Five Personality Traits</h2>
              <div className="space-y-6">
                {Object.entries(TRAIT_INFO).map(([trait, info]) => {
                  const percentile = score.percentile[trait as OceanTraits];
                  const stanine = score.stanine[trait as OceanTraits];
                  
                  return (
                    <motion.div
                      key={trait}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="relative"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 
                            className="text-lg font-semibold capitalize"
                            style={{ color: info.color }}
                          >
                            {trait}
                          </h3>
                          <p className="text-sm text-gray-600">{info.description}</p>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${getPercentileColor(percentile)}`}>
                            {getPercentileLabel(percentile)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {percentile}th percentile • Stanine {stanine}
                          </div>
                        </div>
                      </div>
                      
                      {/* Percentile Bar */}
                      <div className="relative h-12 bg-gray-100 rounded-lg overflow-hidden">
                        <div className="absolute inset-0 flex items-center">
                          {[10, 25, 50, 75, 90].map((marker) => (
                            <div
                              key={marker}
                              className="absolute h-full border-l border-gray-300"
                              style={{ left: `${marker}%` }}
                            >
                              <span className="absolute -top-6 -translate-x-1/2 text-xs text-gray-500">
                                {marker}%
                              </span>
                            </div>
                          ))}
                        </div>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentile}%` }}
                          transition={{ duration: 1, delay: 0.2 }}
                          className="absolute left-0 top-0 h-full flex items-center justify-end"
                          style={{ backgroundColor: info.color }}
                        >
                          <div className="w-1 h-full bg-white/30 mr-2" />
                          <span className="pr-3 text-white font-bold text-lg">
                            {Math.round(score.raw[trait as OceanTraits])}
                          </span>
                        </motion.div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Profile Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Strongest Traits</h3>
                <div className="space-y-3">
                  {Object.entries(score.percentile)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 3)
                    .map(([trait, percentile]) => (
                      <div key={trait} className="flex items-center justify-between">
                        <span className="capitalize text-gray-700">{trait}</span>
                        <span 
                          className="font-semibold"
                          style={{ color: TRAIT_INFO[trait as OceanTraits].color }}
                        >
                          {percentile}th percentile
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Development Areas</h3>
                <div className="space-y-3">
                  {Object.entries(score.percentile)
                    .sort(([, a], [, b]) => a - b)
                    .slice(0, 3)
                    .map(([trait, percentile]) => (
                      <div key={trait} className="flex items-center justify-between">
                        <span className="capitalize text-gray-700">{trait}</span>
                        <span className="font-semibold text-orange-600">
                          {percentile}th percentile
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Balance</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Trait Variability</span>
                    <span className="font-semibold text-blue-600">
                      {(() => {
                        const values = Object.values(score.percentile);
                        const variance = values.reduce((sum, val) => {
                          const mean = values.reduce((a, b) => a + b) / values.length;
                          return sum + Math.pow(val - mean, 2);
                        }, 0) / values.length;
                        return variance > 400 ? 'High' : variance > 200 ? 'Moderate' : 'Low';
                      })()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Profile Type</span>
                    <span className="font-semibold text-green-600">
                      {Object.values(score.percentile).filter(p => p > 75).length >= 3 
                        ? 'Well-Rounded' 
                        : 'Specialized'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'facets' && score.facets && (
          <FacetRadarChart facets={score.facets} />
        )}

        {activeTab === 'emotional' && score.emotionalRegulation && (
          <EmotionalRegulationSpectrum regulation={score.emotionalRegulation} />
        )}

        {activeTab === 'executive' && score.executiveProfile && (
          <ExecutiveLeadershipProfile profile={score.executiveProfile} />
        )}

        {activeTab === 'darkside' && score.darkSideRisks && (
          <DarkSideRiskIndicators risks={score.darkSideRisks} />
        )}
      </div>
    </div>
  );
};