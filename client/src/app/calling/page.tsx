'use client';

import { useState } from 'react';
import { Phone, PhoneCall, Headphones, Bot, Users } from 'lucide-react';
import { telephonyApi, scraperApi, conversationApi } from '@/lib/api';
import { Business, TranscriptEntry, IVRDecision } from '@/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatPhone, getPhoneForCall } from '@/lib/utils';
import AnimatedSection from '@/components/AnimatedSection';
import CallCardComponent from '@/components/CallCard';

interface CallCard {
  callSid: string;
  business: Business;
  status: 'queued' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'no-answer' | 'busy';
  startTime: Date;
  duration?: number;
  transcript: TranscriptEntry[];
  ivrDecisions: IVRDecision[];
  expanded: boolean;
}

export default function CallingPage() {
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [activeCalls, setActiveCalls] = useState<CallCard[]>([]);
  const [script, setScript] = useState('');
  const [goal, setGoal] = useState('');
  const queryClient = useQueryClient();

  const { data: businesses = [], isLoading: businessesLoading } = useQuery({
    queryKey: ['businesses'],
    queryFn: scraperApi.getScrapedBusinesses,
  });

  const initiateCallMutation = useMutation({
    mutationFn: ({ phoneNumber, scriptId, goal, companyName }: { phoneNumber: string; scriptId?: string; goal?: string; companyName?: string }) =>
      telephonyApi.initiateCall(phoneNumber, scriptId, goal, companyName),
    onSuccess: (data) => {
      if (selectedBusiness) {
        const newCall: CallCard = {
          callSid: data.callSid,
          business: selectedBusiness,
          status: 'queued',
          startTime: new Date(),
          transcript: [],
          ivrDecisions: [],
          expanded: true,
        };
        setActiveCalls(prev => [newCall, ...prev]);
      }
      queryClient.invalidateQueries({ queryKey: ['calls'] });
    },
  });

  const testHumanConversationMutation = useMutation({
    mutationFn: ({ phoneNumber, goal }: { phoneNumber: string; script: string; goal: string }) =>
      conversationApi.testHumanConversation(phoneNumber, '', goal),
    onSuccess: (data) => {
      if (selectedBusiness) {
        const newCall: CallCard = {
          callSid: data.callSid,
          business: selectedBusiness,
          status: 'in-progress',
          startTime: new Date(),
          transcript: [],
          ivrDecisions: [],
          expanded: true,
        };
        setActiveCalls(prev => [newCall, ...prev]);
      }
      queryClient.invalidateQueries({ queryKey: ['calls'] });
    },
  });

  const handleCall = () => {
    if (selectedBusiness && selectedBusiness.phoneNumber) {
      const phoneNumber = getPhoneForCall(selectedBusiness.phoneNumber);
      if (phoneNumber) {
        initiateCallMutation.mutate({ 
          phoneNumber,
          scriptId: undefined,
          goal: goal || undefined,
          companyName: selectedBusiness.name
        });
      }
    }
  };

  const handleTestConversation = () => {
    if (selectedBusiness && selectedBusiness.phoneNumber && goal) {
      const phoneNumber = getPhoneForCall(selectedBusiness.phoneNumber);
      if (phoneNumber) {
        testHumanConversationMutation.mutate({ phoneNumber, script, goal });
      }
    }
  };

  const toggleCallExpanded = (callSid: string) => {
    setActiveCalls(prev => prev.map(call => 
      call.callSid === callSid ? { ...call, expanded: !call.expanded } : call
    ));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-blue-900 py-12">
        <div className="container mx-auto px-4">
          <AnimatedSection animation="fadeInUp">
            <div className="text-center">
              <div className="inline-flex items-center px-4 py-2 bg-white/10 rounded-full mb-4">
                <Headphones className="h-4 w-4 text-blue-400 mr-2" />
                <span className="text-white text-sm font-medium">AI Call Management</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Call Management Center
              </h1>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                Initiate and monitor AI-powered calls with real-time progress tracking
              </p>
            </div>
          </AnimatedSection>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Business Selection */}
          <div className="lg:col-span-1">
            <AnimatedSection animation="fadeInLeft">
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center mb-6">
                  <div className="bg-blue-500 rounded-xl p-3 mr-4">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Select Business</h2>
                    <p className="text-gray-600 text-sm">Choose a business to call</p>
                  </div>
                </div>

                {businessesLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                    <p className="text-gray-600">Loading businesses...</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {businesses.map((business: Business) => (
                      <div
                        key={business.id}
                        onClick={() => setSelectedBusiness(business)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 ${
                          selectedBusiness?.id === business.id
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="font-semibold text-gray-900 mb-1">{business.name}</div>
                        <div className="text-sm text-gray-600 flex items-center mb-2">
                          <Phone className="h-3 w-3 mr-1" />
                          {formatPhone(business.phoneNumber)}
                        </div>
                        {business.industry && (
                          <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                            {business.industry}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Call Controls */}
                {selectedBusiness && (
                  <AnimatedSection className="mt-6 p-4 bg-gray-50 rounded-xl" animation="fadeInUp">
                    <h3 className="font-semibold text-gray-900 mb-3">Call Options</h3>
                    
                    <div className="space-y-3 mb-4">
                      <textarea
                        placeholder="Enter conversation script (optional)"
                        value={script}
                        onChange={(e) => setScript(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                        rows={3}
                      />
                      <input
                        type="text"
                        placeholder="Conversation goal (optional)"
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <button
                        onClick={handleCall}
                        disabled={initiateCallMutation.isPending}
                        className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold transition-colors"
                      >
                        <PhoneCall className="h-4 w-4 mr-2" />
                        {initiateCallMutation.isPending ? 'Initiating...' : 'Start Call'}
                      </button>
                      
                      <button
                        onClick={handleTestConversation}
                        disabled={testHumanConversationMutation.isPending || !script || !goal}
                        className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold transition-colors"
                      >
                        <Bot className="h-4 w-4 mr-2" />
                        {testHumanConversationMutation.isPending ? 'Starting...' : 'Test Conversation'}
                      </button>
                    </div>
                  </AnimatedSection>
                )}
              </div>
            </AnimatedSection>
          </div>

          {/* Active Calls */}
          <div className="lg:col-span-2">
            <AnimatedSection animation="fadeInRight">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-slate-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="bg-green-500 rounded-xl p-3 mr-4">
                        <PhoneCall className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">Active Calls</h2>
                        <p className="text-gray-600 text-sm">Monitor ongoing conversations</p>
                      </div>
                    </div>
                    <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                      {activeCalls.length} calls
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  {activeCalls.length === 0 ? (
                    <div className="text-center py-12">
                      <PhoneCall className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Calls</h3>
                      <p className="text-gray-600">Select a business and start a call to see progress here</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activeCalls.map((call) => (
                        <CallCardComponent
                          key={call.callSid}
                          callSid={call.callSid}
                          business={call.business}
                          initialStatus={call.status}
                          startTime={call.startTime}
                          expanded={call.expanded}
                          onToggleExpanded={() => toggleCallExpanded(call.callSid)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </div>
    </div>
  );
}