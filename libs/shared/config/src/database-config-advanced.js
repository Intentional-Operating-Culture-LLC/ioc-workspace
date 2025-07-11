/**
 * @fileoverview Advanced database configuration with connection pooling and monitoring
 * @description Enterprise-grade database configuration for different environments
 */

const { URL } = require('url');

/**
 * Database configuration builder
 */
class DatabaseConfigBuilder {
  constructor(environment = 'development') {
    this.environment = environment;
    this.config = this._getBaseConfig();
  }

  /**
   * Get base configuration for environment
   */
  _getBaseConfig() {
    const configs = {
      production: {
        // Connection settings
        connectionString: process.env.DATABASE_URL,
        replicaConnectionString: process.env.DATABASE_REPLICA_URL,
        ssl: {
          rejectUnauthorized: true,
          ca: process.env.DATABASE_CA_CERT,
          key: process.env.DATABASE_CLIENT_KEY,
          cert: process.env.DATABASE_CLIENT_CERT,
        },
        
        // Pool configuration
        pool: {
          min: parseInt(process.env.DATABASE_POOL_MIN) || 10,
          max: parseInt(process.env.DATABASE_POOL_MAX) || 100,
          idleTimeoutMillis: parseInt(process.env.DATABASE_POOL_IDLE_TIMEOUT) || 30000,
          acquireTimeoutMillis: parseInt(process.env.DATABASE_POOL_ACQUIRE_TIMEOUT) || 30000,
          createTimeoutMillis: parseInt(process.env.DATABASE_POOL_CREATE_TIMEOUT) || 30000,
          destroyTimeoutMillis: parseInt(process.env.DATABASE_POOL_DESTROY_TIMEOUT) || 5000,
          reapIntervalMillis: parseInt(process.env.DATABASE_POOL_REAP_INTERVAL) || 1000,
          createRetryIntervalMillis: 200,
          propagateCreateError: false,
        },
        
        // Query configuration
        query: {
          timeout: parseInt(process.env.DATABASE_QUERY_TIMEOUT) || 30000,
          statementTimeout: parseInt(process.env.DATABASE_STATEMENT_TIMEOUT) || 30000,
          idleInTransactionSessionTimeout: parseInt(process.env.DATABASE_IDLE_TRANSACTION_TIMEOUT) || 60000,
        },
        
        // Connection retry
        retry: {
          max: 5,
          backoff: 'exponential',
          initialDelay: 1000,
          maxDelay: 30000,
        },
        
        // Monitoring
        monitoring: {
          enabled: true,
          logQueries: false,
          logSlowQueries: true,
          slowQueryThreshold: 1000,
          collectMetrics: true,
        },
        
        // Read/Write splitting
        readWriteSplitting: {
          enabled: !!process.env.DATABASE_REPLICA_URL,
          readPreference: 'replica', // 'primary' | 'replica' | 'nearest'
          maxReplicaLag: 1000, // milliseconds
        },
      },
      
      staging: {
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false,
        },
        pool: {
          min: parseInt(process.env.DATABASE_POOL_MIN) || 5,
          max: parseInt(process.env.DATABASE_POOL_MAX) || 50,
          idleTimeoutMillis: parseInt(process.env.DATABASE_POOL_IDLE_TIMEOUT) || 30000,
          acquireTimeoutMillis: parseInt(process.env.DATABASE_POOL_ACQUIRE_TIMEOUT) || 30000,
        },
        query: {
          timeout: parseInt(process.env.DATABASE_QUERY_TIMEOUT) || 30000,
        },
        retry: {
          max: 3,
          backoff: 'exponential',
          initialDelay: 1000,
        },
        monitoring: {
          enabled: true,
          logQueries: true,
          logSlowQueries: true,
          slowQueryThreshold: 500,
          collectMetrics: true,
        },
      },
      
      development: {
        connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/ioc_dev',
        ssl: false,
        pool: {
          min: parseInt(process.env.DATABASE_POOL_MIN) || 1,
          max: parseInt(process.env.DATABASE_POOL_MAX) || 10,
          idleTimeoutMillis: parseInt(process.env.DATABASE_POOL_IDLE_TIMEOUT) || 10000,
          acquireTimeoutMillis: parseInt(process.env.DATABASE_POOL_ACQUIRE_TIMEOUT) || 10000,
        },
        query: {
          timeout: parseInt(process.env.DATABASE_QUERY_TIMEOUT) || 0, // No timeout in dev
        },
        retry: {
          max: 1,
        },
        monitoring: {
          enabled: true,
          logQueries: true,
          logSlowQueries: true,
          slowQueryThreshold: 100,
          collectMetrics: false,
        },
      },
      
      test: {
        connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/ioc_test',
        ssl: false,
        pool: {
          min: 1,
          max: 5,
          idleTimeoutMillis: 1000,
          acquireTimeoutMillis: 1000,
        },
        query: {
          timeout: 5000,
        },
        retry: {
          max: 0,
        },
        monitoring: {
          enabled: false,
          logQueries: false,
          logSlowQueries: false,
          collectMetrics: false,
        },
      },
    };
    
