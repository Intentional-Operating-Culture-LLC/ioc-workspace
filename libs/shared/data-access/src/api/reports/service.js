// Reports service wrapper for API consistency
import { ReportsService as CoreReportsService } from '../../services/ReportsService';

export class ReportsService extends CoreReportsService {
  constructor(supabase) {
    super(supabase);
  }

  // Add any API-specific wrapper methods here if needed
  async getReportsWithCaching(params) {
    // Could add caching layer here
    return this.getReports(params);
  }

  async getReportWithCaching(params) {
    // Could add caching layer here
    return this.getReport(params);
  }
}