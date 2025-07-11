'use client';

import { useEffect, useState } from 'react';

export default function DeploymentStatusPage() {
  const [versionData, setVersionData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/version')
      .then(res => res.json())
      .then(data => {
        setVersionData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching version:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Deployment Status</h1>
        
        {loading ? (
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600">Loading deployment information...</p>
          </div>
        ) : versionData ? (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Current Deployment</h2>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Version</dt>
                  <dd className="mt-1 text-lg font-semibold text-gray-900">{versionData.version}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Deployed At</dt>
                  <dd className="mt-1 text-lg font-semibold text-gray-900">{versionData.deployedAt}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Commit</dt>
                  <dd className="mt-1 text-lg font-mono text-gray-900">{versionData.commit}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                  <dd className="mt-1 text-lg text-gray-900">{new Date(versionData.lastUpdated).toLocaleString()}</dd>
                </div>
              </dl>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Feature Status</h2>
              <ul className="space-y-2">
                {Object.entries(versionData.features).map(([feature, enabled]) => (
                  <li key={feature} className="flex items-center">
                    <span className={`inline-block w-3 h-3 rounded-full mr-3 ${enabled ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span className="text-gray-700 capitalize">{feature.replace(/([A-Z])/g, ' $1').trim()}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-blue-50 rounded-lg p-6">
              <p className="text-blue-900 font-medium">{versionData.message}</p>
            </div>

            <div className="bg-gray-100 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                This page verifies that GitHub changes have been deployed to Vercel. 
                Check the browser console for additional deployment logs.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-red-50 rounded-lg p-6">
            <p className="text-red-900">Failed to load deployment information</p>
          </div>
        )}
      </div>
    </div>
  );
}