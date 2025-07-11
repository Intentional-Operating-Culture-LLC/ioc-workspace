/**
 * Services Module
 * Exports all service interfaces and implementations
 */

// Export interfaces
export * from './interfaces';

// Export service implementations
export { ConfigurationService, configurationService } from './ConfigurationService';
export { LeadScoringService, leadScoringService } from './LeadScoringService';
export { CampaignManagementService, campaignManagementService } from './CampaignManagementService';
export { AnalyticsService, analyticsService } from './AnalyticsService';
export { EmailService, emailService } from './EmailService';
export { ServiceRegistry, serviceRegistry } from './ServiceRegistry';

// Export new dashboard and reporting services
export { DashboardService } from './DashboardService';
export { ReportsService } from './ReportsService';
export { ReportGenerator } from './ReportGenerator';
export { ReportExporter } from './ReportExporter';
export { SystemService } from './SystemService';
export { WebSocketService } from './WebSocketService';
export { CacheService, globalCache, dashboardCache, reportsCache, metricsCache, CacheHelper } from './CacheService';

// Initialize and register all services
import { serviceRegistry } from './ServiceRegistry';
import { configurationService } from './ConfigurationService';
import { leadScoringService } from './LeadScoringService';
import { campaignManagementService } from './CampaignManagementService';
import { analyticsService } from './AnalyticsService';
import { emailService } from './EmailService';

// Register services in dependency order
export function registerAllServices(): void {
  // Configuration should be first as other services depend on it
  serviceRegistry.register('configuration', configurationService);
  
  // Analytics is used by other services
  serviceRegistry.register('analytics', analyticsService);
  
  // Email service is used by campaign management
  serviceRegistry.register('email', emailService);
  
  // Lead scoring is independent
  serviceRegistry.register('leadScoring', leadScoringService);
  
  // Campaign management depends on analytics and email
  serviceRegistry.register('campaignManagement', campaignManagementService);
}

// Helper function to initialize all services
export async function initializeServices(): Promise<void> {
  registerAllServices();
  await serviceRegistry.initializeAll();
}

// Helper function to shutdown all services
export async function shutdownServices(): Promise<void> {
  await serviceRegistry.shutdownAll();
}

// Helper function to get service health
export async function getServicesHealth(): Promise<Map<string, import('./interfaces').ServiceHealth>> {
  return serviceRegistry.healthCheckAll();
}