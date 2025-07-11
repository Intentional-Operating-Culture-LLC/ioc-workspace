import React, { useState, useMemo } from 'react';
import { Calculator, TrendingUp, DollarSign, Database, Zap, Search } from 'lucide-react';

interface CostTier {
  name: string;
  mrr: string;
  storage: number; // GB
  requests: number; // monthly
  features: string[];
  breakdown: {
    s3Storage: number;
    s3Requests: number;
    lambda: number;
    firehose?: number;
    athena?: number;
    quicksight?: number;
  };
}

export const S3DataLakeCostCalculator: React.FC = () => {
  const [currentMRR, setCurrentMRR] = useState(0);
  const [dataVolumeGB, setDataVolumeGB] = useState(1);
  const [monthlyAssessments, setMonthlyAssessments] = useState(1000);

  const costTiers: CostTier[] = [
    {
      name: 'Startup',
      mrr: '$0-$1K',
      storage: 10,
      requests: 10000,
      features: [
        'Direct S3 uploads',
        'Basic Lambda processing',
        'Manual QuickSight refresh',
        'CloudWatch monitoring'
      ],
      breakdown: {
        s3Storage: 0.23,
        s3Requests: 0.05,
        lambda: 0,
        quicksight: 0
      }
    },
    {
      name: 'Growth',
      mrr: '$1K-$5K',
      storage: 100,
      requests: 100000,
      features: [
        'All Startup features',
        'Kinesis Firehose streaming',
        'Automated ETL processing',
        'S3 Intelligent Tiering',
        'Basic Athena queries'
      ],
      breakdown: {
        s3Storage: 2.30,
        s3Requests: 0.50,
        lambda: 2.00,
        firehose: 17.50,
        athena: 5.00
      }
    },
    {
      name: 'Scale',
      mrr: '$5K-$20K',
      storage: 500,
      requests: 500000,
      features: [
        'All Growth features',
        'Advanced Athena analytics',
        'QuickSight SPICE',
        'Glue catalog',
        'Real-time processing',
        'Cross-region replication'
      ],
      breakdown: {
        s3Storage: 11.50,
        s3Requests: 2.50,
        lambda: 10.00,
        firehose: 87.50,
        athena: 25.00,
        quicksight: 48.00
      }
    },
    {
      name: 'Enterprise',
      mrr: '$20K+',
      storage: 2000,
      requests: 2000000,
      features: [
        'All Scale features',
        'Full Glue ETL pipelines',
        'ML integration',
        'Advanced QuickSight',
        'Data Lake Formation',
        'Macie security scanning'
      ],
      breakdown: {
        s3Storage: 46.00,
        s3Requests: 10.00,
        lambda: 40.00,
        firehose: 350.00,
        athena: 100.00,
        quicksight: 500.00
      }
    }
  ];

  const calculateCosts = useMemo(() => {
    // S3 Storage costs
    const s3StorageCost = dataVolumeGB * 0.023; // Standard storage
    
    // S3 Request costs
    const putRequests = monthlyAssessments * 2; // Raw + processed
    const getRequests = monthlyAssessments * 5; // Analytics queries
    const s3RequestCost = (putRequests * 0.005 / 1000) + (getRequests * 0.0004 / 1000);
    
    // Lambda costs (if > 1M free tier)
    const lambdaInvocations = monthlyAssessments * 2;
    const lambdaCost = lambdaInvocations > 1000000 
      ? (lambdaInvocations - 1000000) * 0.0000002 
      : 0;
    
    // Firehose costs (if enabled)
    const firehoseCost = currentMRR >= 1000 
      ? (dataVolumeGB * 0.035) 
      : 0;
    
    // Athena costs (if enabled)
    const athenaCost = currentMRR >= 5000 
      ? (dataVolumeGB * 0.005 * 10) // Assume 10 queries per GB
      : 0;
    
    // QuickSight costs (if enabled)
    const quicksightCost = currentMRR >= 1000
      ? 24 // Per user per month
      : 0;

    const totalCost = s3StorageCost + s3RequestCost + lambdaCost + 
                     firehoseCost + athenaCost + quicksightCost;

    return {
      s3Storage: s3StorageCost,
      s3Requests: s3RequestCost,
      lambda: lambdaCost,
      firehose: firehoseCost,
      athena: athenaCost,
      quicksight: quicksightCost,
      total: totalCost
    };
  }, [dataVolumeGB, monthlyAssessments, currentMRR]);

  const getCurrentTier = () => {
    if (currentMRR >= 20000) return costTiers[3];
    if (currentMRR >= 5000) return costTiers[2];
    if (currentMRR >= 1000) return costTiers[1];
    return costTiers[0];
  };

  const currentTier = getCurrentTier();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Calculator className="w-6 h-6" />
          S3 Data Lake Cost Calculator
        </h2>

        {/* Input Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium mb-2">
              Current MRR
            </label>
            <input
              type="number"
              value={currentMRR}
              onChange={(e) => setCurrentMRR(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Data Volume (GB/month)
            </label>
            <input
              type="number"
              value={dataVolumeGB}
              onChange={(e) => setDataVolumeGB(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Monthly Assessments
            </label>
            <input
              type="number"
              value={monthlyAssessments}
              onChange={(e) => setMonthlyAssessments(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="1000"
            />
          </div>
        </div>

        {/* Current Tier Info */}
        <div className="bg-blue-50 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">
            Your Recommended Tier: {currentTier.name}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Features Available:</h4>
              <ul className="list-disc list-inside text-sm space-y-1">
                {currentTier.features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Estimated Monthly Cost:</h4>
              <div className="text-3xl font-bold text-blue-600 mb-4">
                ${calculateCosts.total.toFixed(2)}
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>S3 Storage:</span>
                  <span>${calculateCosts.s3Storage.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>S3 Requests:</span>
                  <span>${calculateCosts.s3Requests.toFixed(2)}</span>
                </div>
                {calculateCosts.lambda > 0 && (
                  <div className="flex justify-between">
                    <span>Lambda:</span>
                    <span>${calculateCosts.lambda.toFixed(2)}</span>
                  </div>
                )}
                {calculateCosts.firehose > 0 && (
                  <div className="flex justify-between">
                    <span>Kinesis Firehose:</span>
                    <span>${calculateCosts.firehose.toFixed(2)}</span>
                  </div>
                )}
                {calculateCosts.athena > 0 && (
                  <div className="flex justify-between">
                    <span>Athena:</span>
                    <span>${calculateCosts.athena.toFixed(2)}</span>
                  </div>
                )}
                {calculateCosts.quicksight > 0 && (
                  <div className="flex justify-between">
                    <span>QuickSight:</span>
                    <span>${calculateCosts.quicksight.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Growth Path */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Growth Path
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {costTiers.map((tier, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${
                  tier.name === currentTier.name
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                }`}
              >
                <h4 className="font-semibold mb-2">{tier.name}</h4>
                <p className="text-sm text-gray-600 mb-3">{tier.mrr} MRR</p>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-1">
                    <Database className="w-4 h-4 text-gray-400" />
                    <span>{tier.storage} GB</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap className="w-4 h-4 text-gray-400" />
                    <span>{tier.requests.toLocaleString()} req/mo</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">
                      ${Object.values(tier.breakdown).reduce((a, b) => a + b, 0).toFixed(0)}/mo
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cost Optimization Tips */}
        <div className="mt-8 bg-green-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Search className="w-5 h-5" />
            Cost Optimization Tips
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Immediate Savings:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Use S3 Intelligent Tiering (automatic)</li>
                <li>Enable lifecycle policies for old data</li>
                <li>Compress data with Parquet format (70% reduction)</li>
                <li>Use S3 Select to reduce data transfer</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">As You Scale:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Reserve QuickSight capacity for discounts</li>
                <li>Use Athena partitioning to reduce scan costs</li>
                <li>Implement caching for frequent queries</li>
                <li>Archive to Glacier after 1 year</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Implementation Timeline */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Implementation Timeline</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
            <div className="flex-1">
              <h4 className="font-medium">Week 1: Foundation</h4>
              <p className="text-sm text-gray-600">
                S3 bucket setup, Lambda processing, basic monitoring
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
            <div className="flex-1">
              <h4 className="font-medium">Week 2: Integration</h4>
              <p className="text-sm text-gray-600">
                QuickSight connection, Athena tables, cost alerts
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-2 h-2 bg-gray-300 rounded-full mt-2"></div>
            <div className="flex-1">
              <h4 className="font-medium">Month 2: Streaming (at $1K MRR)</h4>
              <p className="text-sm text-gray-600">
                Add Kinesis Firehose, real-time processing
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-2 h-2 bg-gray-300 rounded-full mt-2"></div>
            <div className="flex-1">
              <h4 className="font-medium">Month 6: Advanced Analytics (at $5K MRR)</h4>
              <p className="text-sm text-gray-600">
                Glue ETL, ML integration, advanced dashboards
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default S3DataLakeCostCalculator;