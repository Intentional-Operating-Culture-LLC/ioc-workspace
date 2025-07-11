/**
 * Performance Test Results Analyzer
 */

const fs = require('fs');
const path = require('path');

class PerformanceAnalyzer {
  constructor(resultsFile) {
    this.results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
    this.thresholds = {
      http_req_duration: { p95: 500, p99: 1000 },
      assessment_completion_time: { p95: 120000 },
      score_calculation_time: { p95: 200 },
      api_response_time: { p95: 300 },
      error_rate: { max: 0.05 },
    };
  }

  analyze() {
    const report = {
      summary: this.generateSummary(),
      metrics: this.analyzeMetrics(),
      scenarios: this.analyzeScenarios(),
      bottlenecks: this.identifyBottlenecks(),
      recommendations: this.generateRecommendations(),
    };

    return report;
  }

  generateSummary() {
    const { metrics } = this.results;
    return {
      total_requests: metrics.http_reqs?.values?.count || 0,
      total_duration: metrics.iteration_duration?.values?.max || 0,
      success_rate: this.calculateSuccessRate(),
      avg_response_time: metrics.http_req_duration?.values?.avg || 0,
      peak_concurrent_users: this.calculatePeakUsers(),
    };
  }

  analyzeMetrics() {
    const { metrics } = this.results;
    const analysis = {};

    for (const [key, threshold] of Object.entries(this.thresholds)) {
      const metric = metrics[key];
      if (!metric) continue;

      const values = metric.values || {};
      analysis[key] = {
        avg: values.avg,
        min: values.min,
        max: values.max,
        p95: values['p(95)'],
        p99: values['p(99)'],
        passed: this.checkThreshold(values, threshold),
      };
    }

    return analysis;
  }

  analyzeScenarios() {
    const scenarios = {};
    const { root_group } = this.results;

    if (root_group && root_group.groups) {
      for (const [scenario, data] of Object.entries(root_group.groups)) {
        scenarios[scenario] = {
          checks_passed: data.checks?.filter(c => c.passes).length || 0,
          checks_failed: data.checks?.filter(c => c.fails).length || 0,
          duration: data.duration,
          iterations: data.iterations,
        };
      }
    }

    return scenarios;
  }

  identifyBottlenecks() {
    const bottlenecks = [];
    const { metrics } = this.results;

    // Check for slow endpoints
    if (metrics.http_req_duration?.values?.['p(95)'] > 500) {
      bottlenecks.push({
        type: 'slow_response',
        severity: 'high',
        detail: 'API response times exceed acceptable threshold',
        value: metrics.http_req_duration.values['p(95)'],
        threshold: 500,
      });
    }

    // Check for high error rate
    const errorRate = this.calculateErrorRate();
    if (errorRate > 0.05) {
      bottlenecks.push({
        type: 'high_error_rate',
        severity: 'critical',
        detail: 'Error rate exceeds 5%',
        value: errorRate,
        threshold: 0.05,
      });
    }

    // Check for score calculation performance
    if (metrics.score_calculation_time?.values?.['p(95)'] > 200) {
      bottlenecks.push({
        type: 'slow_calculation',
        severity: 'medium',
        detail: 'OCEAN score calculation taking too long',
        value: metrics.score_calculation_time.values['p(95)'],
        threshold: 200,
      });
    }

    return bottlenecks;
  }

  generateRecommendations() {
    const recommendations = [];
    const bottlenecks = this.identifyBottlenecks();

    for (const bottleneck of bottlenecks) {
      switch (bottleneck.type) {
        case 'slow_response':
          recommendations.push({
            issue: 'Slow API Response Times',
            suggestions: [
              'Implement response caching for frequently accessed data',
              'Optimize database queries with proper indexing',
              'Consider implementing a CDN for static assets',
              'Use database connection pooling',
            ],
          });
          break;

        case 'high_error_rate':
          recommendations.push({
            issue: 'High Error Rate',
            suggestions: [
              'Implement circuit breakers for external services',
              'Add retry logic with exponential backoff',
              'Improve error handling and validation',
              'Monitor and alert on error spikes',
            ],
          });
          break;

        case 'slow_calculation':
          recommendations.push({
            issue: 'Slow Score Calculations',
            suggestions: [
              'Pre-calculate and cache OCEAN mappings',
              'Implement batch processing for multiple responses',
              'Consider moving calculations to background jobs',
              'Optimize algorithm complexity',
            ],
          });
          break;
      }
    }

    return recommendations;
  }

  calculateSuccessRate() {
    const { metrics } = this.results;
    const total = metrics.http_reqs?.values?.count || 0;
    const errors = metrics.errors?.values?.count || 0;
    return total > 0 ? ((total - errors) / total) * 100 : 0;
  }

  calculateErrorRate() {
    const { metrics } = this.results;
    const total = metrics.http_reqs?.values?.count || 0;
    const errors = metrics.errors?.values?.count || 0;
    return total > 0 ? errors / total : 0;
  }

