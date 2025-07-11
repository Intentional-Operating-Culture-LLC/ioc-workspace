/**
 * Queue Manager Implementation
 * Handles message queuing for async processing in dual-AI system
 */

import { IQueueManager, QueueOptions, QueueStats } from '../core/interfaces';
import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';

export class DualAIQueueManager implements IQueueManager {
  private queues: Map<string, Queue>;
  private workers: Map<string, Worker[]>;
  private config: QueueManagerConfig;
  private isShuttingDown: boolean = false;

  constructor(config: QueueManagerConfig) {
    this.config = config;
    this.queues = new Map();
    this.workers = new Map();

    // Initialize configured queues
    this.initializeQueues();
    
    // Start monitoring
    this.startMonitoring();

    // Handle graceful shutdown
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  async enqueue<T>(queue: string, message: T, options?: QueueOptions): Promise<string> {
    const messageId = this.generateMessageId();
    const startTime = Date.now();

    try {
      const queueInstance = this.getOrCreateQueue(queue);
      
      const queueMessage: QueueMessage<T> = {
        id: messageId,
        payload: message,
        priority: options?.priority || 5,
        delay: options?.delay || 0,
        retries: options?.retries || 3,
        maxRetries: options?.retries || 3,
        ttl: options?.ttl,
        enqueuedAt: Date.now(),
        processAfter: Date.now() + (options?.delay || 0)
      };

      await queueInstance.enqueue(queueMessage);

      // Record metrics
      const duration = Date.now() - startTime;
      metrics.histogram('queue_enqueue_duration', duration, { queue });
      metrics.increment('queue_message_enqueued', { queue, priority: queueMessage.priority });

      logger.debug('Message enqueued', {
        messageId,
        queue,
        priority: queueMessage.priority,
        delay: options?.delay,
        duration
      });

      return messageId;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Failed to enqueue message', {
        messageId,
        queue,
        error: error.message,
        duration
      });

      metrics.histogram('queue_enqueue_duration', duration, { 
        queue, 
        status: 'error' 
      });
      metrics.increment('queue_enqueue_error', { queue });

      throw error;
    }
  }

  async dequeue<T>(queue: string, count: number = 1): Promise<T[]> {
    const startTime = Date.now();

    try {
      const queueInstance = this.getOrCreateQueue(queue);
      const messages = await queueInstance.dequeue(count);
      
      const payloads = messages.map(msg => msg.payload);

      // Record metrics
      const duration = Date.now() - startTime;
      metrics.histogram('queue_dequeue_duration', duration, { queue });
      metrics.histogram('queue_messages_dequeued', messages.length, { queue });

      if (messages.length > 0) {
        logger.debug('Messages dequeued', {
          queue,
          count: messages.length,
          requested: count,
          duration
        });
      }

      return payloads;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Failed to dequeue messages', {
        queue,
        count,
        error: error.message,
        duration
      });

      metrics.histogram('queue_dequeue_duration', duration, { 
        queue, 
        status: 'error' 
      });

      throw error;
    }
  }

  async getQueueStats(queue: string): Promise<QueueStats> {
    try {
      const queueInstance = this.getOrCreateQueue(queue);
      return await queueInstance.getStats();
    } catch (error) {
      logger.error('Failed to get queue stats', {
        queue,
        error: error.message
      });

      return {
        length: 0,
        processing: 0,
        failed: 0,
        completed: 0,
        averageWaitTime: 0
      };
    }
  }

  async purgeQueue(queue: string): Promise<void> {
    const startTime = Date.now();

    try {
      const queueInstance = this.getOrCreateQueue(queue);
      const purgedCount = await queueInstance.purge();

      const duration = Date.now() - startTime;

      logger.info('Queue purged', {
        queue,
        purgedCount,
        duration
      });

      metrics.histogram('queue_purge_duration', duration, { queue });
      metrics.record('queue_messages_purged', purgedCount, { queue });

    } catch (error) {
      logger.error('Failed to purge queue', {
        queue,
        error: error.message
      });

      throw error;
    }
  }

  // Worker management methods

  async startWorker(queue: string, processor: MessageProcessor<any>): Promise<void> {
    try {
      const queueInstance = this.getOrCreateQueue(queue);
      const workerConfig = this.config.workers[queue] || this.config.defaultWorker;
      
      const worker = new QueueWorker(queue, queueInstance, processor, workerConfig);
      
      if (!this.workers.has(queue)) {
        this.workers.set(queue, []);
      }
      
      this.workers.get(queue)!.push(worker);
      await worker.start();

      logger.info('Worker started', {
        queue,
        workerId: worker.id,
        concurrency: workerConfig.concurrency
      });

      metrics.increment('queue_worker_started', { queue });

    } catch (error) {
      logger.error('Failed to start worker', {
        queue,
        error: error.message
      });

      throw error;
    }
  }

  async stopWorker(queue: string, workerId?: string): Promise<void> {
    try {
      const workers = this.workers.get(queue) || [];
      
      if (workerId) {
        const worker = workers.find(w => w.id === workerId);
        if (worker) {
          await worker.stop();
          this.workers.set(queue, workers.filter(w => w.id !== workerId));
        }
      } else {
        // Stop all workers for the queue
        await Promise.all(workers.map(w => w.stop()));
        this.workers.set(queue, []);
      }

      logger.info('Worker(s) stopped', {
        queue,
        workerId: workerId || 'all'
      });

      metrics.increment('queue_worker_stopped', { queue });

    } catch (error) {
      logger.error('Failed to stop worker', {
        queue,
        workerId,
        error: error.message
      });

      throw error;
    }
  }

  // Private methods

  private getOrCreateQueue(name: string): Queue {
    if (!this.queues.has(name)) {
      const queueConfig = this.config.queues[name] || this.config.defaultQueue;
      const queue = new Queue(name, queueConfig);
      this.queues.set(name, queue);
    }
    
    return this.queues.get(name)!;
  }

  private initializeQueues(): void {
    // Initialize predefined queues
    const predefinedQueues = [
      'generation',
      'validation', 
      'disagreement',
      'learning',
      'retraining'
    ];

    for (const queueName of predefinedQueues) {
      this.getOrCreateQueue(queueName);
    }

    logger.info('Queues initialized', {
      count: this.queues.size,
      queues: Array.from(this.queues.keys())
    });
  }

  private startMonitoring(): void {
    // Monitor queue statistics
    setInterval(async () => {
      if (this.isShuttingDown) return;

      try {
        for (const [queueName, queue] of this.queues) {
          const stats = await queue.getStats();
          
          // Record queue metrics
          metrics.gauge('queue_length', stats.length, { queue: queueName });
          metrics.gauge('queue_processing', stats.processing, { queue: queueName });
          metrics.gauge('queue_failed', stats.failed, { queue: queueName });
          metrics.gauge('queue_average_wait_time', stats.averageWaitTime, { queue: queueName });
        }
      } catch (error) {
        logger.warn('Queue monitoring failed', {
          error: error.message
        });
      }
    }, this.config.monitoringInterval || 30000);

    // Worker health check
    setInterval(() => {
      if (this.isShuttingDown) return;

      for (const [queueName, workers] of this.workers) {
        const healthyWorkers = workers.filter(w => w.isHealthy()).length;
        const totalWorkers = workers.length;
        
        metrics.gauge('queue_workers_healthy', healthyWorkers, { queue: queueName });
        metrics.gauge('queue_workers_total', totalWorkers, { queue: queueName });

        if (healthyWorkers < totalWorkers) {
          logger.warn('Unhealthy workers detected', {
            queue: queueName,
            healthy: healthyWorkers,
            total: totalWorkers
          });
        }
      }
    }, this.config.healthCheckInterval || 60000);
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async shutdown(): Promise<void> {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    
    logger.info('Shutting down queue manager...');

    try {
      // Stop all workers
      const stopPromises = [];
      for (const [queueName, workers] of this.workers) {
        for (const worker of workers) {
          stopPromises.push(worker.stop());
        }
      }
      
      await Promise.all(stopPromises);

      // Close all queues
      for (const queue of this.queues.values()) {
        await queue.close();
      }

      logger.info('Queue manager shutdown complete');

    } catch (error) {
      logger.error('Error during queue manager shutdown', {
        error: error.message
      });
    }
  }
}

