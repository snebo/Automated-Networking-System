'use client';

import { useState, useEffect } from 'react';
import { Phone, User, Building2, Clock, CheckCircle, XCircle, Eye, Download, Filter, Users, Target, TrendingUp, Calendar } from 'lucide-react';
import { telephonyApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { formatPhone } from '@/lib/utils';
import AnimatedSection from '@/components/AnimatedSection';

interface VerifiedContact {
  id: string;
  name: string;
  profession: string;
  department?: string;
  extension?: string;
  directPhone?: string;
  email?: string;
}

interface CalledBusiness {
  id: string;
  name: string;
  phone?: string | import('@/types').PhoneNumber;
  category?: string;
  address?: string;
  callStatus: 'completed' | 'failed' | 'no-answer' | 'busy';
  callDate: Date;
  callDuration?: number;
  verifiedPhone: string;
  contacts: VerifiedContact[];
  notes?: string;
}

export default function WorkflowPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedBusiness, setExpandedBusiness] = useState<string | null>(null);

  const { data: calledBusinesses = [], isLoading } = useQuery({
    queryKey: ['workflow', 'called-businesses'],
    queryFn: telephonyApi.getCalledBusinesses,
  });

  const filteredBusinesses = calledBusinesses.filter((business: CalledBusiness) => {
    const matchesStatus = statusFilter === 'all' || business.callStatus === statusFilter;
    const matchesSearch = business.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         formatPhone(business.phone).includes(searchTerm) ||
                         business.contacts.some(c => 
                           c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           c.profession.toLowerCase().includes(searchTerm.toLowerCase())
                         );
    return matchesStatus && matchesSearch;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'no-answer':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'busy':
        return <Phone className="h-4 w-4 text-orange-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'no-answer':
        return 'bg-yellow-100 text-yellow-800';
      case 'busy':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const exportToCSV = () => {
    const headers = ['Business Name', 'Phone', 'Status', 'Call Date', 'Duration', 'Contacts', 'Notes'];
    const rows = filteredBusinesses.map((business: CalledBusiness) => [
      business.name,
      formatPhone(business.phone),
      business.callStatus,
      new Date(business.callDate).toLocaleDateString(),
      business.callDuration ? `${business.callDuration}s` : '',
      business.contacts.map(c => `${c.name} (${c.profession})`).join('; '),
      business.notes || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map((field: string) => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-results-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const completedCalls = filteredBusinesses.filter((b: CalledBusiness) => b.callStatus === 'completed').length;
  const totalContacts = filteredBusinesses.reduce((sum: number, b: CalledBusiness) => sum + b.contacts.length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-purple-900 py-12">
        <div className="container mx-auto px-4">
          <AnimatedSection animation="fadeInUp">
            <div className="text-center">
              <div className="inline-flex items-center px-4 py-2 bg-white/10 rounded-full mb-4">
                <Target className="h-4 w-4 text-purple-400 mr-2" />
                <span className="text-white text-sm font-medium">Workflow Results</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Call Results & Contacts
              </h1>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                Verified contacts and extracted information from completed calls
              </p>
            </div>
          </AnimatedSection>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <AnimatedSection className="mb-8" animation="fadeInUp" delay={100}>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center">
                <div className="bg-blue-100 rounded-lg p-3 mr-4">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{filteredBusinesses.length}</p>
                  <p className="text-gray-600 text-sm">Total Businesses</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center">
                <div className="bg-green-100 rounded-lg p-3 mr-4">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{completedCalls}</p>
                  <p className="text-gray-600 text-sm">Successful Calls</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center">
                <div className="bg-purple-100 rounded-lg p-3 mr-4">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{totalContacts}</p>
                  <p className="text-gray-600 text-sm">Contacts Found</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center">
                <div className="bg-orange-100 rounded-lg p-3 mr-4">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {filteredBusinesses.length > 0 ? Math.round((completedCalls / filteredBusinesses.length) * 100) : 0}%
                  </p>
                  <p className="text-gray-600 text-sm">Success Rate</p>
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Filters and Controls */}
        <AnimatedSection className="mb-8" animation="fadeInUp" delay={200}>
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="Search businesses or contacts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="no-answer">No Answer</option>
                  <option value="busy">Busy</option>
                </select>
              </div>
              
              <button
                onClick={exportToCSV}
                disabled={filteredBusinesses.length === 0}
                className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Results
              </button>
            </div>
          </div>
        </AnimatedSection>

        {/* Results */}
        <AnimatedSection animation="fadeInUp" delay={300}>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-purple-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-purple-500 rounded-xl p-3 mr-4">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Workflow Results</h2>
                    <p className="text-gray-600 text-sm">Called businesses and extracted contacts</p>
                  </div>
                </div>
                <span className="bg-purple-100 text-purple-800 text-sm font-medium px-3 py-1 rounded-full">
                  {filteredBusinesses.length} results
                </span>
              </div>
            </div>

            <div className="p-6">
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-6">
                    <Clock className="h-8 w-8 animate-spin text-purple-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading results...</h3>
                  <p className="text-gray-600">Fetching workflow data</p>
                </div>
              ) : filteredBusinesses.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-6">
                    <Building2 className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No results found</h3>
                  <p className="text-gray-600">Try adjusting your search or filters</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredBusinesses.map((business: CalledBusiness) => (
                    <div key={business.id} className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            {getStatusIcon(business.callStatus)}
                            <div>
                              <div className="font-semibold text-gray-900">{business.name}</div>
                              <div className="text-sm text-gray-600 flex items-center space-x-4">
                                <span className="flex items-center">
                                  <Phone className="h-3 w-3 mr-1" />
                                  {formatPhone(business.phone)}
                                </span>
                                <span className="flex items-center">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {new Date(business.callDate).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(business.callStatus)}`}>
                              {business.callStatus}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                              {business.contacts.length} contacts
                            </span>
                            <button
                              onClick={() => setExpandedBusiness(
                                expandedBusiness === business.id ? null : business.id
                              )}
                              className="text-gray-500 hover:text-gray-700 transition-colors"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {expandedBusiness === business.id && (
                        <div className="p-4 border-t border-gray-200 bg-white">
                          <div className="grid lg:grid-cols-2 gap-6">
                            {/* Business Details */}
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-3">Business Information</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Category:</span>
                                  <span className="text-gray-900">{business.category || 'Not specified'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Verified Phone:</span>
                                  <span className="text-gray-900">{business.verifiedPhone}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Call Duration:</span>
                                  <span className="text-gray-900">
                                    {business.callDuration ? `${business.callDuration}s` : 'N/A'}
                                  </span>
                                </div>
                                {business.notes && (
                                  <div className="mt-3">
                                    <span className="text-gray-600 text-sm">Notes:</span>
                                    <p className="text-gray-900 mt-1 p-2 bg-gray-50 rounded text-sm">
                                      {business.notes}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Contacts */}
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-3">
                                Extracted Contacts ({business.contacts.length})
                              </h4>
                              {business.contacts.length === 0 ? (
                                <p className="text-gray-500 text-sm italic">No contacts extracted</p>
                              ) : (
                                <div className="space-y-3">
                                  {business.contacts.map((contact, index) => (
                                    <div key={contact.id || index} className="p-3 bg-blue-50 rounded-lg">
                                      <div className="flex items-start justify-between">
                                        <div>
                                          <div className="font-medium text-gray-900">{contact.name}</div>
                                          <div className="text-sm text-blue-700">{contact.profession}</div>
                                          {contact.department && (
                                            <div className="text-xs text-gray-600 mt-1">{contact.department}</div>
                                          )}
                                        </div>
                                        <User className="h-4 w-4 text-blue-500" />
                                      </div>
                                      <div className="mt-2 space-y-1 text-xs text-gray-600">
                                        {contact.directPhone && (
                                          <div>Direct: {contact.directPhone}</div>
                                        )}
                                        {contact.extension && (
                                          <div>Ext: {contact.extension}</div>
                                        )}
                                        {contact.email && (
                                          <div>Email: {contact.email}</div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}