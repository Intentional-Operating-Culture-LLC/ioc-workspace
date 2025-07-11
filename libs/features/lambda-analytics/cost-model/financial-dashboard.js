/**
 * Financial Dashboard Component for IOC Analytics
 * Real-time cost tracking and budget monitoring
 */

import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ComposedChart
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle, Info, Zap, Database, BarChart2, Cloud
} from 'lucide-react';

// Service icons mapping
const SERVICE_ICONS = {
  pinpoint: BarChart2,
  s3: Database,
  lambda: Zap,
  quicksight: BarChart2,
  athena: Database,
  cloudwatch: Cloud,
};

// Service colors
const SERVICE_COLORS = {
  pinpoint: '#FF6B6B',
  s3: '#4ECDC4',
  lambda: '#FFA500',
  quicksight: '#9B59B6',
  athena: '#3498DB',
  cloudwatch: '#2ECC71',
};

export default function FinancialDashboard() {
  const [timeRange, setTimeRange] = useState('current');
  const [costData, setCostData] = useState(null);
  const [projections, setProjections] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(null);

  useEffect(() => {
    loadDashboardData();
    
    // Set up auto-refresh every 5 minutes
    const interval = setInterval(loadDashboardData, 5 * 60 * 1000);
    setRefreshInterval(interval);
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timeRange]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch current costs
      const costsResponse = await fetch(`/api/analytics/costs?range=${timeRange}`);
      const costs = await costsResponse.json();
      
      // Fetch projections
      const projectionsResponse = await fetch('/api/analytics/projections');
      const proj = await projectionsResponse.json();
      
      setCostData(costs);
      setProjections(proj);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const { current, history, budget, unitEconomics } = costData || {};

  return (
    <div className="space-y-6">
      {/* Header with key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Current Month Cost"
          value={`$${current?.total?.toFixed(2) || '0.00'}`}
          change={current?.changePercent}
          icon={DollarSign}
          trend={current?.trend}
        />
        
        <MetricCard
          title="Budget Utilization"
          value={`${budget?.percentUsed?.toFixed(1) || '0'}%`}
          icon={AlertTriangle}
          status={budget?.status}
          progress={budget?.percentUsed}
        />
        
        <MetricCard
          title="Cost per User"
          value={`$${unitEconomics?.costPerUser?.toFixed(2) || '0.00'}`}
          change={unitEconomics?.changePercent}
          icon={TrendingUp}
        />
        
        <MetricCard
          title="Projected Monthly"
          value={`$${current?.projected?.toFixed(2) || '0.00'}`}
          icon={TrendingUp}
          subtext={`vs $${budget?.target?.toFixed(2) || '0'} target`}
        />
      </div>

      {/* Budget Alert */}
      {budget?.alert && (
        <Alert variant={budget.critical ? 'destructive' : 'warning'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {budget.message}. Current: ${current?.total?.toFixed(2)}, 
            Target: ${budget?.target?.toFixed(2)}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="services">Service Breakdown</TabsTrigger>
          <TabsTrigger value="trends">Trends & Analysis</TabsTrigger>
          <TabsTrigger value="projections">Projections</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Daily Cost Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Cost Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={history?.daily || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                    <Area
                      type="monotone"
                      dataKey="cost"
                      stroke="#3B82F6"
                      fill="#3B82F6"
                      fillOpacity={0.1}
                    />
                    <Line
                      type="monotone"
                      dataKey="average"
                      stroke="#10B981"
                      strokeDasharray="5 5"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Service Cost Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Service Cost Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={current?.services || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomLabel}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="cost"
                    >
                      {(current?.services || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={SERVICE_COLORS[entry.name]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Unit Economics */}
          <Card>
            <CardHeader>
              <CardTitle>Unit Economics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Cost per User</p>
                  <p className="text-2xl font-bold">
                    ${unitEconomics?.costPerUser?.toFixed(2) || '0'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Cost per Assessment</p>
                  <p className="text-2xl font-bold">
                    ${unitEconomics?.costPerAssessment?.toFixed(2) || '0'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Revenue per User</p>
                  <p className="text-2xl font-bold">
                    ${unitEconomics?.revenuePerUser?.toFixed(2) || '0'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Margin per User</p>
                  <p className="text-2xl font-bold">
                    ${unitEconomics?.marginPerUser?.toFixed(2) || '0'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Break-even Users</p>
                  <p className="text-2xl font-bold">
                    {unitEconomics?.breakEvenUsers || '0'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          {/* Detailed Service Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(current?.services || []).map((service) => (
              <ServiceCard key={service.name} service={service} budget={budget} />
            ))}
          </div>

          {/* Service Cost Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Service Cost Trends (30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={history?.byService || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                  <Legend />
                  {Object.keys(SERVICE_COLORS).map((service) => (
                    <Line
                      key={service}
                      type="monotone"
                      dataKey={service}
                      stroke={SERVICE_COLORS[service]}
                      strokeWidth={2}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          {/* Cost vs Revenue Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Cost vs Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={history?.monthly || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="revenue" fill="#10B981" />
                  <Bar yAxisId="left" dataKey="cost" fill="#EF4444" />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="margin"
                    stroke="#3B82F6"
                    strokeWidth={3}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Growth Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>User Growth vs Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={history?.userGrowth || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="users"
                      stroke="#3B82F6"
                      name="Users"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="costPerUser"
                      stroke="#EF4444"
                      name="Cost per User"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Efficiency Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <EfficiencyMetric
                    label="Infrastructure Efficiency"
                    value={85}
                    target={90}
                  />
                  <EfficiencyMetric
                    label="Query Optimization"
                    value={72}
                    target={80}
                  />
                  <EfficiencyMetric
                    label="Storage Optimization"
                    value={68}
                    target={75}
                  />
                  <EfficiencyMetric
                    label="Compute Utilization"
                    value={91}
                    target={85}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="projections" className="space-y-4">
          {/* Scenario Projections */}
          <Card>
            <CardHeader>
              <CardTitle>Growth Scenario Projections</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={projections?.scenarios || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="conservative"
                    stroke="#10B981"
                    strokeWidth={2}
                    name="Conservative"
                  />
                  <Line
                    type="monotone"
                    dataKey="moderate"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    name="Moderate"
                  />
                  <Line
                    type="monotone"
                    dataKey="aggressive"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    name="Aggressive"
                  />
                  <Line
                    type="monotone"
                    dataKey="budget"
                    stroke="#EF4444"
                    strokeDasharray="5 5"
                    name="Budget Target"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Break-even Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Break-even Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {projections?.breakeven?.map((scenario) => (
                  <div key={scenario.name} className="text-center p-4 border rounded">
                    <h4 className="font-semibold">{scenario.name}</h4>
                    <p className="text-2xl font-bold">{scenario.users} users</p>
                    <p className="text-sm text-muted-foreground">
                      Month {scenario.month}
                    </p>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={projections?.breakeven?.chart || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="users" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stackId="1"
                    stroke="#10B981"
                    fill="#10B981"
                  />
                  <Area
                    type="monotone"
                    dataKey="cost"
                    stackId="2"
                    stroke="#EF4444"
                    fill="#EF4444"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-4">
          {/* Optimization Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {costData?.recommendations?.map((rec, index) => (
              <RecommendationCard key={index} recommendation={rec} />
            ))}
          </div>

          {/* Cost Savings Opportunities */}
          <Card>
            <CardHeader>
              <CardTitle>Cost Savings Roadmap</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {costData?.savingsRoadmap?.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded">
                    <div className="flex-1">
                      <h4 className="font-semibold">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <Badge variant={item.effort === 'Low' ? 'success' : item.effort === 'Medium' ? 'warning' : 'destructive'}>
                          {item.effort} Effort
                        </Badge>
                        <span className="text-sm">Timeline: {item.timeline}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">
                        ${item.savings}/mo
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.percentSaving}% reduction
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Component helpers
function MetricCard({ title, value, change, icon: Icon, trend, status, progress, subtext }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {change !== undefined && (
              <p className={`text-sm ${change >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
              </p>
            )}
            {subtext && (
              <p className="text-sm text-muted-foreground">{subtext}</p>
            )}
          </div>
          <div className={`p-3 rounded-full ${getStatusColor(status)}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
        {progress !== undefined && (
          <Progress value={progress} className="mt-4" />
        )}
      </CardContent>
    </Card>
  );
}

function ServiceCard({ service, budget }) {
  const Icon = SERVICE_ICONS[service.name] || Database;
  const percentOfTotal = (service.cost / budget?.target) * 100;
  
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg`} style={{ backgroundColor: `${SERVICE_COLORS[service.name]}20` }}>
              <Icon className="w-5 h-5" style={{ color: SERVICE_COLORS[service.name] }} />
            </div>
            <h3 className="font-semibold capitalize">{service.name}</h3>
          </div>
          <Badge variant={service.trend > 0 ? 'destructive' : 'success'}>
            {service.trend > 0 ? '+' : ''}{service.trend}%
          </Badge>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Current Month</span>
            <span className="font-semibold">${service.cost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Daily Average</span>
            <span className="font-semibold">${service.dailyAverage.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">% of Budget</span>
            <span className="font-semibold">{percentOfTotal.toFixed(1)}%</span>
          </div>
        </div>
        
        <Progress value={percentOfTotal} className="mt-4" />
      </CardContent>
    </Card>
  );
}

function RecommendationCard({ recommendation }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={recommendation.priority === 'High' ? 'destructive' : recommendation.priority === 'Medium' ? 'warning' : 'default'}>
                {recommendation.priority} Priority
              </Badge>
              <Badge variant="outline">{recommendation.category}</Badge>
            </div>
            <h3 className="font-semibold mb-2">{recommendation.title}</h3>
            <p className="text-sm text-muted-foreground mb-4">{recommendation.description}</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Potential Savings</span>
                <span className="font-semibold text-green-600">${recommendation.savings}/mo</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Implementation</span>
                <span>{recommendation.effort}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EfficiencyMetric({ label, value, target }) {
  const isAboveTarget = value >= target;
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className={isAboveTarget ? 'text-green-600' : 'text-orange-600'}>
          {value}% / {target}%
        </span>
      </div>
      <Progress value={value} className={isAboveTarget ? 'bg-green-100' : 'bg-orange-100'} />
    </div>
  );
}

function getStatusColor(status) {
  switch (status) {
    case 'good':
      return 'bg-green-100 text-green-600';
    case 'warning':
      return 'bg-orange-100 text-orange-600';
    case 'critical':
      return 'bg-red-100 text-red-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

function renderCustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
  const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}