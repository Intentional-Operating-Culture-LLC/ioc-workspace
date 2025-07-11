import { createClient } from '@supabase/supabase-js';
import { DashboardService } from './DashboardService';
import { SystemService } from './SystemService';

export interface WebSocketConnection {
  id: string;
  userId: string;
  organizationId: string;
  socketId?: string;
  connectedAt: string;
  lastActivity: string;
  subscriptions: string[];
  metadata?: Record<string, any>;
}

export interface RealtimeMessage {
  type: 'dashboard_update' | 'metric_update' | 'system_alert' | 'user_activity' | 'report_ready';
  payload: Record<string, any>;
  timestamp: string;
  organizationId: string;
  userId?: string;
}

export interface SubscriptionParams {
  type: 'dashboard' | 'metrics' | 'activity' | 'system' | 'reports';
  filters?: Record<string, any>;
}

export class WebSocketService {
  private connections: Map<string, WebSocketConnection> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map(); // subscription_type -> connection_ids
  private dashboardService?: DashboardService;
  private systemService?: SystemService;
  private updateInterval?: NodeJS.Timeout;

  constructor(private supabase?: ReturnType<typeof createClient>) {
    if (supabase) {
      this.dashboardService = new DashboardService(supabase);
      this.systemService = new SystemService(supabase);
    }

    // Start real-time update cycle
    this.startUpdateCycle();
  }

  async initializeConnection(params: {
    organizationId: string;
    userId: string;
    request: Request;
  }): Promise<{ connectionId: string; subscriptions: string[] }> {
    const connectionId = this.generateConnectionId();
    
    const connection: WebSocketConnection = {
      id: connectionId,
      userId: params.userId,
      organizationId: params.organizationId,
      connectedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      subscriptions: [],
    };

    this.connections.set(connectionId, connection);

    // Auto-subscribe to basic dashboard updates
    await this.subscribe(connectionId, {
      type: 'dashboard',
      filters: { organizationId: params.organizationId },
    });

    return {
      connectionId,
      subscriptions: connection.subscriptions,
    };
  }

  async subscribe(connectionId: string, params: SubscriptionParams): Promise<{ success: boolean }> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    const subscriptionKey = `${params.type}:${params.filters?.organizationId || 'global'}`;
    
    // Add to connection subscriptions
    if (!connection.subscriptions.includes(subscriptionKey)) {
      connection.subscriptions.push(subscriptionKey);
    }

    // Add to global subscriptions map
    if (!this.subscriptions.has(subscriptionKey)) {
      this.subscriptions.set(subscriptionKey, new Set());
    }
    this.subscriptions.get(subscriptionKey)!.add(connectionId);

    // Update last activity
    connection.lastActivity = new Date().toISOString();

