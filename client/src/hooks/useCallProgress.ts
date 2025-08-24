import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface CallProgressEvent {
  callSid: string;
  type: 'call_started' | 'call_failed' | 'transcript' | 'ivr_options' | 'ai_decision' | 'agent_response' | 'call_ended' | 'call_terminated';
  data: {
    text?: string;
    transcript?: string;
    options?: Array<{ key: string; description: string; confidence?: number }>;
    selectedOption?: string;
    reasoning?: string;
    confidence?: number;
    error?: string;
    duration?: number;
    phoneNumber?: string;
    goal?: string;
    companyName?: string;
  };
  timestamp: Date;
}

export const useCallProgress = (callSid?: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [progress, setProgress] = useState<CallProgressEvent[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Connect to the call-progress namespace
    const newSocket = io(`${SOCKET_URL}/call-progress`, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    newSocket.on('connect', () => {
      console.log('Connected to call progress WebSocket');
      setConnected(true);

      // Subscribe to specific call if callSid provided
      if (callSid) {
        newSocket.emit('subscribe-to-call', { callSid });
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from call progress WebSocket');
      setConnected(false);
    });

    // Listen for call progress events
    newSocket.on('call-progress', (event: CallProgressEvent) => {
      console.log('Call progress event:', event);
      
      // Only add if it matches our callSid (or if we're listening to all)
      if (!callSid || event.callSid === callSid) {
        setProgress((prev) => [...prev, event]);
      }
    });

    // Listen for general call updates
    newSocket.on('call-update', (event: CallProgressEvent) => {
      console.log('Call update event:', event);
      
      if (!callSid || event.callSid === callSid) {
        setProgress((prev) => [...prev, event]);
      }
    });

    setSocket(newSocket);

    return () => {
      if (callSid) {
        newSocket.emit('unsubscribe-from-call', { callSid });
      }
      newSocket.close();
    };
  }, [callSid]);

  const getLatestStatus = (): string | null => {
    const statusEvents = progress.filter(e => 
      e.type === 'call_started' || 
      e.type === 'call_ended' || 
      e.type === 'call_terminated' ||
      e.type === 'call_failed'
    );
    
    if (statusEvents.length === 0) return null;
    
    // Sort by timestamp to get the most recent status
    const sortedEvents = statusEvents.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    const latest = sortedEvents[0];
    
    switch (latest.type) {
      case 'call_started':
        return 'in-progress';
      case 'call_ended':
        return 'completed';
      case 'call_terminated':
      case 'call_failed':
        return 'failed';
      default:
        return null;
    }
  };

  const getTranscripts = (): Array<{ speaker: string; text: string; timestamp: Date }> => {
    const transcriptEvents = progress
      .filter(e => e.type === 'transcript' || e.type === 'agent_response')
      .map(e => ({
        speaker: e.type === 'agent_response' ? 'agent' : 'ivr',
        text: e.data.text || e.data.transcript || '',
        timestamp: e.timestamp,
        callSid: e.callSid,
      }));

    // Remove duplicates based on text content and timestamp
    const uniqueTranscripts = transcriptEvents.filter((transcript, index, arr) => {
      return !arr.slice(0, index).some(prev => 
        prev.text === transcript.text && 
        Math.abs(new Date(prev.timestamp).getTime() - new Date(transcript.timestamp).getTime()) < 1000
      );
    });

    // Sort by timestamp (oldest first - top-down approach)
    return uniqueTranscripts.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  };

  const getIVROptions = () => {
    const ivrEvents = progress.filter(e => e.type === 'ivr_options');
    return ivrEvents.length > 0 ? (ivrEvents[ivrEvents.length - 1].data.options || []) : [];
  };

  const getAIDecisions = () => {
    return progress
      .filter(e => e.type === 'ai_decision')
      .map(e => e.data);
  };

  return {
    socket,
    connected,
    progress,
    status: getLatestStatus(),
    transcripts: getTranscripts(),
    ivrOptions: getIVROptions(),
    aiDecisions: getAIDecisions(),
  };
};