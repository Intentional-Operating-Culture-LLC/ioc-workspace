/**
 * Centralized error handling for Lambda functions
 * Implements cost-effective error tracking and alerting
 */

import { Context } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { CloudWatchLogsClient, PutLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';

const sqsClient = new SQSClient({ region: process.env.AWS_REGION });
const logsClient = new CloudWatchLogsClient({ region: process.env.AWS_REGION });

export interface ErrorContext {
  function?: string;
  record?: string;
  messageId?: string;
  [key: string]: any;
}

class ErrorHandler {
  private errorQueue: string | undefined;
  private deadLetterQueue: string | undefined;
  
  constructor() {
    this.errorQueue = process.env.ERROR_QUEUE_URL;
    this.deadLetterQueue = process.env.DEAD_LETTER_QUEUE_URL;
  }
  
  async handle(error: Error | unknown, context: ErrorContext): Promise<void> {
    const errorDetails = this.formatError(error, context);
    
    // Log error
    console.error('Error occurred:', JSON.stringify(errorDetails));
    
    // Send to error queue if configured
    if (this.errorQueue) {
      try {
        await this.sendToErrorQueue(errorDetails);
      } catch (queueError) {
        console.error('Failed to send to error queue:', queueError);
      }
    }
    
    // Track error metrics
    this.trackErrorMetrics(errorDetails);
  }
  
  async handleCritical(error: Error | unknown, lambdaContext: Context): Promise<void> {
    const errorDetails = this.formatError(error, {
      function: lambdaContext.functionName,
      requestId: lambdaContext.awsRequestId,
      critical: true
    });
    
    // Log critical error
    console.error('CRITICAL ERROR:', JSON.stringify(errorDetails));
    
    // Send to dead letter queue
    if (this.deadLetterQueue) {
      try {
        await this.sendToDeadLetterQueue(errorDetails);
      } catch (dlqError) {
        console.error('Failed to send to DLQ:', dlqError);
      }
    }
    
    // Alert if configured
    await this.sendCriticalAlert(errorDetails);
  }
  
  private formatError(error: Error | unknown, context: ErrorContext): any {
    const err = error instanceof Error ? error : new Error(String(error));
    
    return {
      timestamp: new Date().toISOString(),
      message: err.message,
      name: err.name,
      stack: err.stack,
      context,
      environment: {
        region: process.env.AWS_REGION,
        functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
        functionVersion: process.env.AWS_LAMBDA_FUNCTION_VERSION,
        memorySize: process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE
      }
    };
  }
  
  private async sendToErrorQueue(errorDetails: any): Promise<void> {
    const command = new SendMessageCommand({
      QueueUrl: this.errorQueue!,
      MessageBody: JSON.stringify(errorDetails),
      MessageAttributes: {
        errorType: {
          DataType: 'String',
          StringValue: errorDetails.name || 'Unknown'
        },
        function: {
          DataType: 'String',
          StringValue: errorDetails.context.function || 'Unknown'
        }
      }
    });
    
    await sqsClient.send(command);
  }
  
  private async sendToDeadLetterQueue(errorDetails: any): Promise<void> {
    const command = new SendMessageCommand({
      QueueUrl: this.deadLetterQueue!,
      MessageBody: JSON.stringify(errorDetails),
      MessageAttributes: {
        errorType: {
          DataType: 'String',
          StringValue: 'Critical'
        },
        timestamp: {
          DataType: 'String',
          StringValue: errorDetails.timestamp
        }
      }
    });
    
    await sqsClient.send(command);
  }
  
  private trackErrorMetrics(errorDetails: any): void {
    // Use CloudWatch Logs for cost-effective error tracking
    // Custom metrics are expensive at scale
    console.log('ERROR_METRIC', JSON.stringify({
      type: 'error',
      errorName: errorDetails.name,
      function: errorDetails.context.function,
      timestamp: errorDetails.timestamp
    }));
  }
  
  private async sendCriticalAlert(errorDetails: any): Promise<void> {
    // Only send alerts for production critical errors
    if (process.env.STAGE !== 'production') {
      return;
    }
    
    // Log critical alert for CloudWatch Alarms to pick up
    console.error('CRITICAL_ALERT', JSON.stringify({
      type: 'critical_error',
      function: errorDetails.context.function,
      message: errorDetails.message,
      timestamp: errorDetails.timestamp
    }));
  }
}

export const errorHandler = new ErrorHandler();

// Error types for better error handling
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ProcessingError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'ProcessingError';
  }
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}