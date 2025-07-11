'use client';

import React, { useState, useEffect } from 'react';
import { UserTable } from "@ioc/shared/ui";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);

  useEffect(() => {
    // Simulate data loading
    setTimeout(() => {
      setUsers([
      { id: 1, name: 'John Smith', email: 'john.smith@acme.com', organization: 'Acme Corporation', role: 'Admin', lastActive: '2 hours ago', status: 'Active', joinedDate: '2023-05-15', assessmentsCompleted: 12 },
      { id: 2, name: 'Sarah Johnson', email: 'sarah.j@techinnovators.com', organization: 'Tech Innovators', role: 'Manager', lastActive: '1 day ago', status: 'Active', joinedDate: '2023-06-20', assessmentsCompleted: 8 },
      { id: 3, name: 'Michael Chen', email: 'mchen@globalsolutions.com', organization: 'Global Solutions', role: 'User', lastActive: '3 hours ago', status: 'Active', joinedDate: '2023-07-10', assessmentsCompleted: 5 },
      { id: 4, name: 'Emily Davis', email: 'emily@startup.com', organization: 'StartUp Inc', role: 'Admin', lastActive: '5 minutes ago', status: 'Active', joinedDate: '2024-01-05', assessmentsCompleted: 2 },
      { id: 5, name: 'Robert Wilson', email: 'rwilson@digitalventures.com', organization: 'Digital Ventures', role: 'Manager', lastActive: '2 days ago', status: 'Active', joinedDate: '2023-08-15', assessmentsCompleted: 15 },
      { id: 6, name: 'Lisa Anderson', email: 'lisa.a@cloudsystems.com', organization: 'Cloud Systems', role: 'User', lastActive: '1 week ago', status: 'Inactive', joinedDate: '2023-09-01', assessmentsCompleted: 3 },
      { id: 7, name: 'David Martinez', email: 'dmartinez@dataanalytics.com', organization: 'Data Analytics Co', role: 'Admin', lastActive: '1 month ago', status: 'Inactive', joinedDate: '2023-10-15', assessmentsCompleted: 0 },
      { id: 8, name: 'Jennifer Taylor', email: 'jtaylor@securityfirst.com', organization: 'Security First', role: 'Manager', lastActive: '30 minutes ago', status: 'Active', joinedDate: '2023-04-20', assessmentsCompleted: 20 },
      { id: 9, name: 'James Brown', email: 'jbrown@acme.com', organization: 'Acme Corporation', role: 'User', lastActive: '4 hours ago', status: 'Active', joinedDate: '2023-11-01', assessmentsCompleted: 6 },
      { id: 10, name: 'Maria Garcia', email: 'mgarcia@globalsolutions.com', organization: 'Global Solutions', role: 'User', lastActive: '1 hour ago', status: 'Active', joinedDate: '2023-12-15', assessmentsCompleted: 9 }]
      );
      setLoading(false);
    }, 1000);
  }, []);

  const handleViewDetails = (user) => {
    setSelectedUser(user);
    setShowDetailsModal(true);
  };

  const handleEditRole = (user) => {
    setSelectedUser(user);
    setShowRoleModal(true);
  };

  const handleSaveRole = () => {
    const updatedUsers = users.map((u) =>
    u.id === selectedUser.id ? selectedUser : u
    );
    setUsers(updatedUsers);
    setShowRoleModal(false);
    setSelectedUser(null);
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
                <span className="text-gray-900">Users</span>
              </nav>
              <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            </div>
            <div className="flex space-x-3">
              <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                Export Users
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Invite User
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wider">Total Users</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">{users.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wider">Active Users</h3>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {users.filter((u) => u.status === 'Active').length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wider">Admins</h3>
            <p className="mt-2 text-3xl font-bold text-purple-600">
              {users.filter((u) => u.role === 'Admin').length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wider">Avg Assessments</h3>
            <p className="mt-2 text-3xl font-bold text-blue-600">
              {(users.reduce((sum, u) => sum + u.assessmentsCompleted, 0) / users.length).toFixed(1)}
            </p>
          </div>
        </div>

        {/* Users Table */}
        <UserTable
          users={users}
          onViewDetails={handleViewDetails}
          onEditRole={handleEditRole}
          loading={loading} />


        {/* Activity Log Preview */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-900">John Smith completed Security Assessment</p>
                <p className="text-xs text-gray-500">2 hours ago</p>
              </div>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Completed</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-900">Sarah Johnson invited 5 new team members</p>
                <p className="text-xs text-gray-500">1 day ago</p>
              </div>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Invitation</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-900">Michael Chen updated profile information</p>
                <p className="text-xs text-gray-500">3 hours ago</p>
              </div>
              <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">Profile</span>
            </div>
          </div>
        </div>
      </main>

      {/* User Details Modal */}
      {showDetailsModal && selectedUser &&
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Details</h3>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-medium">{selectedUser.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium">{selectedUser.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Organization</p>
                <p className="font-medium">{selectedUser.organization}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Role</p>
                <p className="font-medium">{selectedUser.role}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Joined Date</p>
                <p className="font-medium">{selectedUser.joinedDate}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Assessments Completed</p>
                <p className="font-medium">{selectedUser.assessmentsCompleted}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Last Active</p>
                <p className="font-medium">{selectedUser.lastActive}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                  ${selectedUser.status === 'Active' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'}`}>
                  {selectedUser.status}
                </span>
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <button
              onClick={() => setShowDetailsModal(false)}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors">

                Close
              </button>
            </div>
          </div>
        </div>
      }

      {/* Edit Role Modal */}
      {showRoleModal && selectedUser &&
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit User Role</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">User: {selectedUser.name}</p>
                <p className="text-sm text-gray-600 mb-4">Current Role: {selectedUser.role}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Role</label>
                <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedUser.role}
                onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value })}>

                  <option value="User">User</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> Changing user roles will affect their access permissions immediately.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
              onClick={() => setShowRoleModal(false)}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors">

                Cancel
              </button>
              <button
              onClick={handleSaveRole}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">

                Save Changes
              </button>
            </div>
          </div>
        </div>
      }
    </div>);

}