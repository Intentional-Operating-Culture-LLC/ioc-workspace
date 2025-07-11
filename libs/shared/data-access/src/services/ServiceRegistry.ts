/**
 * Service Registry
 * Manages service registration and dependency injection
 */

import { IService, IServiceRegistry, ServiceHealth } from './interfaces';

export class ServiceRegistry implements IServiceRegistry {
  private services: Map<string, IService> = new Map();
  private initializationOrder: string[] = [];

  register<T extends IService>(name: string, service: T): void {
    if (this.services.has(name)) {
      throw new Error(`Service '${name}' is already registered`);
    }

    this.services.set(name, service);
    this.initializationOrder.push(name);
    
    console.log(`✅ Registered service: ${name}`);
  }

  get<T extends IService>(name: string): T {
    const service = this.services.get(name);
    
    if (!service) {
      throw new Error(`Service '${name}' not found in registry`);
    }

    return service as T;
  }

  getAll(): Map<string, IService> {
    return new Map(this.services);
  }

  has(name: string): boolean {
    return this.services.has(name);
  }

  unregister(name: string): void {
    if (!this.services.has(name)) {
      throw new Error(`Service '${name}' not found in registry`);
    }

    this.services.delete(name);
    this.initializationOrder = this.initializationOrder.filter(n => n !== name);
    
    console.log(`✅ Unregistered service: ${name}`);
  }

  async initializeAll(): Promise<void> {
    console.log('🚀 Initializing all services...');
    
    for (const name of this.initializationOrder) {
      const service = this.services.get(name);
      if (service) {
        try {
          console.log(`  Initializing ${name}...`);
          await service.initialize();
          console.log(`  ✅ ${name} initialized`);
        } catch (error: any) {
          console.error(`  ❌ Failed to initialize ${name}:`, error.message);
          throw new Error(`Service initialization failed for ${name}: ${error.message}`);
        }
      }
    }
    
    console.log('✅ All services initialized successfully');
  }

  async shutdownAll(): Promise<void> {
    console.log('🛑 Shutting down all services...');
    
    // Shutdown in reverse order of initialization
    const shutdownOrder = [...this.initializationOrder].reverse();
    
    for (const name of shutdownOrder) {
      const service = this.services.get(name);
      if (service) {
        try {
          console.log(`  Shutting down ${name}...`);
          await service.shutdown();
          console.log(`  ✅ ${name} shut down`);
        } catch (error: any) {
          console.error(`  ⚠️  Failed to shutdown ${name}:`, error.message);
          // Continue shutting down other services
        }
      }
    }
    
    console.log('✅ All services shut down');
  }

  async healthCheckAll(): Promise<Map<string, ServiceHealth>> {
    const healthChecks = new Map<string, ServiceHealth>();
    
    console.log('🏥 Performing health checks on all services...');
    
    for (const [name, service] of this.services) {
      try {
        const health = await service.healthCheck();
        healthChecks.set(name, health);
        
        const icon = health.status === 'healthy' ? '✅' : 
                    health.status === 'degraded' ? '⚠️' : '❌';
        console.log(`  ${icon} ${name}: ${health.status} - ${health.message}`);
      } catch (error: any) {
        healthChecks.set(name, {
          status: 'unhealthy',
          message: `Health check failed: ${error.message}`,
          lastCheck: new Date()
        });
        console.log(`  ❌ ${name}: unhealthy - Health check failed`);
      }
    }
    
    const healthyCount = Array.from(healthChecks.values())
      .filter(h => h.status === 'healthy').length;
    const totalCount = healthChecks.size;
    
    console.log(`🏥 Health check complete: ${healthyCount}/${totalCount} services healthy`);
    
    return healthChecks;
  }

  /**
   * Get service dependency graph
   */
  getDependencyGraph(): Map<string, string[]> {
    // In a more complex system, this would analyze actual dependencies
    // For now, return initialization order as a simple dependency chain
    const graph = new Map<string, string[]>();
    
    for (let i = 0; i < this.initializationOrder.length; i++) {
      const service = this.initializationOrder[i];
      const dependencies = this.initializationOrder.slice(0, i);
      graph.set(service, dependencies);
    }
    
    return graph;
  }

  /**
   * Get service statistics
   */
  getStatistics(): {
    totalServices: number;
    healthyServices: number;
    degradedServices: number;
    unhealthyServices: number;
    services: Array<{ name: string; status: string }>;
  } {
    const stats = {
      totalServices: this.services.size,
      healthyServices: 0,
      degradedServices: 0,
      unhealthyServices: 0,
      services: [] as Array<{ name: string; status: string }>
    };

    // This would need to be async in real usage, but for now we'll just return structure
    for (const [name] of this.services) {
      stats.services.push({ name, status: 'unknown' });
    }

    return stats;
  }
}

// Create and export singleton instance
export const serviceRegistry = new ServiceRegistry();