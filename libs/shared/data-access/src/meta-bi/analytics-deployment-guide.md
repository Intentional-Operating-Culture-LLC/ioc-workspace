# IOC Analytics Database Deployment Guide

This guide provides step-by-step instructions for deploying the IOC Analytics Database system in production environments.

## 🏗️ Prerequisites

### Infrastructure Requirements

**Minimum Production Requirements:**
- PostgreSQL 14+ server with 16GB RAM, 4 CPU cores
- 500GB+ SSD storage (will grow with data)
- Network bandwidth: 100 Mbps minimum
- SSL/TLS certificates for secure connections

**Recommended Production Setup:**
- PostgreSQL 15+ server with 32GB RAM, 8 CPU cores
- 1TB+ NVMe SSD storage with backup storage
- Network: 1 Gbps dedicated connection
- High availability: Primary + read replica setup
- Automated backup solution

### Dependencies

```bash
# PostgreSQL Extensions
sudo apt-get install postgresql-15 postgresql-contrib-15
sudo apt-get install postgresql-15-pg-stat-statements
sudo apt-get install postgresql-15-pg-trgm

# System Tools
sudo apt-get install pg-activity htop iotop

# Optional: TimescaleDB for time-series optimization
sudo apt-get install timescaledb-2-postgresql-15
```

## 📦 Database Setup

### 1. Create Analytics Database

```sql
-- Connect as superuser
sudo -u postgres psql

-- Create dedicated database and user
CREATE DATABASE ioc_analytics;
CREATE USER analytics_user WITH ENCRYPTED PASSWORD 'secure_production_password';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE ioc_analytics TO analytics_user;
GRANT USAGE ON SCHEMA public TO analytics_user;
GRANT CREATE ON SCHEMA public TO analytics_user;

-- Connect to analytics database
\c ioc_analytics

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Optional: Enable TimescaleDB
-- CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
```

### 2. Configure PostgreSQL

Edit `/etc/postgresql/15/main/postgresql.conf`:

```conf
# Memory Configuration
shared_buffers = 8GB                    # 25% of total RAM
effective_cache_size = 24GB             # 75% of total RAM
work_mem = 256MB                        # For complex queries
maintenance_work_mem = 2GB              # For maintenance operations

# Connection Settings
max_connections = 200                   # Adjust based on application needs
shared_preload_libraries = 'pg_stat_statements'

# Write-Ahead Logging
wal_level = replica
max_wal_size = 4GB
min_wal_size = 1GB
checkpoint_completion_target = 0.9
checkpoint_timeout = 15min

# Query Optimization
random_page_cost = 1.1                 # For SSD storage
effective_io_concurrency = 200         # For SSD
seq_page_cost = 1.0

# Logging Configuration
log_min_duration_statement = 1000      # Log slow queries
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on

# Statistics
track_activities = on
track_counts = on
track_io_timing = on
track_functions = all
stats_temp_directory = '/var/run/postgresql/15-main.pg_stat_tmp'
```

Edit `/etc/postgresql/15/main/pg_hba.conf`:

```conf
# Add secure connection rules
hostssl ioc_analytics analytics_user 10.0.0.0/16 md5
hostssl ioc_analytics analytics_user 0.0.0.0/0 cert
```

### 3. Initialize Schema

```typescript
import { createAnalyticsSystem } from '@ioc/lib/meta-bi';

const analytics = createAnalyticsSystem({
  database: {
    host: 'analytics-db.company.com',
    port: 5432,
    database: 'ioc_analytics',
    username: 'analytics_user',
    password: process.env.ANALYTICS_DB_PASSWORD,
    ssl: true,
    pool: {
      min: 5,
      max: 50,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    },
    partitioning: {
      enabled: true,
      strategy: 'time',
      interval: 'monthly'
    },
    compression: {
      enabled: true,
      algorithm: 'lz4'
    }
  },
  enableMonitoring: true,
  enableBackups: true,
  retentionDays: 365  // 1 year retention
});

await analytics.initialize();
console.log('Analytics database initialized successfully');
```

## 🚀 Application Deployment

### 1. Environment Configuration

Create `.env.production`:

