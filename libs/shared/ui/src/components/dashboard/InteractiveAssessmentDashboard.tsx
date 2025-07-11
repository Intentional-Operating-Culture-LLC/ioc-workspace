'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, 
  PolarRadiusAxis, Radar, Area, AreaChart, ComposedChart, Legend
} from 'recharts';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  BellIcon,
  SearchIcon,
  FilterIcon,
  CalendarIcon,
  UsersIcon,
  ClipboardCheckIcon,
  TrendingUpIcon,
  ExclamationTriangleIcon,
  DocumentReportIcon,
  CogIcon,
  RefreshIcon,
  DownloadIcon,
  EyeIcon,
  StarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  ChartBarIcon,
  DocumentTextIcon,
  PresentationChartLineIcon,
  UserGroupIcon,
  AcademicCapIcon,
  LightBulbIcon,
  ShieldCheckIcon,
  SparklesIcon,
  FireIcon,
  BeakerIcon,
  GlobeIcon,
  MenuIcon,
  XIcon
} from '@heroicons/react/24/outline';

// Types
interface AssessmentMetrics {
  totalAssessments: number;
  activeAssessments: number;
  completedAssessments: number;
  averageCompletionTime: number;
  completionRate: number;
  participationRate: number;
  avgScore: number;
  improvement: number;
}

interface ChartData {
  name: string;
  value: number;
  change?: number;
  color?: string;
}

interface DashboardProps {
  metrics: AssessmentMetrics;
  timeRange: 'week' | 'month' | 'quarter' | 'year';
  onTimeRangeChange: (range: 'week' | 'month' | 'quarter' | 'year') => void;
  isLoading?: boolean;
  realTimeData?: boolean;
}

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  children?: SidebarItem[];
}

// Sidebar Navigation Items
const sidebarItems: SidebarItem[] = [
  {
    name: 'Overview',
    href: '/dashboard',
    icon: ChartBarIcon,
  },
  {
    name: 'Assessments',
    href: '/dashboard/assessments',
    icon: ClipboardCheckIcon,
    children: [
      { name: 'Active', href: '/dashboard/assessments/active', icon: ClockIcon },
      { name: 'Completed', href: '/dashboard/assessments/completed', icon: CheckCircleIcon },
      { name: 'Drafts', href: '/dashboard/assessments/drafts', icon: DocumentTextIcon },
    ],
  },
  {
    name: 'Analytics',
    href: '/dashboard/analytics',
    icon: PresentationChartLineIcon,
    children: [
      { name: 'Performance', href: '/dashboard/analytics/performance', icon: TrendingUpIcon },
      { name: 'Trends', href: '/dashboard/analytics/trends', icon: FireIcon },
      { name: 'Insights', href: '/dashboard/analytics/insights', icon: LightBulbIcon },
    ],
  },
  {
    name: 'Reports',
    href: '/dashboard/reports',
    icon: DocumentReportIcon,
    badge: '3',
    children: [
      { name: 'Weekly', href: '/dashboard/reports/weekly', icon: CalendarIcon },
      { name: 'Monthly', href: '/dashboard/reports/monthly', icon: CalendarIcon },
      { name: 'Custom', href: '/dashboard/reports/custom', icon: BeakerIcon },
    ],
  },
  {
    name: 'Users',
    href: '/dashboard/users',
    icon: UserGroupIcon,
    children: [
      { name: 'All Users', href: '/dashboard/users/all', icon: UsersIcon },
      { name: 'Teams', href: '/dashboard/users/teams', icon: UserGroupIcon },
      { name: 'Roles', href: '/dashboard/users/roles', icon: ShieldCheckIcon },
    ],
  },
  {
    name: 'OCEAN Model',
    href: '/dashboard/ocean',
    icon: GlobeIcon,
    children: [
      { name: 'Coverage', href: '/dashboard/ocean/coverage', icon: SparklesIcon },
      { name: 'Insights', href: '/dashboard/ocean/insights', icon: AcademicCapIcon },
      { name: 'Recommendations', href: '/dashboard/ocean/recommendations', icon: LightBulbIcon },
    ],
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: CogIcon,
  },
];

// Metric Card Component
const MetricCard: React.FC<{
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo';
  subtitle?: string;
}> = ({ title, value, change, changeType, icon: Icon, color = 'blue', subtitle }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      {change !== undefined && (
        <div className="mt-4 flex items-center">
          <span className={`text-sm font-medium ${
            changeType === 'increase' ? 'text-green-600' : 
            changeType === 'decrease' ? 'text-red-600' : 
            'text-gray-600'
          }`}>
            {changeType === 'increase' ? '↗' : changeType === 'decrease' ? '↘' : '→'} {Math.abs(change)}%
          </span>
          <span className="text-sm text-gray-500 ml-2">vs last period</span>
        </div>
      )}
    </div>
  );
};