// Queue implementation
class Queue {
  private messages: Map<string, QueueMessage<any>>;
  private priorityQueue: QueueMessage<any>[];
  private processing: Set<string>;
  private completed: QueueMessage<any>[];
  private failed: QueueMessage<any>[];
  private stats: QueueStats;

  constructor(
    public readonly name: string,
    private config: QueueConfig
  ) {
    this.messages = new Map();
    this.priorityQueue = [];
    this.processing = new Set();
    this.completed = [];
    this.failed = [];
    this.stats = {
      length: 0,
      processing: 0,
      failed: 0,
      completed: 0,
      averageWaitTime: 0
    };
  }

  async enqueue<T>(message: QueueMessage<T>): Promise<void> {
    this.messages.set(message.id, message);
    
    // Insert into priority queue (higher priority = lower number)
    this.insertByPriority(message);
    
    this.updateStats();
  }

  async dequeue<T>(count: number): Promise<QueueMessage<T>[]> {
    const now = Date.now();
    const messages: QueueMessage<T>[] = [];
    
    while (messages.length < count && this.priorityQueue.length > 0) {
      const message = this.priorityQueue[0];
      
      // Check if message is ready to be processed
      if (message.processAfter > now) {
        break;
      }
      
      // Check TTL
      if (message.ttl && now > message.enqueuedAt + message.ttl) {
        this.priorityQueue.shift();
        this.messages.delete(message.id);
        this.failed.push(message);
        continue;
      }
      
      this.priorityQueue.shift();
      this.processing.add(message.id);
      messages.push(message);
    }
    
    this.updateStats();
    return messages;
  }

