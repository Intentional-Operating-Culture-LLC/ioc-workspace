'use client';
import { useEffect, useState } from 'react';
import { AttributionData, ChartData } from "@ioc/shared/types/marketing";
import { Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend, ChartOptions, } from 'chart.js';
ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);
export function AttributionAnalysis() {
    const [attributionData, setAttributionData] = useState<AttributionData[]>([]);
    const [selectedModel, setSelectedModel] = useState<'linear' | 'first_touch' | 'last_touch' | 'time_decay'>('linear');
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        fetchAttributionData();
    }, []);
    const fetchAttributionData = async () => {
        try {
            const response = await fetch('/api/marketing/attribution');
            if (!response.ok)
                throw new Error('Failed to fetch attribution data');
            const data = await response.json();
            setAttributionData(data.data);
        }
        catch (error) {
            console.error('Error fetching attribution data:', error);
        }
        finally {
            setLoading(false);
        }
    };
    const getAttributionValue = (data: AttributionData) => {
        switch (selectedModel) {
            case 'first_touch':
                return data.first_touch_conversions;
            case 'last_touch':
                return data.last_touch_conversions;
            case 'time_decay':
                return data.time_decay_attribution_value;
            default:
                return data.linear_attribution_value;
        }
    };
    const channelColors = {
        email: '#8B5CF6',
        social: '#3B82F6',
        search: '#10B981',
        display: '#F59E0B',
        video: '#EF4444',
        affiliate: '#6366F1',
        direct: '#14B8A6',
    };
    const doughnutData: ChartData = {
        labels: attributionData.map(d => d.channel),
        datasets: [
            {
                label: 'Channel Attribution',
                data: attributionData.map(d => getAttributionValue(d)),
                backgroundColor: attributionData.map(d => channelColors[d.channel]),
                borderWidth: 0,
            },
        ],
    };
    const barData: ChartData = {
        labels: attributionData.map(d => d.channel),
        datasets: [
            {
                label: 'Revenue Attribution',
                data: attributionData.map(d => d.attributed_revenue),
                backgroundColor: '#6366F1',
            },
        ],
    };
    const doughnutOptions: ChartOptions<'doughnut'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    padding: 15,
                    font: {
                        size: 12,
                    },
                },
            },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        const value = context.parsed;
                        const total = context.dataset.data.reduce((a, b) => (a as number) + (b as number), 0) as number;
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${context.label}: ${value} (${percentage}%)`;
                    },
                },
            },
        },
    };
    const barOptions: ChartOptions<'bar'> = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: (value) => `$${value.toLocaleString()}`,
                },
            },
        },
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                callbacks: {
                    label: (context) => `Revenue: $${context.parsed.y.toLocaleString()}`,
                },
            },
        },
    };
    if (loading) {
        return (<div className="animate-pulse">
        <div className="h-64 bg-gray-100 rounded-lg"></div>
      </div>);
    }
    return (<div className="space-y-6">
      {/* Attribution Model Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Attribution Model</h3>
        <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value as any)} className="mt-1 block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
          <option value="linear">Linear Attribution</option>
          <option value="first_touch">First Touch</option>
          <option value="last_touch">Last Touch</option>
          <option value="time_decay">Time Decay</option>
        </select>
      </div>

      {/* Attribution Pie Chart */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-4">Channel Contribution</h4>
        <div className="h-64">
          <Doughnut data={doughnutData} options={doughnutOptions}/>
        </div>
      </div>

      {/* Revenue by Channel Bar Chart */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-4">Revenue by Channel</h4>
        <div className="h-48">
          <Bar data={barData} options={barOptions}/>
        </div>
      </div>

      {/* Channel Details Table */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Channel Details</h4>
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Channel
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Touchpoints
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conversions
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attributionData.map((data) => (<tr key={data.channel}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: channelColors[data.channel] }}/>
                      {data.channel}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">
                    {data.touchpoints.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">
                    {data.attributed_conversions.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                    ${data.attributed_revenue.toLocaleString()}
                  </td>
                </tr>))}
            </tbody>
          </table>
        </div>
      </div>
    </div>);
}
