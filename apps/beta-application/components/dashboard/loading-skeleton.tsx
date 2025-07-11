import { cn } from "@ioc/shared/data-access/utils";
interface SkeletonProps {
    className?: string;
    style?: React.CSSProperties;
}
export function Skeleton({ className, style }: SkeletonProps) {
    return (<div style={style} className={cn('animate-pulse rounded-md bg-gray-200 dark:bg-gray-700', className)}/>);
}
export function KPICardSkeleton() {
    return (<div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24"/>
          <Skeleton className="h-8 w-32"/>
          <Skeleton className="h-4 w-20"/>
        </div>
        <Skeleton className="h-12 w-12 rounded-full"/>
      </div>
    </div>);
}
export function ChartSkeleton() {
    return (<div className="space-y-4">
      <div className="flex items-end space-x-2">
        {Array.from({ length: 7 }).map((_, i) => (<Skeleton key={i} className="flex-1" style={{ height: `${Math.random() * 150 + 50}px` }}/>))}
      </div>
      <div className="flex space-x-8">
        <Skeleton className="h-4 w-20"/>
        <Skeleton className="h-4 w-20"/>
      </div>
    </div>);
}
export function TableSkeleton({ rows = 5 }: {
    rows?: number;
}) {
    return (<div className="space-y-3">
      <div className="flex space-x-4 pb-3 border-b">
        {Array.from({ length: 4 }).map((_, i) => (<Skeleton key={i} className="h-4 flex-1"/>))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (<div key={i} className="flex space-x-4 py-3">
          {Array.from({ length: 4 }).map((_, j) => (<Skeleton key={j} className="h-4 flex-1"/>))}
        </div>))}
    </div>);
}
