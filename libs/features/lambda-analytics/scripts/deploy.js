#!/usr/bin/env node

/**
 * Lambda deployment script with MRR-based configuration
 */

import { LambdaClient, CreateFunctionCommand, UpdateFunctionCodeCommand, UpdateFunctionConfigurationCommand } from '@aws-sdk/client-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { IAMClient, CreateRoleCommand, AttachRolePolicyCommand } from '@aws-sdk/client-iam';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { getLambdaConfigs, getTriggerConfigs } from '../src/config/lambda-config.js';

const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const s3Client = new S3Client({ region: process.env.AWS_REGION });
const iamClient = new IAMClient({ region: process.env.AWS_REGION });

const DEPLOYMENT_BUCKET = process.env.DEPLOYMENT_BUCKET || 'ioc-lambda-deployments';
const CURRENT_MRR = parseInt(process.env.CURRENT_MRR || '0');

async function main() {
  console.log('🚀 Starting Lambda deployment...');
  console.log(`Current MRR: $${CURRENT_MRR}`);
  
  try {
    // Build the Lambda functions
    console.log('📦 Building Lambda functions...');
    execSync('npm run build', { stdio: 'inherit' });
    
    // Bundle for Lambda
    console.log('🎁 Creating deployment package...');
    await createDeploymentPackage();
    
    // Upload to S3
    console.log('☁️ Uploading to S3...');
    const codeLocation = await uploadToS3();
    
    // Deploy each Lambda function
    const configs = getLambdaConfigs(CURRENT_MRR);
    
    for (const [name, config] of Object.entries(configs)) {
      console.log(`\n🔧 Deploying ${config.functionName}...`);
      await deployLambdaFunction(config, codeLocation);
    }
    
    // Configure triggers
    console.log('\n⚡ Configuring triggers...');
    await configureTriggers();
    
    console.log('\n✅ Deployment complete!');
    
    // Display cost estimates
    displayCostEstimates();
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

async function createDeploymentPackage() {
  // Use esbuild for optimal bundle size
  const functions = [
    'assessment-anonymizer',
    'ocean-calculator',
    'dual-ai-processor',
    'pinpoint-transformer',
    's3-data-processor'
  ];
  
  for (const func of functions) {
    execSync(`npx esbuild src/functions/${func}.ts --bundle --platform=node --target=node20 --minify --outfile=dist/functions/${func}.js`, {
      stdio: 'inherit'
    });
  }
  
  // Create zip file
  execSync('cd dist && zip -r ../lambda-deployment.zip . && cd ..', {
    stdio: 'inherit'
  });
}

async function uploadToS3() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const key = `lambda-analytics/${timestamp}/lambda-deployment.zip`;
  
  const fileContent = readFileSync('lambda-deployment.zip');
  
  await s3Client.send(new PutObjectCommand({
    Bucket: DEPLOYMENT_BUCKET,
    Key: key,
    Body: fileContent
  }));
  
  return {
    S3Bucket: DEPLOYMENT_BUCKET,
    S3Key: key
  };
}

async function deployLambdaFunction(config, codeLocation) {
  try {
    // Check if function exists
    const functionExists = await checkFunctionExists(config.functionName);
    
    if (functionExists) {
      // Update existing function
      console.log(`Updating existing function ${config.functionName}...`);
      
      // Update code
      await lambdaClient.send(new UpdateFunctionCodeCommand({
        FunctionName: config.functionName,
        ...codeLocation
      }));
      
      // Wait for update to complete
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Update configuration
      await lambdaClient.send(new UpdateFunctionConfigurationCommand({
        FunctionName: config.functionName,
        Runtime: config.runtime,
        MemorySize: config.memorySize,
        Timeout: config.timeout,
        Environment: {
          Variables: config.environment
        },
        ReservedConcurrentExecutions: config.reservedConcurrentExecutions,
        DeadLetterConfig: config.deadLetterConfig,
        TracingConfig: config.tracingConfig
      }));
    } else {
      // Create new function
      console.log(`Creating new function ${config.functionName}...`);
      
      // Create IAM role first
      const roleArn = await createLambdaRole(config.functionName);
      
      await lambdaClient.send(new CreateFunctionCommand({
        FunctionName: config.functionName,
        Runtime: config.runtime,
        Handler: config.handler,
        Code: codeLocation,
        Role: roleArn,
        MemorySize: config.memorySize,
        Timeout: config.timeout,
        Environment: {
          Variables: config.environment
        },
        ReservedConcurrentExecutions: config.reservedConcurrentExecutions,
        DeadLetterConfig: config.deadLetterConfig,
        TracingConfig: config.tracingConfig
      }));
    }
    
    console.log(`✓ ${config.functionName} deployed successfully`);
  } catch (error) {
    console.error(`Failed to deploy ${config.functionName}:`, error);
    throw error;
  }
}

async function checkFunctionExists(functionName) {
  try {
    await lambdaClient.send(new GetFunctionCommand({ FunctionName: functionName }));
    return true;
  } catch (error) {
    if (error.name === 'ResourceNotFoundException') {
      return false;
    }
    throw error;
  }
}

async function createLambdaRole(functionName) {
  const roleName = `${functionName}-role`;
  const assumeRolePolicy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: {
          Service: 'lambda.amazonaws.com'
        },
        Action: 'sts:AssumeRole'
      }
    ]
  };
  
  try {
    await iamClient.send(new CreateRoleCommand({
      RoleName: roleName,
      AssumeRolePolicyDocument: JSON.stringify(assumeRolePolicy),
      Description: `Execution role for ${functionName}`
    }));
    
    // Attach basic execution policy
    await iamClient.send(new AttachRolePolicyCommand({
      RoleName: roleName,
      PolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
    }));
    
    // Attach additional policies based on function needs
    const additionalPolicies = [
      'arn:aws:iam::aws:policy/AmazonS3FullAccess',
      'arn:aws:iam::aws:policy/AmazonSQSFullAccess',
      'arn:aws:iam::aws:policy/CloudWatchLogsFullAccess'
    ];
    
    for (const policyArn of additionalPolicies) {
      await iamClient.send(new AttachRolePolicyCommand({
        RoleName: roleName,
        PolicyArn
      }));
    }
    
    // Wait for role to propagate
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    return `arn:aws:iam::${process.env.AWS_ACCOUNT_ID}:role/${roleName}`;
  } catch (error) {
    if (error.name === 'EntityAlreadyExistsException') {
      return `arn:aws:iam::${process.env.AWS_ACCOUNT_ID}:role/${roleName}`;
    }
    throw error;
  }
}