  async markCompleted(messageId: string): Promise<void> {
    const message = this.messages.get(messageId);
    if (message) {
      this.processing.delete(messageId);
      this.messages.delete(messageId);
      this.completed.push(message);
      this.updateStats();
    }
  }

  async markFailed(messageId: string, error?: string): Promise<void> {
    const message = this.messages.get(messageId);
    if (!message) return;

    this.processing.delete(messageId);
    
    if (message.retries > 0) {
      // Retry the message
      message.retries--;
      message.processAfter = Date.now() + this.getRetryDelay(message);
      this.insertByPriority(message);
    } else {
      // Max retries exceeded
      this.messages.delete(messageId);
      message.error = error;
      this.failed.push(message);
    }
    
    this.updateStats();
  }

  async getStats(): Promise<QueueStats> {
    this.updateStats();
    return { ...this.stats };
  }

  async purge(): Promise<number> {
    const count = this.messages.size + this.priorityQueue.length;
    
    this.messages.clear();
    this.priorityQueue = [];
    this.processing.clear();
    this.completed = [];
    this.failed = [];
    
    this.updateStats();
    return count;
  }

  async close(): Promise<void> {
    // Clean up resources
    this.messages.clear();
    this.priorityQueue = [];
    this.processing.clear();
  }

  private insertByPriority<T>(message: QueueMessage<T>): void {
    let inserted = false;
    
    for (let i = 0; i < this.priorityQueue.length; i++) {
      if (message.priority < this.priorityQueue[i].priority) {
        this.priorityQueue.splice(i, 0, message);
        inserted = true;
        break;
      }
    }
    
    if (!inserted) {
      this.priorityQueue.push(message);
    }
  }

  private getRetryDelay(message: QueueMessage<any>): number {
    const baseDelay = 1000; // 1 second
    const attempt = message.maxRetries - message.retries;
    return baseDelay * Math.pow(2, attempt); // Exponential backoff
  }

  private updateStats(): void {
    const now = Date.now();
    
    this.stats = {
      length: this.priorityQueue.length,
      processing: this.processing.size,
      failed: this.failed.length,
      completed: this.completed.length,
      averageWaitTime: this.calculateAverageWaitTime(now)
    };
  }

