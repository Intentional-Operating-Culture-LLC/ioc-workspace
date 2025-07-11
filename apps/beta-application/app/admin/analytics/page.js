'use client';

import React, { useState, useEffect } from 'react';
import { RevenueChart } from "@ioc/shared/ui";

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');
  const [revenueData, setRevenueData] = useState([]);
  const [userGrowthData, setUserGrowthData] = useState([]);
  const [assessmentData, setAssessmentData] = useState([]);
  const [churnData, setChurnData] = useState({
    currentMonth: 2.5,
    previousMonth: 3.2,
    averageChurn: 2.8
  });

  useEffect(() => {
    // Simulate data loading
    setTimeout(() => {
      setRevenueData([
      { label: 'Jan', value: 165000 },
      { label: 'Feb', value: 172000 },
      { label: 'Mar', value: 168000 },
      { label: 'Apr', value: 175000 },
      { label: 'May', value: 182000 },
      { label: 'Jun', value: 186500 }]
      );

      setUserGrowthData([
      { label: 'Jan', value: 8500 },
      { label: 'Feb', value: 9200 },
      { label: 'Mar', value: 10100 },
      { label: 'Apr', value: 10800 },
      { label: 'May', value: 11600 },
      { label: 'Jun', value: 12458 }]
      );

      setAssessmentData([
      { label: 'Jan', value: 65 },
      { label: 'Feb', value: 68 },
      { label: 'Mar', value: 72 },
      { label: 'Apr', value: 74 },
      { label: 'May', value: 76 },
      { label: 'Jun', value: 78.5 }]
      );

      setLoading(false);
    }, 1000);
  }, [timeRange]);

  const UserGrowthChart = ({ data, loading }) => {
    if (loading) {
      return (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
          <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
        </div>);

    }

    const maxValue = Math.max(...data.map((d) => d.value));
    const chartHeight = 256;

    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">User Growth</h3>
        <div className="relative h-64">
          <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 pr-2">
            <span>{(maxValue / 1000).toFixed(1)}k</span>
            <span>{(maxValue * 0.75 / 1000).toFixed(1)}k</span>
            <span>{(maxValue * 0.5 / 1000).toFixed(1)}k</span>
            <span>{(maxValue * 0.25 / 1000).toFixed(1)}k</span>
            <span>0</span>
          </div>

          <div className="ml-12 h-full relative">
            <div className="absolute inset-0">
              {[0, 1, 2, 3, 4].map((i) =>
              <div
                key={i}
                className="absolute w-full border-t border-gray-200"
                style={{ top: `${i / 4 * 100}%` }} />

              )}
            </div>

            <div className="relative h-full flex items-end justify-between px-2">
              {data.map((item, index) => {
                const barHeight = item.value / maxValue * chartHeight;
                return (
                  <div
                    key={index}
                    className="relative group"
                    style={{ width: `${100 / data.length - 2}%` }}>

                    <div
                      className="bg-green-600 rounded-t hover:bg-green-700 transition-colors duration-200"
                      style={{ height: `${barHeight}px` }} />

                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                      {(item.value / 1000).toFixed(1)}k users
                    </div>
                    <div className="absolute top-full mt-1 text-xs text-gray-500 text-center w-full">
                      {item.label}
                    </div>
                  </div>);

              })}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
          <div>
            <p className="text-sm text-gray-600">Total Users</p>
            <p className="text-lg font-semibold text-gray-900">
              {(data[data.length - 1].value / 1000).toFixed(1)}k
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">New This Month</p>
            <p className="text-lg font-semibold text-gray-900">
              +{data[data.length - 1].value - data[data.length - 2].value}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Growth Rate</p>
            <p className="text-lg font-semibold text-green-600">+46.5%</p>
          </div>
        </div>
      </div>);

  };

  const AssessmentChart = ({ data, loading }) => {
    if (loading) {
      return (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
          <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
        </div>);

    }

    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Assessment Completion Trends</h3>
        <div className="relative h-64">
          <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 pr-2">
            <span>100%</span>
            <span>75%</span>
            <span>50%</span>
            <span>25%</span>
            <span>0%</span>
          </div>

          <div className="ml-12 h-full relative">
            <div className="absolute inset-0">
              {[0, 1, 2, 3, 4].map((i) =>
              <div
                key={i}
                className="absolute w-full border-t border-gray-200"
                style={{ top: `${i / 4 * 100}%` }} />

              )}
            </div>

            <svg className="w-full h-full">
              <polyline
                fill="none"
                stroke="#3B82F6"
                strokeWidth="3"
                points={data.map((item, index) => {
                  const x = index / (data.length - 1) * 100;
                  const y = 100 - item.value;
                  return `${x}%,${y}%`;
                }).join(' ')} />

              {data.map((item, index) => {
                const x = index / (data.length - 1) * 100;
                const y = 100 - item.value;
                return (
                  <circle
                    key={index}
                    cx={`${x}%`}
                    cy={`${y}%`}
                    r="4"
                    fill="#3B82F6"
                    className="hover:r-6 transition-all duration-200" />);


              })}
            </svg>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
          <div>
            <p className="text-sm text-gray-600">Current Rate</p>
            <p className="text-lg font-semibold text-gray-900">{data[data.length - 1].value}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Improvement</p>
            <p className="text-lg font-semibold text-green-600">
              +{(data[data.length - 1].value - data[0].value).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Target</p>
            <p className="text-lg font-semibold text-gray-900">85%</p>
          </div>
        </div>
      </div>);

  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <nav className="flex items-center text-sm text-gray-500 mb-2">
                <a href="/admin" className="hover:text-gray-700">Admin</a>
                <span className="mx-2">/</span>
                <span className="text-gray-900">Analytics</span>
              </nav>
              <h1 className="text-3xl font-bold text-gray-900">Business Analytics</h1>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setTimeRange('week')}
                className={`px-3 py-2 text-sm rounded-md ${
                timeRange === 'week' ?
                'bg-blue-600 text-white' :
                'bg-gray-200 text-gray-700 hover:bg-gray-300'}`
                }>

                Week
              </button>
              <button
                onClick={() => setTimeRange('month')}
                className={`px-3 py-2 text-sm rounded-md ${
                timeRange === 'month' ?
                'bg-blue-600 text-white' :
                'bg-gray-200 text-gray-700 hover:bg-gray-300'}`
                }>

                Month
              </button>
              <button
                onClick={() => setTimeRange('quarter')}
                className={`px-3 py-2 text-sm rounded-md ${
                timeRange === 'quarter' ?
                'bg-blue-600 text-white' :
                'bg-gray-200 text-gray-700 hover:bg-gray-300'}`
                }>

                Quarter
              </button>
              <button
                onClick={() => setTimeRange('year')}
                className={`px-3 py-2 text-sm rounded-md ${
                timeRange === 'year' ?
                'bg-blue-600 text-white' :
                'bg-gray-200 text-gray-700 hover:bg-gray-300'}`
                }>

                Year
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wider mb-2">Revenue Growth</h3>
            <p className="text-3xl font-bold text-gray-900">+22.7%</p>
            <p className="text-sm text-gray-500 mt-1">vs last {timeRange}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wider mb-2">User Growth</h3>
            <p className="text-3xl font-bold text-gray-900">+46.5%</p>
            <p className="text-sm text-gray-500 mt-1">vs last {timeRange}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wider mb-2">Avg Revenue/User</h3>
            <p className="text-3xl font-bold text-gray-900">$14.97</p>
            <p className="text-sm text-green-600 mt-1">↑ $2.30</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wider mb-2">LTV:CAC Ratio</h3>
            <p className="text-3xl font-bold text-gray-900">3.2:1</p>
            <p className="text-sm text-green-600 mt-1">Healthy</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <RevenueChart data={revenueData} loading={loading} />
          <UserGrowthChart data={userGrowthData} loading={loading} />
          <AssessmentChart data={assessmentData} loading={loading} />
          
          {/* Churn Analysis */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Churn Analysis</h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Current Month Churn</span>
                  <span className="text-sm font-semibold">{churnData.currentMonth}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${churnData.currentMonth * 10}%` }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Previous Month Churn</span>
                  <span className="text-sm font-semibold">{churnData.previousMonth}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-gray-500 h-2 rounded-full" style={{ width: `${churnData.previousMonth * 10}%` }}></div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Improvement</p>
                    <p className="text-lg font-semibold text-green-600">
                      -{(churnData.previousMonth - churnData.currentMonth).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">6-Month Average</p>
                    <p className="text-lg font-semibold text-gray-900">{churnData.averageChurn}%</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                <span className="font-semibold">Good news!</span> Churn rate has decreased by 21.9% compared to last month.
              </p>
            </div>
          </div>
        </div>

        {/* Cohort Analysis Table */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cohort Retention Analysis</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cohort</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Month 1</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Month 2</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Month 3</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Month 4</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Month 5</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Month 6</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Jan 2024</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">100%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">92%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">87%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">84%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">82%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">80%</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Feb 2024</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">100%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">94%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">89%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">86%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">84%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">-</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Mar 2024</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">100%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">95%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">91%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">88%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">-</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>);

}