async function configureTriggers() {
  const triggerConfigs = getTriggerConfigs(CURRENT_MRR);
  
  // Configure S3 triggers
  for (const trigger of triggerConfigs.s3Triggers) {
    console.log(`Configuring S3 trigger for ${trigger.functionName}...`);
    // S3 trigger configuration would go here
  }
  
  // Configure SQS triggers
  for (const trigger of triggerConfigs.sqsTriggers) {
    console.log(`Configuring SQS trigger for ${trigger.functionName}...`);
    // SQS trigger configuration would go here
  }
  
  // Configure EventBridge triggers
  for (const trigger of triggerConfigs.eventBridgeTriggers) {
    console.log(`Configuring EventBridge trigger for ${trigger.functionName}...`);
    // EventBridge trigger configuration would go here
  }
}

function displayCostEstimates() {
  console.log('\n💰 Cost Estimates:');
  console.log('================================');
  
  const estimates = {
    'Assessment Anonymizer': {
      invocationsPerDay: 1000,
      avgDuration: 500,
      memory: CURRENT_MRR >= 1000 ? 256 : 128
    },
    'OCEAN Calculator': {
      invocationsPerDay: 1000,
      avgDuration: 1000,
      memory: CURRENT_MRR >= 1000 ? 256 : 128
    },
    'Dual AI Processor': {
      invocationsPerDay: 500,
      avgDuration: 2000,
      memory: CURRENT_MRR >= 5000 ? 256 : 128
    },
    'Pinpoint Transformer': {
      invocationsPerDay: 2000,
      avgDuration: 200,
      memory: 128
    },
    'S3 Data Processor': {
      invocationsPerDay: 100,
      avgDuration: 5000,
      memory: CURRENT_MRR >= 1000 ? 256 : 128
    }
  };
  
  let totalDailyCost = 0;
  
  Object.entries(estimates).forEach(([name, est]) => {
    const requestCost = (est.invocationsPerDay * 0.0000002);
    const computeCost = (est.invocationsPerDay * est.avgDuration / 1000 * est.memory / 1024 * 0.0000166667);
    const dailyCost = requestCost + computeCost;
    totalDailyCost += dailyCost;
    
    console.log(`${name}:`);
    console.log(`  Invocations/day: ${est.invocationsPerDay}`);
    console.log(`  Memory: ${est.memory}MB`);
    console.log(`  Daily cost: $${dailyCost.toFixed(4)}`);
  });
  
  console.log('--------------------------------');
  console.log(`Total daily cost: $${totalDailyCost.toFixed(2)}`);
  console.log(`Total monthly cost: $${(totalDailyCost * 30).toFixed(2)}`);
  console.log('\n📊 Cost optimization tips:');
  
  if (CURRENT_MRR < 1000) {
    console.log('- Functions configured for minimal cost');
    console.log('- Upgrade to 256MB memory at $1K MRR for better performance');
  } else if (CURRENT_MRR < 5000) {
    console.log('- Functions optimized for cost/performance balance');
    console.log('- X-Ray tracing available at $5K MRR');
  } else if (CURRENT_MRR < 10000) {
    console.log('- Enhanced monitoring enabled');
    console.log('- Consider provisioned concurrency at $10K MRR');
  } else {
    console.log('- Full performance optimization enabled');
    console.log('- Monitor costs closely and adjust as needed');
  }
}

// Run deployment
main();