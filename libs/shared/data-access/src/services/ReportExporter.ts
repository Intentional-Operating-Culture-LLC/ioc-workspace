import { createClient } from '@supabase/supabase-js';
import { ReportsService, WeeklyReport, ReportSection } from './ReportsService';

export interface ExportParams {
  reportId: string;
  organizationId: string;
  format: 'pdf' | 'excel' | 'csv' | 'html' | 'json';
  includeCharts: boolean;
  includeRawData: boolean;
  template?: string;
}

export interface ExportResult {
  format: string;
  data: Buffer | string;
  filename: string;
  contentType: string;
  size: number;
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'radar' | 'scatter';
  data: any;
  options?: any;
  width?: number;
  height?: number;
}

export class ReportExporter {
  private reportsService: ReportsService;

  constructor(private supabase: ReturnType<typeof createClient>) {
    this.reportsService = new ReportsService(supabase);
  }

  async exportReport(params: ExportParams): Promise<ExportResult> {
    // Get report with sections
    const report = await this.reportsService.getReport({
      reportId: params.reportId,
      organizationId: params.organizationId,
    });

    if (!report) {
      throw new Error('Report not found');
    }

    switch (params.format) {
      case 'pdf':
        return this.exportToPDF(report, params);
      case 'excel':
        return this.exportToExcel(report, params);
      case 'csv':
        return this.exportToCSV(report, params);
      case 'html':
        return this.exportToHTML(report, params);
      case 'json':
        return this.exportToJSON(report, params);
      default:
        throw new Error(`Unsupported export format: ${params.format}`);
    }
  }

  private async exportToPDF(
    report: WeeklyReport & { sections: ReportSection[] },
    params: ExportParams
  ): Promise<ExportResult> {
    // In a real implementation, this would use a library like puppeteer or jsPDF
    // For now, we'll create a mock PDF structure
    
    const htmlContent = await this.generateHTMLContent(report, params);
    
    // Mock PDF generation - in reality, use puppeteer or similar
    const pdfData = Buffer.from(`PDF Mock Data for Report: ${report.title}\n\n${htmlContent}`);
    
    return {
      format: 'pdf',
      data: pdfData,
      filename: `report-${report.id}-${this.formatDate(new Date())}.pdf`,
      contentType: 'application/pdf',
      size: pdfData.length,
    };
  }

