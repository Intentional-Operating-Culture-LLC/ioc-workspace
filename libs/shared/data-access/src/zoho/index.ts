/**
 * Zoho Campaigns API Client Library
 * Complete production-ready solution for email campaign automation
 */

// Core client
export { default as ZohoCampaignsClient } from './campaigns-client';
// Note: Core types are now exported from @ioc/types
export type {
  Campaign,
  MailingList,
  Contact,
  Template,
  CampaignStats,
  DeliveryReport
} from './campaigns-client';

// Automation service
export { default as CampaignAutomationService } from './campaign-automation';
// Note: Core types are now exported from @ioc/types
export type {
  CampaignResult,
  AutomationReport
} from './campaign-automation';

// Configuration management
export { default as ZohoConfigLoader } from './config';
export {
  zohoConfig,
  createCampaignsClient,
  createAutomationService,
  createDemoService
} from './config';
// Note: ZohoEnvironmentConfig is now exported from @ioc/types

// Monitoring and logging
export { default as ZohoCampaignsMonitor } from './monitoring';
export type {
  LogEntry,
  MetricData,
  AlertConfig,
  MonitoringConfig,
  CampaignMetrics,
  SystemMetrics,
  AlertStatus
} from './monitoring';

// Testing suite
export { default as ZohoCampaignsTestSuite } from './test-suite';
export type {
  TestConfig,
  TestResult,
  TestSuite
} from './test-suite';

// Re-export for convenience
import ZohoCampaignsClient from './campaigns-client';
import CampaignAutomationService from './campaign-automation';
import ZohoCampaignsMonitor from './monitoring';
import ZohoCampaignsTestSuite from './test-suite';

export {
  ZohoCampaignsClient as Client,
  CampaignAutomationService as AutomationService,
  ZohoCampaignsMonitor as Monitor,
  ZohoCampaignsTestSuite as TestSuiteClass
};