```bash
# Database Configuration
ANALYTICS_DB_HOST=analytics-db.company.com
ANALYTICS_DB_PORT=5432
ANALYTICS_DB_NAME=ioc_analytics
ANALYTICS_DB_USER=analytics_user
ANALYTICS_DB_PASSWORD=your_secure_password
ANALYTICS_DB_SSL=true

# SSL Certificate paths
ANALYTICS_DB_SSL_CA=/path/to/ca-certificate.crt
ANALYTICS_DB_SSL_CERT=/path/to/client-certificate.crt
ANALYTICS_DB_SSL_KEY=/path/to/client-key.key

# Performance Configuration
ANALYTICS_BATCH_SIZE=5000
ANALYTICS_PARALLEL_PROCESSING=8
ANALYTICS_RETRY_ATTEMPTS=3
ANALYTICS_ENABLE_CACHING=true
ANALYTICS_CACHE_TIMEOUT=300000

# System Configuration
ANALYTICS_ENABLE_MONITORING=true
ANALYTICS_ENABLE_BACKUPS=true
ANALYTICS_BACKUP_SCHEDULE="0 2 * * *"
ANALYTICS_RETENTION_DAYS=365
ANALYTICS_DEBUG_MODE=false

# Backup Configuration
ANALYTICS_BACKUP_PATH=/data/backups/analytics
ANALYTICS_BACKUP_RETENTION_DAYS=90
ANALYTICS_BACKUP_COMPRESSION=true
ANALYTICS_BACKUP_ENCRYPTION_KEY=/path/to/backup-encryption.key

# Monitoring Configuration
ANALYTICS_ALERT_EMAIL=ops-team@company.com
ANALYTICS_SLACK_WEBHOOK=https://hooks.slack.com/services/...
ANALYTICS_METRICS_ENDPOINT=https://monitoring.company.com/metrics
```

### 2. Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache \
    postgresql-client \
    curl \
    tzdata

# Set timezone
ENV TZ=UTC

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S analytics -u 1001
USER analytics

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000

CMD ["npm", "start"]
```

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  analytics-app:
    build: .
    container_name: ioc-analytics-app
    restart: unless-stopped
    environment:
      NODE_ENV: production
    env_file:
      - .env.production
    ports:
      - "3000:3000"
    volumes:
      - /data/backups:/data/backups:rw
      - /etc/ssl/certs:/etc/ssl/certs:ro
    depends_on:
      - analytics-db
    networks:
      - analytics-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  analytics-db:
    image: postgres:15
    container_name: ioc-analytics-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: ioc_analytics
      POSTGRES_USER: analytics_user
      POSTGRES_PASSWORD: ${ANALYTICS_DB_PASSWORD}
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - analytics-data:/var/lib/postgresql/data
      - ./postgresql.conf:/etc/postgresql/postgresql.conf:ro
      - ./init-scripts:/docker-entrypoint-initdb.d:ro
    ports:
      - "5432:5432"
    networks:
      - analytics-network
    command: postgres -c config_file=/etc/postgresql/postgresql.conf

  analytics-backup:
    image: postgres:15
    container_name: ioc-analytics-backup
    restart: unless-stopped
    environment:
      PGPASSWORD: ${ANALYTICS_DB_PASSWORD}
    volumes:
      - /data/backups:/backups:rw
      - ./backup-scripts:/scripts:ro
    networks:
      - analytics-network
    command: /scripts/backup-scheduler.sh

volumes:
  analytics-data:
    driver: local

networks:
  analytics-network:
    driver: bridge
```

### 3. Kubernetes Deployment

Create `analytics-namespace.yaml`:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: ioc-analytics
  labels:
    name: ioc-analytics
```

Create `analytics-configmap.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: analytics-config
  namespace: ioc-analytics
data:
  postgresql.conf: |
    shared_buffers = 2GB
    effective_cache_size = 6GB
    work_mem = 256MB
    maintenance_work_mem = 512MB
    max_connections = 100
    shared_preload_libraries = 'pg_stat_statements'
    wal_level = replica
    max_wal_size = 2GB
    checkpoint_completion_target = 0.9
```

Create `analytics-secrets.yaml`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: analytics-secrets
  namespace: ioc-analytics
type: Opaque
data:
  db-password: <base64-encoded-password>
  backup-encryption-key: <base64-encoded-key>
```

Create `analytics-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: analytics-app
  namespace: ioc-analytics
  labels:
    app: analytics-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: analytics-app
  template:
    metadata:
      labels:
        app: analytics-app
    spec:
      containers:
      - name: analytics-app
        image: your-registry/ioc-analytics:latest
        ports:
        - containerPort: 3000
        env:
        - name: ANALYTICS_DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: analytics-secrets
              key: db-password
        - name: ANALYTICS_DB_HOST
          value: "analytics-db-service"
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: analytics-app-service
  namespace: ioc-analytics
spec:
  selector:
    app: analytics-app
  ports:
  - protocol: TCP
    port: 3000
    targetPort: 3000
  type: LoadBalancer
```

