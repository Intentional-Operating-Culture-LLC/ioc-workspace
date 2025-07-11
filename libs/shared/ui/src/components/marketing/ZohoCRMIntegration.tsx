'use client';

import { useEffect, useState } from 'react';
import { 
  UserGroupIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  PhoneIcon,
  EnvelopeIcon,
  ArrowTrendingUpIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  company: string;
  email: string;
  phone?: string;
  lead_source: string;
  lead_status: string;
  created_time: string;
  rating?: string;
}

interface Deal {
  id: string;
  deal_name: string;
  account_name: string;
  amount: number;
  stage: string;
  closing_date: string;
  probability: number;
  contact_name?: string;
  created_time: string;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  account_name: string;
  phone?: string;
  title?: string;
  created_time: string;
}

interface CRMStats {
  total_leads: number;
  qualified_leads: number;
  total_deals: number;
  total_deal_value: number;
  avg_deal_size: number;
  win_rate: number;
  conversion_rate: number;
  pipeline_velocity: number;
}

export function ZohoCRMIntegration() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState<CRMStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'leads' | 'deals' | 'contacts'>('leads');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCRMData();
  }, []);

  const fetchCRMData = async () => {
    try {
      setLoading(true);
      const [leadsRes, dealsRes, contactsRes, statsRes] = await Promise.all([
        fetch('/api/integrations/zoho/leads?limit=10'),
        fetch('/api/integrations/zoho/deals?limit=10'),
        fetch('/api/integrations/zoho/contacts?limit=10'),
        fetch('/api/integrations/zoho/stats')
      ]);

      if (!leadsRes.ok || !dealsRes.ok || !contactsRes.ok || !statsRes.ok) {
        throw new Error('Failed to fetch CRM data');
      }

      const [leadsData, dealsData, contactsData, statsData] = await Promise.all([
        leadsRes.json(),
        dealsRes.json(),
        contactsRes.json(),
        statsRes.json()
      ]);

      setLeads(leadsData.data);
      setDeals(dealsData.data);
      setContacts(contactsData.data);
      setStats(statsData.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching CRM data:', error);
      setError('Failed to load CRM data');
      
      // Fallback to mock data
      setStats({
        total_leads: 1247,
        qualified_leads: 423,
        total_deals: 89,
        total_deal_value: 245000,
        avg_deal_size: 2753,
        win_rate: 23.5,
        conversion_rate: 33.9,
        pipeline_velocity: 18.5
      });

      setLeads([
        {
          id: '1',
          first_name: 'Sarah',
          last_name: 'Johnson',
          company: 'TechCorp Inc',
          email: 'sarah.johnson@techcorp.com',
          phone: '+1-555-0123',
          lead_source: 'Website',
          lead_status: 'Qualified',
          created_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          rating: 'Hot'
        },
        {
          id: '2',
          first_name: 'Michael',
          last_name: 'Chen',
          company: 'StartupXYZ',
          email: 'michael@startupxyz.com',
          lead_source: 'Social Media',
          lead_status: 'New',
          created_time: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          rating: 'Warm'
        },
        {
          id: '3',
          first_name: 'Emily',
          last_name: 'Rodriguez',
          company: 'Global Solutions Ltd',
          email: 'emily.r@globalsol.com',
          phone: '+1-555-0456',
          lead_source: 'Email Campaign',
          lead_status: 'Contacted',
          created_time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          rating: 'Cold'
        }
      ]);

      setDeals([
        {
          id: '1',
          deal_name: 'TechCorp Enterprise License',
          account_name: 'TechCorp Inc',
          amount: 45000,
          stage: 'Negotiation',
          closing_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
          probability: 75,
          contact_name: 'Sarah Johnson',
          created_time: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '2',
          deal_name: 'StartupXYZ Integration',
          account_name: 'StartupXYZ',
          amount: 12000,
          stage: 'Proposal',
          closing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          probability: 50,
          contact_name: 'Michael Chen',
          created_time: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]);

      setContacts([
        {
          id: '1',
          first_name: 'Sarah',
          last_name: 'Johnson',
          email: 'sarah.johnson@techcorp.com',
          account_name: 'TechCorp Inc',
          phone: '+1-555-0123',
          title: 'VP of Technology',
          created_time: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '2',
          first_name: 'Michael',
          last_name: 'Chen',
          email: 'michael@startupxyz.com',
          account_name: 'StartupXYZ',
          title: 'Founder & CEO',
          created_time: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getLeadStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'qualified':
        return 'bg-green-100 text-green-800';
      case 'contacted':
        return 'bg-blue-100 text-blue-800';
      case 'new':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDealStageColor = (stage: string) => {
    switch (stage.toLowerCase()) {
      case 'negotiation':
        return 'bg-orange-100 text-orange-800';
      case 'proposal':
        return 'bg-blue-100 text-blue-800';
      case 'qualification':
        return 'bg-yellow-100 text-yellow-800';
      case 'closed won':
        return 'bg-green-100 text-green-800';
      case 'closed lost':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return diffInHours < 1 ? 'Just now' : `${diffInHours}h ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
      return `${diffInDays}d ago`;
    }
    
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="h-20 bg-gray-100 rounded"></div>
          <div className="h-20 bg-gray-100 rounded"></div>
        </div>
        <div className="h-64 bg-gray-100 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={fetchCRMData}
          className="mt-2 text-sm text-red-700 hover:text-red-900 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* CRM Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
            <div className="flex items-center">
              <UserGroupIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-600">Total Leads</p>
                <p className="text-2xl font-semibold text-blue-900">{stats.total_leads.toLocaleString()}</p>
                <p className="text-xs text-blue-700">{stats.qualified_leads} qualified</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
            <div className="flex items-center">
              <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-green-600">Pipeline Value</p>
                <p className="text-2xl font-semibold text-green-900">${stats.total_deal_value.toLocaleString()}</p>
                <p className="text-xs text-green-700">{stats.win_rate}% win rate</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
        {(['leads', 'deals', 'contacts'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-gray-50 rounded-lg p-4">
        {activeTab === 'leads' && (
          <div className="space-y-3">
            {leads.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No leads found</p>
            ) : (
              leads.map((lead) => (
                <div key={lead.id} className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900">
                          {lead.first_name} {lead.last_name}
                        </h4>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getLeadStatusColor(lead.lead_status)}`}>
                          {lead.lead_status}
                        </span>
                        {lead.rating && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            lead.rating === 'Hot' ? 'bg-red-100 text-red-800' :
                            lead.rating === 'Warm' ? 'bg-orange-100 text-orange-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {lead.rating}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{lead.company}</p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <EnvelopeIcon className="h-3 w-3" />
                          <span>{lead.email}</span>
                        </div>
                        {lead.phone && (
                          <div className="flex items-center space-x-1">
                            <PhoneIcon className="h-3 w-3" />
                            <span>{lead.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-1">
                          <ClockIcon className="h-3 w-3" />
                          <span>{formatDate(lead.created_time)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Source</p>
                      <p className="text-sm font-medium text-gray-900">{lead.lead_source}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'deals' && (
          <div className="space-y-3">
            {deals.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No deals found</p>
            ) : (
              deals.map((deal) => (
                <div key={deal.id} className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900">{deal.deal_name}</h4>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getDealStageColor(deal.stage)}`}>
                          {deal.stage}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{deal.account_name}</p>
                      {deal.contact_name && (
                        <p className="text-xs text-gray-500 mt-1">Contact: {deal.contact_name}</p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <CalendarIcon className="h-3 w-3" />
                          <span>Closes {formatDate(deal.closing_date)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <ArrowTrendingUpIcon className="h-3 w-3" />
                          <span>{deal.probability}% probability</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">${deal.amount.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">Created {formatDate(deal.created_time)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'contacts' && (
          <div className="space-y-3">
            {contacts.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No contacts found</p>
            ) : (
              contacts.map((contact) => (
                <div key={contact.id} className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">
                        {contact.first_name} {contact.last_name}
                      </h4>
                      {contact.title && (
                        <p className="text-sm text-gray-600 mt-1">{contact.title}</p>
                      )}
                      <p className="text-sm text-gray-600">{contact.account_name}</p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <EnvelopeIcon className="h-3 w-3" />
                          <span>{contact.email}</span>
                        </div>
                        {contact.phone && (
                          <div className="flex items-center space-x-1">
                            <PhoneIcon className="h-3 w-3" />
                            <span>{contact.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Added {formatDate(contact.created_time)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}