'use client';
import { useEffect, useState } from 'react';
import { CampaignPerformance, ChannelType } from "@ioc/shared/types";
import { ChartBarIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/20/solid';
const channelIcons: Record<ChannelType, string> = {
    email: '✉️',
    social: '👥',
    search: '🔍',
    display: '🖼️',
    video: '🎥',
    affiliate: '🤝',
    direct: '🎯',
};
const statusColors = {
    active: 'bg-green-100 text-green-800',
    paused: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-gray-100 text-gray-800',
    draft: 'bg-blue-100 text-blue-800',
    scheduled: 'bg-purple-100 text-purple-800',
    archived: 'bg-gray-100 text-gray-600',
};
export function CampaignPerformanceList() {
    const [campaigns, setCampaigns] = useState<CampaignPerformance[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
    useEffect(() => {
        fetchCampaigns();
    }, []);
    const fetchCampaigns = async () => {
        try {
            const response = await fetch('/api/marketing/campaigns/performance');
            if (!response.ok)
                throw new Error('Failed to fetch campaigns');
            const data = await response.json();
            setCampaigns(data.data);
        }
        catch (error) {
            console.error('Error fetching campaigns:', error);
        }
        finally {
            setLoading(false);
        }
    };
    const formatCurrency = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formatPercentage = (value: number) => `${value.toFixed(2)}%`;
    if (loading) {
        return (<div className="space-y-4">
        {[1, 2, 3].map((i) => (<div key={i} className="animate-pulse">
            <div className="bg-gray-100 h-24 rounded-lg"></div>
          </div>))}
      </div>);
    }
    return (<div className="space-y-4">
      {campaigns.length === 0 ? (<div className="text-center py-12">
          <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400"/>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No campaigns</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new campaign.</p>
          <div className="mt-6">
            <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
              New Campaign
            </button>
          </div>
        </div>) : (campaigns.map((campaign) => (<div key={campaign.campaign_id} className={`border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${selectedCampaign === campaign.campaign_id ? 'border-indigo-500 shadow-md' : 'border-gray-200'}`} onClick={() => setSelectedCampaign(campaign.campaign_id)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-2xl">{channelIcons[campaign.channel]}</div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{campaign.campaign_name}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[campaign.status]}`}>
                      {campaign.status}
                    </span>
                    <span className="text-sm text-gray-500">{campaign.channel}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {campaign.trend === 'up' ? (<ArrowTrendingUpIcon className="h-5 w-5 text-green-500"/>) : campaign.trend === 'down' ? (<ArrowTrendingDownIcon className="h-5 w-5 text-red-500"/>) : null}
                <span className={`text-sm font-medium ${campaign.trend === 'up' ? 'text-green-600' :
                campaign.trend === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
                  {campaign.trend_percentage > 0 ? '+' : ''}{campaign.trend_percentage.toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500">Revenue</p>
                <p className="text-sm font-semibold text-gray-900">{formatCurrency(campaign.revenue)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Spend</p>
                <p className="text-sm font-semibold text-gray-900">{formatCurrency(campaign.cost)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">ROI</p>
                <p className="text-sm font-semibold text-gray-900">{formatPercentage(campaign.roi)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Conversions</p>
                <p className="text-sm font-semibold text-gray-900">{campaign.conversions.toLocaleString()}</p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-4 text-xs">
              <div>
                <p className="text-gray-500">Impressions</p>
                <p className="font-medium text-gray-700">{campaign.impressions.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500">CTR</p>
                <p className="font-medium text-gray-700">{formatPercentage(campaign.ctr)}</p>
              </div>
              <div>
                <p className="text-gray-500">Conv. Rate</p>
                <p className="font-medium text-gray-700">{formatPercentage(campaign.conversion_rate)}</p>
              </div>
            </div>

            {selectedCampaign === campaign.campaign_id && (<div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <button className="text-sm text-indigo-600 hover:text-indigo-500">
                    View Details →
                  </button>
                  <div className="space-x-2">
                    <button className="text-sm text-gray-600 hover:text-gray-500">
                      Edit
                    </button>
                    <button className="text-sm text-gray-600 hover:text-gray-500">
                      Duplicate
                    </button>
                    {campaign.status === 'active' ? (<button className="text-sm text-yellow-600 hover:text-yellow-500">
                        Pause
                      </button>) : campaign.status === 'paused' ? (<button className="text-sm text-green-600 hover:text-green-500">
                        Resume
                      </button>) : null}
                  </div>
                </div>
              </div>)}
          </div>)))}
    </div>);
}
