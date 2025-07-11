/**
 * @fileoverview Secure secret management system
 * @description Centralized secret management with encryption and environment-specific handling
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Secret encryption/decryption utility
 */
class SecretCrypto {
  constructor(key = null) {
    this.algorithm = 'aes-256-gcm';
    this.key = key || this._generateKey();
    this.keyBuffer = Buffer.from(this.key, 'hex');
  }
  
  /**
   * Generate a new encryption key
   */
  _generateKey() {
    return crypto.randomBytes(32).toString('hex');
  }
  
  /**
   * Encrypt a secret value
   */
  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.keyBuffer);
    cipher.setAAD(Buffer.from('secret-manager', 'utf8'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      iv: iv.toString('hex'),
      encrypted,
      authTag: authTag.toString('hex'),
    };
  }
  
  /**
   * Decrypt a secret value
   */
  decrypt(encryptedData) {
    const { iv, encrypted, authTag } = encryptedData;
    const decipher = crypto.createDecipher(this.algorithm, this.keyBuffer);
    
    decipher.setAAD(Buffer.from('secret-manager', 'utf8'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

/**
 * Secret classification levels
 */
const SECRET_LEVELS = {
  PUBLIC: 'public',
  INTERNAL: 'internal',
  CONFIDENTIAL: 'confidential',
  SECRET: 'secret',
  TOP_SECRET: 'top_secret',
};

/**
 * Secret configuration definitions
 */
const SECRET_DEFINITIONS = {
  // Authentication secrets
  NEXTAUTH_SECRET: {
    level: SECRET_LEVELS.SECRET,
    description: 'NextAuth.js encryption secret',
    required: true,
    environments: ['production', 'staging', 'development'],
    validation: (value) => value.length >= 32,
    generator: () => crypto.randomBytes(32).toString('hex'),
  },
  
  // Database secrets
  DATABASE_URL: {
    level: SECRET_LEVELS.CONFIDENTIAL,
    description: 'Database connection URL',
    required: true,
    environments: ['production', 'staging', 'development'],
    validation: (value) => value.includes('://'),
    masked: true,
  },
  
  // API keys
  OPENAI_API_KEY: {
    level: SECRET_LEVELS.SECRET,
    description: 'OpenAI API key',
    required: false,
    environments: ['production', 'staging', 'development'],
    validation: (value) => value.startsWith('sk-'),
    masked: true,
  },
  
  ANTHROPIC_API_KEY: {
    level: SECRET_LEVELS.SECRET,
    description: 'Anthropic API key',
    required: false,
    environments: ['production', 'staging', 'development'],
    validation: (value) => value.startsWith('sk-ant-'),
    masked: true,
  },
  
  // Payment secrets
  STRIPE_SECRET_KEY: {
    level: SECRET_LEVELS.SECRET,
    description: 'Stripe secret key',
    required: false,
    environments: ['production', 'staging'],
    validation: (value) => value.startsWith('sk_'),
    masked: true,
  },
  
  STRIPE_WEBHOOK_SECRET: {
    level: SECRET_LEVELS.SECRET,
    description: 'Stripe webhook secret',
    required: false,
    environments: ['production', 'staging'],
    validation: (value) => value.startsWith('whsec_'),
    masked: true,
  },
  
  // Supabase secrets
  SUPABASE_SERVICE_ROLE_KEY: {
    level: SECRET_LEVELS.SECRET,
    description: 'Supabase service role key',
    required: true,
    environments: ['production', 'staging', 'development'],
    validation: (value) => value.length > 100,
    masked: true,
  },
  
  // Email secrets
  SMTP_PASS: {
    level: SECRET_LEVELS.CONFIDENTIAL,
    description: 'SMTP password',
    required: false,
    environments: ['production', 'staging'],
    validation: (value) => value.length > 0,
    masked: true,
  },
  
  // Storage secrets
  S3_SECRET_ACCESS_KEY: {
    level: SECRET_LEVELS.SECRET,
    description: 'AWS S3 secret access key',
    required: false,
    environments: ['production', 'staging'],
    validation: (value) => value.length === 40,
    masked: true,
  },
  
  // Redis password
  REDIS_PASSWORD: {
    level: SECRET_LEVELS.CONFIDENTIAL,
    description: 'Redis password',
    required: false,
    environments: ['production', 'staging'],
    validation: (value) => value.length > 0,
    masked: true,
  },
  
  // Monitoring secrets
  SENTRY_DSN: {
    level: SECRET_LEVELS.INTERNAL,
    description: 'Sentry DSN for error tracking',
    required: false,
    environments: ['production', 'staging'],
    validation: (value) => value.includes('sentry.io'),
    masked: false,
  },
};

/**
 * Secret manager class
 */
class SecretManager {
  constructor(environment = 'development', encryptionKey = null) {
    this.environment = environment;
    this.crypto = new SecretCrypto(encryptionKey);
    this.secrets = new Map();
    this.auditLog = [];
  }
  
  /**
   * Set a secret value
   */
  setSecret(key, value, metadata = {}) {
    const definition = SECRET_DEFINITIONS[key];
    
    if (!definition) {
      throw new Error(`Unknown secret: ${key}`);
    }
    
    // Validate environment
    if (!definition.environments.includes(this.environment)) {
      throw new Error(`Secret ${key} is not allowed in ${this.environment} environment`);
    }
    
    // Validate value
    if (definition.validation && !definition.validation(value)) {
      throw new Error(`Secret ${key} failed validation`);
    }
    
    // Encrypt if needed
    const secretData = {
      key,
      value: definition.level === SECRET_LEVELS.PUBLIC ? value : this.crypto.encrypt(value),
      level: definition.level,
      encrypted: definition.level !== SECRET_LEVELS.PUBLIC,
      timestamp: new Date().toISOString(),
      environment: this.environment,
      metadata,
    };
    
    this.secrets.set(key, secretData);
    this._auditLog('SET', key, definition.level);
    
    return secretData;
  }
  
  /**
   * Get a secret value
   */
  getSecret(key) {
    const secretData = this.secrets.get(key);
    
    if (!secretData) {
      // Try to get from environment variables
      const envValue = process.env[key];
      if (envValue) {
        this._auditLog('GET_ENV', key, 'unknown');
        return envValue;
      }
      
      throw new Error(`Secret not found: ${key}`);
    }
    
    this._auditLog('GET', key, secretData.level);
    
    // Decrypt if needed
    if (secretData.encrypted) {
      return this.crypto.decrypt(secretData.value);
    }
    
    return secretData.value;
  }
  
  /**
   * Check if a secret exists
   */
  hasSecret(key) {
    return this.secrets.has(key) || process.env[key] !== undefined;
  }
  
  /**
   * Delete a secret
   */
  deleteSecret(key) {
    const secretData = this.secrets.get(key);
    if (secretData) {
      this.secrets.delete(key);
      this._auditLog('DELETE', key, secretData.level);
      return true;
    }
    return false;
  }
  
  /**
   * List all secrets (masked)
   */
  listSecrets() {
    const secrets = [];
    
    for (const [key, secretData] of this.secrets) {
      const definition = SECRET_DEFINITIONS[key] || {};
      secrets.push({
        key,
        level: secretData.level,
        description: definition.description,
        environment: secretData.environment,
        timestamp: secretData.timestamp,
        masked: definition.masked,
        value: definition.masked ? this._maskValue(secretData.value) : secretData.value,
      });
    }
    
    return secrets;
  }
  
  /**
   * Validate all secrets for current environment
   */
  validateSecrets() {
    const results = {
      valid: true,
      errors: [],
      warnings: [],
      missing: [],
    };
    
    for (const [key, definition] of Object.entries(SECRET_DEFINITIONS)) {
      if (!definition.environments.includes(this.environment)) {
        continue;
      }
      
      if (definition.required && !this.hasSecret(key)) {
        results.missing.push({
          key,
          level: definition.level,
          description: definition.description,
        });
        results.valid = false;
      } else if (this.hasSecret(key)) {
        try {
          const value = this.getSecret(key);
          if (definition.validation && !definition.validation(value)) {
            results.errors.push({
              key,
              message: `Secret ${key} failed validation`,
            });
            results.valid = false;
          }
        } catch (error) {
          results.errors.push({
            key,
            message: error.message,
          });
          results.valid = false;
        }
      }
    }
    
    return results;
  }
  
  /**
   * Generate missing secrets
   */
  generateMissingSecrets() {
    const generated = [];
    
    for (const [key, definition] of Object.entries(SECRET_DEFINITIONS)) {
      if (!definition.environments.includes(this.environment)) {
        continue;
      }
      
      if (definition.required && !this.hasSecret(key) && definition.generator) {
        const value = definition.generator();
        this.setSecret(key, value, { generated: true });
        generated.push(key);
      }
    }
    
    return generated;
  }
  
  /**
   * Export secrets to environment format
   */
  exportToEnv(includePublic = true) {
    const envLines = [];
    
    for (const [key, secretData] of this.secrets) {
      if (!includePublic && secretData.level === SECRET_LEVELS.PUBLIC) {
        continue;
      }
      
      const definition = SECRET_DEFINITIONS[key] || {};
      const value = secretData.encrypted ? this.crypto.decrypt(secretData.value) : secretData.value;
      
      envLines.push(`# ${definition.description || key}`);
      envLines.push(`${key}=${value}`);
      envLines.push('');
    }
    
    return envLines.join('\n');
  }
  
  /**
   * Import secrets from environment variables
   */
  importFromEnv(env = process.env) {
    const imported = [];
    
    for (const [key, definition] of Object.entries(SECRET_DEFINITIONS)) {
      if (env[key] && !this.hasSecret(key)) {
        this.setSecret(key, env[key], { imported: true });
        imported.push(key);
      }
    }
    
    return imported;
  }
  
  /**
   * Get audit log
   */
  getAuditLog() {
    return this.auditLog;
  }
  
  /**
   * Clear audit log
   */
  clearAuditLog() {
    this.auditLog = [];
  }
  
  /**
   * Mask sensitive values for display
   */
  _maskValue(value) {
    if (typeof value === 'string') {
      if (value.length <= 8) {
        return '*'.repeat(value.length);
      }
      return value.substring(0, 4) + '*'.repeat(value.length - 8) + value.substring(value.length - 4);
    }
    return '[MASKED]';
  }
  
  /**
   * Add entry to audit log
   */
  _auditLog(action, key, level) {
    this.auditLog.push({
      action,
      key,
      level,
      timestamp: new Date().toISOString(),
      environment: this.environment,
    });
  }
}

/**
 * Create secret manager instance
 */
function createSecretManager(environment = 'development', encryptionKey = null) {
  return new SecretManager(environment, encryptionKey);
}

/**
 * Environment-specific secret managers
 */
const secretManagers = {
  production: createSecretManager('production'),
  staging: createSecretManager('staging'),
  development: createSecretManager('development'),
  test: createSecretManager('test'),
};

/**
 * Get secret manager for environment
 */
function getSecretManager(environment = 'development') {
  return secretManagers[environment] || secretManagers.development;
}

module.exports = {
  SECRET_LEVELS,
  SECRET_DEFINITIONS,
  SecretCrypto,
  SecretManager,
  createSecretManager,
  getSecretManager,
  secretManagers,
};