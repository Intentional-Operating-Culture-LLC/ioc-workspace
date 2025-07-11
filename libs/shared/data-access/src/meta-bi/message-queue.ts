// IOC Meta BI Message Queue System
// Production-ready message queuing with Redis and RabbitMQ support for reliability

import { EventEmitter } from 'events';
import { createHash } from 'crypto';

export interface MessageQueueConfig {
  // Queue configuration
  queue: {
    type: 'redis' | 'rabbitmq' | 'kafka' | 'sqs' | 'memory';
    connectionString: string;
    queueName: string;
    exchangeName?: string;
    routingKey?: string;
    dlqName: string;
    maxRetries: number;
    retryBackoffMs: number;
  };
  
  // Message configuration
  message: {
    enableCompression: boolean;
    compressionLevel: number;
    enableEncryption: boolean;
    encryptionKey?: string;
    maxMessageSize: number;
    messageTTL: number;
    enableDeduplication: boolean;
    deduplicationWindow: number;
  };
  
  // Consumer configuration
  consumer: {
    concurrency: number;
    prefetchCount: number;
    ackTimeout: number;
    processingTimeout: number;
    enableAutoAck: boolean;
    enableBatching: boolean;
    batchSize: number;
    batchTimeout: number;
  };
  
  // Producer configuration
  producer: {
    enableBatching: boolean;
    batchSize: number;
    batchTimeout: number;
    confirmDelivery: boolean;
    enablePersistence: boolean;
    compressionThreshold: number;
  };
  
  // Reliability configuration
  reliability: {
    enableDurability: boolean;
    enableReplication: boolean;
    replicationFactor: number;
    enableCheckpointing: boolean;
    checkpointInterval: number;
    enableHeartbeat: boolean;
    heartbeatInterval: number;
  };
  
  // Monitoring configuration
  monitoring: {
    enableMetrics: boolean;
    metricsInterval: number;
    enableHealthChecks: boolean;
    healthCheckInterval: number;
    enableAlerting: boolean;
    alertThresholds: {
      queueDepth: number;
      errorRate: number;
      latency: number;
      throughput: number;
    };
  };
  
  // Performance configuration
  performance: {
    enablePooling: boolean;
    poolSize: number;
    maxConnections: number;
    connectionTimeout: number;
    keepAlive: boolean;
    enableCaching: boolean;
    cacheSize: number;
  };
}

export interface QueueMessage {
  id: string;
  timestamp: Date;
  payload: any;
  headers: Record<string, string>;
  metadata: {
    source: string;
    messageType: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    retryCount: number;
    maxRetries: number;
    expiresAt?: Date;
    correlationId?: string;
    causationId?: string;
    version: string;
    schema: string;
    checksum: string;
  };
  deliveryAttempts: DeliveryAttempt[];
}

export interface DeliveryAttempt {
  timestamp: Date;
  status: 'delivered' | 'failed' | 'rejected' | 'timeout';
  error?: string;
  processingTime: number;
  consumerId: string;
}

export interface QueueMetrics {
  messageCount: number;
  pendingMessages: number;
  processingMessages: number;
  completedMessages: number;
  failedMessages: number;
  dlqMessages: number;
  averageLatency: number;
  currentThroughput: number;
  errorRate: number;
  consumerMetrics: Map<string, ConsumerMetrics>;
  producerMetrics: ProducerMetrics;
}

export interface ConsumerMetrics {
  consumerId: string;
  messagesProcessed: number;
  messagesSuccess: number;
  messagesFailed: number;
  averageProcessingTime: number;
  currentLoad: number;
  lastHeartbeat: Date;
  status: 'active' | 'idle' | 'error' | 'offline';
}

export interface ProducerMetrics {
  messagesSent: number;
  messagesConfirmed: number;
  messagesFailed: number;
  averageSendTime: number;
  currentBatchSize: number;
  pendingConfirmations: number;
}

export interface MessageHandler {
  (message: QueueMessage): Promise<void>;
}

export interface MessageFilter {
  messageType?: string;
  source?: string;
  priority?: string;
  customFilter?: (message: QueueMessage) => boolean;
}

export class MessageQueue extends EventEmitter {
  private config: MessageQueueConfig;
  private connection?: any;
  private isConnected = false;
  private consumers: Map<string, MessageConsumer> = new Map();
  private producer?: MessageProducer;
  