// Sidebar Component
const Sidebar: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  activeItem?: string;
}> = ({ isOpen, onClose, activeItem }) => {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  const SidebarItem: React.FC<{ item: SidebarItem; depth?: number }> = ({ item, depth = 0 }) => {
    const isExpanded = expandedItems.includes(item.name);
    const hasChildren = item.children && item.children.length > 0;
    const isActive = activeItem === item.href;

    return (
      <div>
        <div
          className={`flex items-center px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${
            isActive
              ? 'bg-indigo-50 text-indigo-700 border-r-2 border-indigo-500'
              : 'text-gray-700 hover:bg-gray-50'
          } ${depth > 0 ? 'pl-12' : ''}`}
          onClick={() => hasChildren && toggleExpanded(item.name)}
        >
          <item.icon className="h-5 w-5 mr-3" />
          <span className="flex-1">{item.name}</span>
          {item.badge && (
            <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-600 rounded-full">
              {item.badge}
            </span>
          )}
          {hasChildren && (
            <ChevronRightIcon className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          )}
        </div>
        {hasChildren && isExpanded && (
          <div className="ml-4">
            {item.children!.map((child) => (
              <SidebarItem key={child.name} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">IOC Dashboard</h2>
          <button
            onClick={onClose}
            className="md:hidden p-2 rounded-md hover:bg-gray-100"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        
        <nav className="mt-4 space-y-1">
          {sidebarItems.map((item) => (
            <SidebarItem key={item.name} item={item} />
          ))}
        </nav>
      </div>
    </>
  );
};

// Header Component
const Header: React.FC<{
  onMenuClick: () => void;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}> = ({ onMenuClick, title, subtitle, actions }) => {
  const [notifications, setNotifications] = useState(3);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
      <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 rounded-md hover:bg-gray-100"
          >
            <MenuIcon className="h-6 w-6" />
          </button>
          <div className="ml-4 md:ml-0">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {subtitle && (
              <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {actions}
          
          {/* Search */}
          <div className="relative hidden sm:block">
            <SearchIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>

          {/* Notifications */}
          <div className="relative">
            <button className="p-2 rounded-full hover:bg-gray-100 relative">
              <BellIcon className="h-6 w-6 text-gray-600" />
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {notifications}
                </span>
              )}
            </button>
          </div>

          {/* User menu */}
          <div className="relative">
            <button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100">
              <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">JD</span>
              </div>
              <ChevronDownIcon className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

// Time Range Selector
const TimeRangeSelector: React.FC<{
  value: 'week' | 'month' | 'quarter' | 'year';
  onChange: (value: 'week' | 'month' | 'quarter' | 'year') => void;
}> = ({ value, onChange }) => {
  const ranges = [
    { label: 'Week', value: 'week' as const },
    { label: 'Month', value: 'month' as const },
    { label: 'Quarter', value: 'quarter' as const },
    { label: 'Year', value: 'year' as const },
  ];

  return (
    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
      {ranges.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
            value === range.value
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
};

// Main Dashboard Component
export const InteractiveAssessmentDashboard: React.FC<DashboardProps> = ({
  metrics,
  timeRange,
  onTimeRangeChange,
  isLoading = false,
  realTimeData = false,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLastUpdated(new Date());
    setRefreshing(false);
  }, []);

  // Generate sample chart data
  const assessmentTrendData = useMemo(() => [
    { name: 'Jan', completed: 45, active: 12, total: 57 },
    { name: 'Feb', completed: 52, active: 18, total: 70 },
    { name: 'Mar', completed: 61, active: 24, total: 85 },
    { name: 'Apr', completed: 58, active: 19, total: 77 },
    { name: 'May', completed: 67, active: 22, total: 89 },
    { name: 'Jun', completed: 74, active: 28, total: 102 },
  ], []);

  const oceanCoverageData = useMemo(() => [
    { name: 'Openness', value: 85, fullMark: 100 },
    { name: 'Conscientiousness', value: 92, fullMark: 100 },
    { name: 'Extraversion', value: 78, fullMark: 100 },
    { name: 'Agreeableness', value: 88, fullMark: 100 },
    { name: 'Neuroticism', value: 65, fullMark: 100 },
  ], []);

  const assessmentTypeData = useMemo(() => [
    { name: 'Personality', value: 35, color: '#3B82F6' },
    { name: 'Skills', value: 25, color: '#10B981' },
    { name: 'Leadership', value: 20, color: '#F59E0B' },
    { name: 'Team Dynamics', value: 15, color: '#EF4444' },
    { name: 'Other', value: 5, color: '#8B5CF6' },
  ], []);

  const performanceData = useMemo(() => [
    { name: 'Mon', performance: 82, participation: 75 },
    { name: 'Tue', performance: 85, participation: 78 },
    { name: 'Wed', performance: 88, participation: 82 },
    { name: 'Thu', performance: 86, participation: 80 },
    { name: 'Fri', performance: 90, participation: 85 },
    { name: 'Sat', performance: 87, participation: 83 },
    { name: 'Sun', performance: 84, participation: 79 },
  ], []);

  const headerActions = (
    <div className="flex items-center space-x-2">
      <TimeRangeSelector value={timeRange} onChange={onTimeRangeChange} />
      <button
        onClick={handleRefresh}
        disabled={refreshing}
        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
        title="Refresh data"
      >
        <RefreshIcon className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
      </button>
      <button className="p-2 rounded-lg hover:bg-gray-100" title="Export data">
        <DownloadIcon className="h-5 w-5" />
      </button>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        activeItem="/dashboard"
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          title="Assessment Dashboard"
          subtitle="Monitor and analyze assessment performance"
          actions={headerActions}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Status Banner */}
          {realTimeData && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-3"></div>
                <span className="text-sm text-green-700">
                  Live data - Last updated: {lastUpdated.toLocaleTimeString()}
                </span>
              </div>
            </div>
          )}

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="Total Assessments"
              value={metrics.totalAssessments}
              change={12}
              changeType="increase"
              icon={ClipboardCheckIcon}
              color="blue"
              subtitle="All time"
            />
            <MetricCard
              title="Active Assessments"
              value={metrics.activeAssessments}
              change={8}
              changeType="increase"
              icon={ClockIcon}
              color="yellow"
              subtitle="In progress"
            />
            <MetricCard
              title="Completion Rate"
              value={`${metrics.completionRate}%`}
              change={5}
              changeType="increase"
              icon={CheckCircleIcon}
              color="green"
              subtitle="This period"
            />
            <MetricCard
              title="Average Score"
              value={`${metrics.avgScore}%`}
              change={2}
              changeType="increase"
              icon={StarIcon}
              color="purple"
              subtitle="Performance"
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Assessment Trends */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Assessment Trends</h3>
                <button className="text-sm text-indigo-600 hover:text-indigo-800">
                  View Details
                </button>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={assessmentTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="completed" fill="#10B981" name="Completed" />
                    <Bar dataKey="active" fill="#F59E0B" name="Active" />
                    <Line type="monotone" dataKey="total" stroke="#3B82F6" name="Total" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* OCEAN Coverage */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">OCEAN Model Coverage</h3>
                <button className="text-sm text-indigo-600 hover:text-indigo-800">
                  View Analysis
                </button>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={oceanCoverageData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="name" />
                    <PolarRadiusAxis domain={[0, 100]} />
                    <Radar
                      name="Coverage"
                      dataKey="value"
                      stroke="#3B82F6"
                      fill="#3B82F6"
                      fillOpacity={0.3}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Assessment Types */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Assessment Types</h3>
                <button className="text-sm text-indigo-600 hover:text-indigo-800">
                  Manage Types
                </button>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={assessmentTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {assessmentTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Weekly Performance</h3>
                <button className="text-sm text-indigo-600 hover:text-indigo-800">
                  View Report
                </button>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="performance"
                      stackId="1"
                      stroke="#3B82F6"
                      fill="#3B82F6"
                      fillOpacity={0.7}
                      name="Performance"
                    />
                    <Area
                      type="monotone"
                      dataKey="participation"
                      stackId="2"
                      stroke="#10B981"
                      fill="#10B981"
                      fillOpacity={0.7}
                      name="Participation"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Recent Activity & Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activity */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                <button className="text-sm text-indigo-600 hover:text-indigo-800">
                  View All
                </button>
              </div>
              <div className="space-y-4">
                {[
                  { user: 'Sarah Johnson', action: 'completed Leadership Assessment', time: '2 minutes ago', type: 'success' },
                  { user: 'Mike Chen', action: 'started Team Dynamics Assessment', time: '15 minutes ago', type: 'info' },
                  { user: 'Lisa Rodriguez', action: 'submitted Skills Assessment', time: '1 hour ago', type: 'success' },
                  { user: 'David Kim', action: 'requested assessment review', time: '2 hours ago', type: 'warning' },
                ].map((activity, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.type === 'success' ? 'bg-green-500' :
                      activity.type === 'warning' ? 'bg-yellow-500' :
                      'bg-blue-500'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{activity.user}</span> {activity.action}
                      </p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Alerts & Notifications */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Alerts</h3>
                <button className="text-sm text-indigo-600 hover:text-indigo-800">
                  Manage
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Low Participation</p>
                    <p className="text-xs text-yellow-700">Team Alpha has 40% participation rate</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                  <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">New Assessment</p>
                    <p className="text-xs text-blue-700">Q2 Leadership review is ready</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-800">Milestone Reached</p>
                    <p className="text-xs text-green-700">100 assessments completed!</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div>
              Last updated: {lastUpdated.toLocaleString()}
            </div>
            <div className="flex items-center space-x-4">
              <span>IOC Assessment Platform v3.1.1</span>
              <button className="text-indigo-600 hover:text-indigo-800">
                Help & Support
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default InteractiveAssessmentDashboard;