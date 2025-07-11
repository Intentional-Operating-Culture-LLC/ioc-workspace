/**
 * Athena Setup Configuration
 * Enables SQL analytics on S3 data lake when IOC reaches $5K MRR
 */

import { 
  AthenaClient, 
  CreateWorkGroupCommand,
  CreateDataCatalogCommand,
  StartQueryExecutionCommand 
} from '@aws-sdk/client-athena';
import { 
  GlueClient, 
  CreateDatabaseCommand,
  CreateTableCommand 
} from '@aws-sdk/client-glue';

export interface AthenaConfig {
  enabled: boolean;
  mrrThreshold: number;
  s3Bucket: string;
  queryResultsBucket: string;
  databaseName: string;
  workgroupName: string;
  region: string;
}

export const ATHENA_CONFIG: AthenaConfig = {
  enabled: false, // Enable when MRR >= $5,000
  mrrThreshold: 5000,
  s3Bucket: 'ioc-analytics-data-lake',
  queryResultsBucket: 'ioc-athena-query-results',
  databaseName: 'ioc_analytics',
  workgroupName: 'ioc-analytics-workgroup',
  region: 'us-east-1'
};

/**
 * Setup Athena infrastructure
 */
export async function setupAthenaInfrastructure(currentMRR: number): Promise<void> {
  if (currentMRR < ATHENA_CONFIG.mrrThreshold) {
    console.log(`Current MRR ($${currentMRR}) below threshold ($${ATHENA_CONFIG.mrrThreshold})`);
    return;
  }

  const athenaClient = new AthenaClient({ region: ATHENA_CONFIG.region });
  const glueClient = new GlueClient({ region: ATHENA_CONFIG.region });

  // 1. Create Athena Workgroup with cost controls
  await createWorkgroup(athenaClient);

  // 2. Create Glue Database
  await createDatabase(glueClient);

  // 3. Create Tables
  await createTables(glueClient);

  // 4. Create partitions
  await createPartitions(athenaClient);

  console.log('Athena infrastructure setup complete');
}

/**
 * Create Athena workgroup with cost controls
 */
async function createWorkgroup(client: AthenaClient): Promise<void> {
  const command = new CreateWorkGroupCommand({
    Name: ATHENA_CONFIG.workgroupName,
    Description: 'IOC Analytics workgroup with cost controls',
    Configuration: {
      ResultConfiguration: {
        OutputLocation: `s3://${ATHENA_CONFIG.queryResultsBucket}/`,
        EncryptionConfiguration: {
          EncryptionOption: 'SSE_S3'
        }
      },
      EnforceWorkGroupConfiguration: true,
      PublishCloudWatchMetricsEnabled: true,
      BytesScannedCutoffPerQuery: 1073741824, // 1GB limit per query
      RequesterPaysEnabled: false
    },
    Tags: [
      { Key: 'Environment', Value: 'production' },
      { Key: 'CostCenter', Value: 'analytics' }
    ]
  });

  try {
    await client.send(command);
    console.log('Workgroup created successfully');
  } catch (error: any) {
    if (error.name !== 'InvalidRequestException') {
      throw error;
    }
    console.log('Workgroup already exists');
  }
}

/**
 * Create Glue database for data catalog
 */
async function createDatabase(client: GlueClient): Promise<void> {
  const command = new CreateDatabaseCommand({
    DatabaseInput: {
      Name: ATHENA_CONFIG.databaseName,
      Description: 'IOC Analytics data lake catalog',
      LocationUri: `s3://${ATHENA_CONFIG.s3Bucket}/`,
      Parameters: {
        'classification': 'parquet',
        'compressionType': 'snappy'
      }
    }
  });

  try {
    await client.send(command);
    console.log('Database created successfully');
  } catch (error: any) {
    if (error.name !== 'AlreadyExistsException') {
      throw error;
    }
    console.log('Database already exists');
  }
}

/**
 * Create optimized table schemas
 */
async function createTables(client: GlueClient): Promise<void> {
  // Assessment Events Table
  await createAssessmentEventsTable(client);
  
  // OCEAN Scores Table
  await createOceanScoresTable(client);
  
  // Industry Benchmarks Table
  await createBenchmarksTable(client);
  
  // User Engagement Table
  await createEngagementTable(client);
  
  // Cost Tracking Table
  await createCostTrackingTable(client);
}

/**
 * Create partitions for cost optimization
 */
