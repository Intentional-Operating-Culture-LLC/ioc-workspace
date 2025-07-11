// Dashboard service wrapper for API consistency
import { DashboardService as CoreDashboardService } from '../../services/DashboardService';

export class DashboardService extends CoreDashboardService {
  constructor(supabase) {
    super(supabase);
  }

  // Add any API-specific wrapper methods here if needed
  async getMetricsWithCaching(params) {
    // Could add caching layer here
    return this.getMetrics(params);
  }

  async getSummaryWithCaching(params) {
    // Could add caching layer here
    return this.getSummary(params);
  }
}