Create `analytics-database.yaml`:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: analytics-db
  namespace: ioc-analytics
spec:
  serviceName: analytics-db-service
  replicas: 1
  selector:
    matchLabels:
      app: analytics-db
  template:
    metadata:
      labels:
        app: analytics-db
    spec:
      containers:
      - name: postgres
        image: postgres:15
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          value: "ioc_analytics"
        - name: POSTGRES_USER
          value: "analytics_user"
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: analytics-secrets
              key: db-password
        - name: PGDATA
          value: "/var/lib/postgresql/data/pgdata"
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
        - name: postgres-config
          mountPath: /etc/postgresql/postgresql.conf
          subPath: postgresql.conf
        resources:
          requests:
            memory: "4Gi"
            cpu: "1000m"
          limits:
            memory: "8Gi"
            cpu: "2000m"
      volumes:
      - name: postgres-config
        configMap:
          name: analytics-config
  volumeClaimTemplates:
  - metadata:
      name: postgres-data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
      storageClassName: fast-ssd
---
apiVersion: v1
kind: Service
metadata:
  name: analytics-db-service
  namespace: ioc-analytics
spec:
  selector:
    app: analytics-db
  ports:
  - protocol: TCP
    port: 5432
    targetPort: 5432
  clusterIP: None
```

## 🔒 Security Configuration

### 1. SSL/TLS Setup

Generate certificates:

```bash
# Create CA key and certificate
openssl genrsa -out ca-key.pem 4096
openssl req -new -x509 -days 3650 -key ca-key.pem -out ca-cert.pem

# Create server key and certificate
openssl genrsa -out server-key.pem 4096
openssl req -new -key server-key.pem -out server-csr.pem
openssl x509 -req -days 365 -in server-csr.pem -CA ca-cert.pem -CAkey ca-key.pem -out server-cert.pem

# Create client key and certificate
openssl genrsa -out client-key.pem 4096
openssl req -new -key client-key.pem -out client-csr.pem
openssl x509 -req -days 365 -in client-csr.pem -CA ca-cert.pem -CAkey ca-key.pem -out client-cert.pem
```

Update PostgreSQL configuration:

```conf
# postgresql.conf
ssl = on
ssl_cert_file = '/etc/ssl/certs/server-cert.pem'
ssl_key_file = '/etc/ssl/private/server-key.pem'
ssl_ca_file = '/etc/ssl/certs/ca-cert.pem'
ssl_crl_file = ''
ssl_ciphers = 'HIGH:MEDIUM:+3DES:!aNULL'
ssl_prefer_server_ciphers = on
```

### 2. Database Security

```sql
-- Create read-only role for reporting
CREATE ROLE analytics_readonly;
GRANT CONNECT ON DATABASE ioc_analytics TO analytics_readonly;
GRANT USAGE ON SCHEMA public TO analytics_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO analytics_readonly;

-- Create backup role
CREATE ROLE analytics_backup;
GRANT CONNECT ON DATABASE ioc_analytics TO analytics_backup;
GRANT USAGE ON SCHEMA public TO analytics_backup;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_backup;

-- Create monitoring role
CREATE ROLE analytics_monitor;
GRANT CONNECT ON DATABASE ioc_analytics TO analytics_monitor;
GRANT pg_monitor TO analytics_monitor;

-- Row Level Security for sensitive data
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_log_policy ON audit_log
  FOR SELECT
  TO analytics_readonly
  USING (event_type != 'sensitive');
```

### 3. Firewall Configuration

```bash
# Ubuntu/Debian UFW
sudo ufw allow from 10.0.0.0/16 to any port 5432
sudo ufw allow from 172.16.0.0/12 to any port 5432
sudo ufw deny 5432

# CentOS/RHEL firewalld
sudo firewall-cmd --permanent --add-rich-rule="rule family='ipv4' source address='10.0.0.0/16' port protocol='tcp' port='5432' accept"
sudo firewall-cmd --reload
```

## 📊 Monitoring Setup

### 1. Prometheus Metrics

Create `analytics-monitoring.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres-exporter
  namespace: ioc-analytics
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres-exporter
  template:
    metadata:
      labels:
        app: postgres-exporter
    spec:
      containers:
      - name: postgres-exporter
        image: prometheuscommunity/postgres-exporter:latest
        ports:
        - containerPort: 9187
        env:
        - name: DATA_SOURCE_NAME
          value: "postgresql://analytics_monitor:password@analytics-db-service:5432/ioc_analytics?sslmode=require"
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-exporter-service
  namespace: ioc-analytics
  labels:
    app: postgres-exporter
