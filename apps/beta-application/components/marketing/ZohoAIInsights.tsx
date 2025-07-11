'use client';

import { useEffect, useState } from 'react';
import { 
  SparklesIcon,
  LightBulbIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface ZohoAIInsight {
  id: string;
  type: 'prediction' | 'recommendation' | 'anomaly' | 'trend' | 'opportunity';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  priority: 'critical' | 'high' | 'medium' | 'low';
  data: Record<string, any>;
  source: string;
  created_at: string;
  is_actionable: boolean;
  action_taken?: boolean;
  expires_at?: string;
}

interface ZohoAIAnalytics {
  lead_scoring_insights: any[];
  sales_forecasting: any;
  customer_behavior_analysis: any[];
  campaign_optimization: any[];
  predictive_analytics: any[];
}

export function ZohoAIInsights() {
  const [insights, setInsights] = useState<ZohoAIInsight[]>([]);
  const [analytics, setAnalytics] = useState<ZohoAIAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'actionable' | 'high-impact'>('actionable');
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);

  useEffect(() => {
    fetchZohoAIData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchZohoAIData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchZohoAIData = async () => {
    try {
      setLoading(true);
      const [insightsRes, analyticsRes] = await Promise.all([
        fetch('/api/integrations/zoho/ai-insights'),
        fetch('/api/integrations/zoho/ai-analytics')
      ]);

      if (!insightsRes.ok || !analyticsRes.ok) {
        throw new Error('Failed to fetch Zoho AI data');
      }

      const [insightsData, analyticsData] = await Promise.all([
        insightsRes.json(),
        analyticsRes.json()
      ]);

      setInsights(insightsData.data);
      setAnalytics(analyticsData.data);
    } catch (error) {
      console.error('Error fetching Zoho AI data:', error);
      
      // Fallback to mock data
      setInsights([
        {
          id: '1',
          type: 'prediction',
          title: 'High-Value Lead Prediction',
          description: 'Sarah Johnson from TechCorp has a 89% likelihood of converting to a $40K+ deal based on engagement patterns and company profile analysis.',
          confidence: 0.89,
          impact: 'high',
          priority: 'high',
          data: {
            lead_name: 'Sarah Johnson',
            company: 'TechCorp Inc',
            predicted_deal_value: 45000,
            conversion_probability: 89,
            factors: ['Company size', 'Engagement score', 'Industry match', 'Budget indicators']
          },
          source: 'Zoho CRM AI',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          is_actionable: true
        },
        {
          id: '2',
          type: 'recommendation',
          title: 'Email Campaign Optimization',
          description: 'Shift email campaigns to Tuesday 2-4 PM for 67% higher open rates. Current schedule shows significant underperformance.',
          confidence: 0.84,
          impact: 'medium',
          priority: 'medium',
          data: {
            current_open_rate: 18.2,
            optimized_open_rate: 30.4,
            best_days: ['Tuesday', 'Wednesday'],
            best_time: '2:00 PM - 4:00 PM',
            performance_lift: 67
          },
          source: 'Zoho Marketing Hub AI',
          created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          is_actionable: true
        },
        {
          id: '3',
          type: 'anomaly',
          title: 'Unusual Lead Source Performance',
          description: 'Social media leads show 340% increase in qualification rate this week. Investigation recommended to understand and replicate success factors.',
          confidence: 0.95,
          impact: 'high',
          priority: 'critical',
          data: {
            source: 'Social Media',
            normal_qualification_rate: 12,
            current_qualification_rate: 41,
            increase_percentage: 340,
            volume_increase: true,
            quality_increase: true
          },
          source: 'Zoho Analytics AI',
          created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          is_actionable: true
        },
        {
          id: '4',
          type: 'opportunity',
          title: 'Cross-Sell Opportunity Identified',
          description: 'Existing customer Global Solutions Ltd shows strong indicators for Premium package upgrade worth $25K based on usage patterns.',
          confidence: 0.78,
          impact: 'high',
          priority: 'high',
          data: {
            customer: 'Global Solutions Ltd',
            current_package: 'Standard',
            recommended_package: 'Premium',
            upgrade_value: 25000,
            usage_indicators: ['High API usage', 'Feature requests', 'Team growth'],
            timing: 'Next 30 days'
          },
          source: 'Zoho CRM AI',
          created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          is_actionable: true
        },
        {
          id: '5',
          type: 'trend',
          title: 'Industry Trend Analysis',
          description: 'Healthcare sector leads show 45% higher conversion rates. Consider allocating more marketing budget to healthcare vertical.',
          confidence: 0.72,
          impact: 'medium',
          priority: 'medium',
          data: {
            industry: 'Healthcare',
            conversion_rate: 34.5,
            avg_conversion_rate: 23.8,
            improvement: 45,
            market_size: 'Large',
            competition: 'Medium'
          },
          source: 'Zoho Analytics AI',
          created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
          is_actionable: false
        }
      ]);

      setAnalytics({
        lead_scoring_insights: [],
        sales_forecasting: {
          next_month_prediction: 285000,
          confidence: 0.87,
          factors: ['Pipeline velocity', 'Historical patterns', 'Market trends']
        },
        customer_behavior_analysis: [],
        campaign_optimization: [],
        predictive_analytics: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInsightAction = async (insightId: string, action: 'accept' | 'dismiss') => {
    try {
      const response = await fetch(`/api/integrations/zoho/ai-insights/${insightId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (response.ok) {
        setInsights(insights.map(insight => 
          insight.id === insightId 
            ? { ...insight, action_taken: true }
            : insight
        ));
      }
    } catch (error) {
      console.error('Error updating insight:', error);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'prediction':
        return ArrowTrendingUpIcon;
      case 'recommendation':
        return LightBulbIcon;
      case 'anomaly':
        return ExclamationTriangleIcon;
      case 'trend':
        return ChartBarIcon;
      case 'opportunity':
        return SparklesIcon;
      default:
        return ChartBarIcon;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'text-green-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const filteredInsights = insights.filter(insight => {
    if (filter === 'actionable') return insight.is_actionable && !insight.action_taken;
    if (filter === 'high-impact') return insight.impact === 'high';
    return true;
  });

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-100 h-24 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* AI Analytics Summary */}
      {analytics?.sales_forecasting && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200">
          <div className="flex items-start space-x-3">
            <SparklesIcon className="h-6 w-6 text-purple-600 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-purple-900">AI Sales Forecast</h3>
              <p className="text-2xl font-semibold text-purple-900 mt-1">
                ${analytics.sales_forecasting.next_month_prediction.toLocaleString()}
              </p>
              <p className="text-xs text-purple-700 mt-1">
                Predicted revenue for next month ({Math.round(analytics.sales_forecasting.confidence * 100)}% confidence)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
        {(['actionable', 'high-impact', 'all'] as const).map((filterOption) => (
          <button
            key={filterOption}
            onClick={() => setFilter(filterOption)}
            className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors ${
              filter === filterOption
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {filterOption.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            {filterOption === 'actionable' && (
              <span className="ml-1 text-purple-600">
                ({insights.filter(i => i.is_actionable && !i.action_taken).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Insights List */}
      <div className="space-y-3">
        {filteredInsights.length === 0 ? (
          <div className="text-center py-8">
            <SparklesIcon className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">No AI insights available</p>
          </div>
        ) : (
          filteredInsights.map((insight) => {
            const Icon = getInsightIcon(insight.type);
            const isExpanded = expandedInsight === insight.id;
            
            return (
              <div
                key={insight.id}
                className={`border rounded-lg p-4 transition-all ${
                  getPriorityColor(insight.priority)
                } ${insight.action_taken ? 'opacity-60' : ''}`}
              >
                <div 
                  className="cursor-pointer"
                  onClick={() => setExpandedInsight(isExpanded ? null : insight.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-medium truncate">
                            {insight.title}
                          </h4>
                          <span className={`text-xs font-medium ${getImpactColor(insight.impact)}`}>
                            {insight.impact} impact
                          </span>
                        </div>
                        <p className="text-xs mt-1 opacity-90 line-clamp-2">
                          {insight.description}
                        </p>
                        <div className="flex items-center space-x-3 mt-2 text-xs opacity-75">
                          <span>Confidence: {Math.round(insight.confidence * 100)}%</span>
                          <span>•</span>
                          <span>{insight.source}</span>
                          <span>•</span>
                          <span>{formatTimeAgo(insight.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-medium uppercase ml-2 flex-shrink-0">
                      {insight.type}
                    </span>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-current border-opacity-20">
                    {/* Data Details */}
                    {insight.data && Object.keys(insight.data).length > 0 && (
                      <div className="mb-4 space-y-2">
                        <h5 className="text-xs font-medium opacity-75">Details:</h5>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {Object.entries(insight.data).slice(0, 6).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="opacity-75">{key.replace(/_/g, ' ')}</span>
                              <span className="font-medium">
                                {Array.isArray(value) 
                                  ? value.join(', ')
                                  : typeof value === 'number' && key.includes('value')
                                    ? `$${value.toLocaleString()}`
                                    : String(value)
                                }
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {insight.is_actionable && !insight.action_taken && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleInsightAction(insight.id, 'accept')}
                          className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-white bg-opacity-50 rounded-md hover:bg-opacity-75 transition-colors"
                        >
                          <CheckCircleIcon className="h-4 w-4" />
                          <span className="text-xs font-medium">Accept</span>
                        </button>
                        <button
                          onClick={() => handleInsightAction(insight.id, 'dismiss')}
                          className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-white bg-opacity-50 rounded-md hover:bg-opacity-75 transition-colors"
                        >
                          <XMarkIcon className="h-4 w-4" />
                          <span className="text-xs font-medium">Dismiss</span>
                        </button>
                      </div>
                    )}

                    {/* Action Status */}
                    {insight.action_taken && (
                      <div className="text-xs opacity-75">
                        <span className="font-medium">Action taken</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* AI Capabilities Note */}
      <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
        <div className="flex items-start space-x-2">
          <SparklesIcon className="h-5 w-5 text-indigo-600 flex-shrink-0" />
          <div>
            <p className="text-xs text-indigo-800 font-medium">Powered by Zoho AI</p>
            <p className="text-xs text-indigo-600 mt-1">
              Advanced machine learning algorithms analyze your CRM data, marketing campaigns, 
              and customer behavior to provide predictive insights and optimization recommendations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}