'use client';

import AnimatedSection from '@/components/AnimatedSection';
import FloatingElements from '@/components/FloatingElements';
import { scraperApi } from '@/lib/api';
import { formatAddress, formatPhone } from '@/lib/utils';
import { Business } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Building2,
  Database,
  Download,
  Eye,
  Filter,
  Hash,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Settings,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

function ConfirmationModal({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
        <div className="p-8">
          <div className="flex items-start">
            <div
              className={`flex-shrink-0 ${
                danger ? 'text-red-600' : 'text-blue-600'
              } bg-gray-50 rounded-xl p-3`}
            >
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="ml-4 w-full">
              <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
              <p className="text-gray-600 mb-8 leading-relaxed">{message}</p>
              <div className="flex gap-4 justify-end">
                <button
                  onClick={onCancel}
                  className="px-6 py-3 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors duration-300"
                >
                  {cancelText}
                </button>
                <button
                  onClick={onConfirm}
                  className={`px-6 py-3 text-sm font-semibold text-white rounded-xl transition-all duration-300 transform hover:scale-105 ${
                    danger
                      ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-red-200'
                      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-200'
                  } shadow-lg`}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ScrapingPage() {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [maxResults, setMaxResults] = useState(50);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    businessId: string;
    businessName: string;
  }>({
    isOpen: false,
    businessId: '',
    businessName: '',
  });
  const queryClient = useQueryClient();

  const {
    data: businesses = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['businesses'],
    queryFn: scraperApi.getScrapedBusinesses,
  });


  const scrapeMutation = useMutation({
    mutationFn: ({ query, location, maxResults }: { query: string; location: string; maxResults: number }) =>
      scraperApi.scrapeBusinesses(query, location, maxResults),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      setQuery('');
      setLocation('');
      setMaxResults(50);
    },
  });

  const enrichMutation = useMutation({
    mutationFn: (businessId: string) => scraperApi.enrichBusinessData(businessId),
    onSuccess: (data, businessId) => {
      console.log('Enrich successful for business:', businessId);
      setEnrichingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(businessId);
        return newSet;
      });
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
    },
    onError: (error, businessId) => {
      console.error('Enrich failed:', error);
      setEnrichingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(businessId);
        return newSet;
      });
      alert(`Failed to enrich business: ${error.message || 'Unknown error'}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (businessId: string) => {
      console.log('Delete mutation function called with ID:', businessId);
      return scraperApi.deleteBusiness(businessId);
    },
    onSuccess: (data, businessId) => {
      console.log('Delete successful:', data.message);
      setDeletingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(businessId);
        return newSet;
      });
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
    },
    onError: (error, businessId) => {
      console.error('Delete failed:', error);
      setDeletingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(businessId);
        return newSet;
      });
      alert(`Failed to delete business: ${error.message || 'Unknown error'}`);
    },
  });

  const handleScrape = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && location.trim()) {
      scrapeMutation.mutate({ 
        query: query.trim(), 
        location: location.trim(), 
        maxResults 
      });
    }
  };

  const handleEnrich = (businessId: string) => {
    setEnrichingIds((prev) => new Set(prev).add(businessId));
    enrichMutation.mutate(businessId);
  };

  const handleDelete = (businessId: string, businessName: string) => {
    setDeleteConfirmation({
      isOpen: true,
      businessId,
      businessName,
    });
  };

  const confirmDelete = () => {
    const { businessId } = deleteConfirmation;
    setDeletingIds((prev) => new Set(prev).add(businessId));
    deleteMutation.mutate(businessId);
    setDeleteConfirmation({ isOpen: false, businessId: '', businessName: '' });
  };

  const cancelDelete = () => {
    setDeleteConfirmation({ isOpen: false, businessId: '', businessName: '' });
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Phone', 'Address', 'Website', 'Industry', 'Services'];
    const rows = businesses.map((business: Business) => [
      business.name,
      formatPhone(business.phoneNumber),
      formatAddress(business.address),
      business.website || '',
      business.industry || '',
      Array.isArray(business.services) ? business.services.join(', ') : '',
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((field: string) => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `businesses-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 custom-scrollbar overflow-hidden">
      <FloatingElements count={15} />

      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-pattern-dots opacity-10"></div>
        <div className="container mx-auto px-4 relative z-10">
          <AnimatedSection className="text-center mb-12" animation="fadeInUp">
            <div className="inline-flex items-center px-4 py-2 bg-white/10 rounded-full mb-6 glass-morphism">
              <Database className="h-4 w-4 text-blue-400 mr-2" />
              <span className="text-white text-sm font-medium">Intelligent Data Collection</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              <span className="block mb-2">Business</span>
              <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient-shift pb-2">
                Scraping Engine
              </span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Advanced ML-powered data extraction with intelligent filtering, phone verification,
              and real-time quality assessment for enterprise-grade accuracy.
            </p>
          </AnimatedSection>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12 relative z-10">
        {/* Search Form */}
        <AnimatedSection className="mb-12" animation="fadeInUp" delay={200}>
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/20">
            <div className="flex items-center mb-6">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-3 mr-4">
                <Search className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Intelligent Search</h2>
                <p className="text-gray-600">
                  AI-powered business discovery with quality filtering
                </p>
              </div>
            </div>

            <form onSubmit={handleScrape} className="grid md:grid-cols-4 gap-4">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Business type (e.g., 'dental clinic', 'restaurant')"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-300 text-gray-900 placeholder-gray-500"
                  disabled={scrapeMutation.isPending}
                />
              </div>

              <div className="relative group">
                <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Location (e.g., 'San Francisco, CA')"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all duration-300 text-gray-900 placeholder-gray-500"
                  disabled={scrapeMutation.isPending}
                />
              </div>

              <div className="relative group">
                <Hash className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-green-500 transition-colors" />
                <input
                  type="number"
                  min="1"
                  max="200"
                  placeholder="Max results (e.g., 50)"
                  value={maxResults}
                  onChange={(e) => setMaxResults(parseInt(e.target.value) || 50)}
                  className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all duration-300 text-gray-900 placeholder-gray-500"
                  disabled={scrapeMutation.isPending}
                />
              </div>

              <button
                type="submit"
                disabled={scrapeMutation.isPending || !query.trim() || !location.trim()}
                className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-semibold shadow-lg"
              >
                {scrapeMutation.isPending ? (
                  <div className="flex items-center justify-center">
                    <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                    Searching...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <Search className="h-5 w-5 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                    Discover Businesses
                  </div>
                )}
              </button>
            </form>

            {/* Filter Info */}
            <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div className="flex items-start">
                <Filter className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-blue-900 mb-1">
                    Smart Filtering Active
                  </h3>
                  <p className="text-xs text-blue-700">
                    Phone verification required • Content quality filtering • Article/blog exclusion
                    • Real-time deduplication
                  </p>
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Error Display */}
        {scrapeMutation.error && (
          <AnimatedSection animation="fadeInUp">
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 mb-8 shadow-lg">
              <div className="flex items-center">
                <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
                <div>
                  <h3 className="text-lg font-semibold text-red-800 mb-1">Search Error</h3>
                  <p className="text-red-700">
                    {scrapeMutation.error instanceof Error
                      ? scrapeMutation.error.message
                      : 'Something went wrong during the search'}
                  </p>
                </div>
              </div>
            </div>
          </AnimatedSection>
        )}

        {/* Results Section */}
        <AnimatedSection animation="fadeInUp" delay={400}>
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
            {/* Header */}
            <div className="px-8 py-6 bg-gradient-to-r from-slate-50 to-blue-50 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-3 mr-4">
                    <Building2 className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      Discovered Businesses ({businesses.length})
                    </h2>
                    <p className="text-gray-600">Verified and filtered business data</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={exportToCSV}
                    disabled={businesses.length === 0}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Export CSV
                  </button>
                  <button
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['businesses'] })}
                    className="inline-flex items-center px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 font-semibold"
                  >
                    <RefreshCw className="h-5 w-5 mr-2" />
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            {isLoading ? (
              <div className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-6">
                  <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading businesses...</h3>
                <p className="text-gray-600">Analyzing and filtering results</p>
              </div>
            ) : error ? (
              <div className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold text-red-900 mb-2">
                  Error loading businesses
                </h3>
                <p className="text-red-600">Please try refreshing the page</p>
              </div>
            ) : businesses.length === 0 ? (
              <div className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-6">
                  <Search className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No businesses found</h3>
                <p className="text-gray-600">Try adjusting your search criteria or location</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-slate-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                        Business
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                        Industry
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider w-48">
                        Services
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {businesses.map((business: Business) => (
                      <tr
                        key={business.id}
                        className="hover:bg-blue-50/50 transition-colors duration-200"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-semibold text-gray-900 text-lg">
                              {business.name}
                            </div>
                            {business.website && (
                              <a
                                href={business.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 text-sm hover:underline transition-colors"
                              >
                                {business.website}
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center text-gray-900 font-medium">
                            <Phone className="h-4 w-4 mr-2 text-green-600" />
                            {formatPhone(business.phoneNumber)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
                          <div className="flex items-start">
                            <MapPin className="h-4 w-4 mr-2 text-red-500 mt-0.5 flex-shrink-0" />
                            <div className="break-words">
                              {formatAddress(business.address) || (
                                <span className="text-gray-400 text-xs italic">
                                  No address available
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            {business.industry}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {business.services &&
                          Array.isArray(business.services) &&
                          business.services.length > 0 ? (
                            <div className="max-w-48">
                              <div
                                className="truncate cursor-help"
                                title={business.services.join(', ')}
                              >
                                {business.services.slice(0, 2).join(', ')}
                                {business.services.length > 2
                                  ? ` +${business.services.length - 2} more`
                                  : ''}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs italic">No services listed</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEnrich(business.id)}
                              disabled={enrichingIds.has(business.id) || business.enriched}
                              className="inline-flex items-center px-3 py-2 text-xs font-semibold bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-md"
                            >
                              {business.enriched ? (
                                <>
                                  <Eye className="h-3 w-3 mr-1" />
                                  Enriched
                                </>
                              ) : enrichingIds.has(business.id) ? (
                                <>
                                  <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                                  Processing
                                </>
                              ) : (
                                <>
                                  <Settings className="h-3 w-3 mr-1" />
                                  Enrich
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleDelete(business.id, business.name)}
                              disabled={deletingIds.has(business.id)}
                              className="inline-flex items-center px-3 py-2 text-xs font-semibold bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-md"
                              title="Delete business"
                            >
                              {deletingIds.has(business.id) ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </AnimatedSection>
      </div>

      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        title="Delete Business"
        message={`Are you sure you want to delete "${deleteConfirmation.businessName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        danger={true}
      />
    </div>
  );
}