spec:
  ports:
  - port: 9187
    targetPort: 9187
  selector:
    app: postgres-exporter
```

### 2. Grafana Dashboard

Import the PostgreSQL dashboard and customize with analytics-specific metrics:

```json
{
  "dashboard": {
    "title": "IOC Analytics Database",
    "panels": [
      {
        "title": "Connection Usage",
        "type": "stat",
        "targets": [
          {
            "expr": "pg_stat_activity_count / pg_settings_max_connections * 100",
            "legendFormat": "Connection Usage %"
          }
        ]
      },
      {
        "title": "Query Performance",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(pg_stat_statements_total_time_seconds[5m])",
            "legendFormat": "Query Time"
          }
        ]
      },
      {
        "title": "Cache Hit Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "pg_stat_database_blks_hit / (pg_stat_database_blks_hit + pg_stat_database_blks_read) * 100",
            "legendFormat": "Cache Hit Rate %"
          }
        ]
      }
    ]
  }
}
```

### 3. Alerting Rules

Create `analytics-alerts.yaml`:

```yaml
groups:
- name: analytics-database
  rules:
  - alert: HighConnectionUsage
    expr: pg_stat_activity_count / pg_settings_max_connections > 0.8
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High database connection usage"
      
  - alert: SlowQueries
    expr: rate(pg_stat_statements_total_time_seconds[5m]) > 1000
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "Slow queries detected"
      
  - alert: LowCacheHitRate
    expr: pg_stat_database_blks_hit / (pg_stat_database_blks_hit + pg_stat_database_blks_read) < 0.95
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "Low cache hit rate"
```

## 💾 Backup Strategy

### 1. Automated Backup Script

Create `backup-scheduler.sh`:

```bash
#!/bin/bash

set -e

# Configuration
DB_HOST="${ANALYTICS_DB_HOST}"
DB_PORT="${ANALYTICS_DB_PORT:-5432}"
DB_NAME="${ANALYTICS_DB_NAME}"
DB_USER="${ANALYTICS_DB_USER}"
BACKUP_DIR="/backups"
RETENTION_DAYS="${ANALYTICS_BACKUP_RETENTION_DAYS:-30}"

# Timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/analytics_backup_${TIMESTAMP}.sql"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Perform backup
echo "Starting backup at $(date)"
pg_dump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --verbose \
  --no-password \
  --format=custom \
  --compress=9 \
  --file="$BACKUP_FILE"

# Verify backup
echo "Verifying backup..."
pg_restore --list "$BACKUP_FILE" > /dev/null

# Compress and encrypt
if [ -n "$ANALYTICS_BACKUP_ENCRYPTION_KEY" ]; then
  echo "Encrypting backup..."
  openssl enc -aes-256-cbc -salt -in "$BACKUP_FILE" -out "${BACKUP_FILE}.enc" -pass file:"$ANALYTICS_BACKUP_ENCRYPTION_KEY"
  rm "$BACKUP_FILE"
  BACKUP_FILE="${BACKUP_FILE}.enc"
fi

# Upload to cloud storage (optional)
if [ -n "$AWS_S3_BUCKET" ]; then
  echo "Uploading to S3..."
  aws s3 cp "$BACKUP_FILE" "s3://${AWS_S3_BUCKET}/analytics-backups/"
fi

# Cleanup old backups
echo "Cleaning up old backups..."
find "$BACKUP_DIR" -name "analytics_backup_*.sql*" -mtime +$RETENTION_DAYS -delete

echo "Backup completed successfully at $(date)"
```

### 2. Point-in-Time Recovery Setup

Enable WAL archiving in `postgresql.conf`:

```conf
# WAL archiving
archive_mode = on
archive_command = 'cp %p /backups/wal_archive/%f'
archive_timeout = 300

# Replication
wal_level = replica
max_wal_senders = 3
wal_keep_size = 64MB
```

Create recovery script:

```bash
#!/bin/bash

# Point-in-time recovery script
BACKUP_FILE="$1"
RECOVERY_TIME="$2"
RECOVERY_DIR="/var/lib/postgresql/recovery"

# Restore base backup
pg_restore --host="$DB_HOST" --create --dbname=postgres "$BACKUP_FILE"

