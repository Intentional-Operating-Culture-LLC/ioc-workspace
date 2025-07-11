'use client';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from 'lucide-react';
import { cn } from "@ioc/shared/data-access";
interface CEOKPICardProps {
    title: string;
    value: string;
    target: string;
    progress: number;
    change: number;
    icon: React.ReactNode;
    status: 'success' | 'warning' | 'error';
}
export function CEOKPICard({ title, value, target, progress, change, icon, status }: CEOKPICardProps) {
    const getTrendIcon = () => {
        if (change > 0)
            return <ArrowUpIcon className="h-4 w-4 text-green-500"/>;
        if (change < 0)
            return <ArrowDownIcon className="h-4 w-4 text-red-500"/>;
        return <MinusIcon className="h-4 w-4 text-gray-500"/>;
    };
    const getStatusColor = () => {
        switch (status) {
            case 'success':
                return 'border-green-200 bg-green-50';
            case 'warning':
                return 'border-yellow-200 bg-yellow-50';
            case 'error':
                return 'border-red-200 bg-red-50';
            default:
                return 'border-gray-200 bg-gray-50';
        }
    };
    return (<Card className={cn('relative overflow-hidden', getStatusColor())}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-700">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold text-gray-900">
              {value}
            </div>
            <div className="text-sm text-gray-500">
              of {target}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className={cn('h-2 rounded-full transition-all duration-500', status === 'success' ? 'bg-green-500' :
            status === 'warning' ? 'bg-yellow-500' : 'bg-red-500')} style={{ width: `${Math.min(progress, 100)}%` }}/>
          </div>
          
          {/* Change Indicator */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-1">
              {getTrendIcon()}
              <span className={cn('font-medium', change > 0 ? 'text-green-600' :
            change < 0 ? 'text-red-600' : 'text-gray-600')}>
                {change > 0 ? '+' : ''}{change.toFixed(1)}%
              </span>
            </div>
            <div className="text-gray-500">
              {progress.toFixed(0)}% complete
            </div>
          </div>
        </div>
      </CardContent>
    </Card>);
}
