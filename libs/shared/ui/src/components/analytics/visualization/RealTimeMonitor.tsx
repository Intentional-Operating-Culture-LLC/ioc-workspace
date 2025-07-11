import React, { useEffect, useState } from 'react';
import { Activity, Users, Database, Zap } from 'lucide-react';

interface RealTimeMonitorProps {
  organizationId: string;
}

export const RealTimeMonitor: React.FC<RealTimeMonitorProps> = ({
  organizationId,
}) => {
  const [metrics, setMetrics] = useState({
    activeUsers: 0,
    requestsPerSecond: 0,
    dataProcessed: 0,
    queueLength: 0,
  });
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
      // Simulate real-time data updates
      setMetrics({
        activeUsers: Math.floor(Math.random() * 50) + 100,
        requestsPerSecond: Math.floor(Math.random() * 100) + 200,
        dataProcessed: Math.floor(Math.random() * 1000) + 5000,
        queueLength: Math.floor(Math.random() * 20),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [organizationId]);

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2">
          <Activity className="w-5 h-5 text-green-400 animate-pulse" />
          <span className="text-sm">
            <span className="text-gray-400">Active Users:</span>{' '}
            <span className="font-mono font-medium">{metrics.activeUsers}</span>
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          <span className="text-sm">
            <span className="text-gray-400">Requests/s:</span>{' '}
            <span className="font-mono font-medium">{metrics.requestsPerSecond}</span>
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Database className="w-5 h-5 text-blue-400" />
          <span className="text-sm">
            <span className="text-gray-400">Data Processed:</span>{' '}
            <span className="font-mono font-medium">{metrics.dataProcessed} MB</span>
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-purple-400" />
          <span className="text-sm">
            <span className="text-gray-400">Queue:</span>{' '}
            <span className="font-mono font-medium">{metrics.queueLength}</span>
          </span>
        </div>
      </div>
      
      <div className="text-sm text-gray-400 font-mono">
        {time.toLocaleTimeString()}
      </div>
    </div>
  );
};