/**
 * Athena Integration Points
 * Connects Athena with QuickSight, Lambda, and APIs
 */

import { 
  AthenaClient,
  StartQueryExecutionCommand,
  GetQueryExecutionCommand,
  GetQueryResultsCommand,
  QueryExecutionState
} from '@aws-sdk/client-athena';
import { 
  QuickSightClient,
  CreateDataSourceCommand,
  CreateDataSetCommand,
  UpdateDataSetCommand
} from '@aws-sdk/client-quicksight';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

export class AthenaIntegration {
  private athenaClient: AthenaClient;
  private quicksightClient: QuickSightClient;
  private lambdaClient: LambdaClient;
  
  private readonly config = {
    database: 'ioc_analytics',
    workgroup: 'ioc-analytics-workgroup',
    resultsBucket: 's3://ioc-athena-query-results/',
    quicksightAccountId: process.env.AWS_ACCOUNT_ID || '',
    region: 'us-east-1'
  };

  constructor() {
    this.athenaClient = new AthenaClient({ region: this.config.region });
    this.quicksightClient = new QuickSightClient({ region: this.config.region });
    this.lambdaClient = new LambdaClient({ region: this.config.region });
  }

  /**
   * Execute Athena query and return results
   */
  async executeQuery(query: string, parameters?: Record<string, any>): Promise<QueryResult> {
    // Parameterize query if needed
    const finalQuery = this.parameterizeQuery(query, parameters);

    // Start query execution
    const executionId = await this.startQueryExecution(finalQuery);

    // Wait for completion
    await this.waitForQueryCompletion(executionId);

    // Get results
    const results = await this.getQueryResults(executionId);

    return {
      executionId,
      results,
      metadata: await this.getQueryMetadata(executionId)
    };
  }

  /**
   * Create QuickSight data source from Athena
   */
  async createQuickSightDataSource(name: string): Promise<void> {
    const command = new CreateDataSourceCommand({
      AwsAccountId: this.config.quicksightAccountId,
      DataSourceId: `athena-${name}`,
      Name: `IOC Analytics - ${name}`,
      Type: 'ATHENA',
      DataSourceParameters: {
        AthenaParameters: {
          WorkGroup: this.config.workgroup
        }
      },
      Permissions: [
        {
          Principal: `arn:aws:quicksight:${this.config.region}:${this.config.quicksightAccountId}:group/default/admin`,
          Actions: [
            'quicksight:DescribeDataSource',
            'quicksight:DescribeDataSourcePermissions',
            'quicksight:PassDataSource',
            'quicksight:UpdateDataSource',
            'quicksight:UpdateDataSourcePermissions',
            'quicksight:DeleteDataSource'
          ]
        }
      ]
    });

    await this.quicksightClient.send(command);
    console.log(`QuickSight data source created: ${name}`);
  }

  /**
   * Create QuickSight dataset from Athena table
   */
  async createQuickSightDataSet(
    dataSourceName: string,
    tableName: string,
    datasetName: string
  ): Promise<void> {
    const command = new CreateDataSetCommand({
      AwsAccountId: this.config.quicksightAccountId,
      DataSetId: `dataset-${datasetName}`,
      Name: datasetName,
      PhysicalTableMap: {
        [tableName]: {
          RelationalTable: {
            DataSourceArn: `arn:aws:quicksight:${this.config.region}:${this.config.quicksightAccountId}:datasource/athena-${dataSourceName}`,
            Catalog: 'AwsDataCatalog',
            Schema: this.config.database,
            Name: tableName,
            InputColumns: await this.getTableColumns(tableName)
          }
        }
      },
      ImportMode: 'SPICE',
      Permissions: [
        {
          Principal: `arn:aws:quicksight:${this.config.region}:${this.config.quicksightAccountId}:group/default/admin`,
          Actions: ['quicksight:*']
        }
      ]
    });

    await this.quicksightClient.send(command);
    console.log(`QuickSight dataset created: ${datasetName}`);
  }

  /**
   * Lambda function to trigger scheduled Athena queries
   */
  async createScheduledQueryLambda(): Promise<LambdaConfig> {
    return {
      functionName: 'ioc-athena-scheduled-queries',
      handler: 'index.handler',
      runtime: 'nodejs18.x',
      code: `
const { AthenaClient, StartQueryExecutionCommand } = require('@aws-sdk/client-athena');

exports.handler = async (event) => {
  const client = new AthenaClient({ region: '${this.config.region}' });
  
  // Parse scheduled query from event
  const { queryId, query, outputLocation } = event;
  
  const command = new StartQueryExecutionCommand({
    QueryString: query,
    QueryExecutionContext: {
      Database: '${this.config.database}'
    },
    ResultConfiguration: {
      OutputLocation: outputLocation || '${this.config.resultsBucket}'
    },
    WorkGroup: '${this.config.workgroup}'
  });
  
  const response = await client.send(command);
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      queryId,
      executionId: response.QueryExecutionId,
      startTime: new Date().toISOString()
    })
  };
};`,
      environment: {
        DATABASE_NAME: this.config.database,
        WORKGROUP_NAME: this.config.workgroup
      },
      schedule: 'rate(1 hour)' // Hourly execution
    };
  }

