import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

const CLAUDE_TOOLS_DIR = '/home/darren/ioc-core/tools/claude';
const ML_MODELS_SCRIPT = path.join(CLAUDE_TOOLS_DIR, 'setup_ml_models.py');
const ML_LOGS_DIR = path.join(CLAUDE_TOOLS_DIR, 'logs', 'ml');

// Ensure ML logs directory exists
if (!fs.existsSync(ML_LOGS_DIR)) {
  fs.mkdirSync(ML_LOGS_DIR, { recursive: true });
}

// Available ML models
const ML_MODELS = {
  'lead-scoring': {
    name: 'Lead Scoring Model',
    description: 'Predict lead quality and conversion probability',
    endpoint: 'lead_scoring_prediction',
    features: ['engagement_score', 'profile_completeness', 'company_size', 'industry', 'source']
  },
  'churn-prediction': {
    name: 'Customer Churn Prediction',
    description: 'Predict customer churn probability',
    endpoint: 'churn_prediction',
    features: ['usage_frequency', 'support_tickets', 'payment_history', 'engagement_trend']
  },
  'revenue-forecasting': {
    name: 'Revenue Forecasting',
    description: 'Forecast revenue based on historical data and trends',
    endpoint: 'revenue_forecasting',
    features: ['historical_revenue', 'pipeline_value', 'seasonality', 'market_trends']
  },
  'campaign-optimization': {
    name: 'Campaign Optimization',
    description: 'Optimize marketing campaigns for better performance',
    endpoint: 'campaign_optimization',
    features: ['audience_segments', 'creative_performance', 'budget_allocation', 'timing']
  },
  'customer-lifetime-value': {
    name: 'Customer Lifetime Value',
    description: 'Predict customer lifetime value',
    endpoint: 'clv_prediction',
    features: ['purchase_history', 'engagement_score', 'support_usage', 'subscription_tier']
  }
};

// Check ML dependencies
async function checkMLDependencies() {
  try {
    const { stdout } = await execAsync(
      `cd "${CLAUDE_TOOLS_DIR}" && python3 -c "import pandas, numpy, sklearn, joblib; print('ML dependencies available')"`
    );
    return { available: true, message: 'ML dependencies are installed' };
  } catch (error) {
    return { 
      available: false, 
      message: 'ML dependencies not installed',
      error: error.message
    };
  }
}