# Create recovery.conf for point-in-time recovery
cat > "$RECOVERY_DIR/recovery.conf" << EOF
restore_command = 'cp /backups/wal_archive/%f %p'
recovery_target_time = '$RECOVERY_TIME'
recovery_target_timeline = 'latest'
EOF

echo "Point-in-time recovery setup complete"
```

## 🔄 Maintenance Procedures

### 1. Regular Maintenance Script

Create `maintenance.sh`:

```bash
#!/bin/bash

set -e

echo "Starting analytics database maintenance..."

# Update table statistics
echo "Updating table statistics..."
psql -h "$ANALYTICS_DB_HOST" -U "$ANALYTICS_DB_USER" -d "$ANALYTICS_DB_NAME" -c "ANALYZE;"

# Vacuum tables
echo "Vacuuming tables..."
psql -h "$ANALYTICS_DB_HOST" -U "$ANALYTICS_DB_USER" -d "$ANALYTICS_DB_NAME" -c "VACUUM ANALYZE;"

# Refresh materialized views
echo "Refreshing materialized views..."
psql -h "$ANALYTICS_DB_HOST" -U "$ANALYTICS_DB_USER" -d "$ANALYTICS_DB_NAME" -c "SELECT refresh_all_analytics_views();"

# Check for slow queries
echo "Checking for slow queries..."
psql -h "$ANALYTICS_DB_HOST" -U "$ANALYTICS_DB_USER" -d "$ANALYTICS_DB_NAME" -c "
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
WHERE mean_time > 1000 
ORDER BY mean_time DESC 
LIMIT 10;"

# Check index usage
echo "Checking index usage..."
psql -h "$ANALYTICS_DB_HOST" -U "$ANALYTICS_DB_USER" -d "$ANALYTICS_DB_NAME" -c "
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE idx_scan = 0 
ORDER BY schemaname, tablename;"

# Cleanup old audit logs
echo "Cleaning up old audit logs..."
psql -h "$ANALYTICS_DB_HOST" -U "$ANALYTICS_DB_USER" -d "$ANALYTICS_DB_NAME" -c "
DELETE FROM audit_log 
WHERE timestamp < NOW() - INTERVAL '90 days';"

echo "Maintenance completed successfully"
```

### 2. Health Check Script

Create `health-check.sh`:

```bash
#!/bin/bash

# Health check script for analytics database
DB_HOST="${ANALYTICS_DB_HOST}"
DB_PORT="${ANALYTICS_DB_PORT:-5432}"
DB_NAME="${ANALYTICS_DB_NAME}"
DB_USER="${ANALYTICS_DB_USER}"

# Check database connectivity
if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"; then
  echo "ERROR: Cannot connect to database"
  exit 1
fi

# Check connection count
CONNECTIONS=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM pg_stat_activity;")
MAX_CONNECTIONS=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SHOW max_connections;")
CONNECTION_USAGE=$((CONNECTIONS * 100 / MAX_CONNECTIONS))

if [ "$CONNECTION_USAGE" -gt 80 ]; then
  echo "WARNING: High connection usage: $CONNECTION_USAGE%"
fi

# Check cache hit rate
CACHE_HIT_RATE=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT round(
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100, 2
) FROM pg_statio_user_tables;")

if [ "$CACHE_HIT_RATE" -lt 95 ]; then
  echo "WARNING: Low cache hit rate: $CACHE_HIT_RATE%"
fi

