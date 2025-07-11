'use client';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { AlertTriangle, CheckCircle, Info, Shield } from 'lucide-react';
import { cn } from "@ioc/shared/data-access";
interface CEOAlertsProps {
    criticalIssues: number;
    systemHealth: number;
    securityScore: number;
}
interface Alert {
    id: string;
    type: 'critical' | 'warning' | 'info' | 'success';
    title: string;
    message: string;
    timestamp: Date;
    actionable: boolean;
}
export function CEOAlerts({ criticalIssues, systemHealth, securityScore }: CEOAlertsProps) {
    const generateAlerts = (): Alert[] => {
        const alerts: Alert[] = [];
        if (criticalIssues > 0) {
            alerts.push({
                id: 'critical-issues',
                type: 'critical',
                title: 'Critical Issues Detected',
                message: `${criticalIssues} critical issues require immediate attention for MVP launch`,
                timestamp: new Date(),
                actionable: true
            });
        }
        if (systemHealth < 95) {
            alerts.push({
                id: 'system-health',
                type: 'warning',
                title: 'System Health Below Target',
                message: `System health at ${systemHealth}%. Target is 95% for production readiness`,
                timestamp: new Date(),
                actionable: true
            });
        }
        if (securityScore < 98) {
            alerts.push({
                id: 'security',
                type: 'warning',
                title: 'Security Score Monitoring',
                message: `Security score at ${securityScore}%. Maintaining high security standards`,
                timestamp: new Date(),
                actionable: false
            });
        }
        // Add positive alerts
        if (criticalIssues === 0 && systemHealth >= 95) {
            alerts.push({
                id: 'all-clear',
                type: 'success',
                title: 'All Systems Operational',
                message: 'No critical issues detected. MVP launch preparation on track',
                timestamp: new Date(),
                actionable: false
            });
        }
        return alerts;
    };
    const alerts = generateAlerts();
    const getAlertIcon = (type: Alert['type']) => {
        switch (type) {
            case 'critical':
                return <AlertTriangle className="h-5 w-5 text-red-500"/>;
            case 'warning':
                return <AlertTriangle className="h-5 w-5 text-yellow-500"/>;
            case 'info':
                return <Info className="h-5 w-5 text-blue-500"/>;
            case 'success':
                return <CheckCircle className="h-5 w-5 text-green-500"/>;
        }
    };
    const getAlertBackground = (type: Alert['type']) => {
        switch (type) {
            case 'critical':
                return 'bg-red-50 border-red-200';
            case 'warning':
                return 'bg-yellow-50 border-yellow-200';
            case 'info':
                return 'bg-blue-50 border-blue-200';
            case 'success':
                return 'bg-green-50 border-green-200';
        }
    };
    if (alerts.length === 0) {
        return (<Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-6 w-6 text-green-500"/>
            <div>
              <p className="text-sm font-medium text-green-800">All Systems Operational</p>
              <p className="text-sm text-green-600">No alerts at this time</p>
            </div>
          </div>
        </CardContent>
      </Card>);
    }
    return (<div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Executive Alerts</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {alerts.map((alert) => (<Card key={alert.id} className={cn('border-l-4', getAlertBackground(alert.type))}>
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                {getAlertIcon(alert.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {alert.title}
                    </p>
                    <span className="text-xs text-gray-500">
                      {alert.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {alert.message}
                  </p>
                  {alert.actionable && (<div className="mt-3">
                      <button className="text-sm font-medium text-blue-600 hover:text-blue-500">
                        View Details →
                      </button>
                    </div>)}
                </div>
              </div>
            </CardContent>
          </Card>))}
      </div>
    </div>);
}
