'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface RealtimeContextType {
  isConnected: boolean;
  subscribe: (channel: string, callback: (data: any) => void) => () => void;
  unsubscribe: (channel: string) => void;
  connectionStats: {
    totalConnections: number;
    activeConnections: number;
    subscriptionTypes: Record<string, number>;
  };
}

const RealtimeContext = createContext<RealtimeContextType | null>(null);

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}

interface RealtimeProviderProps {
  children: React.ReactNode;
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [subscriptions, setSubscriptions] = useState<Map<string, Set<(data: any) => void>>>(new Map());
  const [connectionStats, setConnectionStats] = useState({
    totalConnections: 0,
    activeConnections: 0,
    subscriptionTypes: {},
  });

  // Initialize WebSocket connection
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/admin/websocket`;
    
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('Admin WebSocket connected');
      setIsConnected(true);
      setWebsocket(ws);
      
      // Send initial authentication and subscription
      ws.send(JSON.stringify({
        type: 'auth',
        token: typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null, // You'll need to implement admin auth
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onclose = (event) => {
      console.log('Admin WebSocket disconnected', event.code, event.reason);
      setIsConnected(false);
      setWebsocket(null);
      
      // Only attempt reconnection for normal closures (not server unavailable)
      if (event.code !== 1006 && event.code !== 1011) {
        // Attempt to reconnect after 30 seconds for normal disconnections
        setTimeout(() => {
          if (!websocket || websocket.readyState === WebSocket.CLOSED) {
            // Re-initialize WebSocket (not reload page)
            console.log('Attempting WebSocket reconnection...');
            // This will trigger the useEffect to run again
            setWebsocket(null);
          }
        }, 30000);
      } else {
        console.log('WebSocket server unavailable, running in offline mode');
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, []);

  const handleWebSocketMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'metric_update':
      case 'dashboard_update':
      case 'assessment_completed':
      case 'system_alert':
        // Broadcast to relevant subscribers
        const channel = message.channel || message.type;
        const callbacks = subscriptions.get(channel);
        if (callbacks) {
          callbacks.forEach(callback => callback(message.payload || message.data));
        }
        break;
        
      case 'connection_stats':
        setConnectionStats(message.data);
        break;
        
      case 'pong':
        // Handle heartbeat response
        break;
        
      default:
        console.log('Unknown message type:', message.type);
    }
  }, [subscriptions]);

  // Send heartbeat every 30 seconds
  useEffect(() => {
    if (!websocket || !isConnected) return;

    const heartbeat = setInterval(() => {
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    return () => clearInterval(heartbeat);
  }, [websocket, isConnected]);

  const subscribe = useCallback((channel: string, callback: (data: any) => void) => {
    setSubscriptions(prev => {
      const newSubs = new Map(prev);
      if (!newSubs.has(channel)) {
        newSubs.set(channel, new Set());
      }
      newSubs.get(channel)!.add(callback);
      return newSubs;
    });

    // Send subscription message to server
    if (websocket && isConnected) {
      websocket.send(JSON.stringify({
        type: 'subscribe',
        channel,
      }));
    }

    // Return unsubscribe function
    return () => {
      setSubscriptions(prev => {
        const newSubs = new Map(prev);
        const channelSubs = newSubs.get(channel);
        if (channelSubs) {
          channelSubs.delete(callback);
          if (channelSubs.size === 0) {
            newSubs.delete(channel);
            
            // Send unsubscribe message to server
            if (websocket && isConnected) {
              websocket.send(JSON.stringify({
                type: 'unsubscribe',
                channel,
              }));
            }
          }
        }
        return newSubs;
      });
    };
  }, [websocket, isConnected]);

  const unsubscribe = useCallback((channel: string) => {
    setSubscriptions(prev => {
      const newSubs = new Map(prev);
      newSubs.delete(channel);
      return newSubs;
    });

    if (websocket && isConnected) {
      websocket.send(JSON.stringify({
        type: 'unsubscribe',
        channel,
      }));
    }
  }, [websocket, isConnected]);

  const contextValue: RealtimeContextType = {
    isConnected,
    subscribe,
    unsubscribe,
    connectionStats,
  };

  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
    </RealtimeContext.Provider>
  );
}