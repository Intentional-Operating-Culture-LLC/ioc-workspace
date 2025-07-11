/**
 * Dark Side Analysis Dashboard Component
 * Comprehensive visualization of personality derailers and trait extremes
 */

import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Brain, 
  Shield,
  Eye,
  Target,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity
} from 'lucide-react';

interface DarkSideAnalysis {
  traitScores: Record<string, number>;
  darkSideRisk: {
    overallRisk: 'low' | 'moderate' | 'high' | 'critical';
    traitRisks: Record<string, any>;
    stressAmplification: number;
    compensatoryBehaviors: string[];
  };
  stressResponse: {
    currentStressLevel: number;
    teamImpact: 'positive' | 'neutral' | 'negative' | 'toxic';
    adaptiveCapacity: number;
    maladaptivePatterns: string[];
  };
  behavioralIndicators: {
    observedBehaviors: Record<string, any>;
    selfAwarenessGap: number;
    impactOnOthers: {
      teamMorale: number;
      productivity: number;
      turnoverRisk: number;
      stakeholderConfidence: number;
    };
  };
  interventionRecommendations: {
    immediateActions: any[];
    developmentGoals: any[];
    supportStructures: any;
    monitoringPlan: any;
  };
}

interface DarkSideDashboardProps {
  userId?: string;
  assessmentId?: string;
  onInterventionRequest?: (type: string, details: any) => void;
  className?: string;
}

