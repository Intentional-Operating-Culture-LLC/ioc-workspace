// System service wrapper for API consistency
import { SystemService as CoreSystemService } from '../../services/SystemService';

export class SystemService extends CoreSystemService {
  constructor(supabase) {
    super(supabase);
  }

  // Add any API-specific wrapper methods here if needed
  async getPerformanceMetricsWithCaching(params) {
    // Could add caching layer here
    return this.getPerformanceMetrics(params);
  }

  async getJobStatusWithCaching(params) {
    // Could add caching layer here
    return this.getJobStatus(params);
  }
}