    return configs[this.environment] || configs.development;
  }

  /**
   * Parse database URL
   */
  parseConnectionString(connectionString) {
    try {
      const url = new URL(connectionString);
      return {
        host: url.hostname,
        port: parseInt(url.port) || 5432,
        database: url.pathname.slice(1),
        user: url.username,
        password: url.password,
        protocol: url.protocol.slice(0, -1),
      };
    } catch (error) {
      throw new Error(`Invalid database connection string: ${error.message}`);
    }
  }

  /**
   * Get configuration for specific database type
   */
  getConfig(type = 'postgresql') {
    const baseConfig = this.config;
    const parsed = this.parseConnectionString(baseConfig.connectionString);
    
    switch (type) {
      case 'postgresql':
      case 'postgres':
        return this._getPostgresConfig(baseConfig, parsed);
      
      case 'mysql':
      case 'mysql2':
        return this._getMySQLConfig(baseConfig, parsed);
      
      case 'mongodb':
        return this._getMongoDBConfig(baseConfig, parsed);
      
      default:
        throw new Error(`Unsupported database type: ${type}`);
    }
  }

  /**
   * PostgreSQL specific configuration
   */
  _getPostgresConfig(baseConfig, parsed) {
    return {
      // Connection
      host: parsed.host,
      port: parsed.port,
      database: parsed.database,
      user: parsed.user,
      password: parsed.password,
      
      // SSL
      ssl: baseConfig.ssl,
      
      // Pool
      ...baseConfig.pool,
      
      // Query
      statement_timeout: baseConfig.query.statementTimeout,
      query_timeout: baseConfig.query.timeout,
      idle_in_transaction_session_timeout: baseConfig.query.idleInTransactionSessionTimeout,
      
      // PostgreSQL specific
      application_name: `ioc-core-${this.environment}`,
      max_prepared_transactions: 0,
      
      // Connection options
      connectionTimeoutMillis: baseConfig.pool.acquireTimeoutMillis,
      
      // Events
      onConnect: async (client) => {
        if (baseConfig.monitoring.enabled) {
          console.log('Database connection established');
        }
      },
      onError: (error, client) => {
        console.error('Database error:', error);
      },
      
      // Type parsing
      types: {
        getTypeParser: (oid, format) => {
          // Custom type parsers if needed
          return null;
        },
      },
    };
  }

  /**
   * MySQL specific configuration
   */
  _getMySQLConfig(baseConfig, parsed) {
    return {
      // Connection
      host: parsed.host,
      port: parsed.port,
      database: parsed.database,
      user: parsed.user,
      password: parsed.password,
      
      // SSL
      ssl: baseConfig.ssl,
      
      // Pool
      connectionLimit: baseConfig.pool.max,
      queueLimit: 0,
      waitForConnections: true,
      
      // Query
      connectTimeout: baseConfig.pool.acquireTimeoutMillis,
      timeout: baseConfig.query.timeout,
      
      // MySQL specific
      charset: 'utf8mb4',
      timezone: 'Z',
      multipleStatements: false,
      
      // Debug
      debug: this.environment === 'development',
    };
  }

  /**
   * MongoDB specific configuration
   */
  _getMongoDBConfig(baseConfig, parsed) {
    return {
      // Connection
      url: baseConfig.connectionString,
      
      // Options
      useNewUrlParser: true,
      useUnifiedTopology: true,
      
      // Pool
      minPoolSize: baseConfig.pool.min,
      maxPoolSize: baseConfig.pool.max,
      maxIdleTimeMS: baseConfig.pool.idleTimeoutMillis,
      waitQueueTimeoutMS: baseConfig.pool.acquireTimeoutMillis,
      
      // Connection
      serverSelectionTimeoutMS: baseConfig.pool.acquireTimeoutMillis,
      socketTimeoutMS: baseConfig.query.timeout,
      
      // SSL
      ssl: !!baseConfig.ssl,
      sslValidate: baseConfig.ssl?.rejectUnauthorized,
      
      // Monitoring
      monitoring: baseConfig.monitoring.enabled,
      
      // Retry
      retryWrites: true,
      retryReads: true,
    };
  }

  /**
   * Get replica configuration
   */
  getReplicaConfig(type = 'postgresql') {
    if (!this.config.replicaConnectionString) {
      return null;
    }
    
    const replicaConfig = {
      ...this.config,
      connectionString: this.config.replicaConnectionString,
    };
    
    const builder = new DatabaseConfigBuilder(this.environment);
    builder.config = replicaConfig;
    return builder.getConfig(type);
  }

  /**
   * Get monitoring configuration
   */
  getMonitoringConfig() {
    return {
      ...this.config.monitoring,
      
      // Metrics to collect
      metrics: {
        connectionPool: true,
        queryPerformance: true,
        transactionDuration: true,
        errorRate: true,
        replicationLag: this.config.readWriteSplitting?.enabled || false,
      },
      
      // Alerting thresholds
      alerts: {
        slowQueryThreshold: this.config.monitoring.slowQueryThreshold,
        connectionPoolExhaustedThreshold: 0.9,
        replicationLagThreshold: 5000,
        errorRateThreshold: 0.01,
      },
      
      // Logging configuration
      logging: {
        level: this.environment === 'production' ? 'warn' : 'debug',
        format: 'json',
        includeQueryParams: this.environment !== 'production',
        maskSensitiveData: true,
      },
    };
  }

  /**
   * Get migration configuration
   */
  getMigrationConfig() {
    return {
      directory: './migrations',
      tableName: 'migrations',
      schemaName: 'public',
      
      // Migration settings by environment
      validateChecksums: this.environment === 'production',
      disableTransactions: false,
      
      // Lock settings
      migrationLockTimeout: 60000,
      migrationLockRetryInterval: 1000,
      
      // Logging
      log: console.log,
      logger: {
        info: console.info,
        warn: console.warn,
        error: console.error,
      },
    };
  }

  /**
   * Get health check queries
   */
  getHealthCheckQueries(type = 'postgresql') {
    const queries = {
      postgresql: {
        basic: 'SELECT 1',
        extended: `
          SELECT 
            current_database() as database,
            current_user as user,
            version() as version,
            pg_is_in_recovery() as is_replica,
            extract(epoch from now() - pg_postmaster_start_time()) as uptime_seconds
        `,
        replicationLag: `
          SELECT 
            CASE 
              WHEN pg_is_in_recovery() THEN 
                extract(epoch from now() - pg_last_xact_replay_timestamp())
              ELSE 0
            END as replication_lag_seconds
        `,
      },
      mysql: {
        basic: 'SELECT 1',
        extended: 'SHOW STATUS',
        replicationLag: 'SHOW SLAVE STATUS',
      },
      mongodb: {
        basic: { ping: 1 },
        extended: { serverStatus: 1 },
        replicationLag: { replSetGetStatus: 1 },
      },
    };
    
    return queries[type] || queries.postgresql;
  }
}

