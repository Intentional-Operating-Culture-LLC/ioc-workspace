'use client';
import { Card, CardContent, CardHeader, CardTitle } from "@ioc/shared/ui";
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from "@ioc/shared/data-access/utils";
interface CEOMetricsCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    trend: 'up' | 'down' | 'stable';
    change?: number;
    icon?: React.ReactNode;
    className?: string;
}
export function CEOMetricsCard({ title, value, subtitle, trend, change, icon, className }: CEOMetricsCardProps) {
    const getTrendIcon = () => {
        switch (trend) {
            case 'up':
                return <TrendingUp className="h-4 w-4 text-green-500"/>;
            case 'down':
                return <TrendingDown className="h-4 w-4 text-red-500"/>;
            case 'stable':
                return <Minus className="h-4 w-4 text-gray-500"/>;
        }
    };
    const getTrendColor = () => {
        switch (trend) {
            case 'up':
                return 'text-green-600';
            case 'down':
                return 'text-red-600';
            case 'stable':
                return 'text-gray-600';
        }
    };
    return (<Card className={cn('hover:shadow-lg transition-shadow', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-700">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className="text-2xl font-bold text-gray-900">
            {value}
          </div>
          {subtitle && (<div className="text-sm text-gray-500">
              {subtitle}
            </div>)}
          {change !== undefined && (<div className="flex items-center space-x-1">
              {getTrendIcon()}
              <span className={cn('text-sm font-medium', getTrendColor())}>
                {change > 0 ? '+' : ''}{change.toFixed(1)}%
              </span>
              <span className="text-sm text-gray-500">
                vs last period
              </span>
            </div>)}
        </div>
      </CardContent>
    </Card>);
}