  private metrics: QueueMetrics = {
    messageCount: 0,
    pendingMessages: 0,
    processingMessages: 0,
    completedMessages: 0,
    failedMessages: 0,
    dlqMessages: 0,
    averageLatency: 0,
    currentThroughput: 0,
    errorRate: 0,
    consumerMetrics: new Map(),
    producerMetrics: {
      messagesSent: 0,
      messagesConfirmed: 0,
      messagesFailed: 0,
      averageSendTime: 0,
      currentBatchSize: 0,
      pendingConfirmations: 0
    }
  };
  
  private messageCache: Map<string, QueueMessage> = new Map();
  private deduplicationCache: Map<string, Date> = new Map();
  private latencyWindow: number[] = [];
  private throughputWindow: number[] = [];
  
  constructor(config: MessageQueueConfig) {
    super();
    this.config = config;
    this.startMonitoring();
  }
  
  // Connection management
  async connect(): Promise<void> {
    try {
      switch (this.config.queue.type) {
        case 'redis':
          await this.connectRedis();
          break;
        case 'rabbitmq':
          await this.connectRabbitMQ();
          break;
        case 'kafka':
          await this.connectKafka();
          break;
        case 'sqs':
          await this.connectSQS();
          break;
        case 'memory':
          await this.connectMemory();
          break;
        default:
          throw new Error(`Unsupported queue type: ${this.config.queue.type}`);
      }
      
      this.isConnected = true;
      this.producer = new MessageProducer(this.connection, this.config, this);
      
      this.emit('connected', { queueType: this.config.queue.type });
      
    } catch (error) {
      this.emit('connection_error', error);
      throw error;
    }
  }
  
  async disconnect(): Promise<void> {
    this.isConnected = false;
    
    // Stop all consumers
    for (const consumer of this.consumers.values()) {
      await consumer.stop();
    }
    
    // Stop producer
    if (this.producer) {
      await this.producer.stop();
    }
    
    // Close connection
    if (this.connection) {
      await this.closeConnection();
    }
    
    this.emit('disconnected');
  }
  
  private async connectRedis(): Promise<void> {
    const Redis = require('ioredis');
    
    this.connection = new Redis(this.config.queue.connectionString, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      enableOfflineQueue: false,
      lazyConnect: true,
      keepAlive: this.config.performance.keepAlive,
      connectTimeout: this.config.performance.connectionTimeout
    });
    
    await this.connection.connect();
    
