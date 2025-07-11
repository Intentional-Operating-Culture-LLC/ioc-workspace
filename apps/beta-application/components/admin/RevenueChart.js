'use client';

import React, { useState } from 'react';

const RevenueChart = ({ data, loading = false }) => {
  const [timeRange, setTimeRange] = useState('month');
  
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="h-8 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
        <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
      </div>
    );
  }

  // Calculate max value for scaling
  const maxValue = Math.max(...data.map(d => d.value));
  const chartHeight = 256; // 16rem = 256px

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Revenue Overview</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setTimeRange('week')}
            className={`px-3 py-1 text-sm rounded-md ${
              timeRange === 'week' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`px-3 py-1 text-sm rounded-md ${
              timeRange === 'month' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setTimeRange('year')}
            className={`px-3 py-1 text-sm rounded-md ${
              timeRange === 'year' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Year
          </button>
        </div>
      </div>

      <div className="relative h-64">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 pr-2">
          <span>${(maxValue / 1000).toFixed(0)}k</span>
          <span>${(maxValue * 0.75 / 1000).toFixed(0)}k</span>
          <span>${(maxValue * 0.5 / 1000).toFixed(0)}k</span>
          <span>${(maxValue * 0.25 / 1000).toFixed(0)}k</span>
          <span>$0</span>
        </div>

        {/* Chart area */}
        <div className="ml-12 h-full relative">
          {/* Grid lines */}
          <div className="absolute inset-0">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="absolute w-full border-t border-gray-200"
                style={{ top: `${(i / 4) * 100}%` }}
              />
            ))}
          </div>

          {/* Bars */}
          <div className="relative h-full flex items-end justify-between px-2">
            {data.map((item, index) => {
              const barHeight = (item.value / maxValue) * chartHeight;
              return (
                <div
                  key={index}
                  className="relative group"
                  style={{ width: `${100 / data.length - 2}%` }}
                >
                  <div
                    className="bg-blue-600 rounded-t hover:bg-blue-700 transition-colors duration-200"
                    style={{ height: `${barHeight}px` }}
                  />
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                    ${(item.value / 1000).toFixed(1)}k
                  </div>
                  {/* X-axis label */}
                  <div className="absolute top-full mt-1 text-xs text-gray-500 text-center w-full">
                    {item.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="mt-6 grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
        <div>
          <p className="text-sm text-gray-600">Total Revenue</p>
          <p className="text-lg font-semibold text-gray-900">
            ${(data.reduce((sum, item) => sum + item.value, 0) / 1000).toFixed(1)}k
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Average</p>
          <p className="text-lg font-semibold text-gray-900">
            ${(data.reduce((sum, item) => sum + item.value, 0) / data.length / 1000).toFixed(1)}k
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Growth</p>
          <p className="text-lg font-semibold text-green-600">+12.5%</p>
        </div>
      </div>
    </div>
  );
};

export default RevenueChart;