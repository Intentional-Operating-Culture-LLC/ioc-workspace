'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircleIcon,
  ClockIcon,
  UserIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { useRealtime } from './RealtimeProvider';

interface AssessmentEvent {
  id: string;
  type: 'completed' | 'started' | 'progress';
  timestamp: string;
  user: string;
  assessment: string;
  tier: 'individual' | 'executive' | 'organizational';
  progress?: number;
  score?: number;
  organization: string;
}

export function RealTimeAssessmentFeed({ detailed = false }: { detailed?: boolean }) {
  const [events, setEvents] = useState<AssessmentEvent[]>([]);
  const { isConnected, subscribe } = useRealtime();

  useEffect(() => {
    // Generate initial mock events
    const mockEvents: AssessmentEvent[] = [
      {
        id: '1',
        type: 'completed',
        timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
        user: 'John Smith',
        assessment: 'OCEAN Full Assessment',
        tier: 'individual',
        score: 87,
        organization: 'TechCorp Inc',
      },
      {
        id: '2',
        type: 'started',
        timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
        user: 'Sarah Johnson',
        assessment: 'Executive Leadership Profile',
        tier: 'executive',
        organization: 'InnovateFlow',
      },
      {
        id: '3',
        type: 'progress',
        timestamp: new Date(Date.now() - 8 * 60000).toISOString(),
        user: 'Mike Chen',
        assessment: 'Mindset Spectrum Assessment',
        tier: 'individual',
        progress: 65,
        organization: 'DataDrive Solutions',
      },
    ];
    
    setEvents(mockEvents);

    // Subscribe to real-time assessment updates
    const unsubscribe = subscribe('assessment_events', (newEvent: AssessmentEvent) => {
      setEvents(prev => [newEvent, ...prev.slice(0, detailed ? 49 : 9)]);
    });

    // Simulate real-time events for demo
    const interval = setInterval(() => {
      const eventTypes = ['completed', 'started', 'progress'] as const;
      const tiers = ['individual', 'executive', 'organizational'] as const;
      const users = ['Alice Brown', 'Bob Wilson', 'Carol Davis', 'David Lee'];
      const assessments = [
        'OCEAN Full Assessment',
        'Confidence Spectrum',
        'Executive Leadership Profile',
        'Team Composition Analysis',
        'Adaptability Assessment',
      ];
      const organizations = ['TechCorp Inc', 'InnovateFlow', 'DataDrive Solutions', 'CloudScale'];

      const mockEvent: AssessmentEvent = {
        id: Date.now().toString(),
        type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
        timestamp: new Date().toISOString(),
        user: users[Math.floor(Math.random() * users.length)],
        assessment: assessments[Math.floor(Math.random() * assessments.length)],
        tier: tiers[Math.floor(Math.random() * tiers.length)],
        organization: organizations[Math.floor(Math.random() * organizations.length)],
      };

      if (mockEvent.type === 'completed') {
        mockEvent.score = Math.floor(Math.random() * 40) + 60; // 60-100
      } else if (mockEvent.type === 'progress') {
        mockEvent.progress = Math.floor(Math.random() * 60) + 20; // 20-80
      }

      setEvents(prev => [mockEvent, ...prev.slice(0, detailed ? 49 : 9)]);
    }, 10000); // New event every 10 seconds

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [subscribe, detailed]);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'started':
        return <ClockIcon className="h-5 w-5 text-blue-500" />;
      case 'progress':
        return <ChartBarIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <UserIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getEventText = (event: AssessmentEvent) => {
    switch (event.type) {
      case 'completed':
        return `completed ${event.assessment} (Score: ${event.score})`;
      case 'started':
        return `started ${event.assessment}`;
      case 'progress':
        return `is ${event.progress}% through ${event.assessment}`;
      default:
        return event.assessment;
    }
  };

  const formatTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now.getTime() - time.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <div className="chart-container">
      <div className="flex items-center justify-between mb-6">
        <h3 className="chart-title">
          {detailed ? 'Assessment Activity Feed' : 'Real-time Assessment Feed'}
        </h3>
        <div className={`realtime-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
          <div className="pulse-dot mr-2"></div>
          {isConnected ? 'Live' : 'Offline'}
        </div>
      </div>

      <div className={`space-y-4 ${detailed ? 'max-h-[600px]' : 'max-h-[400px]'} overflow-y-auto`}>
        <AnimatePresence>
          {events.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex-shrink-0 mt-1">
                {getEventIcon(event.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">{event.user}</span>
                  <span className={`assessment-tier-badge ${event.tier}`}>
                    {event.tier}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {getEventText(event)}
                </p>
                {detailed && (
                  <p className="text-xs text-gray-500 mt-1">
                    {event.organization}
                  </p>
                )}
                {event.progress && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Progress</span>
                      <span>{event.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${event.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex-shrink-0 text-xs text-gray-500">
                {formatTime(event.timestamp)}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {events.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <ChartBarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No recent assessment activity</p>
        </div>
      )}
    </div>
  );
}