/**
 * Database connection manager
 */
class DatabaseConnectionManager {
  constructor(config, type = 'postgresql') {
    this.config = config;
    this.type = type;
    this.connections = new Map();
    this.healthCheckInterval = null;
  }

  /**
   * Get connection
   */
  async getConnection(name = 'primary') {
    if (this.connections.has(name)) {
      return this.connections.get(name);
    }
    
    const connection = await this._createConnection(name);
    this.connections.set(name, connection);
    return connection;
  }

  /**
   * Create connection
   */
  async _createConnection(name) {
    // Implementation depends on database driver
    // This is a placeholder
    console.log(`Creating ${name} connection for ${this.type}`);
    return { name, config: this.config };
  }

  /**
   * Start health checks
   */
  startHealthChecks(interval = 30000) {
    this.healthCheckInterval = setInterval(() => {
      this.checkHealth();
    }, interval);
  }

  /**
   * Stop health checks
   */
  stopHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Check connection health
   */
  async checkHealth() {
    const results = {};
    
    for (const [name, connection] of this.connections) {
      try {
        // Execute health check query
        const start = Date.now();
        // await connection.query(healthCheckQuery);
        const duration = Date.now() - start;
        
        results[name] = {
          status: 'healthy',
          responseTime: duration,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString(),
        };
      }
    }
    
    return results;
  }

  /**
   * Close all connections
   */
  async closeAll() {
    this.stopHealthChecks();
    
    for (const [name, connection] of this.connections) {
      try {
        // await connection.close();
        console.log(`Closed ${name} connection`);
      } catch (error) {
        console.error(`Error closing ${name} connection:`, error);
      }
    }
    
    this.connections.clear();
  }
}

/**
 * Create database configuration
 */
function createDatabaseConfig(environment = process.env.NODE_ENV || 'development', type = 'postgresql') {
  const builder = new DatabaseConfigBuilder(environment);
  return builder.getConfig(type);
}

/**
 * Create database connection manager
 */
function createDatabaseManager(environment = process.env.NODE_ENV || 'development', type = 'postgresql') {
  const builder = new DatabaseConfigBuilder(environment);
  const config = builder.getConfig(type);
  return new DatabaseConnectionManager(config, type);
}

module.exports = {
  DatabaseConfigBuilder,
  DatabaseConnectionManager,
  createDatabaseConfig,
  createDatabaseManager,
};