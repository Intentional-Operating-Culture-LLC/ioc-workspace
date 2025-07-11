import { ReactNode } from 'react';
import { cn } from "@ioc/shared/data-access/utils";
import { ArrowUp, ArrowDown } from 'lucide-react';
interface KPICardProps {
    title: string;
    value: string | number;
    change?: number;
    changeLabel?: string;
    icon?: ReactNode;
    className?: string;
}
export function KPICard({ title, value, change, changeLabel, icon, className, }: KPICardProps) {
    const isPositive = change && change > 0;
    const isNegative = change && change < 0;
    return (<div className={cn('rounded-lg border bg-card text-card-foreground shadow-sm p-6', className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {change !== undefined && (<div className="flex items-center space-x-1 text-sm">
              {isPositive && (<>
                  <ArrowUp className="h-4 w-4 text-green-600"/>
                  <span className="text-green-600">+{Math.abs(change)}%</span>
                </>)}
              {isNegative && (<>
                  <ArrowDown className="h-4 w-4 text-red-600"/>
                  <span className="text-red-600">{Math.abs(change)}%</span>
                </>)}
              {changeLabel && (<span className="text-muted-foreground">{changeLabel}</span>)}
            </div>)}
        </div>
        {icon && (<div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            {icon}
          </div>)}
      </div>
    </div>);
}
