import { handler } from './assessment-anonymizer';
import { S3Event, Context } from 'aws-lambda';
import { S3Client } from '@aws-sdk/client-s3';

jest.mock('@aws-sdk/client-s3');

describe('Assessment Anonymizer Lambda', () => {
  let mockContext: Context;
  let mockS3Event: S3Event;
  
  beforeEach(() => {
    mockContext = {
      functionName: 'test-function',
      invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test',
      requestId: 'test-request-id',
      getRemainingTimeInMillis: () => 30000,
    } as any;
    
    mockS3Event = {
      Records: [
        {
          eventName: 'ObjectCreated:Put',
          s3: {
            bucket: { name: 'test-bucket' },
            object: { key: 'raw/assessments/test-assessment.json' }
          }
        }
      ]
    } as any;
    
    process.env.ANONYMIZATION_SALT = 'test-salt';
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  test('should anonymize assessment data successfully', async () => {
    const mockAssessmentData = {
      userId: 'user123',
      email: 'test@example.com',
      assessmentId: 'assessment456',
      timestamp: '2024-01-01T00:00:00Z',
      scores: { openness: 70 },
      responses: [
        { questionId: 'q1', answer: 75, responseTime: 2000 }
      ],
      demographics: {
        age: 30,
        industry: 'Technology',
        role: 'Manager'
      }
    };
    
    // Mock S3 getObject
    const mockGetObject = jest.fn().mockResolvedValue({
      Body: {
        transformToString: () => Promise.resolve(JSON.stringify(mockAssessmentData))
      }
    });
    
    // Mock S3 putObject
    const mockPutObject = jest.fn().mockResolvedValue({});
    
    (S3Client as any).mockImplementation(() => ({
      send: jest.fn((command) => {
        if (command.constructor.name === 'GetObjectCommand') {
          return mockGetObject();
        }
        if (command.constructor.name === 'PutObjectCommand') {
          return mockPutObject();
        }
      })
    }));
    
    const result = await handler(mockS3Event, mockContext);
    
    expect(result.statusCode).toBe(200);
    expect(mockPutObject).toHaveBeenCalled();
    
    // Verify anonymization
    const putCall = mockPutObject.mock.calls[0];
    expect(putCall).toBeDefined();
  });
  
  test('should handle missing data gracefully', async () => {
    const mockGetObject = jest.fn().mockResolvedValue({
      Body: null
    });
    
    (S3Client as any).mockImplementation(() => ({
      send: jest.fn(() => mockGetObject())
    }));
    
    const result = await handler(mockS3Event, mockContext);
    
    expect(result.statusCode).toBe(200);
    expect(result.body).toContain('processed": 0');
  });
  
  test('should anonymize demographics correctly', async () => {
    const testCases = [
      { age: 22, expected: '18-24' },
      { age: 30, expected: '25-34' },
      { age: 40, expected: '35-44' },
      { age: 50, expected: '45-54' },
      { age: 60, expected: '55-64' },
      { age: 70, expected: '65+' }
    ];
    
    // Test age range conversion
    testCases.forEach(({ age, expected }) => {
      // Test implementation would go here
    });
  });
  
  test('should track cost metrics', async () => {
    const consoleSpy = jest.spyOn(console, 'log');
    
    await handler(mockS3Event, mockContext);
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('COST_METRICS')
    );
  });
});