# S3 Data Lake Architecture for IOC Assessment Data

## Overview
This architecture provides a cost-effective data lake solution starting at ~$1-5/month, scaling efficiently as IOC grows.

## 1. S3 Data Lake Structure

### Bucket Organization
```
ioc-data-lake-prod/
├── raw/                           # Original unprocessed data
│   ├── assessments/
│   │   ├── year=2025/
│   │   │   ├── month=01/
│   │   │   │   ├── day=15/
│   │   │   │   │   └── assessment_001.json
│   ├── events/                    # Pinpoint events
│   │   └── year=2025/month=01/day=15/
│   └── users/                     # User metadata
│       └── year=2025/month=01/day=15/
├── processed/                     # Transformed data
│   ├── assessments/
│   │   ├── type=personality/
│   │   │   └── year=2025/month=01/
│   │   └── type=skills/
│   │       └── year=2025/month=01/
│   └── analytics/                 # Aggregated data
│       └── daily_summaries/
└── archive/                       # Old data (Glacier)
    └── assessments/
        └── year=2023/
```

### Partitioning Strategy
- **Primary**: Date-based (year/month/day) for time-series queries
- **Secondary**: Assessment type for filtered analysis
- **Rationale**: Optimizes for QuickSight date-range queries

### Lifecycle Policies
```json
{
  "Rules": [
    {
      "Id": "MoveToInfrequentAccess",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "INTELLIGENT_TIERING"
        }
      ],
      "Prefix": "raw/"
    },
    {
      "Id": "ArchiveOldData",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 365,
          "StorageClass": "GLACIER"
        }
      ],
      "Prefix": "processed/"
    }
  ]
}
```

### Data Formats
- **Raw Data**: JSON (preserves structure, compresses well)
- **Processed Data**: Parquet (70% smaller, faster queries)
- **Analytics**: CSV (QuickSight compatibility)

## 2. Data Ingestion Pipeline

### Phase 1: Direct Upload ($0-5/month)
```javascript
// Lambda function for direct S3 upload
exports.handler = async (event) => {
  const assessmentData = JSON.parse(event.body);
  
  // Add metadata
  const enrichedData = {
    ...assessmentData,
    timestamp: new Date().toISOString(),
    version: '1.0',
    processed: false
  };
  
  // Generate S3 key with partitioning
  const date = new Date();
  const key = `raw/assessments/year=${date.getFullYear()}/month=${String(date.getMonth() + 1).padStart(2, '0')}/day=${String(date.getDate()).padStart(2, '0')}/assessment_${assessmentData.id}.json`;
  
  // Upload to S3
  await s3.putObject({
    Bucket: 'ioc-data-lake-prod',
    Key: key,
    Body: JSON.stringify(enrichedData),
    ContentType: 'application/json',
    ServerSideEncryption: 'AES256'
  }).promise();
  
  return { statusCode: 200 };
};
```

### Phase 2: Add Processing ($5-50/month)
```javascript
// ETL Lambda for data transformation
exports.processAssessment = async (event) => {
  // Triggered by S3 event
  const record = event.Records[0];
  const bucket = record.s3.bucket.name;
  const key = record.s3.object.key;
  
  // Read raw data
  const rawData = await s3.getObject({ Bucket: bucket, Key: key }).promise();
  const assessment = JSON.parse(rawData.Body.toString());
  
  // Transform to analytics format
  const processed = {
    assessment_id: assessment.id,
    user_id: assessment.user_id,
    type: assessment.type,
    score: assessment.score,
    completion_time: assessment.duration,
    date: assessment.timestamp.split('T')[0],
    anonymized_demographics: {
      age_group: getAgeGroup(assessment.user_age),
      region: assessment.user_region
    }
  };
  
  // Save as Parquet (using parquetjs)
  const parquetKey = key.replace('raw/', 'processed/').replace('.json', '.parquet');
  await saveAsParquet(processed, bucket, parquetKey);
};
```

