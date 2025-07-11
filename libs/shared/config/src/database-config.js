/**
 * @fileoverview Database configuration with connection pooling and health checks
 * @description Environment-specific database configurations with optimizations
 */

const { getEnvironmentConfig } = require('./env-schema');

/**
 * Database connection pool configuration by environment
 */
const getDatabasePoolConfig = (environment = 'development') => {
  const envConfig = getEnvironmentConfig();
  
  const baseConfig = {
    min: envConfig.databaseConfig?.pool?.min || 2,
    max: envConfig.databaseConfig?.pool?.max || 10,
    idleTimeoutMillis: envConfig.databaseConfig?.pool?.idleTimeoutMillis || 30000,
    acquireTimeoutMillis: envConfig.databaseConfig?.pool?.acquireTimeoutMillis || 30000,
    createTimeoutMillis: 3000,
    destroyTimeoutMillis: 5000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 100,
    propagateCreateError: false,
  };
  
  // Environment-specific pool configurations
  if (environment === 'production') {
    return {
      ...baseConfig,
      min: 5,
      max: 50,
      idleTimeoutMillis: 30000,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 5000,
      destroyTimeoutMillis: 5000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200,
      propagateCreateError: true,
      // Production-specific optimizations
      log: (message, logLevel) => {
        if (logLevel === 'error') {
          console.error('Database pool error:', message);
        }
      },
    };
  } else if (environment === 'staging') {
    return {
      ...baseConfig,
      min: 2,
      max: 20,
      idleTimeoutMillis: 30000,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 3000,
      destroyTimeoutMillis: 5000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 150,
      propagateCreateError: true,
      // Staging logging
      log: (message, logLevel) => {
        console.log(`Database pool [${logLevel}]:`, message);
      },
    };
  } else {
    // Development
    return {
      ...baseConfig,
      min: 1,
      max: 5,
      idleTimeoutMillis: 10000,
      acquireTimeoutMillis: 10000,
      createTimeoutMillis: 3000,
      destroyTimeoutMillis: 5000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 100,
      propagateCreateError: false,
      // Development logging
      log: (message, logLevel) => {
        if (process.env.DEBUG_DB) {
          console.log(`Database pool [${logLevel}]:`, message);
        }
      },
    };
  }
};

/**
 * Database connection configuration
 */
const getDatabaseConfig = (environment = 'development') => {
  const envConfig = getEnvironmentConfig();
  
  const baseConfig = {
    client: 'postgresql',
    connection: {
      connectionString: envConfig.databaseConfig?.url || envConfig.DATABASE_URL,
      ssl: environment === 'production' ? { rejectUnauthorized: false } : false,
      charset: 'utf8',
      timezone: 'UTC',
    },
    pool: getDatabasePoolConfig(environment),
    migrations: {
      tableName: 'knex_migrations',
      directory: './migrations',
      extension: 'js',
      disableTransactions: false,
      loadExtensions: ['.js'],
    },
    seeds: {
      directory: './seeds',
      loadExtensions: ['.js'],
    },
    debug: environment === 'development',
    asyncStackTraces: environment !== 'production',
    log: {
      warn: (message) => console.warn('Database warning:', message),
      error: (message) => console.error('Database error:', message),
      deprecate: (message) => console.warn('Database deprecation:', message),
      debug: environment === 'development' 
        ? (message) => console.log('Database debug:', message)
        : () => {},
    },
  };
  
  // Environment-specific database configurations
  if (environment === 'production') {
    return {
      ...baseConfig,
      connection: {
        ...baseConfig.connection,
        ssl: { rejectUnauthorized: false },
        statement_timeout: 30000,
        query_timeout: 30000,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        application_name: 'ioc-core-production',
      },
      debug: false,
      asyncStackTraces: false,
      acquireConnectionTimeout: 30000,
      useNullAsDefault: true,
    };
  } else if (environment === 'staging') {
    return {
      ...baseConfig,
      connection: {
        ...baseConfig.connection,
        ssl: { rejectUnauthorized: false },
        statement_timeout: 60000,
        query_timeout: 60000,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
        application_name: 'ioc-core-staging',
      },
      debug: true,
      asyncStackTraces: true,
      acquireConnectionTimeout: 30000,
      useNullAsDefault: true,
    };
  } else {
    // Development
    return {
      ...baseConfig,
      connection: {
        ...baseConfig.connection,
        ssl: false,
        statement_timeout: 0,
        query_timeout: 0,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 10000,
        application_name: 'ioc-core-development',
      },
      debug: process.env.DEBUG_DB === 'true',
      asyncStackTraces: true,
      acquireConnectionTimeout: 10000,
      useNullAsDefault: true,
    };
  }
};

/**
 * Database health check configuration
 */
const getDatabaseHealthConfig = (environment = 'development') => {
  return {
    timeout: 5000,
    retries: 3,
    retryDelay: 1000,
    queries: {
      simple: 'SELECT 1 as health_check',
      extended: 'SELECT version() as version, now() as timestamp',
      connection_count: `
        SELECT 
          count(*) as active_connections,
          max_conn.setting as max_connections
        FROM pg_stat_activity psa
        CROSS JOIN pg_settings max_conn
        WHERE max_conn.name = 'max_connections'
        AND psa.state = 'active'
      `,
    },
    thresholds: {
      production: {
        maxResponseTime: 1000,
        maxActiveConnections: 40,
        minAvailableConnections: 10,
      },
      staging: {
        maxResponseTime: 2000,
        maxActiveConnections: 15,
        minAvailableConnections: 5,
      },
      development: {
        maxResponseTime: 5000,
        maxActiveConnections: 5,
        minAvailableConnections: 1,
      },
    },
  };
};

