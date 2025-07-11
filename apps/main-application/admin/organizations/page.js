'use client';

import React, { useState, useEffect } from 'react';
import { OrganizationTable } from "@ioc/shared/ui";

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    // Simulate data loading
    setTimeout(() => {
      setOrganizations([
      { id: 1, name: 'Acme Corporation', email: 'admin@acme.com', users: 150, plan: 'Enterprise', status: 'Active', createdAt: '2023-05-15', mrr: 15000 },
      { id: 2, name: 'Tech Innovators', email: 'contact@techinnovators.com', users: 75, plan: 'Professional', status: 'Active', createdAt: '2023-06-20', mrr: 5000 },
      { id: 3, name: 'Global Solutions', email: 'info@globalsolutions.com', users: 200, plan: 'Enterprise', status: 'Active', createdAt: '2023-07-10', mrr: 20000 },
      { id: 4, name: 'StartUp Inc', email: 'hello@startup.com', users: 25, plan: 'Starter', status: 'Trial', createdAt: '2024-01-05', mrr: 500 },
      { id: 5, name: 'Digital Ventures', email: 'admin@digitalventures.com', users: 50, plan: 'Professional', status: 'Active', createdAt: '2023-08-15', mrr: 3500 },
      { id: 6, name: 'Cloud Systems', email: 'support@cloudsystems.com', users: 100, plan: 'Professional', status: 'Active', createdAt: '2023-09-01', mrr: 7000 },
      { id: 7, name: 'Data Analytics Co', email: 'info@dataanalytics.com', users: 80, plan: 'Professional', status: 'Suspended', createdAt: '2023-10-15', mrr: 0 },
      { id: 8, name: 'Security First', email: 'admin@securityfirst.com', users: 300, plan: 'Enterprise', status: 'Active', createdAt: '2023-04-20', mrr: 30000 }]
      );
      setLoading(false);
    }, 1000);
  }, []);

  const handleEdit = (org) => {
    setSelectedOrg(org);
    setShowEditModal(true);
  };

  const handleSuspend = (org) => {
    const updatedOrgs = organizations.map((o) =>
    o.id === org.id ?
    { ...o, status: o.status === 'Active' ? 'Suspended' : 'Active' } :
    o
    );
    setOrganizations(updatedOrgs);
  };

  const handleSaveEdit = () => {
    const updatedOrgs = organizations.map((o) =>
    o.id === selectedOrg.id ? selectedOrg : o
    );
    setOrganizations(updatedOrgs);
    setShowEditModal(false);
    setSelectedOrg(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <nav className="flex items-center text-sm text-gray-500 mb-2">
                <a href="/admin" className="hover:text-gray-700">Admin</a>
                <span className="mx-2">/</span>
                <span className="text-gray-900">Organizations</span>
              </nav>
              <h1 className="text-3xl font-bold text-gray-900">Organization Management</h1>
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Add Organization
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wider">Total Organizations</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">{organizations.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wider">Active</h3>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {organizations.filter((o) => o.status === 'Active').length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wider">Trial</h3>
            <p className="mt-2 text-3xl font-bold text-yellow-600">
              {organizations.filter((o) => o.status === 'Trial').length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wider">Total MRR</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              ${(organizations.reduce((sum, o) => sum + o.mrr, 0) / 1000).toFixed(1)}k
            </p>
          </div>
        </div>

        {/* Organizations Table */}
        <OrganizationTable
          organizations={organizations}
          onEdit={handleEdit}
          onSuspend={handleSuspend}
          loading={loading} />

      </main>

      {/* Edit Modal */}
      {showEditModal && selectedOrg &&
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Organization</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
                <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedOrg.name}
                onChange={(e) => setSelectedOrg({ ...selectedOrg, name: e.target.value })} />

              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                <input
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedOrg.email}
                onChange={(e) => setSelectedOrg({ ...selectedOrg, email: e.target.value })} />

              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedOrg.plan}
                onChange={(e) => setSelectedOrg({ ...selectedOrg, plan: e.target.value })}>

                  <option value="Starter">Starter</option>
                  <option value="Professional">Professional</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User Limit</label>
                <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedOrg.users}
                onChange={(e) => setSelectedOrg({ ...selectedOrg, users: parseInt(e.target.value) })} />

              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors">

                Cancel
              </button>
              <button
              onClick={handleSaveEdit}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">

                Save Changes
              </button>
            </div>
          </div>
        </div>
      }
    </div>);

}