    return { success: true };
  }

  async unsubscribe(connectionId: string, subscriptionKey: string): Promise<{ success: boolean }> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    // Remove from connection subscriptions
    connection.subscriptions = connection.subscriptions.filter(s => s !== subscriptionKey);

    // Remove from global subscriptions map
    const subscribers = this.subscriptions.get(subscriptionKey);
    if (subscribers) {
      subscribers.delete(connectionId);
      if (subscribers.size === 0) {
        this.subscriptions.delete(subscriptionKey);
      }
    }

    return { success: true };
  }

  async disconnect(connectionId: string): Promise<{ success: boolean }> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return { success: false };
    }

    // Remove from all subscriptions
    for (const subscriptionKey of connection.subscriptions) {
      const subscribers = this.subscriptions.get(subscriptionKey);
      if (subscribers) {
        subscribers.delete(connectionId);
        if (subscribers.size === 0) {
          this.subscriptions.delete(subscriptionKey);
        }
      }
    }

    // Remove connection
    this.connections.delete(connectionId);

    return { success: true };
  }

  async broadcastMessage(message: RealtimeMessage, targetSubscription?: string): Promise<{ sent: number }> {
    let targetConnections: Set<string> = new Set();

    if (targetSubscription) {
      // Send to specific subscription
      const subscribers = this.subscriptions.get(targetSubscription);
      if (subscribers) {
        targetConnections = new Set(subscribers);
      }
    } else {
      // Send to organization-specific subscribers
      const orgSubscriptions = Array.from(this.subscriptions.keys())
        .filter(key => key.includes(message.organizationId));
      
      for (const subKey of orgSubscriptions) {
        const subscribers = this.subscriptions.get(subKey);
        if (subscribers) {
          subscribers.forEach(connId => targetConnections.add(connId));
        }
      }
    }

    // Filter active connections
    const activeConnections = Array.from(targetConnections)
      .filter(connId => this.connections.has(connId));

    // In a real implementation, this would send via WebSocket
    // For now, we'll simulate the broadcast
    console.log(`Broadcasting to ${activeConnections.length} connections:`, message);

    return { sent: activeConnections.length };
  }

  async sendDashboardUpdate(organizationId: string): Promise<void> {
    if (!this.dashboardService) return;

    try {
      const realtimeData = await this.dashboardService.getRealtimeData({ organizationId });
      
      const message: RealtimeMessage = {
        type: 'dashboard_update',
        payload: realtimeData,
        timestamp: new Date().toISOString(),
        organizationId,
      };

      await this.broadcastMessage(message, `dashboard:${organizationId}`);
    } catch (error) {
      console.error('Failed to send dashboard update:', error);
    }
  }

  async sendMetricUpdate(organizationId: string, metricData: any): Promise<void> {
    const message: RealtimeMessage = {
      type: 'metric_update',
      payload: metricData,
      timestamp: new Date().toISOString(),
      organizationId,
    };

    await this.broadcastMessage(message, `metrics:${organizationId}`);
  }

  async sendSystemAlert(alert: {
    level: 'info' | 'warning' | 'error';
    title: string;
    message: string;
    organizationId?: string;
  }): Promise<void> {
    const message: RealtimeMessage = {
      type: 'system_alert',
      payload: alert,
      timestamp: new Date().toISOString(),
      organizationId: alert.organizationId || 'global',
    };

    const targetSubscription = alert.organizationId 
      ? `system:${alert.organizationId}` 
      : 'system:global';

    await this.broadcastMessage(message, targetSubscription);
  }

  async sendUserActivityUpdate(organizationId: string, activityData: any): Promise<void> {
    const message: RealtimeMessage = {
      type: 'user_activity',
      payload: activityData,
      timestamp: new Date().toISOString(),
      organizationId,
    };

    await this.broadcastMessage(message, `activity:${organizationId}`);
  }

  async sendReportReady(organizationId: string, reportData: any): Promise<void> {
    const message: RealtimeMessage = {
      type: 'report_ready',
      payload: reportData,
      timestamp: new Date().toISOString(),
      organizationId,
    };

    await this.broadcastMessage(message, `reports:${organizationId}`);
  }

  getConnectionStats(): {
    totalConnections: number;
    activeConnections: number;
    subscriptionTypes: Record<string, number>;
    organizationCounts: Record<string, number>;
  } {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    const activeConnections = Array.from(this.connections.values())
      .filter(conn => new Date(conn.lastActivity).getTime() > fiveMinutesAgo);

    const subscriptionTypes: Record<string, number> = {};
    const organizationCounts: Record<string, number> = {};

    for (const [key, subscribers] of this.subscriptions.entries()) {
      const [type] = key.split(':');
      subscriptionTypes[type] = (subscriptionTypes[type] || 0) + subscribers.size;
    }

    for (const connection of activeConnections) {
      const orgId = connection.organizationId;
      organizationCounts[orgId] = (organizationCounts[orgId] || 0) + 1;
    }

    return {
      totalConnections: this.connections.size,
      activeConnections: activeConnections.length,
      subscriptionTypes,
      organizationCounts,
    };
  }

  async getActiveConnections(organizationId?: string): Promise<WebSocketConnection[]> {
    const connections = Array.from(this.connections.values());
    
    if (organizationId) {
      return connections.filter(conn => conn.organizationId === organizationId);
    }

    return connections;
  }

  private startUpdateCycle(): void {
    // Send periodic updates every 30 seconds
    this.updateInterval = setInterval(async () => {
      await this.sendPeriodicUpdates();
    }, 30000);
  }

  private async sendPeriodicUpdates(): Promise<void> {
    if (!this.dashboardService || !this.systemService) return;

    // Get unique organization IDs from active connections
    const organizationIds = new Set(
      Array.from(this.connections.values()).map(conn => conn.organizationId)
    );

    for (const organizationId of organizationIds) {
      // Check if there are dashboard subscribers for this organization
      const dashboardSubscribers = this.subscriptions.get(`dashboard:${organizationId}`);
      if (dashboardSubscribers && dashboardSubscribers.size > 0) {
        await this.sendDashboardUpdate(organizationId);
      }
    }

    // Send system health updates if there are system subscribers
    const systemSubscribers = this.subscriptions.get('system:global');
    if (systemSubscribers && systemSubscribers.size > 0) {
      try {
        const healthStatus = await this.systemService.getSystemHealth();
        await this.sendSystemAlert({
          level: healthStatus.status === 'healthy' ? 'info' : 
                 healthStatus.status === 'warning' ? 'warning' : 'error',
          title: 'System Health Update',
          message: `System status: ${healthStatus.status}`,
        });
      } catch (error) {
        console.error('Failed to send system health update:', error);
      }
    }
  }

  private generateConnectionId(): string {
    return 'conn_' + Math.random().toString(36).substring(2) + '_' + Date.now();
  }

  // Cleanup inactive connections
  async cleanup(): Promise<{ cleaned: number }> {
    const now = Date.now();
    const thirtyMinutesAgo = now - 30 * 60 * 1000;
    let cleaned = 0;

    for (const [connectionId, connection] of this.connections.entries()) {
      const lastActivity = new Date(connection.lastActivity).getTime();
      if (lastActivity < thirtyMinutesAgo) {
        await this.disconnect(connectionId);
        cleaned++;
      }
    }

    return { cleaned };
  }

  // Stop the service
  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }

    // Disconnect all connections
    for (const connectionId of this.connections.keys()) {
      this.disconnect(connectionId);
    }
  }

  // Simulate receiving external events (for integration with other services)
  async handleExternalEvent(event: {
    type: string;
    organizationId: string;
    data: any;
  }): Promise<void> {
    switch (event.type) {
      case 'assessment_completed':
        await this.sendDashboardUpdate(event.organizationId);
        await this.sendUserActivityUpdate(event.organizationId, {
          type: 'assessment_completed',
          ...event.data,
        });
        break;

      case 'report_generated':
        await this.sendReportReady(event.organizationId, event.data);
        break;

      case 'metric_calculated':
        await this.sendMetricUpdate(event.organizationId, event.data);
        break;

      case 'system_error':
        await this.sendSystemAlert({
          level: 'error',
          title: 'System Error',
          message: event.data.message,
          organizationId: event.organizationId,
        });
        break;

      default:
        console.log('Unknown external event type:', event.type);
    }
  }
}