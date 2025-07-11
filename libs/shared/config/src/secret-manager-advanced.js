/**
 * @fileoverview Advanced secret management system with encryption and rotation
 * @description Enterprise-grade secret management with support for multiple providers
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

/**
 * Secret provider interface
 */
class SecretProvider {
  async getSecret(key) {
    throw new Error('getSecret must be implemented by provider');
  }
  
  async setSecret(key, value) {
    throw new Error('setSecret must be implemented by provider');
  }
  
  async deleteSecret(key) {
    throw new Error('deleteSecret must be implemented by provider');
  }
  
  async listSecrets() {
    throw new Error('listSecrets must be implemented by provider');
  }
}

/**
 * Environment variable secret provider
 */
class EnvironmentSecretProvider extends SecretProvider {
  constructor(prefix = 'SECRET_') {
    super();
    this.prefix = prefix;
  }
  
  async getSecret(key) {
    const envKey = this.prefix + key.toUpperCase();
    return process.env[envKey] || null;
  }
  
  async setSecret(key, value) {
    const envKey = this.prefix + key.toUpperCase();
    process.env[envKey] = value;
    return true;
  }
  
  async deleteSecret(key) {
    const envKey = this.prefix + key.toUpperCase();
    delete process.env[envKey];
    return true;
  }
  
  async listSecrets() {
    return Object.keys(process.env)
      .filter(key => key.startsWith(this.prefix))
      .map(key => key.slice(this.prefix.length).toLowerCase());
  }
}

/**
 * File-based secret provider (for development)
 */
class FileSecretProvider extends SecretProvider {
  constructor(secretsPath = '.secrets') {
    super();
    this.secretsPath = secretsPath;
    this.encryptionKey = this._deriveKey();
  }
  
  _deriveKey() {
    const masterKey = process.env.MASTER_KEY || 'development-key-change-in-production';
    return crypto.createHash('sha256').update(masterKey).digest();
  }
  
  _encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }
  
  _decrypt(encrypted) {
    const parts = encrypted.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
  
  async _loadSecrets() {
    try {
      const data = await fs.readFile(this.secretsPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return {};
      }
      throw error;
    }
  }
  
  async _saveSecrets(secrets) {
    await fs.writeFile(this.secretsPath, JSON.stringify(secrets, null, 2));
  }
  
  async getSecret(key) {
    const secrets = await this._loadSecrets();
    const encrypted = secrets[key];
    if (!encrypted) return null;
    return this._decrypt(encrypted);
  }
  
  async setSecret(key, value) {
    const secrets = await this._loadSecrets();
    secrets[key] = this._encrypt(value);
    await this._saveSecrets(secrets);
    return true;
  }
  
  async deleteSecret(key) {
    const secrets = await this._loadSecrets();
    delete secrets[key];
    await this._saveSecrets(secrets);
    return true;
  }
  
  async listSecrets() {
    const secrets = await this._loadSecrets();
    return Object.keys(secrets);
  }
}

/**
 * Secret metadata
 */
class SecretMetadata {
  constructor(data = {}) {
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.rotatedAt = data.rotatedAt || null;
    this.expiresAt = data.expiresAt || null;
    this.version = data.version || 1;
    this.tags = data.tags || [];
    this.description = data.description || '';
  }
  
  isExpired() {
    if (!this.expiresAt) return false;
    return new Date() > new Date(this.expiresAt);
  }
  
  needsRotation(maxAgeDays = 90) {
    const lastRotation = this.rotatedAt || this.createdAt;
    const daysSinceRotation = (Date.now() - new Date(lastRotation).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceRotation > maxAgeDays;
  }
}

/**
 * Advanced secret manager
 */
class SecretManager {
  constructor(options = {}) {
    this.provider = options.provider || new EnvironmentSecretProvider();
    this.cache = new Map();
    this.cacheEnabled = options.cacheEnabled !== false;
    this.cacheTTL = options.cacheTTL || 300000; // 5 minutes
    this.metadata = new Map();
    this.validators = new Map();
    this.rotationCallbacks = new Map();
  }

  /**
   * Register secret validator
   */
  registerValidator(key, validator) {
    this.validators.set(key, validator);
  }

  /**
   * Register rotation callback
   */
  registerRotationCallback(key, callback) {
    this.rotationCallbacks.set(key, callback);
  }

  /**
   * Get secret with caching
   */
  async getSecret(key, options = {}) {
    // Check cache first
    if (this.cacheEnabled && !options.skipCache) {
      const cached = this.cache.get(key);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.value;
      }
    }
    
    // Get from provider
    const value = await this.provider.getSecret(key);
    
    // Cache the result
    if (this.cacheEnabled && value !== null) {
      this.cache.set(key, {
        value,
        timestamp: Date.now(),
      });
    }
    
