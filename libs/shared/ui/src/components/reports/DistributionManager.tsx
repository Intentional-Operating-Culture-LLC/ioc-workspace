'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShareIcon, 
  EnvelopeIcon,
  UserGroupIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  BellIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

interface DistributionManagerProps {
  organizationId: string;
  user: any;
}

interface DistributionList {
  id: string;
  name: string;
  description: string;
  distribution_channels: string[];
  subscribers: any[];
  schedule_configuration: any;
  is_active: boolean;
  created_at: string;
  created_by_user: {
    full_name: string;
  };
}

interface Subscription {
  id: string;
  subscription_type: string;
  delivery_preferences: any;
  is_active: boolean;
  template?: {
    id: string;
    name: string;
    template_type: string;
  };
  distribution_list?: {
    id: string;
    name: string;
    description: string;
  };
}

export function DistributionManager({ organizationId, user }: DistributionManagerProps) {
  const [distributionLists, setDistributionLists] = useState<DistributionList[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [deliveryHistory, setDeliveryHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'lists' | 'subscriptions' | 'history'>('lists');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadDistributionData();
  }, [organizationId, activeTab]);

  const loadDistributionData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/reports/distribution?organizationId=${organizationId}&type=${activeTab}`);
      if (response.ok) {
        const data = await response.json();
        if (activeTab === 'lists') {
          setDistributionLists(data.distribution_lists || []);
        } else if (activeTab === 'subscriptions') {
          setSubscriptions(data.subscriptions || []);
        } else if (activeTab === 'history') {
          setDeliveryHistory(data.delivery_history || []);
        }
      }
    } catch (error) {
      console.error('Error loading distribution data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDistributionList = async (listData: any) => {
    try {
      const response = await fetch('/api/reports/distribution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_distribution_list',
          organizationId,
          ...listData
        })
      });

      if (response.ok) {
        loadDistributionData();
        setShowCreateModal(false);
      }
    } catch (error) {
      console.error('Error creating distribution list:', error);
    }
  };

  const deleteDistributionList = async (listId: string) => {
    if (!confirm('Are you sure you want to delete this distribution list?')) return;

    try {
      const response = await fetch(`/api/reports/distribution/${listId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId })
      });

      if (response.ok) {
        loadDistributionData();
      }
    } catch (error) {
      console.error('Error deleting distribution list:', error);
    }
  };

  const subscribe = async (templateId?: string, distributionListId?: string) => {
    try {
      const response = await fetch('/api/reports/distribution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'subscribe',
          organizationId,
          templateId,
          distributionListId,
          subscriptionType: templateId ? 'individual' : 'list',
          deliveryPreferences: {
            format: 'email',
            frequency: 'immediate'
          }
        })
      });

      if (response.ok) {
        loadDistributionData();
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
    }
  };

  const unsubscribe = async (subscriptionId: string) => {
    try {
      const response = await fetch('/api/reports/distribution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unsubscribe',
          organizationId,
          subscriptionId
        })
      });

      if (response.ok) {
        loadDistributionData();
      }
    } catch (error) {
      console.error('Error unsubscribing:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Distribution Management</h3>
          <p className="text-gray-600">Manage report distribution lists and subscriptions</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Distribution List
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'lists', name: 'Distribution Lists', icon: UserGroupIcon },
            { id: 'subscriptions', name: 'My Subscriptions', icon: BellIcon },
            { id: 'history', name: 'Delivery History', icon: ClockIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-5 w-5 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      ) : (
        <>
          {activeTab === 'lists' && (
            <DistributionListsTab
              lists={distributionLists}
              onDelete={deleteDistributionList}
              onSubscribe={subscribe}
            />
          )}

          {activeTab === 'subscriptions' && (
            <SubscriptionsTab
              subscriptions={subscriptions}
              onUnsubscribe={unsubscribe}
            />
          )}

          {activeTab === 'history' && (
            <DeliveryHistoryTab
              history={deliveryHistory}
            />
          )}
        </>
      )}

      {/* Create Distribution List Modal */}
      {showCreateModal && (
        <CreateDistributionListModal
          onSave={createDistributionList}
          onCancel={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}

// Distribution Lists Tab
function DistributionListsTab({ lists, onDelete, onSubscribe }: any) {
  if (lists.length === 0) {
    return (
      <div className="text-center py-12">
        <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Distribution Lists</h3>
        <p className="text-gray-600">Create your first distribution list to manage subscribers</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {lists.map((list: DistributionList) => (
        <div key={list.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h4 className="text-lg font-medium text-gray-900 mb-2">{list.name}</h4>
              <p className="text-sm text-gray-600 mb-3">{list.description}</p>
              
              <div className="flex flex-wrap gap-2 mb-3">
                {list.distribution_channels.map((channel) => (
                  <span key={channel} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {channel}
                  </span>
                ))}
              </div>
              
              <div className="flex items-center text-sm text-gray-500 mb-3">
                <UserGroupIcon className="h-4 w-4 mr-1" />
                {list.subscribers.length} subscribers
              </div>
            </div>
            
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              list.is_active 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {list.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>

          {list.schedule_configuration && list.schedule_configuration.enabled && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center text-sm text-gray-600">
                <CalendarIcon className="h-4 w-4 mr-1" />
                Automated delivery enabled
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onSubscribe(undefined, list.id)}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Subscribe
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button
                className="p-2 text-gray-400 hover:text-gray-600"
                title="Edit List"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDelete(list.id)}
                className="p-2 text-gray-400 hover:text-red-600"
                title="Delete List"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Subscriptions Tab
function SubscriptionsTab({ subscriptions, onUnsubscribe }: any) {
  if (subscriptions.length === 0) {
    return (
      <div className="text-center py-12">
        <BellIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Subscriptions</h3>
        <p className="text-gray-600">Subscribe to distribution lists to receive automated reports</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <ul className="divide-y divide-gray-200">
        {subscriptions.map((subscription: Subscription) => (
          <li key={subscription.id}>
            <div className="px-4 py-4 flex items-center justify-between hover:bg-gray-50">
              <div className="flex items-center min-w-0 flex-1">
                <div className="flex-shrink-0">
                  {subscription.template ? (
                    <DocumentTextIcon className="h-8 w-8 text-indigo-600" />
                  ) : (
                    <UserGroupIcon className="h-8 w-8 text-green-600" />
                  )}
                </div>
                <div className="ml-4 min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {subscription.template?.name || subscription.distribution_list?.name}
                      </p>
                      <div className="flex items-center mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          subscription.subscription_type === 'individual' 
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {subscription.subscription_type}
                        </span>
                        {subscription.template && (
                          <span className="ml-2 text-xs text-gray-500">
                            {subscription.template.template_type}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {subscription.template?.description || subscription.distribution_list?.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-500">
                  Via {subscription.delivery_preferences?.format || 'email'}
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  subscription.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {subscription.is_active ? 'Active' : 'Inactive'}
                </span>
                <button
                  onClick={() => onUnsubscribe(subscription.id)}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Unsubscribe
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Delivery History Tab
function DeliveryHistoryTab({ history }: any) {
  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Delivery History</h3>
        <p className="text-gray-600">Delivery history will appear here once reports are sent</p>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <ul className="divide-y divide-gray-200">
        {history.map((delivery: any) => (
          <li key={delivery.id}>
            <div className="px-4 py-4 flex items-center justify-between hover:bg-gray-50">
              <div className="flex items-center min-w-0 flex-1">
                <div className="flex-shrink-0">
                  {getStatusIcon(delivery.delivery_status)}
                </div>
                <div className="ml-4 min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {delivery.report?.title || 'Report'}
                      </p>
                      <div className="flex items-center mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(delivery.delivery_status)}`}>
                          {delivery.delivery_status}
                        </span>
                        <span className="ml-2 text-xs text-gray-500">
                          via {delivery.delivery_channel}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        To: {delivery.recipient_address}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-900">
                        {new Date(delivery.delivery_timestamp).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(delivery.delivery_timestamp).toLocaleTimeString()}
                      </p>
                      {delivery.read_timestamp && (
                        <p className="text-xs text-green-600 mt-1">
                          Read: {new Date(delivery.read_timestamp).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Create Distribution List Modal
function CreateDistributionListModal({ onSave, onCancel }: any) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    distributionChannels: ['email'],
    subscribers: []
  });

  const [newSubscriber, setNewSubscriber] = useState('');

  const addSubscriber = () => {
    if (newSubscriber.trim() && !formData.subscribers.some((s: any) => s.email === newSubscriber)) {
      setFormData({
        ...formData,
        subscribers: [...formData.subscribers, { email: newSubscriber.trim() }]
      });
      setNewSubscriber('');
    }
  };

  const removeSubscriber = (email: string) => {
    setFormData({
      ...formData,
      subscribers: formData.subscribers.filter((s: any) => s.email !== email)
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create Distribution List</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                List Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                placeholder="Weekly Report Subscribers"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input h-20"
                placeholder="Distribution list for weekly performance reports"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Distribution Channels
              </label>
              <div className="space-y-2">
                {['email', 'slack', 'webhook'].map((channel) => (
                  <label key={channel} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.distributionChannels.includes(channel)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            distributionChannels: [...formData.distributionChannels, channel]
                          });
                        } else {
                          setFormData({
                            ...formData,
                            distributionChannels: formData.distributionChannels.filter(c => c !== channel)
                          });
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 capitalize">{channel}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subscribers
              </label>
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <input
                    type="email"
                    value={newSubscriber}
                    onChange={(e) => setNewSubscriber(e.target.value)}
                    className="input flex-1"
                    placeholder="user@example.com"
                  />
                  <button
                    type="button"
                    onClick={addSubscriber}
                    className="btn-secondary"
                  >
                    Add
                  </button>
                </div>
                
                {formData.subscribers.length > 0 && (
                  <div className="max-h-32 overflow-y-auto border border-gray-200 rounded p-2">
                    {formData.subscribers.map((subscriber: any, index) => (
                      <div key={index} className="flex items-center justify-between py-1">
                        <span className="text-sm text-gray-700">{subscriber.email}</span>
                        <button
                          type="button"
                          onClick={() => removeSubscriber(subscriber.email)}
                          className="text-red-600 hover:text-red-700 ml-2"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={onCancel}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
              >
                Create List
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}