async function createPartitions(client: AthenaClient): Promise<void> {
  // Add partition projection for automatic partition discovery
  const query = `
    ALTER TABLE ${ATHENA_CONFIG.databaseName}.assessment_events
    SET TBLPROPERTIES (
      'projection.enabled' = 'true',
      'projection.date.type' = 'date',
      'projection.date.range' = '2024/01/01,NOW',
      'projection.date.format' = 'yyyy/MM/dd',
      'projection.date.interval' = '1',
      'projection.date.interval.unit' = 'DAYS',
      'projection.assessment_type.type' = 'enum',
      'projection.assessment_type.values' = 'personality,cognitive,technical,behavioral',
      'storage.location.template' = 's3://${ATHENA_CONFIG.s3Bucket}/assessments/\${date}/\${assessment_type}/'
    );
  `;

  const command = new StartQueryExecutionCommand({
    QueryString: query,
    QueryExecutionContext: {
      Database: ATHENA_CONFIG.databaseName
    },
    ResultConfiguration: {
      OutputLocation: `s3://${ATHENA_CONFIG.queryResultsBucket}/`
    },
    WorkGroup: ATHENA_CONFIG.workgroupName
  });

  await client.send(command);
  console.log('Partition projection enabled');
}

/**
 * Create assessment events table
 */
async function createAssessmentEventsTable(client: GlueClient): Promise<void> {
  const command = new CreateTableCommand({
    DatabaseName: ATHENA_CONFIG.databaseName,
    TableInput: {
      Name: 'assessment_events',
      StorageDescriptor: {
        Columns: [
          { Name: 'anonymous_user_id', Type: 'string' },
          { Name: 'session_id', Type: 'string' },
          { Name: 'assessment_id', Type: 'string' },
          { Name: 'timestamp', Type: 'timestamp' },
          { Name: 'assessment_type', Type: 'string' },
          { Name: 'version', Type: 'string' },
          { Name: 'completion_time', Type: 'int' },
          { Name: 'device', Type: 'string' },
          { Name: 'platform', Type: 'string' },
          { Name: 'age_range', Type: 'string' },
          { Name: 'industry', Type: 'string' },
          { Name: 'role', Type: 'string' },
          { Name: 'experience', Type: 'string' },
          { Name: 'region', Type: 'string' }
        ],
        Location: `s3://${ATHENA_CONFIG.s3Bucket}/assessments/`,
        InputFormat: 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat',
        OutputFormat: 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat',
        SerdeInfo: {
          SerializationLibrary: 'org.apache.hadoop.hive.serde2.lazy.LazySimpleSerDe',
          Parameters: {
            'serialization.format': '1'
          }
        },
        Compressed: true,
        Parameters: {
          'compressionType': 'snappy',
          'typeOfData': 'file'
        }
      },
      PartitionKeys: [
        { Name: 'date', Type: 'string' },
        { Name: 'assessment_type', Type: 'string' }
      ],
      TableType: 'EXTERNAL_TABLE',
      Parameters: {
        'EXTERNAL': 'TRUE',
        'parquet.compression': 'SNAPPY'
      }
    }
  });

  try {
    await client.send(command);
    console.log('Assessment events table created');
  } catch (error: any) {
    if (error.name !== 'AlreadyExistsException') {
      throw error;
    }
  }
}

/**
 * Create OCEAN scores table
 */
async function createOceanScoresTable(client: GlueClient): Promise<void> {
  const command = new CreateTableCommand({
    DatabaseName: ATHENA_CONFIG.databaseName,
    TableInput: {
      Name: 'ocean_scores',
      StorageDescriptor: {
        Columns: [
          { Name: 'anonymous_user_id', Type: 'string' },
          { Name: 'assessment_id', Type: 'string' },
          { Name: 'timestamp', Type: 'timestamp' },
          { Name: 'openness', Type: 'double' },
          { Name: 'conscientiousness', Type: 'double' },
          { Name: 'extraversion', Type: 'double' },
          { Name: 'agreeableness', Type: 'double' },
          { Name: 'neuroticism', Type: 'double' },
          { Name: 'consistency', Type: 'double' },
          { Name: 'completeness', Type: 'double' },
          { Name: 'facets', Type: 'map<string,struct<score:double,responses:int,std_dev:double>>' },
          { Name: 'dark_side_indicators', Type: 'map<string,double>' },
          { Name: 'industry', Type: 'string' },
          { Name: 'role', Type: 'string' },
          { Name: 'experience', Type: 'string' }
        ],
        Location: `s3://${ATHENA_CONFIG.s3Bucket}/ocean_scores/`,
        InputFormat: 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat',
        OutputFormat: 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat',
        SerdeInfo: {
          SerializationLibrary: 'org.apache.hadoop.hive.serde2.lazy.LazySimpleSerDe'
        },
        Compressed: true
      },
      PartitionKeys: [
        { Name: 'year', Type: 'string' },
        { Name: 'month', Type: 'string' }
      ],
      TableType: 'EXTERNAL_TABLE'
    }
  });

  try {
    await client.send(command);
    console.log('OCEAN scores table created');
  } catch (error: any) {
    if (error.name !== 'AlreadyExistsException') {
      throw error;
    }
  }
}