### Phase 3: Streaming with Kinesis Firehose ($50-200/month)
```javascript
// Firehose configuration (add at $1K MRR)
{
  "DeliveryStreamName": "ioc-assessment-stream",
  "ExtendedS3DestinationConfiguration": {
    "BucketARN": "arn:aws:s3:::ioc-data-lake-prod",
    "Prefix": "raw/assessments/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/",
    "ErrorOutputPrefix": "error/",
    "BufferingHints": {
      "IntervalInSeconds": 300,  // 5 minutes
      "SizeInMBs": 5
    },
    "CompressionFormat": "GZIP",
    "DataFormatConversionConfiguration": {
      "Enabled": true,
      "OutputFormatConfiguration": {
        "Serializer": {
          "ParquetSerDe": {}
        }
      }
    }
  }
}
```

## 3. Storage Cost Optimization

### Intelligent Tiering Setup
```javascript
// S3 Intelligent-Tiering configuration
{
  "Id": "OptimizeCosts",
  "Status": "Enabled",
  "Tierings": [
    {
      "Days": 90,
      "AccessTier": "ARCHIVE_ACCESS"
    },
    {
      "Days": 180,
      "AccessTier": "DEEP_ARCHIVE_ACCESS"
    }
  ]
}
```

### Compression Strategies
- **JSON**: GZIP compression (70-80% reduction)
- **Parquet**: Built-in compression (90% reduction vs JSON)
- **CSV**: GZIP for QuickSight imports

### Archive Policies
```javascript
// Automated archival Lambda
exports.archiveOldData = async () => {
  const cutoffDate = new Date();
  cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
  
  // List objects older than 1 year
  const objects = await s3.listObjectsV2({
    Bucket: 'ioc-data-lake-prod',
    Prefix: 'processed/',
    MaxKeys: 1000
  }).promise();
  
  // Move to Glacier
  for (const object of objects.Contents) {
    if (new Date(object.LastModified) < cutoffDate) {
      await s3.copyObject({
        Bucket: 'ioc-data-lake-prod',
        CopySource: `ioc-data-lake-prod/${object.Key}`,
        Key: object.Key.replace('processed/', 'archive/'),
        StorageClass: 'GLACIER'
      }).promise();
    }
  }
};
```

### S3 Select Optimization
```javascript
// Query specific data without downloading entire files
const params = {
  Bucket: 'ioc-data-lake-prod',
  Key: 'processed/assessments/type=personality/data.parquet',
  ExpressionType: 'SQL',
  Expression: `SELECT * FROM S3Object WHERE score > 80 AND date >= '2025-01-01'`,
  InputSerialization: {
    Parquet: {}
  },
  OutputSerialization: {
    JSON: {}
  }
};

const data = await s3.selectObjectContent(params).promise();
```

## 4. Integration Points

### Pinpoint Event Export
```javascript
// Configure Pinpoint to export events to S3
{
  "EventStream": {
    "ApplicationId": "ioc-app-id",
    "DestinationStreamArn": "arn:aws:kinesis:firehose:us-east-1:123456789012:deliverystream/ioc-events",
    "RoleArn": "arn:aws:iam::123456789012:role/pinpoint-export-role"
  }
}
```

### QuickSight Direct S3 Queries
```json
{
  "DataSource": {
    "Name": "IOC-S3-DataLake",
    "Type": "S3",
    "DataSourceParameters": {
      "S3Parameters": {
        "ManifestFileLocation": {
          "Bucket": "ioc-data-lake-prod",
          "Key": "quicksight/manifest.json"
        }
      }
    }
  }
}
```

### Athena Configuration
```sql
-- Create external table for Athena queries
CREATE EXTERNAL TABLE IF NOT EXISTS assessments (
  assessment_id string,
  user_id string,
  type string,
  score double,
  completion_time int,
  date date
)
PARTITIONED BY (
  year int,
  month int
)
STORED AS PARQUET
LOCATION 's3://ioc-data-lake-prod/processed/assessments/'
```

### Glue Catalog Setup
```javascript
// Glue crawler configuration
{
  "Name": "ioc-assessment-crawler",
  "Role": "arn:aws:iam::123456789012:role/glue-crawler-role",
  "DatabaseName": "ioc_data_lake",
  "Targets": {
    "S3Targets": [
      {
        "Path": "s3://ioc-data-lake-prod/processed/",
        "Exclusions": ["archive/**"]
      }
    ]
  },
  "Schedule": "cron(0 2 * * ? *)"  // Daily at 2 AM
}
```

