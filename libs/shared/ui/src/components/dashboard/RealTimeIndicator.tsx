import { cn } from "@ioc/shared/data-access";
interface RealTimeIndicatorProps {
    status: 'connected' | 'disconnected' | 'connecting';
    label?: string;
    className?: string;
}
export function RealTimeIndicator({ status, label, className }: RealTimeIndicatorProps) {
    return (<div className={cn('flex items-center space-x-2', className)}>
      <div className="relative">
        <div className={cn('h-3 w-3 rounded-full', status === 'connected' && 'bg-green-500', status === 'disconnected' && 'bg-red-500', status === 'connecting' && 'bg-yellow-500')}/>
        {status === 'connected' && (<div className="absolute inset-0 h-3 w-3 rounded-full bg-green-500 animate-ping opacity-75"/>)}
        {status === 'connecting' && (<div className="absolute inset-0 h-3 w-3 rounded-full bg-yellow-500 animate-pulse"/>)}
      </div>
      {label && (<span className="text-sm font-medium">
          {status === 'connected' && 'Connected'}
          {status === 'disconnected' && 'Disconnected'}
          {status === 'connecting' && 'Connecting...'}
        </span>)}
    </div>);
}