export const DarkSideDashboard: React.FC<DarkSideDashboardProps> = ({
  userId,
  assessmentId,
  onInterventionRequest,
  className = ''
}) => {
  const [analysis, setAnalysis] = useState<DarkSideAnalysis | null>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'traits' | 'stress' | 'interventions'>('overview');

  useEffect(() => {
    if (assessmentId) {
      fetchDarkSideAnalysis();
    }
  }, [assessmentId]);

  const fetchDarkSideAnalysis = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/assessments/${assessmentId}/dark-side-analysis`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch dark side analysis');
      }

      const data = await response.json();
      setAnalysis(data.darkSideAnalysis);
      setInsights(data.insights || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'toxic': return 'bg-red-100 text-red-800';
      case 'negative': return 'bg-orange-100 text-orange-800';
      case 'neutral': return 'bg-yellow-100 text-yellow-800';
      case 'positive': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Risk Level Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-4 rounded-lg border-2 ${getRiskColor(analysis?.darkSideRisk.overallRisk || 'low')}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium">Overall Risk</h3>
              <p className="text-2xl font-bold capitalize">{analysis?.darkSideRisk.overallRisk}</p>
            </div>
            <AlertTriangle className="h-8 w-8" />
          </div>
        </div>

        <div className="p-4 rounded-lg border-2 border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600">Stress Level</h3>
              <p className="text-2xl font-bold text-gray-900">{analysis?.stressResponse.currentStressLevel}/10</p>
            </div>
            <Activity className="h-8 w-8 text-gray-600" />
          </div>
        </div>

        <div className={`p-4 rounded-lg border-2 ${getImpactColor(analysis?.stressResponse.teamImpact || 'neutral')}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium">Team Impact</h3>
              <p className="text-2xl font-bold capitalize">{analysis?.stressResponse.teamImpact}</p>
            </div>
            <Users className="h-8 w-8" />
          </div>
        </div>

        <div className="p-4 rounded-lg border-2 border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600">Self-Awareness Gap</h3>
              <p className="text-2xl font-bold text-gray-900">{analysis?.behavioralIndicators.selfAwarenessGap.toFixed(1)}</p>
            </div>
            <Eye className="h-8 w-8 text-gray-600" />
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Key Insights</h3>
        </div>
        <div className="p-6 space-y-4">
          {insights.slice(0, 3).map((insight, index) => (
            <div key={index} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
              <div className={`flex-shrink-0 w-2 h-2 mt-2 rounded-full ${
                insight.severity === 'critical' ? 'bg-red-500' :
                insight.severity === 'high' ? 'bg-orange-500' :
                insight.severity === 'moderate' ? 'bg-yellow-500' : 'bg-green-500'
              }`} />
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{insight.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team Impact Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(analysis?.behavioralIndicators.impactOnOthers || {}).map(([metric, value]) => (
          <div key={metric} className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-600 capitalize">
              {metric.replace(/([A-Z])/g, ' $1').toLowerCase()}
            </h4>
            <div className="mt-2 flex items-center">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    (value as number) >= 70 ? 'bg-green-500' :
                    (value as number) >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, value as number))}%` }}
                />
              </div>
              <span className="ml-2 text-sm font-semibold text-gray-900">
                {(value as number).toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTraitsTab = () => (
    <div className="space-y-6">
      <div className="grid gap-6">
        {Object.entries(analysis?.darkSideRisk.traitRisks || {}).map(([trait, risk]) => (
          <div key={trait} className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold capitalize">{trait}</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(risk.riskLevel)}`}>
                {risk.riskLevel} risk
              </span>
            </div>
            
            {risk.manifestationType !== 'none' && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Manifestation Type</h4>
                  <p className="text-sm text-gray-600 capitalize">
                    {risk.manifestationType.replace('_', ' ')}
                  </p>
                </div>
                
                {risk.primaryConcerns.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Primary Concerns</h4>
                    <ul className="space-y-1">
                      {risk.primaryConcerns.map((concern: string, index: number) => (
                        <li key={index} className="text-sm text-gray-600 flex items-start">
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0" />
                          {concern}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {risk.impactAreas.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Impact Areas</h4>
                    <ul className="space-y-1">
                      {risk.impactAreas.map((area: string, index: number) => (
                        <li key={index} className="text-sm text-gray-600 flex items-start">
                          <span className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-2 mr-2 flex-shrink-0" />
                          {area}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderStressTab = () => (
    <div className="space-y-6">
      {/* Stress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Current Stress Level</h3>
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-900 mb-2">
              {analysis?.stressResponse.currentStressLevel}/10
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full ${
                  (analysis?.stressResponse.currentStressLevel || 0) >= 8 ? 'bg-red-500' :
                  (analysis?.stressResponse.currentStressLevel || 0) >= 6 ? 'bg-orange-500' :
                  (analysis?.stressResponse.currentStressLevel || 0) >= 4 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${((analysis?.stressResponse.currentStressLevel || 0) / 10) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Adaptive Capacity</h3>
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-900 mb-2">
              {analysis?.stressResponse.adaptiveCapacity.toFixed(0)}%
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full ${
                  (analysis?.stressResponse.adaptiveCapacity || 0) >= 70 ? 'bg-green-500' :
                  (analysis?.stressResponse.adaptiveCapacity || 0) >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${analysis?.stressResponse.adaptiveCapacity || 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Stress Amplification</h3>
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-900 mb-2">
              {analysis?.darkSideRisk.stressAmplification.toFixed(1)}x
            </div>
            <p className="text-sm text-gray-600">Multiplier effect on dark side traits</p>
          </div>
        </div>
      </div>

      {/* Maladaptive Patterns */}
      {(analysis?.stressResponse.maladaptivePatterns.length || 0) > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Maladaptive Stress Patterns</h3>
          <div className="space-y-3">
            {analysis?.stressResponse.maladaptivePatterns.map((pattern, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-800">{pattern}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compensatory Behaviors */}
      {(analysis?.darkSideRisk.compensatoryBehaviors.length || 0) > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Compensatory Behaviors</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {analysis?.darkSideRisk.compensatoryBehaviors.map((behavior, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <Shield className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-yellow-800">{behavior}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderInterventionsTab = () => (
    <div className="space-y-6">
      {/* Immediate Actions */}
      {(analysis?.interventionRecommendations.immediateActions.length || 0) > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-red-500" />
            Immediate Actions Required
          </h3>
          <div className="space-y-4">
            {analysis?.interventionRecommendations.immediateActions.map((action, index) => (
              <div key={index} className="border border-red-200 rounded-lg p-4 bg-red-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-red-900">{action.action}</h4>
                    <p className="text-sm text-red-700 mt-1">
                      <span className="font-medium">Timeline:</span> {action.timeframe}
                    </p>
                    <p className="text-sm text-red-700">
                      <span className="font-medium">Priority:</span> {action.priority}
                    </p>
                  </div>
                  <button
                    onClick={() => onInterventionRequest?.('immediate', action)}
                    className="ml-4 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                  >
                    Take Action
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Development Goals */}
      {(analysis?.interventionRecommendations.developmentGoals.length || 0) > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Target className="h-5 w-5 mr-2 text-blue-500" />
            Development Goals
          </h3>
          <div className="space-y-4">
            {analysis?.interventionRecommendations.developmentGoals.map((goal, index) => (
              <div key={index} className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                <h4 className="font-medium text-blue-900 capitalize">{goal.trait} Development</h4>
                <p className="text-sm text-blue-800 mt-1">{goal.targetBehavior}</p>
                <div className="mt-3">
                  <p className="text-sm font-medium text-blue-900">Methods:</p>
                  <ul className="mt-1 space-y-1">
                    {goal.methods.map((method: string, methodIndex: number) => (
                      <li key={methodIndex} className="text-sm text-blue-700 flex items-start">
                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0" />
                        {method}
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="text-sm text-blue-700 mt-2">
                  <span className="font-medium">Timeline:</span> {goal.timeline}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Support Structures */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Users className="h-5 w-5 mr-2 text-green-500" />
          Recommended Support Structures
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(analysis?.interventionRecommendations.supportStructures || {}).map(([type, items]) => (
            <div key={type} className="space-y-2">
              <h4 className="font-medium text-gray-900 capitalize">{type}</h4>
              <ul className="space-y-1">
                {(items as string[]).map((item, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <XCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-800">Error loading dark side analysis: {error}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
            <span className="text-yellow-800">No dark side analysis available for this assessment.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Dark Side Analysis</h2>
        <p className="text-gray-600">Comprehensive assessment of personality derailers and trait extremes</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: Brain },
            { id: 'traits', label: 'Trait Analysis', icon: Target },
            { id: 'stress', label: 'Stress Response', icon: Activity },
            { id: 'interventions', label: 'Interventions', icon: Shield }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'traits' && renderTraitsTab()}
        {activeTab === 'stress' && renderStressTab()}
        {activeTab === 'interventions' && renderInterventionsTab()}
      </div>
    </div>
  );
};

export default DarkSideDashboard;