/**
 * Create industry benchmarks table
 */
async function createBenchmarksTable(client: GlueClient): Promise<void> {
  const command = new CreateTableCommand({
    DatabaseName: ATHENA_CONFIG.databaseName,
    TableInput: {
      Name: 'industry_benchmarks',
      StorageDescriptor: {
        Columns: [
          { Name: 'industry', Type: 'string' },
          { Name: 'role', Type: 'string' },
          { Name: 'trait', Type: 'string' },
          { Name: 'percentile_25', Type: 'double' },
          { Name: 'percentile_50', Type: 'double' },
          { Name: 'percentile_75', Type: 'double' },
          { Name: 'mean', Type: 'double' },
          { Name: 'std_dev', Type: 'double' },
          { Name: 'sample_size', Type: 'int' },
          { Name: 'last_updated', Type: 'timestamp' }
        ],
        Location: `s3://${ATHENA_CONFIG.s3Bucket}/benchmarks/`,
        InputFormat: 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat',
        OutputFormat: 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat',
        SerdeInfo: {
          SerializationLibrary: 'org.apache.hadoop.hive.serde2.lazy.LazySimpleSerDe'
        }
      },
      TableType: 'EXTERNAL_TABLE'
    }
  });

  try {
    await client.send(command);
    console.log('Benchmarks table created');
  } catch (error: any) {
    if (error.name !== 'AlreadyExistsException') {
      throw error;
    }
  }
}

/**
 * Create user engagement table
 */
async function createEngagementTable(client: GlueClient): Promise<void> {
  const command = new CreateTableCommand({
    DatabaseName: ATHENA_CONFIG.databaseName,
    TableInput: {
      Name: 'user_engagement',
      StorageDescriptor: {
        Columns: [
          { Name: 'anonymous_user_id', Type: 'string' },
          { Name: 'session_id', Type: 'string' },
          { Name: 'event_type', Type: 'string' },
          { Name: 'event_timestamp', Type: 'timestamp' },
          { Name: 'page_url', Type: 'string' },
          { Name: 'duration_seconds', Type: 'int' },
          { Name: 'clicks', Type: 'int' },
          { Name: 'scrolls', Type: 'int' },
          { Name: 'device', Type: 'string' },
          { Name: 'referrer', Type: 'string' }
        ],
        Location: `s3://${ATHENA_CONFIG.s3Bucket}/engagement/`,
        InputFormat: 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat',
        OutputFormat: 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat',
        SerdeInfo: {
          SerializationLibrary: 'org.apache.hadoop.hive.serde2.lazy.LazySimpleSerDe'
        }
      },
      PartitionKeys: [
        { Name: 'date', Type: 'string' }
      ],
      TableType: 'EXTERNAL_TABLE'
    }
  });

  try {
    await client.send(command);
    console.log('Engagement table created');
  } catch (error: any) {
    if (error.name !== 'AlreadyExistsException') {
      throw error;
    }
  }
}

/**
 * Create cost tracking table
 */
async function createCostTrackingTable(client: GlueClient): Promise<void> {
  const command = new CreateTableCommand({
    DatabaseName: ATHENA_CONFIG.databaseName,
    TableInput: {
      Name: 'cost_tracking',
      StorageDescriptor: {
        Columns: [
          { Name: 'service', Type: 'string' },
          { Name: 'operation', Type: 'string' },
          { Name: 'timestamp', Type: 'timestamp' },
          { Name: 'cost_usd', Type: 'decimal(10,6)' },
          { Name: 'usage_amount', Type: 'double' },
          { Name: 'usage_unit', Type: 'string' },
          { Name: 'user_type', Type: 'string' },
          { Name: 'feature', Type: 'string' }
        ],
        Location: `s3://${ATHENA_CONFIG.s3Bucket}/costs/`,
        InputFormat: 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat',
        OutputFormat: 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat',
        SerdeInfo: {
          SerializationLibrary: 'org.apache.hadoop.hive.serde2.lazy.LazySimpleSerDe'
        }
      },
      PartitionKeys: [
        { Name: 'year', Type: 'string' },
        { Name: 'month', Type: 'string' },
        { Name: 'day', Type: 'string' }
      ],
      TableType: 'EXTERNAL_TABLE'
    }
  });

  try {
    await client.send(command);
    console.log('Cost tracking table created');
  } catch (error: any) {
    if (error.name !== 'AlreadyExistsException') {
      throw error;
    }
  }
}