  /**
   * Create API endpoint for Athena queries
   */
  async createQueryAPI(): Promise<APIEndpointConfig> {
    return {
      path: '/analytics/query',
      method: 'POST',
      handler: async (request: QueryAPIRequest) => {
        // Validate request
        if (!request.query) {
          throw new Error('Query is required');
        }

        // Check permissions
        if (!this.validateQueryPermissions(request.userId, request.query)) {
          throw new Error('Insufficient permissions');
        }

        // Execute query
        const result = await this.executeQuery(request.query, request.parameters);

        // Format response
        return {
          executionId: result.executionId,
          results: this.formatQueryResults(result.results),
          metadata: result.metadata,
          cached: result.metadata.fromCache || false
        };
      },
      authentication: 'required',
      rateLimit: '10 per minute',
      documentation: {
        description: 'Execute Athena queries on IOC analytics data',
        request: {
          query: 'SQL query string',
          parameters: 'Optional query parameters',
          format: 'json | csv | parquet'
        },
        response: {
          executionId: 'Unique query execution ID',
          results: 'Query results in requested format',
          metadata: 'Query execution metadata'
        }
      }
    };
  }

  /**
   * Export capabilities for analytics results
   */
  async setupExportCapabilities(): Promise<ExportConfig[]> {
    return [
      {
        format: 'csv',
        handler: async (queryResults: any[]) => {
          return this.convertToCSV(queryResults);
        },
        mimeType: 'text/csv',
        fileExtension: '.csv'
      },
      {
        format: 'excel',
        handler: async (queryResults: any[]) => {
          return this.convertToExcel(queryResults);
        },
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        fileExtension: '.xlsx'
      },
      {
        format: 'json',
        handler: async (queryResults: any[]) => {
          return JSON.stringify(queryResults, null, 2);
        },
        mimeType: 'application/json',
        fileExtension: '.json'
      },
      {
        format: 'parquet',
        handler: async (queryResults: any[]) => {
          // Direct S3 location of Athena results
          return this.getParquetLocation(queryResults);
        },
        mimeType: 'application/octet-stream',
        fileExtension: '.parquet'
      }
    ];
  }

  /**
   * Integration with existing Lambda functions
   */
  async integrateWithLambdaAnalytics(): Promise<void> {
    // Ocean Calculator Integration
    const oceanCalculatorIntegration = {
      triggerQuery: 'INSERT INTO ocean_scores SELECT * FROM s3_ocean_staging',
      schedule: 'rate(5 minutes)',
      postProcessing: async (executionId: string) => {
        await this.lambdaClient.send(new InvokeCommand({
          FunctionName: 'ocean-calculator',
          Payload: JSON.stringify({ 
            athenaExecutionId: executionId,
            action: 'updateBenchmarks'
          })
        }));
      }
    };

    // Assessment Anonymizer Integration
    const anonymizerIntegration = {
      preprocessor: async (data: any) => {
        const response = await this.lambdaClient.send(new InvokeCommand({
          FunctionName: 'assessment-anonymizer',
          Payload: JSON.stringify(data)
        }));
        return JSON.parse(new TextDecoder().decode(response.Payload));
      },
      targetTable: 'assessment_events'
    };

    console.log('Lambda integrations configured');
  }

  // Helper methods

  private async startQueryExecution(query: string): Promise<string> {
    const command = new StartQueryExecutionCommand({
      QueryString: query,
      QueryExecutionContext: {
        Database: this.config.database
      },
      ResultConfiguration: {
        OutputLocation: this.config.resultsBucket
      },
      WorkGroup: this.config.workgroup
    });

    const response = await this.athenaClient.send(command);
    return response.QueryExecutionId!;
  }