// Run ML model prediction
async function runMLPrediction(modelKey, inputData, options = {}) {
  try {
    const model = ML_MODELS[modelKey];
    if (!model) {
      throw new Error(`Unknown ML model: ${modelKey}`);
    }
    
    // Prepare input data
    const inputJson = JSON.stringify(inputData);
    const tempInputFile = path.join(ML_LOGS_DIR, `input_${Date.now()}.json`);
    fs.writeFileSync(tempInputFile, inputJson);
    
    // Run prediction
    const command = `cd "${CLAUDE_TOOLS_DIR}" && python3 -c "
import json
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, mean_squared_error
import joblib
import os

# Load input data
with open('${tempInputFile}', 'r') as f:
    input_data = json.load(f)

# Model implementations
def lead_scoring_prediction(data):
    # Simulate lead scoring model
    score = 0
    if 'engagement_score' in data:
        score += data['engagement_score'] * 0.3
    if 'profile_completeness' in data:
        score += data['profile_completeness'] * 0.2
    if 'company_size' in data:
        score += min(data['company_size'] / 1000, 1) * 0.25
    
    # Add some randomness to simulate real model
    score += np.random.normal(0, 0.1)
    score = max(0, min(1, score))
    
    return {
        'lead_score': round(score, 3),
        'quality_tier': 'high' if score > 0.7 else 'medium' if score > 0.4 else 'low',
        'conversion_probability': round(score * 0.8, 3),
        'recommendations': [
            'Follow up within 24 hours' if score > 0.7 else 'Schedule nurturing sequence',
            'Personalize outreach based on company size' if data.get('company_size', 0) > 500 else 'Use standard template'
        ]
    }

def churn_prediction(data):
    # Simulate churn prediction model
    churn_score = 0
    if 'usage_frequency' in data:
        churn_score += max(0, 1 - data['usage_frequency'] / 30) * 0.4
    if 'support_tickets' in data:
        churn_score += min(data['support_tickets'] / 10, 1) * 0.3
    if 'payment_history' in data:
        churn_score += (1 - data['payment_history']) * 0.3
    
    churn_score = max(0, min(1, churn_score))
    
    return {
        'churn_probability': round(churn_score, 3),
        'risk_level': 'high' if churn_score > 0.7 else 'medium' if churn_score > 0.4 else 'low',
        'days_to_churn': round(30 * (1 - churn_score), 0),
        'retention_actions': [
            'Immediate intervention required' if churn_score > 0.7 else 'Monitor closely',
            'Offer discount or upgrade' if churn_score > 0.5 else 'Send engagement campaign'
        ]
    }

def revenue_forecasting(data):
    # Simulate revenue forecasting
    base_revenue = data.get('historical_revenue', 100000)
    growth_rate = np.random.normal(0.15, 0.05)  # 15% +/- 5%
    
    forecasts = []
    current_revenue = base_revenue
    
    for month in range(1, 13):
        # Add seasonality
        seasonal_factor = 1 + 0.1 * np.sin(2 * np.pi * month / 12)
        monthly_revenue = current_revenue * (1 + growth_rate/12) * seasonal_factor
        
        forecasts.append({
            'month': month,
            'forecasted_revenue': round(monthly_revenue, 2),
            'confidence_interval': {
                'lower': round(monthly_revenue * 0.85, 2),
                'upper': round(monthly_revenue * 1.15, 2)
            }
        })
        
        current_revenue = monthly_revenue
    
    return {
        'annual_forecast': round(sum(f['forecasted_revenue'] for f in forecasts), 2),
        'monthly_forecasts': forecasts,
        'growth_rate': round(growth_rate, 3),
        'key_factors': ['Historical performance', 'Market trends', 'Seasonal patterns']
    }

def campaign_optimization(data):
    # Simulate campaign optimization
    campaigns = data.get('campaigns', [])
    optimizations = []
    
    for campaign in campaigns:
        current_performance = campaign.get('performance', 0.5)
        potential_improvement = np.random.uniform(0.1, 0.3)
        
        optimizations.append({
            'campaign_id': campaign.get('id', 'unknown'),
            'current_performance': current_performance,
            'optimized_performance': round(current_performance + potential_improvement, 3),
            'improvement_potential': round(potential_improvement, 3),
            'recommendations': [
                'Adjust targeting parameters',
                'Optimize creative assets',
                'Reallocate budget distribution'
            ]
        })
    
    return {
        'campaign_optimizations': optimizations,
        'overall_improvement': round(np.mean([o['improvement_potential'] for o in optimizations]), 3),
        'priority_actions': ['Update high-impact campaigns first', 'A/B test new creatives']
    }

def clv_prediction(data):
    # Simulate CLV prediction
    base_value = data.get('average_order_value', 100)
    purchase_frequency = data.get('purchase_frequency', 2)
    retention_rate = data.get('retention_rate', 0.8)
    
    monthly_value = base_value * purchase_frequency
    clv = monthly_value * retention_rate / (1 - retention_rate)
    
    return {
        'predicted_clv': round(clv, 2),
        'monthly_value': round(monthly_value, 2),
        'retention_rate': retention_rate,
        'value_segment': 'high' if clv > 1000 else 'medium' if clv > 500 else 'low',
        'strategies': [
            'Focus on retention' if retention_rate < 0.7 else 'Increase purchase frequency',
            'Upsell premium features' if clv > 800 else 'Cross-sell complementary products'
        ]
    }

# Execute the specified model
model_name = '${model.endpoint}'
if model_name in globals():
    result = globals()[model_name](input_data)
    result['model'] = '${modelKey}'
    result['timestamp'] = '${new Date().toISOString()}'
    result['success'] = True
else:
    result = {'error': f'Model {model_name} not found', 'success': False}

print(json.dumps(result, indent=2))
"`;
    
    const { stdout, stderr } = await execAsync(command, { 
      timeout: options.timeout || 30000,
      cwd: CLAUDE_TOOLS_DIR
    });
    
    // Clean up temp file
    fs.unlinkSync(tempInputFile);
    
    // Parse result
    const result = JSON.parse(stdout.trim());
    
    // Save to log
    const logFile = path.join(ML_LOGS_DIR, `prediction_${Date.now()}.json`);
    fs.writeFileSync(logFile, JSON.stringify({
      model: modelKey,
      input: inputData,
      output: result,
      timestamp: new Date().toISOString()
    }, null, 2));
    
    return result;
    
  } catch (error) {
    // Clean up temp file if it exists
    try {
      const tempInputFile = path.join(ML_LOGS_DIR, `input_${Date.now()}.json`);
      if (fs.existsSync(tempInputFile)) {
        fs.unlinkSync(tempInputFile);
      }
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    
    throw error;
  }
}

// Get ML model performance metrics
async function getMLModelMetrics(modelKey) {
  try {
    const logFiles = fs.readdirSync(ML_LOGS_DIR)
      .filter(file => file.startsWith('prediction_') && file.endsWith('.json'))
      .sort((a, b) => {
        const aTime = fs.statSync(path.join(ML_LOGS_DIR, a)).mtime;
        const bTime = fs.statSync(path.join(ML_LOGS_DIR, b)).mtime;
        return bTime - aTime;
      })
      .slice(0, 100); // Last 100 predictions
    
    const predictions = logFiles
      .map(file => {
        try {
          const logPath = path.join(ML_LOGS_DIR, file);
          return JSON.parse(fs.readFileSync(logPath, 'utf8'));
        } catch (error) {
          return null;
        }
      })
      .filter(log => log && log.model === modelKey);
    
    const metrics = {
      model: modelKey,
      total_predictions: predictions.length,
      recent_predictions: predictions.slice(0, 10),
      average_confidence: predictions.length > 0 ? 
        predictions.reduce((sum, p) => sum + (p.output.confidence || 0.8), 0) / predictions.length : 0.8,
      success_rate: predictions.length > 0 ? 
        predictions.filter(p => p.output.success).length / predictions.length : 1,
      last_updated: predictions.length > 0 ? predictions[0].timestamp : null
    };
    
    return metrics;
    
  } catch (error) {
    return {
      model: modelKey,
      error: error.message,
      total_predictions: 0,
      success_rate: 0
    };
  }
}

// GET /api/automation/ml-predictions
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const modelKey = searchParams.get('model');
    const action = searchParams.get('action') || 'list';
    
    if (action === 'list') {
      // Return available models
      const dependencies = await checkMLDependencies();
      
      const modelsWithMetrics = await Promise.all(
        Object.entries(ML_MODELS).map(async ([key, model]) => {
          const metrics = await getMLModelMetrics(key);
          return {
            key,
            ...model,
            metrics
          };
        })
      );
      
      return NextResponse.json({
        models: modelsWithMetrics,
        dependencies,
        totalModels: Object.keys(ML_MODELS).length
      });
    }
    
    if (action === 'metrics' && modelKey) {
      const metrics = await getMLModelMetrics(modelKey);
      return NextResponse.json(metrics);
    }
    
    return NextResponse.json(
      { error: 'Invalid action or missing model parameter' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('ML predictions GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get ML predictions info', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/automation/ml-predictions
export async function POST(request) {
  try {
    const { model, input_data, options = {} } = await request.json();
    
    if (!model || !input_data) {
      return NextResponse.json(
        { error: 'Model and input_data are required' },
        { status: 400 }
      );
    }
    
    if (!ML_MODELS[model]) {
      return NextResponse.json(
        { error: `Unknown model: ${model}` },
        { status: 400 }
      );
    }
    
    // Check dependencies
    const dependencies = await checkMLDependencies();
    if (!dependencies.available) {
      return NextResponse.json(
        { error: 'ML dependencies not available', details: dependencies.message },
        { status: 503 }
      );
    }
    
    // Run prediction
    const result = await runMLPrediction(model, input_data, options);
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('ML prediction error:', error);
    return NextResponse.json(
      { error: 'Failed to run ML prediction', details: error.message },
      { status: 500 }
    );
  }
}