  private async exportToExcel(
    report: WeeklyReport & { sections: ReportSection[] },
    params: ExportParams
  ): Promise<ExportResult> {
    // Mock Excel export - in reality, use exceljs or similar library
    const excelData = this.generateExcelData(report, params);
    const data = Buffer.from(JSON.stringify(excelData, null, 2));
    
    return {
      format: 'excel',
      data,
      filename: `report-${report.id}-${this.formatDate(new Date())}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: data.length,
    };
  }

  private async exportToCSV(
    report: WeeklyReport & { sections: ReportSection[] },
    params: ExportParams
  ): Promise<ExportResult> {
    const csvData = this.generateCSVData(report, params);
    const data = Buffer.from(csvData);
    
    return {
      format: 'csv',
      data,
      filename: `report-${report.id}-${this.formatDate(new Date())}.csv`,
      contentType: 'text/csv',
      size: data.length,
    };
  }

  private async exportToHTML(
    report: WeeklyReport & { sections: ReportSection[] },
    params: ExportParams
  ): Promise<ExportResult> {
    const htmlContent = await this.generateHTMLContent(report, params);
    const data = Buffer.from(htmlContent);
    
    return {
      format: 'html',
      data,
      filename: `report-${report.id}-${this.formatDate(new Date())}.html`,
      contentType: 'text/html',
      size: data.length,
    };
  }

  private async exportToJSON(
    report: WeeklyReport & { sections: ReportSection[] },
    params: ExportParams
  ): Promise<ExportResult> {
    const jsonData = {
      report: {
        id: report.id,
        title: report.title,
        period_start: report.report_period_start,
        period_end: report.report_period_end,
        status: report.status,
        executive_summary: report.executive_summary,
        created_at: report.created_at,
        metadata: report.metadata,
      },
      sections: report.sections.map(section => ({
        id: section.id,
        type: section.section_type,
        title: section.section_title,
        order: section.section_order,
        content: section.content,
        charts_data: params.includeCharts ? section.charts_data : undefined,
        tables_data: section.tables_data,
        insights: section.insights,
      })),
      export_info: {
        exported_at: new Date().toISOString(),
        format: 'json',
        include_charts: params.includeCharts,
        include_raw_data: params.includeRawData,
      },
    };

    const data = Buffer.from(JSON.stringify(jsonData, null, 2));
    
    return {
      format: 'json',
      data,
      filename: `report-${report.id}-${this.formatDate(new Date())}.json`,
      contentType: 'application/json',
      size: data.length,
    };
  }

  private async generateHTMLContent(
    report: WeeklyReport & { sections: ReportSection[] },
    params: ExportParams
  ): Promise<string> {
    const chartElements = params.includeCharts 
      ? await this.generateChartElements(report.sections)
      : '';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${report.title}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        .period {
            font-size: 1.1em;
            opacity: 0.9;
            margin-top: 10px;
        }
        .summary {
            background: white;
            padding: 25px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        .summary h2 {
            color: #4a5568;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
            margin-top: 0;
        }
        .section {
            background: white;
            margin: 20px 0;
            padding: 25px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .section h3 {
            color: #2d3748;
            border-left: 4px solid #667eea;
            padding-left: 15px;
            margin-top: 0;
        }
        .chart-container {
            margin: 20px 0;
            text-align: center;
            background: #f7fafc;
            padding: 20px;
            border-radius: 6px;
        }
        .table-container {
            overflow-x: auto;
            margin: 20px 0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            background: white;
        }
        th, td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
        }
        th {
            background: #f7fafc;
            font-weight: 600;
            color: #4a5568;
        }
        .insights {
            background: #edf2f7;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .insights h4 {
            color: #2d3748;
            margin-top: 0;
        }
        .footer {
            text-align: center;
            color: #718096;
            margin-top: 40px;
            padding: 20px;
            border-top: 1px solid #e2e8f0;
        }
        @media print {
            body { background-color: white; }
            .section { page-break-inside: avoid; }
        }
    </style>
    ${params.includeCharts ? '<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>' : ''}
</head>
<body>
    <div class="header">
        <h1>${report.title}</h1>
        <div class="period">
            ${this.formatDate(new Date(report.report_period_start))} - 
            ${this.formatDate(new Date(report.report_period_end))}
        </div>
        <div class="period">Status: ${report.status.toUpperCase()}</div>
    </div>

    ${report.executive_summary ? `
    <div class="summary">
        <h2>Executive Summary</h2>
        <p>${report.executive_summary}</p>
    </div>
    ` : ''}

    ${report.sections.map(section => `
        <div class="section">
            <h3>${section.section_title}</h3>
            ${section.content ? `<p>${section.content}</p>` : ''}
            
            ${section.charts_data && params.includeCharts 
              ? this.generateChartHTML(section.charts_data, section.id)
              : ''}
            
            ${section.tables_data 
              ? this.generateTableHTML(section.tables_data)
              : ''}
            
            ${section.insights 
              ? this.generateInsightsHTML(section.insights)
              : ''}
        </div>
    `).join('')}

    <div class="footer">
        <p>Report generated on ${this.formatDateTime(new Date())}</p>
        <p>Exported as ${params.format.toUpperCase()}</p>
    </div>

    ${chartElements}
</body>
</html>
    `.trim();
  }

  private generateExcelData(
    report: WeeklyReport & { sections: ReportSection[] },
    params: ExportParams
  ): any {
    // Mock Excel structure - in reality, use exceljs
    const workbook = {
      worksheets: [
        {
          name: 'Report Summary',
          data: [
            ['Report Title', report.title],
            ['Period Start', report.report_period_start],
            ['Period End', report.report_period_end],
            ['Status', report.status],
            ['Executive Summary', report.executive_summary || ''],
          ],
        },
      ],
    };

    // Add section worksheets
    report.sections.forEach(section => {
      const worksheet = {
        name: section.section_title.substring(0, 31), // Excel sheet name limit
        data: [
          ['Section', section.section_title],
          ['Type', section.section_type],
          ['Content', section.content || ''],
        ],
      };

      // Add table data if available
      if (section.tables_data) {
        Object.entries(section.tables_data).forEach(([tableName, tableData]: [string, any]) => {
          if (tableData.headers && tableData.rows) {
            worksheet.data.push([]);
            worksheet.data.push([tableName]);
            worksheet.data.push(tableData.headers);
            tableData.rows.forEach((row: any[]) => worksheet.data.push(row));
          }
        });
      }

      workbook.worksheets.push(worksheet);
    });

    return workbook;
  }

  private generateCSVData(
    report: WeeklyReport & { sections: ReportSection[] },
    params: ExportParams
  ): string {
    const lines: string[] = [];
    
    // Report header
    lines.push('Report Information');
    lines.push(`Title,${this.escapeCsvValue(report.title)}`);
    lines.push(`Period Start,${report.report_period_start}`);
    lines.push(`Period End,${report.report_period_end}`);
    lines.push(`Status,${report.status}`);
    lines.push(`Executive Summary,${this.escapeCsvValue(report.executive_summary || '')}`);
    lines.push('');

    // Sections
    report.sections.forEach(section => {
      lines.push(`Section: ${this.escapeCsvValue(section.section_title)}`);
      lines.push(`Type,${section.section_type}`);
      lines.push(`Content,${this.escapeCsvValue(section.content || '')}`);
      
      // Add table data
      if (section.tables_data) {
        Object.entries(section.tables_data).forEach(([tableName, tableData]: [string, any]) => {
          if (tableData.headers && tableData.rows) {
            lines.push('');
            lines.push(`Table: ${tableName}`);
            lines.push(tableData.headers.map(this.escapeCsvValue).join(','));
            tableData.rows.forEach((row: any[]) => {
              lines.push(row.map(this.escapeCsvValue).join(','));
            });
          }
        });
      }
      
      lines.push('');
    });

    return lines.join('\n');
  }

  private async generateChartElements(sections: ReportSection[]): Promise<string> {
    let chartScripts = '';
    
    sections.forEach(section => {
      if (section.charts_data) {
        Object.entries(section.charts_data).forEach(([chartName, chartData]: [string, any]) => {
          chartScripts += this.generateChartScript(chartName, chartData, section.id);
        });
      }
    });

    return chartScripts ? `<script>${chartScripts}</script>` : '';
  }

  private generateChartHTML(chartsData: any, sectionId: string): string {
    return Object.entries(chartsData)
      .map(([chartName, chartData]: [string, any]) => `
        <div class="chart-container">
          <h4>${chartName.replace(/_/g, ' ').toUpperCase()}</h4>
          <canvas id="chart_${sectionId}_${chartName}" width="400" height="200"></canvas>
        </div>
      `).join('');
  }

  private generateChartScript(chartName: string, chartData: any, sectionId: string): string {
    return `
      document.addEventListener('DOMContentLoaded', function() {
        const ctx = document.getElementById('chart_${sectionId}_${chartName}');
        if (ctx) {
          new Chart(ctx, {
            type: '${chartData.type || 'line'}',
            data: ${JSON.stringify(chartData.data || {})},
            options: {
              responsive: true,
              plugins: {
                title: {
                  display: true,
                  text: '${chartName.replace(/_/g, ' ')}'
                }
              }
            }
          });
        }
      });
    `;
  }

  private generateTableHTML(tablesData: any): string {
    return Object.entries(tablesData)
      .map(([tableName, tableData]: [string, any]) => {
        if (!tableData.headers || !tableData.rows) return '';
        
        return `
          <div class="table-container">
            <h4>${tableName.replace(/_/g, ' ').toUpperCase()}</h4>
            <table>
              <thead>
                <tr>
                  ${tableData.headers.map((header: string) => `<th>${header}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${tableData.rows.map((row: any[]) => `
                  <tr>
                    ${row.map(cell => `<td>${cell || '-'}</td>`).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }).join('');
  }

  private generateInsightsHTML(insights: any): string {
    return `
      <div class="insights">
        <h4>Key Insights</h4>
        ${Object.entries(insights)
          .map(([key, value]: [string, any]) => `
            <p><strong>${key.replace(/_/g, ' ')}:</strong> 
            ${Array.isArray(value) ? value.join(', ') : value}</p>
          `).join('')}
      </div>
    `;
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  private formatDateTime(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private escapeCsvValue(value: any): string {
    const str = String(value || '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  // Batch export multiple reports
  async batchExport(params: {
    reportIds: string[];
    organizationId: string;
    format: 'pdf' | 'excel' | 'csv' | 'html' | 'json';
    includeCharts: boolean;
    includeRawData: boolean;
  }): Promise<ExportResult[]> {
    const results: ExportResult[] = [];

    for (const reportId of params.reportIds) {
      try {
        const result = await this.exportReport({
          reportId,
          organizationId: params.organizationId,
          format: params.format,
          includeCharts: params.includeCharts,
          includeRawData: params.includeRawData,
        });
        results.push(result);
      } catch (error) {
        console.error(`Failed to export report ${reportId}:`, error);
        // Continue with other reports
      }
    }

    return results;
  }

  // Export with custom template
  async exportWithTemplate(params: ExportParams & {
    templateHtml: string;
    templateVariables?: Record<string, any>;
  }): Promise<ExportResult> {
    // Custom template export logic would go here
    // For now, fall back to standard export
    return this.exportReport(params);
  }
}