  calculatePeakUsers() {
    // Estimate based on iterations and duration
    const { metrics } = this.results;
    const iterations = metrics.iterations?.values?.count || 0;
    const duration = metrics.iteration_duration?.values?.max || 1;
    return Math.ceil(iterations / (duration / 1000));
  }

  checkThreshold(values, threshold) {
    if (threshold.p95 && values['p(95)'] > threshold.p95) return false;
    if (threshold.p99 && values['p(99)'] > threshold.p99) return false;
    if (threshold.max && values.max > threshold.max) return false;
    return true;
  }

  generateReport() {
    const analysis = this.analyze();
    
    return `
# OCEAN Assessment Performance Test Report

## Executive Summary
- Total Requests: ${analysis.summary.total_requests.toLocaleString()}
- Success Rate: ${analysis.summary.success_rate.toFixed(2)}%
- Average Response Time: ${analysis.summary.avg_response_time.toFixed(0)}ms
- Peak Concurrent Users: ${analysis.summary.peak_concurrent_users}

## Performance Metrics
${this.formatMetrics(analysis.metrics)}

## Scenario Analysis
${this.formatScenarios(analysis.scenarios)}

## Identified Bottlenecks
${this.formatBottlenecks(analysis.bottlenecks)}

## Recommendations
${this.formatRecommendations(analysis.recommendations)}

## Conclusion
${this.generateConclusion(analysis)}
`;
  }

  formatMetrics(metrics) {
    let output = '';
    for (const [key, data] of Object.entries(metrics)) {
      output += `
### ${this.formatMetricName(key)}
- Average: ${data.avg?.toFixed(2)}ms
- P95: ${data.p95?.toFixed(2)}ms
- P99: ${data.p99?.toFixed(2)}ms
- Max: ${data.max?.toFixed(2)}ms
- Status: ${data.passed ? '✅ PASSED' : '❌ FAILED'}
`;
    }
    return output;
  }

  formatScenarios(scenarios) {
    let output = '';
    for (const [name, data] of Object.entries(scenarios)) {
      const passRate = (data.checks_passed / (data.checks_passed + data.checks_failed)) * 100;
      output += `
### ${name}
- Iterations: ${data.iterations}
- Duration: ${(data.duration / 1000).toFixed(2)}s
- Checks Passed: ${data.checks_passed}
- Checks Failed: ${data.checks_failed}
- Pass Rate: ${passRate.toFixed(2)}%
`;
    }
    return output;
  }

  formatBottlenecks(bottlenecks) {
    if (bottlenecks.length === 0) {
      return 'No significant bottlenecks identified. ✅';
    }

    let output = '';
    for (const bottleneck of bottlenecks) {
      output += `
### ${bottleneck.type.toUpperCase()} (${bottleneck.severity})
- ${bottleneck.detail}
- Current: ${bottleneck.value.toFixed(2)}
- Threshold: ${bottleneck.threshold}
`;
    }
    return output;
  }

  formatRecommendations(recommendations) {
    if (recommendations.length === 0) {
      return 'No immediate optimizations required. System is performing within acceptable parameters.';
    }

    let output = '';
    for (const rec of recommendations) {
      output += `
### ${rec.issue}
${rec.suggestions.map(s => `- ${s}`).join('\n')}
`;
    }
    return output;
  }

  formatMetricName(key) {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  generateConclusion(analysis) {
    const { bottlenecks, summary } = analysis;
    
    if (bottlenecks.length === 0 && summary.success_rate > 95) {
      return 'The OCEAN assessment system is performing excellently under load. All performance thresholds are being met, and the system shows good scalability characteristics.';
    } else if (bottlenecks.length < 3 && summary.success_rate > 90) {
      return 'The OCEAN assessment system is performing adequately, but there are some areas for optimization. Implementing the recommended improvements will enhance user experience and system reliability.';
    } else {
      return 'The OCEAN assessment system requires immediate attention to address performance issues. Priority should be given to the critical bottlenecks identified above.';
    }
  }
}

// Main execution
if (require.main === module) {
  const resultsFile = process.argv[2];
  
  if (!resultsFile) {
    console.error('Usage: node analyze-performance.js <results-file.json>');
    process.exit(1);
  }

  try {
    const analyzer = new PerformanceAnalyzer(resultsFile);
    const report = analyzer.generateReport();
    
    // Save report
    const reportPath = path.join(
      path.dirname(resultsFile),
      'performance-analysis.md'
    );
    fs.writeFileSync(reportPath, report);
    
    console.log(`Performance analysis complete. Report saved to: ${reportPath}`);
    
    // Exit with error if critical issues found
    const analysis = analyzer.analyze();
    if (analysis.bottlenecks.some(b => b.severity === 'critical')) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Error analyzing performance results:', error);
    process.exit(1);
  }
}

module.exports = PerformanceAnalyzer;