# Check disk usage
DISK_USAGE=$(df -h /var/lib/postgresql | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
  echo "WARNING: High disk usage: $DISK_USAGE%"
fi

echo "Health check completed successfully"
```

## 🚨 Disaster Recovery

### 1. Backup Verification

```bash
#!/bin/bash

# Verify backup integrity
BACKUP_FILE="$1"
TEST_DB="test_analytics_restore"

# Create test database
createdb -h "$DB_HOST" -U "$DB_USER" "$TEST_DB"

# Restore backup to test database
pg_restore -h "$DB_HOST" -U "$DB_USER" -d "$TEST_DB" "$BACKUP_FILE"

# Run integrity checks
psql -h "$DB_HOST" -U "$DB_USER" -d "$TEST_DB" -c "
SELECT 
  'anonymized_assessments' as table_name,
  count(*) as row_count
FROM anonymized_assessments
UNION ALL
SELECT 
  'anonymized_assessment_responses' as table_name,
  count(*) as row_count
FROM anonymized_assessment_responses;"

# Cleanup
dropdb -h "$DB_HOST" -U "$DB_USER" "$TEST_DB"

echo "Backup verification completed"
```

### 2. Failover Procedures

```bash
#!/bin/bash

# Emergency failover to read replica
REPLICA_HOST="$1"
PRIMARY_HOST="$2"

echo "Starting emergency failover..."

# Stop application connections to primary
echo "Stopping application..."
kubectl scale deployment analytics-app --replicas=0 -n ioc-analytics

# Promote replica to primary
echo "Promoting replica to primary..."
pg_ctl promote -D /var/lib/postgresql/data

# Update application configuration
echo "Updating application configuration..."
kubectl patch configmap analytics-config -n ioc-analytics --patch="
data:
  ANALYTICS_DB_HOST: '$REPLICA_HOST'
"

# Restart application
echo "Restarting application..."
kubectl scale deployment analytics-app --replicas=3 -n ioc-analytics

echo "Failover completed"
```

## 📈 Performance Tuning

### 1. Query Optimization

```sql
-- Find slow queries
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows,
  100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
WHERE mean_time > 1000
ORDER BY mean_time DESC
LIMIT 20;

-- Analyze table statistics
SELECT 
  schemaname,
  tablename,
  n_tup_ins,
  n_tup_upd,
  n_tup_del,
  n_live_tup,
  n_dead_tup,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

### 2. Automated Performance Tuning

Create `tune-performance.sh`:

```bash
#!/bin/bash

# Automated performance tuning script
echo "Starting performance tuning..."

# Update table statistics
psql -c "ANALYZE;"

# Reindex if needed
psql -c "
SELECT 'REINDEX INDEX ' || indexname || ';'
FROM pg_stat_user_indexes 
WHERE idx_scan < 10 
  AND pg_relation_size(indexname::regclass) > 1000000;"

# Update materialized views
psql -c "SELECT refresh_all_analytics_views();"

# Vacuum analyze large tables
psql -c "
SELECT 'VACUUM ANALYZE ' || schemaname || '.' || tablename || ';'
FROM pg_stat_user_tables 
WHERE n_dead_tup > 1000;"

echo "Performance tuning completed"
```

## 🎯 Go-Live Checklist

### Pre-Deployment

- [ ] Database server provisioned and configured
- [ ] SSL certificates generated and installed
- [ ] Network security groups configured
- [ ] Backup storage configured
- [ ] Monitoring tools installed
- [ ] Application configuration reviewed
- [ ] Database schema initialized
- [ ] Sample data loaded and tested

### Deployment

- [ ] Application deployed to staging environment
- [ ] End-to-end testing completed
- [ ] Performance testing completed
- [ ] Security audit completed
- [ ] Backup and recovery tested
- [ ] Monitoring and alerting verified
- [ ] Documentation updated

### Post-Deployment

- [ ] Production deployment completed
- [ ] Health checks passing
- [ ] Monitoring dashboards configured
- [ ] Backup schedule verified
- [ ] Performance baselines established
- [ ] Team training completed
- [ ] Support procedures documented
- [ ] Incident response plan activated

## 📞 Support and Troubleshooting

### Common Issues

1. **High CPU Usage**
   - Check for slow queries
   - Review connection pooling
   - Consider query optimization

2. **Memory Issues**
   - Adjust shared_buffers
   - Review work_mem settings
   - Check for memory leaks

3. **Disk Space**
   - Monitor WAL file growth
   - Schedule regular vacuuming
   - Implement data retention policies

4. **Connection Limits**
   - Review max_connections setting
   - Implement connection pooling
   - Monitor connection usage

### Emergency Contacts

- **Database Team**: db-team@company.com
- **DevOps Team**: ops-team@company.com
- **On-Call Engineer**: +1-800-ONCALL
- **Vendor Support**: PostgreSQL Support Portal

### Useful Commands

```bash
# Check database status
pg_isready -h $DB_HOST -p $DB_PORT

# Monitor active queries
psql -c "SELECT pid, usename, application_name, client_addr, state, query_start, query FROM pg_stat_activity WHERE state = 'active';"

# Check locks
psql -c "SELECT * FROM pg_locks JOIN pg_stat_activity ON pg_locks.pid = pg_stat_activity.pid;"

# Monitor replication
psql -c "SELECT * FROM pg_stat_replication;"

# Check WAL status
psql -c "SELECT pg_current_wal_lsn(), pg_wal_lsn_diff(pg_current_wal_lsn(), '0/0');"
```

This deployment guide provides a comprehensive foundation for deploying the IOC Analytics Database system in production. Adjust configurations based on your specific infrastructure requirements and compliance needs.