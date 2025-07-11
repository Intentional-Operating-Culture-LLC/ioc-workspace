# Athena Integration for IOC Analytics

## Overview
AWS Athena integration for SQL analytics on IOC's S3 data lake, designed for cost-effective querying of anonymized assessment data.

## Activation Threshold
- **Enable at $5K MRR**: Athena becomes cost-effective when you have sufficient data volume
- **Data Volume**: ~10,000+ assessments monthly
- **Query Frequency**: 100+ analytics queries per month

## Architecture
```
S3 Data Lake → Glue Data Catalog → Athena → QuickSight/APIs
     ↓              ↓                ↓           ↓
  Parquet      Table Schemas    SQL Queries   Dashboards
```

## Key Benefits
- **Serverless**: No infrastructure to manage
- **Pay-per-query**: $5 per TB scanned
- **Standard SQL**: Familiar querying language
- **Fast**: Optimized for analytics workloads
- **Integrated**: Works with QuickSight, Lambda, APIs

## Cost Optimization Strategies
1. **Partitioning**: By date, assessment type, industry
2. **Columnar Format**: Parquet files reduce scan size by 90%
3. **Compression**: SNAPPY compression for balance
4. **Query Results**: 30-day lifecycle on results
5. **Workgroups**: Per-team query limits and monitoring