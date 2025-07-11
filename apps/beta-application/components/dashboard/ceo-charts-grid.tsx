'use client';
import { Card, CardContent, CardHeader, CardTitle, LineChart, BarChart } from "@ioc/shared/ui";
import { TrendingUp, Users, DollarSign, Target } from 'lucide-react';
interface CEOChartsGridProps {
    metrics: {
        revenue: {
            current: number;
            target: number;
            growth: number;
            trend: 'up' | 'down' | 'stable';
        };
        customers: {
            total: number;
            target: number;
            growth: number;
            churn: number;
        };
        partners: {
            active: number;
            target: number;
            pipeline: number;
            revenue: number;
        };
        mvp: {
            readiness: number;
            daysToLaunch: number;
            criticalIssues: number;
            completedFeatures: number;
        };
    };
}
export function CEOChartsGrid({ metrics }: CEOChartsGridProps) {
    // Generate revenue trend data
    const revenueData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
        datasets: [
            {
                label: 'Revenue',
                data: [
                    3500, 4200, 4800, 5500, 6200, 7100, 7800, metrics.revenue.current
                ],
                borderColor: 'rgb(34, 197, 94)',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                tension: 0.4,
            },
            {
                label: 'Target',
                data: Array(8).fill(metrics.revenue.target),
                borderColor: 'rgb(239, 68, 68)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderDash: [5, 5],
                tension: 0,
            },
        ],
    };
    // Generate customer acquisition data
    const customerData = {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [
            {
                label: 'New Customers',
                data: [8, 12, 15, 18],
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
            },
            {
                label: 'Churned',
                data: [2, 3, 1, 2],
                backgroundColor: 'rgba(239, 68, 68, 0.8)',
            },
        ],
    };
    // Generate partner performance data
    const partnerData = {
        labels: ['Active', 'Pipeline', 'Target'],
        datasets: [
            {
                label: 'Partners',
                data: [metrics.partners.active, metrics.partners.pipeline, metrics.partners.target],
                backgroundColor: [
                    'rgba(168, 85, 247, 0.8)',
                    'rgba(251, 191, 36, 0.8)',
                    'rgba(34, 197, 94, 0.8)',
                ],
            },
        ],
    };
    // Generate MVP readiness trend
    const mvpReadinessData = {
        labels: ['30 days ago', '20 days ago', '10 days ago', 'Today'],
        datasets: [
            {
                label: 'MVP Readiness',
                data: [65, 72, 78, metrics.mvp.readiness],
                borderColor: 'rgb(168, 85, 247)',
                backgroundColor: 'rgba(168, 85, 247, 0.1)',
                tension: 0.4,
            },
            {
                label: 'Launch Target',
                data: [95, 95, 95, 95],
                borderColor: 'rgb(34, 197, 94)',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                borderDash: [5, 5],
                tension: 0,
            },
        ],
    };
    return (<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-green-600"/>
            <span>Revenue Tracking</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Current: ${metrics.revenue.current.toLocaleString()}</span>
              <span className="text-gray-600">Target: ${metrics.revenue.target.toLocaleString()}</span>
            </div>
            <LineChart data={revenueData} height={250}/>
            <div className="text-xs text-gray-500 text-center">
              Monthly revenue progression toward $10K target
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-600"/>
            <span>Customer Acquisition</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Total: {metrics.customers.total}</span>
              <span className="text-gray-600">Target: {metrics.customers.target}</span>
            </div>
            <BarChart data={customerData} height={250}/>
            <div className="text-xs text-gray-500 text-center">
              Weekly customer acquisition vs churn
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-purple-600"/>
            <span>Partner Network</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-purple-600">{metrics.partners.active}</div>
                <div className="text-gray-600">Active</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-yellow-600">{metrics.partners.pipeline}</div>
                <div className="text-gray-600">Pipeline</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-green-600">{metrics.partners.target}</div>
                <div className="text-gray-600">Target</div>
              </div>
            </div>
            <BarChart data={partnerData} height={200}/>
            <div className="text-xs text-gray-500 text-center">
              Partner acquisition progress (Target: 5-10 partners)
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-orange-600"/>
            <span>MVP Launch Readiness</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Current: {metrics.mvp.readiness}%</span>
              <span className="text-gray-600">{metrics.mvp.daysToLaunch} days left</span>
            </div>
            <LineChart data={mvpReadinessData} height={250}/>
            <div className="text-xs text-gray-500 text-center">
              MVP readiness progress toward September 1 launch
            </div>
          </div>
        </CardContent>
      </Card>
    </div>);
}