## 5. Security & Compliance

### S3 Encryption Configuration
```json
{
  "Rules": [{
    "ApplyServerSideEncryptionByDefault": {
      "SSEAlgorithm": "AES256"
    },
    "BucketKeyEnabled": true
  }]
}
```

### IAM Roles and Policies
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::ioc-data-lake-prod/raw/*"
    },
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "quicksight.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::ioc-data-lake-prod/processed/*"
    }
  ]
}
```

### VPC Endpoint Configuration
```javascript
// Create VPC endpoint for secure S3 access
{
  "VpcEndpointType": "Gateway",
  "ServiceName": "com.amazonaws.us-east-1.s3",
  "VpcId": "vpc-12345678",
  "RouteTableIds": ["rtb-12345678"],
  "PolicyDocument": {
    "Statement": [{
      "Effect": "Allow",
      "Principal": "*",
      "Action": ["s3:*"],
      "Resource": ["arn:aws:s3:::ioc-data-lake-prod/*"]
    }]
  }
}
```

### CloudTrail Logging
```json
{
  "TrailName": "ioc-data-lake-audit",
  "S3BucketName": "ioc-audit-logs",
  "EventSelectors": [{
    "ReadWriteType": "All",
    "IncludeManagementEvents": false,
    "DataResources": [{
      "Type": "AWS::S3::Object",
      "Values": ["arn:aws:s3:::ioc-data-lake-prod/*"]
    }]
  }]
}
```

## 6. Growth Path & Cost Projections

### Phase 1: Direct S3 Uploads ($0.50-5/month)
- **Storage**: 1GB = $0.023/month
- **Requests**: 10K PUT = $0.05
- **Lambda**: Free tier covers 1M requests
- **Total**: ~$1-5/month

### Phase 2: Add Processing ($5-50/month at $1K MRR)
- **Storage**: 10GB = $0.23/month
- **Lambda Processing**: 100K invocations = $2
- **S3 Lifecycle**: Automated cost reduction
- **Total**: ~$10-50/month

### Phase 3: Kinesis Firehose ($50-200/month at $5K MRR)
- **Firehose**: First 500GB = $17.50
- **Storage**: 100GB with tiering = $15/month
- **Processing**: Lambda + Firehose = $50/month
- **Total**: ~$100-200/month

### Phase 4: Full Analytics ($500-2000/month at $20K MRR)
- **Athena**: $5 per TB scanned
- **Glue**: $0.44/hour for ETL
- **QuickSight**: $24/user/month
- **Storage**: 1TB optimized = $100/month
- **Total**: ~$500-2000/month

## Implementation Checklist

### Week 1: Foundation
- [ ] Create S3 bucket with versioning
- [ ] Set up folder structure
- [ ] Configure encryption and access policies
- [ ] Deploy basic upload Lambda

### Week 2: Processing
- [ ] Create ETL Lambda functions
- [ ] Set up S3 event triggers
- [ ] Implement Parquet conversion
- [ ] Configure lifecycle policies

### Week 3: Integration
- [ ] Connect QuickSight to S3
- [ ] Set up Athena tables
- [ ] Configure Pinpoint export
- [ ] Create CloudWatch dashboards

### Week 4: Optimization
- [ ] Implement S3 Select queries
- [ ] Set up cost alerts
- [ ] Configure intelligent tiering
- [ ] Document query patterns

## Cost Monitoring

### CloudWatch Alarms
```javascript
// Cost alarm configuration
{
  "AlarmName": "S3-Monthly-Cost",
  "MetricName": "EstimatedCharges",
  "Statistic": "Maximum",
  "Period": 86400,
  "EvaluationPeriods": 1,
  "Threshold": 50.0,
  "ComparisonOperator": "GreaterThanThreshold",
  "Dimensions": [{
    "Name": "Currency",
    "Value": "USD"
  }]
}
```

### Monthly Cost Review Dashboard
- S3 storage by tier
- Request counts by type
- Data transfer costs
- Lambda execution costs
- Lifecycle transition savings

## Conclusion

This architecture provides a robust, scalable data lake starting at minimal cost. The phased approach allows IOC to grow infrastructure spending in line with revenue, while maintaining flexibility for future analytics needs.