  private async waitForQueryCompletion(executionId: string): Promise<void> {
    let state: QueryExecutionState | undefined;
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
      const command = new GetQueryExecutionCommand({
        QueryExecutionId: executionId
      });

      const response = await this.athenaClient.send(command);
      state = response.QueryExecution?.Status?.State;

      if (state === 'SUCCEEDED') {
        return;
      } else if (state === 'FAILED' || state === 'CANCELLED') {
        throw new Error(`Query ${state}: ${response.QueryExecution?.Status?.StateChangeReason}`);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    throw new Error('Query timeout');
  }

  private async getQueryResults(executionId: string): Promise<any[]> {
    const command = new GetQueryResultsCommand({
      QueryExecutionId: executionId,
      MaxResults: 1000
    });

    const response = await this.athenaClient.send(command);
    const rows = response.ResultSet?.Rows || [];
    
    if (rows.length === 0) return [];

    // First row contains column names
    const columns = rows[0].Data?.map(col => col.VarCharValue) || [];
    
    // Convert remaining rows to objects
    return rows.slice(1).map(row => {
      const obj: any = {};
      row.Data?.forEach((cell, index) => {
        obj[columns[index]!] = cell.VarCharValue;
      });
      return obj;
    });
  }

  private async getQueryMetadata(executionId: string): Promise<any> {
    const command = new GetQueryExecutionCommand({
      QueryExecutionId: executionId
    });

    const response = await this.athenaClient.send(command);
    return {
      executionTimeMs: response.QueryExecution?.Statistics?.EngineExecutionTimeInMillis,
      dataScannedBytes: response.QueryExecution?.Statistics?.DataScannedInBytes,
      dataScannedMB: (response.QueryExecution?.Statistics?.DataScannedInBytes || 0) / 1048576,
      estimatedCostUSD: ((response.QueryExecution?.Statistics?.DataScannedInBytes || 0) / 1099511627776) * 5,
      fromCache: response.QueryExecution?.Statistics?.DataScannedInBytes === 0
    };
  }

  private parameterizeQuery(query: string, parameters?: Record<string, any>): string {
    if (!parameters) return query;

    let parameterizedQuery = query;
    Object.entries(parameters).forEach(([key, value]) => {
      parameterizedQuery = parameterizedQuery.replace(
        new RegExp(`{{${key}}}`, 'g'),
        this.escapeValue(value)
      );
    });

    return parameterizedQuery;
  }

  private escapeValue(value: any): string {
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`;
    }
    return String(value);
  }

  private validateQueryPermissions(userId: string, query: string): boolean {
    // Implement permission validation logic
    // For now, allow read-only queries
    const readOnlyPattern = /^\s*(SELECT|WITH|SHOW|DESCRIBE)/i;
    return readOnlyPattern.test(query);
  }

  private formatQueryResults(results: any[]): any {
    // Format results based on requirements
    return results;
  }

  private async getTableColumns(tableName: string): Promise<any[]> {
    const query = `DESCRIBE ${this.config.database}.${tableName}`;
    const result = await this.executeQuery(query);
    
    return result.results.map(row => ({
      Name: row.col_name,
      Type: this.mapAthenaTypeToQuickSight(row.data_type)
    }));
  }

  private mapAthenaTypeToQuickSight(athenaType: string): string {
    const typeMap: Record<string, string> = {
      'string': 'STRING',
      'bigint': 'INTEGER',
      'int': 'INTEGER',
      'double': 'DECIMAL',
      'timestamp': 'DATETIME',
      'date': 'DATETIME',
      'boolean': 'BOOLEAN'
    };
    return typeMap[athenaType.toLowerCase()] || 'STRING';
  }

  private convertToCSV(results: any[]): string {
    if (results.length === 0) return '';
    
    const headers = Object.keys(results[0]);
    const rows = results.map(row => 
      headers.map(header => `"${String(row[header] || '').replace(/"/g, '""')}"`).join(',')
    );
    
    return [headers.join(','), ...rows].join('\n');
  }

  private convertToExcel(results: any[]): Buffer {
    // In practice, use a library like xlsx
    throw new Error('Excel export requires xlsx library');
  }

  private getParquetLocation(results: any): string {
    // Return S3 location of Parquet file
    return `${this.config.resultsBucket}${results.executionId}.parquet`;
  }
}

// Type definitions
interface QueryResult {
  executionId: string;
  results: any[];
  metadata: any;
}

interface LambdaConfig {
  functionName: string;
  handler: string;
  runtime: string;
  code: string;
  environment: Record<string, string>;
  schedule: string;
}

interface APIEndpointConfig {
  path: string;
  method: string;
  handler: (request: QueryAPIRequest) => Promise<any>;
  authentication: string;
  rateLimit: string;
  documentation: any;
}

interface QueryAPIRequest {
  userId: string;
  query: string;
  parameters?: Record<string, any>;
  format?: 'json' | 'csv' | 'parquet';
}

interface ExportConfig {
  format: string;
  handler: (queryResults: any[]) => Promise<any>;
  mimeType: string;
  fileExtension: string;
}