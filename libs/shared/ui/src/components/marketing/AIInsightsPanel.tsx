'use client';
import { useEffect, useState } from 'react';
import { AIInsight, InsightPriority } from "@ioc/shared/types";
import { LightBulbIcon, ChartBarIcon, ExclamationTriangleIcon, ArrowTrendingUpIcon as TrendingUpIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/solid';
const priorityColors: Record<InsightPriority, string> = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-blue-100 text-blue-800 border-blue-200',
    informational: 'bg-gray-100 text-gray-800 border-gray-200',
};
const insightIcons = {
    prediction: TrendingUpIcon,
    anomaly: ExclamationTriangleIcon,
    recommendation: LightBulbIcon,
    trend: ChartBarIcon,
};
export function AIInsightsPanel() {
    const [insights, setInsights] = useState<AIInsight[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'actionable' | 'acted'>('actionable');
    const [expandedInsight, setExpandedInsight] = useState<string | null>(null);
    useEffect(() => {
        fetchInsights();
        // Refresh insights every minute
        const interval = setInterval(fetchInsights, 60000);
        return () => clearInterval(interval);
    }, []);
    const fetchInsights = async () => {
        try {
            const response = await fetch('/api/marketing/insights');
            if (!response.ok)
                throw new Error('Failed to fetch insights');
            const data = await response.json();
            setInsights(data.data);
        }
        catch (error) {
            console.error('Error fetching insights:', error);
        }
        finally {
            setLoading(false);
        }
    };
    const handleAction = async (insightId: string, action: 'accept' | 'dismiss') => {
        try {
            const response = await fetch(`/api/marketing/insights/${insightId}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action }),
            });
            if (response.ok) {
                // Update local state
                setInsights(insights.map(insight => insight.id === insightId
                    ? { ...insight, action_taken: true, action_details: { action, timestamp: new Date().toISOString() } }
                    : insight));
            }
        }
        catch (error) {
            console.error('Error updating insight:', error);
        }
    };
    const filteredInsights = insights.filter(insight => {
        if (filter === 'actionable')
            return insight.is_actionable && !insight.action_taken;
        if (filter === 'acted')
            return insight.action_taken;
        return true;
    });
    const formatConfidence = (score?: number) => {
        if (!score)
            return null;
        const percentage = Math.round(score * 100);
        return (<div className="flex items-center space-x-1">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${percentage}%` }}/>
        </div>
        <span className="text-xs text-gray-600">{percentage}%</span>
      </div>);
    };
    if (loading) {
        return (<div className="space-y-3">
        {[1, 2, 3].map((i) => (<div key={i} className="animate-pulse">
            <div className="bg-gray-100 h-20 rounded-lg"></div>
          </div>))}
      </div>);
    }
    return (<div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
        {['actionable', 'acted', 'all'].map((filterOption) => (<button key={filterOption} onClick={() => setFilter(filterOption as any)} className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors ${filter === filterOption
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'}`}>
            {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
            {filterOption === 'actionable' && (<span className="ml-1 text-indigo-600">
                ({insights.filter(i => i.is_actionable && !i.action_taken).length})
              </span>)}
          </button>))}
      </div>

      {/* Insights List */}
      <div className="space-y-3">
        {filteredInsights.length === 0 ? (<div className="text-center py-8">
            <SparklesIcon className="mx-auto h-8 w-8 text-gray-400"/>
            <p className="mt-2 text-sm text-gray-500">No insights available</p>
          </div>) : (filteredInsights.map((insight) => {
            const Icon = insightIcons[insight.insight_type];
            const isExpanded = expandedInsight === insight.id;
            return (<div key={insight.id} className={`border rounded-lg p-4 transition-all ${priorityColors[insight.priority]} ${insight.action_taken ? 'opacity-75' : ''}`}>
                <div className="cursor-pointer" onClick={() => setExpandedInsight(isExpanded ? null : insight.id)}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <Icon className="h-5 w-5 mt-0.5 flex-shrink-0"/>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium truncate pr-2">
                          {insight.title}
                        </h4>
                        <p className="text-xs mt-1 opacity-90">
                          {insight.description}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-medium uppercase ml-2 flex-shrink-0">
                      {insight.priority}
                    </span>
                  </div>

                  {/* Confidence Score */}
                  {insight.confidence_score && (<div className="mt-2">
                      <p className="text-xs opacity-75 mb-1">Confidence</p>
                      {formatConfidence(insight.confidence_score)}
                    </div>)}
                </div>

                {/* Expanded Content */}
                {isExpanded && (<div className="mt-4 pt-4 border-t border-current border-opacity-20">
                    {/* Additional Data */}
                    {insight.data && Object.keys(insight.data).length > 0 && (<div className="mb-4 space-y-2">
                        {Object.entries(insight.data).map(([key, value]) => (<div key={key} className="flex justify-between text-xs">
                            <span className="opacity-75">{key.replace(/_/g, ' ')}</span>
                            <span className="font-medium">
                              {typeof value === 'number'
                                ? value.toLocaleString()
                                : String(value)}
                            </span>
                          </div>))}
                      </div>)}

                    {/* Actions */}
                    {insight.is_actionable && !insight.action_taken && (<div className="flex space-x-2">
                        <button onClick={() => handleAction(insight.id, 'accept')} className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-white bg-opacity-50 rounded-md hover:bg-opacity-75 transition-colors">
                          <CheckCircleIcon className="h-4 w-4"/>
                          <span className="text-xs font-medium">Apply</span>
                        </button>
                        <button onClick={() => handleAction(insight.id, 'dismiss')} className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-white bg-opacity-50 rounded-md hover:bg-opacity-75 transition-colors">
                          <XMarkIcon className="h-4 w-4"/>
                          <span className="text-xs font-medium">Dismiss</span>
                        </button>
                      </div>)}

                    {/* Action Status */}
                    {insight.action_taken && insight.action_details && (<div className="text-xs opacity-75">
                        <span className="font-medium">
                          {insight.action_details.action === 'accept' ? 'Applied' : 'Dismissed'}
                        </span>
                        {' at '}
                        {new Date(insight.action_details.timestamp).toLocaleString()}
                      </div>)}

                    {/* Expiry */}
                    {insight.expires_at && (<div className="mt-2 text-xs opacity-75">
                        Expires: {new Date(insight.expires_at).toLocaleDateString()}
                      </div>)}
                  </div>)}
              </div>);
        }))}
      </div>

      {/* AI Learning Note */}
      <div className="mt-4 p-3 bg-indigo-50 rounded-lg">
        <div className="flex items-start space-x-2">
          <SparklesIcon className="h-5 w-5 text-indigo-600 flex-shrink-0"/>
          <div>
            <p className="text-xs text-indigo-800 font-medium">AI Learning</p>
            <p className="text-xs text-indigo-600 mt-1">
              The AI continuously learns from your campaign performance and user behavior to provide better insights.
            </p>
          </div>
        </div>
      </div>
    </div>);
}