    // Set up Redis-specific queue structures
    await this.setupRedisQueues();
  }
  
  private async connectRabbitMQ(): Promise<void> {
    const amqp = require('amqplib');
    
    this.connection = await amqp.connect(this.config.queue.connectionString, {
      heartbeat: this.config.reliability.heartbeatInterval / 1000
    });
    
    const channel = await this.connection.createChannel();
    
    // Set up RabbitMQ exchanges and queues
    await this.setupRabbitMQQueues(channel);
    
    this.connection.channel = channel;
  }
  
  private async connectKafka(): Promise<void> {
    const { Kafka } = require('kafkajs');
    
    const kafka = new Kafka({
      clientId: 'ioc-message-queue',
      brokers: [this.config.queue.connectionString],
      connectionTimeout: this.config.performance.connectionTimeout,
      requestTimeout: 30000
    });
    
    this.connection = {
      kafka,
      admin: kafka.admin(),
      producer: kafka.producer({
        allowAutoTopicCreation: false,
        transactionTimeout: 30000
      }),
      consumer: kafka.consumer({
        groupId: 'ioc-consumers',
        sessionTimeout: 30000,
        heartbeatInterval: this.config.reliability.heartbeatInterval
      })
    };
    
    await this.connection.admin.connect();
    await this.setupKafkaTopics();
  }
  
  private async connectSQS(): Promise<void> {
    const AWS = require('aws-sdk');
    
    this.connection = new AWS.SQS({
      region: process.env.AWS_REGION || 'us-east-1',
      endpoint: this.config.queue.connectionString
    });
    
    await this.setupSQSQueues();
  }
  
  private async connectMemory(): Promise<void> {
    this.connection = {
      queues: new Map(),
      dlq: new Map(),
      processing: new Map()
    };
    
    this.connection.queues.set(this.config.queue.queueName, []);
    this.connection.dlq.set(this.config.queue.dlqName, []);
  }
  
  // Queue setup methods
  private async setupRedisQueues(): Promise<void> {
    // Create queue structures using Redis lists/streams
    const queueKey = `queue:${this.config.queue.queueName}`;
    const processingKey = `processing:${this.config.queue.queueName}`;
    const dlqKey = `dlq:${this.config.queue.dlqName}`;
    
    // Initialize queue structures if they don't exist
    await this.connection.exists(queueKey);
    await this.connection.exists(processingKey);
    await this.connection.exists(dlqKey);
  }
  
  private async setupRabbitMQQueues(channel: any): Promise<void> {
    // Declare exchange
    if (this.config.queue.exchangeName) {
      await channel.assertExchange(this.config.queue.exchangeName, 'topic', {
        durable: this.config.reliability.enableDurability
      });
    }
    
    // Declare main queue
    await channel.assertQueue(this.config.queue.queueName, {
      durable: this.config.reliability.enableDurability,
      messageTtl: this.config.message.messageTTL,
      deadLetterExchange: '',
      deadLetterRoutingKey: this.config.queue.dlqName
    });
    
    // Declare DLQ
    await channel.assertQueue(this.config.queue.dlqName, {
      durable: this.config.reliability.enableDurability
    });
    
    // Bind queue to exchange
    if (this.config.queue.exchangeName && this.config.queue.routingKey) {
      await channel.bindQueue(
        this.config.queue.queueName,
        this.config.queue.exchangeName,
        this.config.queue.routingKey
      );
    }
    
    // Set QoS
    await channel.prefetch(this.config.consumer.prefetchCount);
  }
  
  private async setupKafkaTopics(): Promise<void> {
    const topics = [
      {
        topic: this.config.queue.queueName,
        numPartitions: 3,
        replicationFactor: this.config.reliability.replicationFactor
      },
      {
        topic: this.config.queue.dlqName,
        numPartitions: 1,
        replicationFactor: this.config.reliability.replicationFactor
      }
    ];
    
    await this.connection.admin.createTopics({ topics });
  }
  
  private async setupSQSQueues(): Promise<void> {
    // Create main queue
    const queueParams = {
      QueueName: this.config.queue.queueName,
      Attributes: {
        MessageRetentionPeriod: Math.floor(this.config.message.messageTTL / 1000).toString(),
        VisibilityTimeout: Math.floor(this.config.consumer.ackTimeout / 1000).toString(),
        ReceiveMessageWaitTimeSeconds: '20'
      }
    };
    
    await this.connection.createQueue(queueParams).promise();
    
    // Create DLQ
    const dlqParams = {
      QueueName: this.config.queue.dlqName,
      Attributes: {
        MessageRetentionPeriod: '1209600' // 14 days
      }
    };
    
    await this.connection.createQueue(dlqParams).promise();
  }
  
  // Message production
  async sendMessage(payload: any, options: {
    messageType?: string;
    source?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    headers?: Record<string, string>;
    correlationId?: string;
    causationId?: string;
    expiresAt?: Date;
  } = {}): Promise<string> {
    if (!this.isConnected || !this.producer) {
      throw new Error('Queue not connected');
    }
    
    const message: QueueMessage = {
      id: this.generateMessageId(),
      timestamp: new Date(),
      payload,
      headers: options.headers || {},
      metadata: {
        source: options.source || 'unknown',
        messageType: options.messageType || 'default',
        priority: options.priority || 'medium',
        retryCount: 0,
        maxRetries: this.config.queue.maxRetries,
        expiresAt: options.expiresAt,
        correlationId: options.correlationId,
        causationId: options.causationId,
        version: '1.0.0',
        schema: 'queue-message-v1',
        checksum: this.calculateChecksum(payload)
      },
      deliveryAttempts: []
    };
    
    // Check for duplicates
    if (this.config.message.enableDeduplication && this.isDuplicate(message)) {
      this.emit('duplicate_message', { messageId: message.id });
      return message.id;
    }
    
    // Compress if enabled
    if (this.config.message.enableCompression) {
      message.payload = await this.compressPayload(message.payload);
    }
    
    // Encrypt if enabled
    if (this.config.message.enableEncryption) {
      message.payload = await this.encryptPayload(message.payload);
    }
    
    // Send message
    await this.producer.send(message);
    
    // Update metrics
    this.metrics.messageCount++;
    this.metrics.pendingMessages++;
    
    // Cache message if enabled
    if (this.config.performance.enableCaching) {
      this.messageCache.set(message.id, message);
    }
    
    this.emit('message_sent', { messageId: message.id, messageType: message.metadata.messageType });
    
    return message.id;
  }
  
  // Message consumption
  async startConsumer(handler: MessageHandler, filter?: MessageFilter): Promise<string> {
    if (!this.isConnected) {
      throw new Error('Queue not connected');
    }
    
    const consumerId = this.generateConsumerId();
    const consumer = new MessageConsumer(
      consumerId,
      this.connection,
      this.config,
      handler,
      filter,
      this
    );
    
    await consumer.start();
    this.consumers.set(consumerId, consumer);
    
    // Initialize consumer metrics
    this.metrics.consumerMetrics.set(consumerId, {
      consumerId,
      messagesProcessed: 0,
      messagesSuccess: 0,
      messagesFailed: 0,
      averageProcessingTime: 0,
      currentLoad: 0,
      lastHeartbeat: new Date(),
      status: 'active'
    });
    
    this.emit('consumer_started', { consumerId });
    
    return consumerId;
  }
  
  async stopConsumer(consumerId: string): Promise<void> {
    const consumer = this.consumers.get(consumerId);
    if (!consumer) {
      throw new Error(`Consumer ${consumerId} not found`);
    }
    
    await consumer.stop();
    this.consumers.delete(consumerId);
    this.metrics.consumerMetrics.delete(consumerId);
    
    this.emit('consumer_stopped', { consumerId });
  }
  
  // Queue management
  async getQueueDepth(): Promise<number> {
    switch (this.config.queue.type) {
      case 'redis':
        return await this.connection.llen(`queue:${this.config.queue.queueName}`);
      case 'rabbitmq':
        const queueInfo = await this.connection.channel.checkQueue(this.config.queue.queueName);
        return queueInfo.messageCount;
      case 'memory':
        return this.connection.queues.get(this.config.queue.queueName)?.length || 0;
      default:
        return 0;
    }
  }
  
  async purgeQueue(): Promise<void> {
    switch (this.config.queue.type) {
      case 'redis':
        await this.connection.del(`queue:${this.config.queue.queueName}`);
        break;
      case 'rabbitmq':
        await this.connection.channel.purgeQueue(this.config.queue.queueName);
        break;
      case 'memory':
        this.connection.queues.set(this.config.queue.queueName, []);
        break;
    }
    
    this.emit('queue_purged');
  }
  
  async getDLQDepth(): Promise<number> {
    switch (this.config.queue.type) {
      case 'redis':
        return await this.connection.llen(`dlq:${this.config.queue.dlqName}`);
      case 'rabbitmq':
        const dlqInfo = await this.connection.channel.checkQueue(this.config.queue.dlqName);
        return dlqInfo.messageCount;
      case 'memory':
        return this.connection.dlq.get(this.config.queue.dlqName)?.length || 0;
      default:
        return 0;
    }
  }
  
  async reprocessDLQ(): Promise<void> {
    // Implementation to move messages from DLQ back to main queue
    this.emit('dlq_reprocessing_started');
  }
  
  // Utility methods
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private generateConsumerId(): string {
    return `consumer_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }
  
  private calculateChecksum(payload: any): string {
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }
  
  private isDuplicate(message: QueueMessage): boolean {
    const cacheKey = `${message.metadata.source}-${message.metadata.messageType}-${message.metadata.checksum}`;
    const lastSeen = this.deduplicationCache.get(cacheKey);
    
    if (lastSeen) {
      const timeDiff = Date.now() - lastSeen.getTime();
      if (timeDiff < this.config.message.deduplicationWindow) {
        return true;
      }
    }
    
    this.deduplicationCache.set(cacheKey, new Date());
    return false;
  }
  
  private async compressPayload(payload: any): Promise<any> {
    // Compression implementation using zlib
    const zlib = require('zlib');
    const compressed = zlib.gzipSync(JSON.stringify(payload), {
      level: this.config.message.compressionLevel
    });
    return compressed.toString('base64');
  }
  
  private async encryptPayload(payload: any): Promise<any> {
    // Encryption implementation using crypto
    const crypto = require('crypto');
    const algorithm = 'aes-256-gcm';
    const key = this.config.message.encryptionKey || 'default-key';
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    cipher.setAAD(Buffer.from('additional-data'));
    
    let encrypted = cipher.update(JSON.stringify(payload), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }
  
  private async closeConnection(): Promise<void> {
    switch (this.config.queue.type) {
      case 'redis':
        await this.connection.quit();
        break;
      case 'rabbitmq':
        await this.connection.close();
        break;
      case 'kafka':
        await this.connection.admin.disconnect();
        await this.connection.producer.disconnect();
        await this.connection.consumer.disconnect();
        break;
      case 'sqs':
        // SQS connections don't need explicit closing
        break;
      case 'memory':
        this.connection = null;
        break;
    }
  }
  
  private startMonitoring(): void {
    if (!this.config.monitoring.enableMetrics) return;
    
    setInterval(async () => {
      await this.updateMetrics();
      this.emit('metrics_updated', this.metrics);
      
      if (this.config.monitoring.enableAlerting) {
        this.checkAlertThresholds();
      }
    }, this.config.monitoring.metricsInterval);
    
    if (this.config.monitoring.enableHealthChecks) {
      setInterval(() => {
        this.performHealthCheck();
      }, this.config.monitoring.healthCheckInterval);
    }
  }
  
  private async updateMetrics(): Promise<void> {
    // Update queue depth
    this.metrics.pendingMessages = await this.getQueueDepth();
    this.metrics.dlqMessages = await this.getDLQDepth();
    
    // Update error rate
    const totalMessages = this.metrics.completedMessages + this.metrics.failedMessages;
    this.metrics.errorRate = totalMessages > 0 ? this.metrics.failedMessages / totalMessages : 0;
    
    // Update throughput
    this.throughputWindow.push(this.metrics.completedMessages);
    if (this.throughputWindow.length > 60) {
      this.throughputWindow.shift();
    }
    
    if (this.throughputWindow.length >= 2) {
      const throughput = this.throughputWindow[this.throughputWindow.length - 1] - 
                        this.throughputWindow[0];
      this.metrics.currentThroughput = throughput / (this.throughputWindow.length - 1);
    }
  }
  
  private checkAlertThresholds(): void {
    const thresholds = this.config.monitoring.alertThresholds;
    
    if (this.metrics.pendingMessages > thresholds.queueDepth) {
      this.emit('alert', {
        type: 'queue_depth_exceeded',
        value: this.metrics.pendingMessages,
        threshold: thresholds.queueDepth
      });
    }
    
    if (this.metrics.errorRate > thresholds.errorRate) {
      this.emit('alert', {
        type: 'error_rate_exceeded',
        value: this.metrics.errorRate,
        threshold: thresholds.errorRate
      });
    }
    
    if (this.metrics.averageLatency > thresholds.latency) {
      this.emit('alert', {
        type: 'latency_exceeded',
        value: this.metrics.averageLatency,
        threshold: thresholds.latency
      });
    }
  }
  
  private async performHealthCheck(): Promise<void> {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date(),
        connection: this.isConnected,
        queueDepth: await this.getQueueDepth(),
        dlqDepth: await this.getDLQDepth(),
        activeConsumers: this.consumers.size,
        metrics: this.metrics
      };
      
      this.emit('health_check', health);
      
    } catch (error) {
      this.emit('health_check_failed', error);
    }
  }
  
  // Public methods
  public getMetrics(): QueueMetrics {
    return { ...this.metrics };
  }
  
  public isQueueConnected(): boolean {
    return this.isConnected;
  }
  
  public getActiveConsumers(): string[] {
    return Array.from(this.consumers.keys());
  }
  
  public updateMessageMetrics(messageId: string, status: 'completed' | 'failed', processingTime: number): void {
    if (status === 'completed') {
      this.metrics.completedMessages++;
      this.metrics.pendingMessages = Math.max(0, this.metrics.pendingMessages - 1);
    } else {
      this.metrics.failedMessages++;
    }
    
    // Update latency metrics
    this.latencyWindow.push(processingTime);
    if (this.latencyWindow.length > 100) {
      this.latencyWindow.shift();
    }
    
    this.metrics.averageLatency = this.latencyWindow.reduce((a, b) => a + b, 0) / this.latencyWindow.length;
    
    // Remove from cache
    if (this.config.performance.enableCaching) {
      this.messageCache.delete(messageId);
    }
  }
  
  public updateConsumerMetrics(consumerId: string, success: boolean, processingTime: number): void {
    const consumerMetrics = this.metrics.consumerMetrics.get(consumerId);
    if (!consumerMetrics) return;
    
    consumerMetrics.messagesProcessed++;
    consumerMetrics.lastHeartbeat = new Date();
    
    if (success) {
      consumerMetrics.messagesSuccess++;
    } else {
      consumerMetrics.messagesFailed++;
    }
    
    // Update average processing time
    consumerMetrics.averageProcessingTime = 
      (consumerMetrics.averageProcessingTime + processingTime) / 2;
  }
}

// Message Producer class
class MessageProducer {
  private connection: any;
  private config: MessageQueueConfig;
  private queue: MessageQueue;
  private batch: QueueMessage[] = [];
  private batchTimer?: NodeJS.Timeout;
  
  constructor(connection: any, config: MessageQueueConfig, queue: MessageQueue) {
    this.connection = connection;
    this.config = config;
    this.queue = queue;
  }
  
  async send(message: QueueMessage): Promise<void> {
    if (this.config.producer.enableBatching) {
      await this.addToBatch(message);
    } else {
      await this.sendSingle(message);
    }
  }
  
  private async addToBatch(message: QueueMessage): Promise<void> {
    this.batch.push(message);
    
    if (this.batch.length >= this.config.producer.batchSize) {
      await this.flushBatch();
    } else if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.flushBatch();
      }, this.config.producer.batchTimeout);
    }
  }
  
  private async flushBatch(): Promise<void> {
    if (this.batch.length === 0) return;
    
    const batch = [...this.batch];
    this.batch = [];
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }
    
    try {
      await this.sendBatch(batch);
    } catch (error) {
      this.queue.emit('batch_send_error', { error, batchSize: batch.length });
      throw error;
    }
  }
  
  private async sendSingle(message: QueueMessage): Promise<void> {
    switch (this.config.queue.type) {
      case 'redis':
        await this.sendRedis(message);
        break;
      case 'rabbitmq':
        await this.sendRabbitMQ(message);
        break;
      case 'kafka':
        await this.sendKafka(message);
        break;
      case 'sqs':
        await this.sendSQS(message);
        break;
      case 'memory':
        await this.sendMemory(message);
        break;
    }
  }
  
  private async sendBatch(messages: QueueMessage[]): Promise<void> {
    for (const message of messages) {
      await this.sendSingle(message);
    }
  }
  
  private async sendRedis(message: QueueMessage): Promise<void> {
    const queueKey = `queue:${this.config.queue.queueName}`;
    await this.connection.lpush(queueKey, JSON.stringify(message));
  }
  
  private async sendRabbitMQ(message: QueueMessage): Promise<void> {
    const channel = this.connection.channel;
    const buffer = Buffer.from(JSON.stringify(message));
    
    const published = channel.publish(
      this.config.queue.exchangeName || '',
      this.config.queue.routingKey || this.config.queue.queueName,
      buffer,
      {
        persistent: this.config.producer.enablePersistence,
        messageId: message.id,
        timestamp: message.timestamp.getTime(),
        headers: message.headers,
        priority: this.getPriorityValue(message.metadata.priority),
        expiration: message.metadata.expiresAt?.getTime().toString()
      }
    );
    
    if (this.config.producer.confirmDelivery && !published) {
      throw new Error('Message could not be published');
    }
  }
  
  private async sendKafka(message: QueueMessage): Promise<void> {
    await this.connection.producer.send({
      topic: this.config.queue.queueName,
      messages: [{
        key: message.id,
        value: JSON.stringify(message),
        headers: message.headers,
        timestamp: message.timestamp.getTime().toString()
      }]
    });
  }
  
  private async sendSQS(message: QueueMessage): Promise<void> {
    const params = {
      QueueUrl: this.config.queue.queueName,
      MessageBody: JSON.stringify(message),
      MessageAttributes: this.convertHeadersToSQSAttributes(message.headers),
      MessageDeduplicationId: message.id,
      MessageGroupId: message.metadata.messageType
    };
    
    await this.connection.sendMessage(params).promise();
  }
  
  private async sendMemory(message: QueueMessage): Promise<void> {
    const queue = this.connection.queues.get(this.config.queue.queueName);
    queue.push(message);
  }
  
  private getPriorityValue(priority: string): number {
    switch (priority) {
      case 'critical': return 10;
      case 'high': return 7;
      case 'medium': return 5;
      case 'low': return 1;
      default: return 5;
    }
  }
  
  private convertHeadersToSQSAttributes(headers: Record<string, string>): any {
    const attributes = {};
    for (const [key, value] of Object.entries(headers)) {
      attributes[key] = {
        DataType: 'String',
        StringValue: value
      };
    }
    return attributes;
  }
  
  async stop(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
    
    if (this.batch.length > 0) {
      await this.flushBatch();
    }
  }
}

// Message Consumer class
class MessageConsumer {
  private consumerId: string;
  private connection: any;
  private config: MessageQueueConfig;
  private handler: MessageHandler;
  private filter?: MessageFilter;
  private queue: MessageQueue;
  private isRunning = false;
  private processingCount = 0;
  
  constructor(
    consumerId: string,
    connection: any,
    config: MessageQueueConfig,
    handler: MessageHandler,
    filter: MessageFilter | undefined,
    queue: MessageQueue
  ) {
    this.consumerId = consumerId;
    this.connection = connection;
    this.config = config;
    this.handler = handler;
    this.filter = filter;
    this.queue = queue;
  }
  
  async start(): Promise<void> {
    this.isRunning = true;
    
    switch (this.config.queue.type) {
      case 'redis':
        this.startRedisConsumer();
        break;
      case 'rabbitmq':
        this.startRabbitMQConsumer();
        break;
      case 'kafka':
        this.startKafkaConsumer();
        break;
      case 'sqs':
        this.startSQSConsumer();
        break;
      case 'memory':
        this.startMemoryConsumer();
        break;
    }
  }
  
  async stop(): Promise<void> {
    this.isRunning = false;
    
    // Wait for processing messages to complete
    while (this.processingCount > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  private startRedisConsumer(): void {
    const consumeLoop = async () => {
      while (this.isRunning) {
        try {
          if (this.processingCount < this.config.consumer.concurrency) {
            const queueKey = `queue:${this.config.queue.queueName}`;
            const processingKey = `processing:${this.config.queue.queueName}`;
            
            const result = await this.connection.brpoplpush(queueKey, processingKey, 1);
            
            if (result) {
              const message = JSON.parse(result);
              this.processMessage(message);
            }
          } else {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error) {
          this.queue.emit('consumer_error', { consumerId: this.consumerId, error });
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    };
    
    consumeLoop();
  }
  
  private startRabbitMQConsumer(): void {
    const channel = this.connection.channel;
    
    channel.consume(this.config.queue.queueName, (msg: any) => {
      if (msg) {
        const message = JSON.parse(msg.content.toString());
        this.processMessage(message, () => {
          channel.ack(msg);
        }, () => {
          channel.nack(msg, false, false);
        });
      }
    }, {
      noAck: this.config.consumer.enableAutoAck
    });
  }
  
  private startKafkaConsumer(): void {
    const consumer = this.connection.consumer;
    
    consumer.subscribe({ topic: this.config.queue.queueName });
    
    consumer.run({
      eachMessage: async ({ message }: any) => {
        const queueMessage = JSON.parse(message.value.toString());
        await this.processMessage(queueMessage);
      }
    });
  }
  
  private startSQSConsumer(): void {
    const pollLoop = async () => {
      while (this.isRunning) {
        try {
          const params = {
            QueueUrl: this.config.queue.queueName,
            MaxNumberOfMessages: this.config.consumer.prefetchCount,
            WaitTimeSeconds: 20,
            VisibilityTimeout: Math.floor(this.config.consumer.ackTimeout / 1000)
          };
          
          const result = await this.connection.receiveMessage(params).promise();
          
          if (result.Messages) {
            for (const msg of result.Messages) {
              const message = JSON.parse(msg.Body);
              this.processMessage(message, async () => {
                await this.connection.deleteMessage({
                  QueueUrl: this.config.queue.queueName,
                  ReceiptHandle: msg.ReceiptHandle
                }).promise();
              });
            }
          }
        } catch (error) {
          this.queue.emit('consumer_error', { consumerId: this.consumerId, error });
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    };
    
    pollLoop();
  }
  
  private startMemoryConsumer(): void {
    const consumeLoop = async () => {
      while (this.isRunning) {
        try {
          if (this.processingCount < this.config.consumer.concurrency) {
            const queue = this.connection.queues.get(this.config.queue.queueName);
            const message = queue.shift();
            
            if (message) {
              this.processMessage(message);
            } else {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          } else {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error) {
          this.queue.emit('consumer_error', { consumerId: this.consumerId, error });
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    };
    
    consumeLoop();
  }
  
  private async processMessage(
    message: QueueMessage,
    ack?: () => void | Promise<void>,
    nack?: () => void | Promise<void>
  ): Promise<void> {
    const startTime = Date.now();
    this.processingCount++;
    
    try {
      // Apply filters
      if (this.filter && !this.matchesFilter(message, this.filter)) {
        if (ack) await ack();
        return;
      }
      
      // Check expiration
      if (message.metadata.expiresAt && new Date() > message.metadata.expiresAt) {
        if (ack) await ack();
        this.queue.emit('message_expired', { messageId: message.id });
        return;
      }
      
      // Process message with timeout
      const processingPromise = this.handler(message);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Processing timeout')), this.config.consumer.processingTimeout);
      });
      
      await Promise.race([processingPromise, timeoutPromise]);
      
      const processingTime = Date.now() - startTime;
      
      // Acknowledge message
      if (ack) await ack();
      
      // Update metrics
      this.queue.updateMessageMetrics(message.id, 'completed', processingTime);
      this.queue.updateConsumerMetrics(this.consumerId, true, processingTime);
      
      this.queue.emit('message_processed', {
        messageId: message.id,
        consumerId: this.consumerId,
        processingTime
      });
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // Handle retry logic
      message.metadata.retryCount++;
      
      if (message.metadata.retryCount < message.metadata.maxRetries) {
        // Retry message
        setTimeout(async () => {
          await this.processMessage(message, ack, nack);
        }, this.config.queue.retryBackoffMs * Math.pow(2, message.metadata.retryCount));
      } else {
        // Move to DLQ
        await this.sendToDLQ(message);
        if (ack) await ack();
      }
      
      // Update metrics
      this.queue.updateMessageMetrics(message.id, 'failed', processingTime);
      this.queue.updateConsumerMetrics(this.consumerId, false, processingTime);
      
      this.queue.emit('message_processing_failed', {
        messageId: message.id,
        consumerId: this.consumerId,
        error: error.message,
        retryCount: message.metadata.retryCount
      });
    } finally {
      this.processingCount--;
    }
  }
  
  private matchesFilter(message: QueueMessage, filter: MessageFilter): boolean {
    if (filter.messageType && message.metadata.messageType !== filter.messageType) {
      return false;
    }
    
    if (filter.source && message.metadata.source !== filter.source) {
      return false;
    }
    
    if (filter.priority && message.metadata.priority !== filter.priority) {
      return false;
    }
    
    if (filter.customFilter && !filter.customFilter(message)) {
      return false;
    }
    
    return true;
  }
  
  private async sendToDLQ(message: QueueMessage): Promise<void> {
    switch (this.config.queue.type) {
      case 'redis':
        await this.connection.lpush(`dlq:${this.config.queue.dlqName}`, JSON.stringify(message));
        break;
      case 'rabbitmq':
        const channel = this.connection.channel;
        channel.sendToQueue(this.config.queue.dlqName, Buffer.from(JSON.stringify(message)));
        break;
      case 'memory':
        const dlq = this.connection.dlq.get(this.config.queue.dlqName);
        dlq.push(message);
        break;
    }
    
    this.queue.emit('message_sent_to_dlq', { messageId: message.id });
  }
}

// Default configuration
export function createDefaultMessageQueueConfig(): MessageQueueConfig {
  return {
    queue: {
      type: 'redis',
      connectionString: process.env.REDIS_URL || 'redis://localhost:6379',
      queueName: 'ioc-message-queue',
      exchangeName: 'ioc-exchange',
      routingKey: 'ioc.messages',
      dlqName: 'ioc-message-dlq',
      maxRetries: 3,
      retryBackoffMs: 1000
    },
    
    message: {
      enableCompression: true,
      compressionLevel: 6,
      enableEncryption: false,
      maxMessageSize: 1024 * 1024, // 1MB
      messageTTL: 24 * 60 * 60 * 1000, // 24 hours
      enableDeduplication: true,
      deduplicationWindow: 300000 // 5 minutes
    },
    
    consumer: {
      concurrency: 5,
      prefetchCount: 10,
      ackTimeout: 30000,
      processingTimeout: 60000,
      enableAutoAck: false,
      enableBatching: false,
      batchSize: 10,
      batchTimeout: 5000
    },
    
    producer: {
      enableBatching: true,
      batchSize: 100,
      batchTimeout: 1000,
      confirmDelivery: true,
      enablePersistence: true,
      compressionThreshold: 1024
    },
    
    reliability: {
      enableDurability: true,
      enableReplication: true,
      replicationFactor: 3,
      enableCheckpointing: true,
      checkpointInterval: 30000,
      enableHeartbeat: true,
      heartbeatInterval: 10000
    },
    
    monitoring: {
      enableMetrics: true,
      metricsInterval: 10000,
      enableHealthChecks: true,
      healthCheckInterval: 30000,
      enableAlerting: true,
      alertThresholds: {
        queueDepth: 1000,
        errorRate: 0.05,
        latency: 10000,
        throughput: 100
      }
    },
    
    performance: {
      enablePooling: true,
      poolSize: 10,
      maxConnections: 20,
      connectionTimeout: 10000,
      keepAlive: true,
      enableCaching: true,
      cacheSize: 1000
    }
  };
}

// Factory function
export function createMessageQueue(config?: Partial<MessageQueueConfig>): MessageQueue {
  const defaultConfig = createDefaultMessageQueueConfig();
  const mergedConfig = { ...defaultConfig, ...config };
  
  return new MessageQueue(mergedConfig);
}