  private calculateAverageWaitTime(now: number): number {
    if (this.priorityQueue.length === 0) return 0;
    
    const waitTimes = this.priorityQueue.map(msg => now - msg.enqueuedAt);
    return waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length;
  }
}

// Worker implementation
class QueueWorker {
  public readonly id: string;
  private isRunning: boolean = false;
  private processingCount: number = 0;
  private lastHeartbeat: number = Date.now();

  constructor(
    private queueName: string,
    private queue: Queue,
    private processor: MessageProcessor<any>,
    private config: WorkerConfig
  ) {
    this.id = `worker_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  async start(): Promise<void> {
    this.isRunning = true;
    this.lastHeartbeat = Date.now();
    
    // Start processing loop
    this.processMessages();
    
    logger.info('Worker started', {
      workerId: this.id,
      queue: this.queueName,
      concurrency: this.config.concurrency
    });
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    
    // Wait for current processing to complete
    while (this.processingCount > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    logger.info('Worker stopped', {
      workerId: this.id,
      queue: this.queueName
    });
  }

  isHealthy(): boolean {
    const now = Date.now();
    const healthTimeout = this.config.healthTimeout || 60000;
    return now - this.lastHeartbeat < healthTimeout;
  }

  private async processMessages(): Promise<void> {
    while (this.isRunning) {
      try {
        if (this.processingCount >= this.config.concurrency) {
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }

        const messages = await this.queue.dequeue(
          Math.min(this.config.concurrency - this.processingCount, this.config.batchSize || 1)
        );

        if (messages.length === 0) {
          await new Promise(resolve => setTimeout(resolve, this.config.pollInterval || 1000));
          continue;
        }

        // Process messages concurrently
        const processPromises = messages.map(msg => this.processMessage(msg));
        await Promise.allSettled(processPromises);

        this.lastHeartbeat = Date.now();

      } catch (error) {
        logger.error('Worker processing error', {
          workerId: this.id,
          queue: this.queueName,
          error: error.message
        });

        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  private async processMessage(message: QueueMessage<any>): Promise<void> {
    this.processingCount++;
    const startTime = Date.now();

    try {
      await this.processor(message.payload, message.id);
      await this.queue.markCompleted(message.id);

      const duration = Date.now() - startTime;
      metrics.histogram('queue_message_processing_duration', duration, { 
        queue: this.queueName,
        worker: this.id,
        status: 'success'
      });

    } catch (error) {
      await this.queue.markFailed(message.id, error.message);
      
      const duration = Date.now() - startTime;
      metrics.histogram('queue_message_processing_duration', duration, { 
        queue: this.queueName,
        worker: this.id,
        status: 'error'
      });

      logger.error('Message processing failed', {
        messageId: message.id,
        queue: this.queueName,
        workerId: this.id,
        error: error.message
      });

    } finally {
      this.processingCount--;
    }
  }
}

// Supporting interfaces and types
interface QueueMessage<T> {
  id: string;
  payload: T;
  priority: number;
  delay: number;
  retries: number;
  maxRetries: number;
  ttl?: number;
  enqueuedAt: number;
  processAfter: number;
  error?: string;
}

interface QueueManagerConfig {
  defaultQueue: QueueConfig;
  defaultWorker: WorkerConfig;
  queues: Record<string, QueueConfig>;
  workers: Record<string, WorkerConfig>;
  monitoringInterval?: number;
  healthCheckInterval?: number;
}

interface QueueConfig {
  maxSize?: number;
  defaultPriority?: number;
  defaultTtl?: number;
}

interface WorkerConfig {
  concurrency: number;
  batchSize?: number;
  pollInterval?: number;
  healthTimeout?: number;
  retryDelay?: number;
}

type MessageProcessor<T> = (payload: T, messageId: string) => Promise<void>;

interface Worker {
  id: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  isHealthy(): boolean;
}

export { DualAIQueueManager, QueueManagerConfig, MessageProcessor };