/**
 * Database migration configuration
 */
const getMigrationConfig = (environment = 'development') => {
  const baseConfig = {
    directory: './migrations',
    extension: 'js',
    tableName: 'knex_migrations',
    schemaName: 'public',
    disableTransactions: false,
    sortDirsSeparately: false,
    loadExtensions: ['.js'],
    migrationSource: 'filesystem',
  };
  
  // Environment-specific migration settings
  if (environment === 'production') {
    return {
      ...baseConfig,
      disableTransactions: true, // Safer for production
      stub: './migration-stubs/production-migration.stub',
    };
  } else if (environment === 'staging') {
    return {
      ...baseConfig,
      disableTransactions: false,
      stub: './migration-stubs/staging-migration.stub',
    };
  } else {
    // Development
    return {
      ...baseConfig,
      disableTransactions: false,
      stub: './migration-stubs/development-migration.stub',
    };
  }
};

/**
 * Database seed configuration
 */
const getSeedConfig = (environment = 'development') => {
  const baseConfig = {
    directory: './seeds',
    loadExtensions: ['.js'],
    recursive: true,
    sortDirsSeparately: false,
    stub: './seed-stubs/seed.stub',
  };
  
  // Environment-specific seed settings
  if (environment === 'production') {
    return {
      ...baseConfig,
      directory: './seeds/production',
      specific: 'production-data.js',
    };
  } else if (environment === 'staging') {
    return {
      ...baseConfig,
      directory: './seeds/staging',
      specific: 'staging-data.js',
    };
  } else {
    // Development
    return {
      ...baseConfig,
      directory: './seeds/development',
      specific: 'development-data.js',
    };
  }
};

/**
 * Database query builder configuration
 */
const getQueryBuilderConfig = (environment = 'development') => {
  return {
    // Query timeout settings
    timeout: environment === 'production' ? 30000 : 60000,
    
    // Connection settings
    wrapIdentifier: (value, origImpl) => origImpl(value),
    postProcessResponse: (result) => result,
    
    // Logging settings
    log: {
      warn: (message) => console.warn('Query warning:', message),
      error: (message) => console.error('Query error:', message),
      deprecate: (message) => console.warn('Query deprecation:', message),
      debug: environment === 'development' 
        ? (message) => console.log('Query debug:', message)
        : () => {},
    },
    
    // Performance settings
    caseSensitive: false,
    
    // Environment-specific settings
    ...(environment === 'production' && {
      // Production-specific query settings
      wrapIdentifier: (value, origImpl) => {
        if (value === '*') return origImpl(value);
        return origImpl(value.toLowerCase());
      },
    }),
  };
};

/**
 * Database monitoring configuration
 */
const getMonitoringConfig = (environment = 'development') => {
  return {
    enabled: environment !== 'development',
    metrics: {
      connectionPool: true,
      queryPerformance: true,
      errorTracking: true,
      slowQueries: true,
    },
    thresholds: {
      slowQueryTime: environment === 'production' ? 1000 : 5000,
      connectionPoolWarning: environment === 'production' ? 0.8 : 0.9,
      errorRate: 0.05, // 5% error rate threshold
    },
    reporting: {
      interval: 60000, // 1 minute
      aggregation: 'minute',
      retention: environment === 'production' ? '7d' : '1d',
    },
  };
};

/**
 * Create complete database configuration
 */
const createDatabaseConfig = (environment = 'development') => {
  return {
    main: getDatabaseConfig(environment),
    pool: getDatabasePoolConfig(environment),
    health: getDatabaseHealthConfig(environment),
    migrations: getMigrationConfig(environment),
    seeds: getSeedConfig(environment),
    queryBuilder: getQueryBuilderConfig(environment),
    monitoring: getMonitoringConfig(environment),
  };
};

/**
 * Database connection factory
 */
class DatabaseConnectionFactory {
  constructor(environment = 'development') {
    this.environment = environment;
    this.config = createDatabaseConfig(environment);
    this.connections = new Map();
  }
  
  /**
   * Get database connection
   */
  getConnection(name = 'default') {
    if (!this.connections.has(name)) {
      const knex = require('knex')(this.config.main);
      this.connections.set(name, knex);
    }
    return this.connections.get(name);
  }
  
  /**
   * Close all connections
   */
  async closeAllConnections() {
    for (const [name, connection] of this.connections) {
      await connection.destroy();
      this.connections.delete(name);
    }
  }
  
  /**
   * Health check
   */
  async healthCheck() {
    const connection = this.getConnection();
    const healthConfig = this.config.health;
    
    try {
      const startTime = Date.now();
      const result = await connection.raw(healthConfig.queries.simple);
      const responseTime = Date.now() - startTime;
      
      const thresholds = healthConfig.thresholds[this.environment];
      
      return {
        healthy: responseTime < thresholds.maxResponseTime,
        responseTime,
        timestamp: new Date().toISOString(),
        environment: this.environment,
        details: {
          query: healthConfig.queries.simple,
          result: result.rows,
          thresholds,
        },
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        environment: this.environment,
      };
    }
  }
  
  /**
   * Get connection pool stats
   */
  getPoolStats() {
    const connection = this.getConnection();
    const pool = connection.client.pool;
    
    return {
      size: pool.size,
      available: pool.available,
      borrowed: pool.borrowed,
      pending: pool.pending,
      min: pool.min,
      max: pool.max,
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = {
  getDatabaseConfig,
  getDatabasePoolConfig,
  getDatabaseHealthConfig,
  getMigrationConfig,
  getSeedConfig,
  getQueryBuilderConfig,
  getMonitoringConfig,
  createDatabaseConfig,
  DatabaseConnectionFactory,
};