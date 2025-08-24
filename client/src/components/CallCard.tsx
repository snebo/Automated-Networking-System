import React from 'react';
import { Phone, PhoneCall, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp, Bot, Headphones } from 'lucide-react';
import { Business } from '@/types';
import { useCallProgress } from '@/hooks/useCallProgress';
import { formatPhone } from '@/lib/utils';

interface CallCardProps {
  callSid: string;
  business: Business;
  initialStatus: string;
  startTime: Date;
  expanded: boolean;
  onToggleExpanded: () => void;
}

export default function CallCard({ 
  callSid, 
  business, 
  initialStatus, 
  startTime, 
  expanded, 
  onToggleExpanded 
}: CallCardProps) {
  const { status, transcripts, ivrOptions, aiDecisions, connected, progress } = useCallProgress(callSid);
  
  // Use WebSocket status if available, otherwise use initial status
  const currentStatus = status || initialStatus;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'queued':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'ringing':
        return <Phone className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'in-progress':
        return <PhoneCall className="h-4 w-4 text-green-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
      case 'no-answer':
      case 'busy':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'queued':
        return 'bg-yellow-100 text-yellow-800';
      case 'ringing':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-emerald-100 text-emerald-800';
      case 'failed':
      case 'no-answer':
      case 'busy':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDuration = () => {
    if (currentStatus === 'completed' || currentStatus === 'failed') {
      // Try to get actual end time from progress events, otherwise use current time
      const endEvent = [...(progress || [])]
        .reverse()
        .find(e => e.type === 'call_ended' || e.type === 'call_terminated' || e.type === 'call_failed');
      
      const endTime = endEvent ? new Date(endEvent.timestamp) : new Date();
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggleExpanded}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
              <Phone className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{business.name}</h3>
              <p className="text-sm text-gray-500">{formatPhone(business.phoneNumber)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {!connected && currentStatus === 'in-progress' && (
              <span className="text-xs text-orange-600">Reconnecting...</span>
            )}
            <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 ${getStatusColor(currentStatus)}`}>
              {getStatusIcon(currentStatus)}
              {currentStatus.replace('-', ' ')}
            </span>
            {getDuration() && (
              <span className="text-sm text-gray-500">{getDuration()}</span>
            )}
            {expanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-4">
          {/* Call ID */}
          <div className="text-xs text-gray-500 flex items-center justify-between">
            <span>Call ID: {callSid.slice(-8)}</span>
            {/* Show retry count if this is a retry attempt */}
            {callSid.startsWith('retry-') && (
              <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">
                Retry in progress...
              </span>
            )}
          </div>

          {/* IVR Options */}
          {ivrOptions.length > 0 && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <h4 className="font-medium text-sm text-blue-900 mb-2 flex items-center gap-2">
                <Bot className="h-4 w-4" />
                IVR Menu Detected
              </h4>
              <div className="space-y-1">
                {ivrOptions.map((option, idx) => (
                  <div key={idx} className="text-xs text-blue-700">
                    Press [{option.key}] → {option.description}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Decisions */}
          {aiDecisions.length > 0 && (
            <div className="bg-purple-50 p-3 rounded-lg">
              <h4 className="font-medium text-sm text-purple-900 mb-2">AI Decisions</h4>
              <div className="space-y-2">
                {aiDecisions.map((decision, idx) => (
                  <div key={idx} className="text-xs">
                    <div className="font-medium text-purple-800">
                      Selected: [{decision.selectedOption || 'N/A'}]
                    </div>
                    <div className="text-purple-600 mt-1">
                      {decision.reasoning || 'Processing...'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transcript */}
          {transcripts.length > 0 && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="font-medium text-sm text-gray-900 mb-2 flex items-center gap-2">
                <Headphones className="h-4 w-4" />
                Transcript
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {transcripts.map((entry, idx) => (
                  <div 
                    key={idx} 
                    className={`text-xs p-2 rounded ${
                      entry.speaker === 'agent' 
                        ? 'bg-blue-100 text-blue-900 ml-4' 
                        : 'bg-white text-gray-700 mr-4'
                    }`}
                  >
                    <div className="font-medium text-xs mb-1">
                      {entry.speaker === 'agent' ? '🤖 Agent' : '📞 IVR'}
                    </div>
                    {entry.text}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No activity yet */}
          {transcripts.length === 0 && ivrOptions.length === 0 && aiDecisions.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <Headphones className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Waiting for call activity...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}