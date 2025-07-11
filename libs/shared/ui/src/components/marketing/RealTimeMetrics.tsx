'use client';
import { useEffect, useState, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, LineElement, PointElement, LinearScale, Title, Tooltip, Filler, ChartOptions, } from 'chart.js';
import { TimeSeriesData, MetricType } from "@ioc/shared/types";
ChartJS.register(LineElement, PointElement, LinearScale, Title, Tooltip, Filler);
interface RealTimeMetric {
    type: MetricType;
    current: number;
    previous: number;
    trend: TimeSeriesData[];
}
export function RealTimeMetrics() {
    const [metrics, setMetrics] = useState<RealTimeMetric[]>([]);
    const [selectedMetric, setSelectedMetric] = useState<MetricType>('impression');
    const [isLive, setIsLive] = useState(true);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    useEffect(() => {
        fetchInitialData();
        if (isLive) {
            intervalRef.current = setInterval(fetchRealTimeUpdate, 5000); // Update every 5 seconds
        }
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isLive]);
    const fetchInitialData = async () => {
        try {
            const response = await fetch('/api/marketing/metrics/realtime');
            if (!response.ok)
                throw new Error('Failed to fetch real-time data');
            const data = await response.json();
            setMetrics(data.data);
        }
        catch (error) {
            console.error('Error fetching real-time data:', error);
        }
    };
    const fetchRealTimeUpdate = async () => {
        try {
            const response = await fetch('/api/marketing/metrics/realtime/update');
            if (!response.ok)
                throw new Error('Failed to fetch update');
            const data = await response.json();
            setMetrics(data.data);
        }
        catch (error) {
            console.error('Error fetching update:', error);
        }
    };
    const selectedMetricData = metrics.find(m => m.type === selectedMetric);
    const chartData = {
        labels: selectedMetricData?.trend.map(d => {
            const date = new Date(d.timestamp);
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        }) || [],
        datasets: [
            {
                label: selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1),
                data: selectedMetricData?.trend.map(d => d.value) || [],
                borderColor: '#6366F1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4,
            },
        ],
    };
    const chartOptions: ChartOptions<'line'> = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            intersect: false,
            mode: 'index',
        },
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#fff',
                bodyColor: '#fff',
                borderColor: '#6366F1',
                borderWidth: 1,
                padding: 10,
                displayColors: false,
            },
        },
        scales: {
            x: {
                display: true,
                grid: {
                    display: false,
                },
            },
            y: {
                display: true,
                beginAtZero: true,
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)',
                },
            },
        },
    };
    const metricIcons: Record<MetricType, string> = {
        impression: '👁️',
        click: '👆',
        conversion: '🎯',
        engagement: '💬',
        revenue: '💰',
        cost: '💸',
    };
    const formatValue = (value: number, type: MetricType) => {
        if (type === 'revenue' || type === 'cost') {
            return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        }
        if (type === 'engagement') {
            return `${value.toFixed(2)}%`;
        }
        return value.toLocaleString();
    };
    const calculateChange = (current: number, previous: number) => {
        if (previous === 0)
            return 0;
        return ((current - previous) / previous) * 100;
    };
    return (<div className="space-y-4">
      {/* Live Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`h-2 w-2 rounded-full ${isLive ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}/>
          <span className="text-sm text-gray-600">{isLive ? 'Live' : 'Paused'}</span>
        </div>
        <button onClick={() => setIsLive(!isLive)} className="text-sm text-indigo-600 hover:text-indigo-500">
          {isLive ? 'Pause' : 'Resume'}
        </button>
      </div>

      {/* Metric Selector */}
      <div className="grid grid-cols-3 gap-2">
        {metrics.map((metric) => {
            const change = calculateChange(metric.current, metric.previous);
            const isSelected = metric.type === selectedMetric;
            return (<button key={metric.type} onClick={() => setSelectedMetric(metric.type)} className={`p-3 rounded-lg border text-left transition-all ${isSelected
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-lg">{metricIcons[metric.type]}</span>
                <span className={`text-xs font-medium ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                  {change > 0 ? '+' : ''}{change.toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-gray-500 capitalize">{metric.type}</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatValue(metric.current, metric.type)}
              </p>
            </button>);
        })}
      </div>

      {/* Real-time Chart */}
      {selectedMetricData && (<div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Last 30 Minutes
          </h4>
          <div className="h-40">
            <Line data={chartData} options={chartOptions}/>
          </div>
        </div>)}

      {/* Quick Stats */}
      <div className="bg-blue-50 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-blue-600 font-medium">Peak Today</p>
            <p className="text-sm font-semibold text-blue-900">
              {selectedMetricData && formatValue(Math.max(...selectedMetricData.trend.map(d => d.value)), selectedMetric)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-blue-600 font-medium">Average</p>
            <p className="text-sm font-semibold text-blue-900">
              {selectedMetricData && formatValue(selectedMetricData.trend.reduce((sum, d) => sum + d.value, 0) / selectedMetricData.trend.length, selectedMetric)}
            </p>
          </div>
        </div>
      </div>
    </div>);
}