    // Check metadata
    const metadata = this.metadata.get(key);
    if (metadata) {
      if (metadata.isExpired()) {
        console.warn(`Secret ${key} has expired`);
      }
      if (metadata.needsRotation(options.maxAgeDays)) {
        console.warn(`Secret ${key} needs rotation`);
      }
    }
    
    return value;
  }

  /**
   * Set secret with validation
   */
  async setSecret(key, value, metadata = {}) {
    // Validate if validator exists
    const validator = this.validators.get(key);
    if (validator && !validator(value)) {
      throw new Error(`Invalid secret value for ${key}`);
    }
    
    // Set the secret
    const result = await this.provider.setSecret(key, value);
    
    // Update metadata
    const existingMetadata = this.metadata.get(key) || new SecretMetadata();
    const newMetadata = new SecretMetadata({
      ...existingMetadata,
      ...metadata,
      updatedAt: new Date().toISOString(),
      version: existingMetadata.version + 1,
    });
    this.metadata.set(key, newMetadata);
    
    // Clear cache
    this.cache.delete(key);
    
    return result;
  }

  /**
   * Rotate secret
   */
  async rotateSecret(key, newValue = null) {
    // Generate new value if not provided
    if (!newValue) {
      newValue = this.generateSecureSecret();
    }
    
    // Get old value for callback
    const oldValue = await this.getSecret(key, { skipCache: true });
    
    // Set new secret
    await this.setSecret(key, newValue, {
      rotatedAt: new Date().toISOString(),
    });
    
    // Call rotation callback if exists
    const callback = this.rotationCallbacks.get(key);
    if (callback) {
      await callback(oldValue, newValue);
    }
    
    return newValue;
  }

  /**
   * Delete secret
   */
  async deleteSecret(key) {
    const result = await this.provider.deleteSecret(key);
    this.cache.delete(key);
    this.metadata.delete(key);
    return result;
  }

  /**
   * List all secrets
   */
  async listSecrets() {
    return await this.provider.listSecrets();
  }

  /**
   * Get secrets that need rotation
   */
  async getSecretsNeedingRotation(maxAgeDays = 90) {
    const secrets = await this.listSecrets();
    const needsRotation = [];
    
    for (const key of secrets) {
      const metadata = this.metadata.get(key);
      if (metadata && metadata.needsRotation(maxAgeDays)) {
        needsRotation.push({
          key,
          lastRotation: metadata.rotatedAt || metadata.createdAt,
          daysSince: Math.floor(
            (Date.now() - new Date(metadata.rotatedAt || metadata.createdAt).getTime()) / 
            (1000 * 60 * 60 * 24)
          ),
        });
      }
    }
    
    return needsRotation;
  }

  /**
   * Generate secure secret
   */
  generateSecureSecret(length = 32) {
    return crypto.randomBytes(length).toString('base64');
  }

  /**
   * Generate API key
   */
  generateApiKey(prefix = 'sk') {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(24).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Hash secret for storage
   */
  hashSecret(secret) {
    return crypto.createHash('sha256').update(secret).digest('hex');
  }

  /**
   * Verify secret hash
   */
  verifySecretHash(secret, hash) {
    return this.hashSecret(secret) === hash;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Export secrets (for backup)
   */
  async exportSecrets(includeMetadata = false) {
    const secrets = {};
    const keys = await this.listSecrets();
    
    for (const key of keys) {
      const value = await this.getSecret(key, { skipCache: true });
      secrets[key] = {
        value: value,
        metadata: includeMetadata ? this.metadata.get(key) : undefined,
      };
    }
    
    return secrets;
  }

  /**
   * Import secrets (from backup)
   */
  async importSecrets(secrets, overwrite = false) {
    const results = [];
    
    for (const [key, data] of Object.entries(secrets)) {
      try {
        const exists = await this.getSecret(key, { skipCache: true });
        if (exists && !overwrite) {
          results.push({ key, status: 'skipped', reason: 'already exists' });
          continue;
        }
        
        await this.setSecret(key, data.value, data.metadata);
        results.push({ key, status: 'imported' });
      } catch (error) {
        results.push({ key, status: 'failed', error: error.message });
      }
    }
    
    return results;
  }
}

/**
 * Create secret manager for environment
 */
function createSecretManager(environment = process.env.NODE_ENV || 'development') {
  let provider;
  
  switch (environment) {
    case 'production':
      // In production, use environment variables or external service
      provider = new EnvironmentSecretProvider();
      break;
    case 'development':
    case 'test':
      // In development/test, use file-based provider
      provider = new FileSecretProvider('.secrets.dev');
      break;
    default:
      provider = new EnvironmentSecretProvider();
  }
  
  return new SecretManager({
    provider,
    cacheEnabled: environment === 'production',
    cacheTTL: environment === 'production' ? 600000 : 60000, // 10 min in prod, 1 min in dev
  });
}

module.exports = {
  SecretManager,
  SecretProvider,
  EnvironmentSecretProvider,
  FileSecretProvider,
  SecretMetadata,
  createSecretManager,
};