import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

export interface CallProgressEvent {
  callSid: string;
  type: 'call_started' | 'call_failed' | 'transcript' | 'ivr_options' | 'ai_decision' | 'agent_response' | 'call_ended' | 'call_terminated';
  data: any;
  timestamp: Date;
}

@Injectable()
export class CallProgressService {
  private readonly logger = new Logger('CallProgress');
  private callProgress = new Map<string, CallProgressEvent[]>();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  private logAndEmit(event: CallProgressEvent): void {
    // Store progress
    if (!this.callProgress.has(event.callSid)) {
      this.callProgress.set(event.callSid, []);
    }
    this.callProgress.get(event.callSid)!.push(event);

    // Clean logging to console
    const callId = event.callSid.slice(-8);
    
    switch (event.type) {
      case 'call_started':
        this.logger.log(`📞 CALL STARTED | ${callId} → ${event.data.phoneNumber}`);
        this.logger.log(`🎯 Goal: ${event.data.goal}`);
        this.logger.log(`🏢 Company: ${event.data.companyName || 'Unknown'}`);
        break;
        
      case 'call_failed':
        this.logger.error(`❌ CALL FAILED | ${callId} - ${event.data.error}`);
        break;
        
      case 'transcript':
        this.logger.log(`🎤 CALLER SAYS | ${callId} - "${event.data.text}"`);
        break;
        
      case 'ivr_options':
        this.logger.log(`📋 IVR OPTIONS | ${callId} - ${event.data.options.length} options detected`);
        event.data.options.forEach((option: any, index: number) => {
          this.logger.log(`   ${index + 1}. Press [${option.key}] → ${option.description}`);
        });
        break;
        
      case 'ai_decision':
        this.logger.log(`🤖 AI DECISION | ${callId} - Press [${event.data.selectedOption}]`);
        this.logger.log(`💭 Reasoning: ${event.data.reasoning}`);
        break;
        
      case 'agent_response':
        this.logger.log(`🎙️ AGENT RESPONSE | ${callId} - "${event.data.text}"`);
        break;
        
      case 'call_ended':
        this.logger.log(`✅ CALL ENDED | ${callId} - Duration: ${event.data.duration}s`);
        break;
        
      case 'call_terminated':
        this.logger.warn(`⚠️ CALL TERMINATED | ${callId} - ${event.data.reason}`);
        break;
    }

    // Emit to frontend
    this.eventEmitter.emit('call.progress', event);
  }

  @OnEvent('call.initiated')
  handleCallStarted(data: any) {
    this.logAndEmit({
      callSid: data.callSid,
      type: 'call_started',
      data,
      timestamp: new Date()
    });
  }

  @OnEvent('call.failed')
  handleCallFailed(data: any) {
    this.logAndEmit({
      callSid: data.callSid,
      type: 'call_failed',
      data,
      timestamp: new Date()
    });
  }

  @OnEvent('stt.final')
  handleTranscript(data: any) {
    this.logAndEmit({
      callSid: data.callSid,
      type: 'transcript',
      data: { text: data.transcript, confidence: data.confidence },
      timestamp: new Date()
    });
  }

  @OnEvent('ivr.menu_detected')
  handleIVROptions(data: any) {
    this.logAndEmit({
      callSid: data.callSid,
      type: 'ivr_options',
      data: { options: data.options },
      timestamp: new Date()
    });
  }

  @OnEvent('ai.decision_made')
  handleAIDecision(data: any) {
    this.logAndEmit({
      callSid: data.callSid,
      type: 'ai_decision',
      data: data.decision,
      timestamp: new Date()
    });
  }

  @OnEvent('ai.speak')
  handleAgentResponse(data: any) {
    this.logAndEmit({
      callSid: data.callSid,
      type: 'agent_response',
      data: { text: data.text },
      timestamp: new Date()
    });
  }

  @OnEvent('call.ended')
  handleCallEnded(data: any) {
    const startTime = this.callProgress.get(data.callSid)?.[0]?.timestamp;
    const duration = startTime ? Math.round((Date.now() - startTime.getTime()) / 1000) : 0;
    
    this.logAndEmit({
      callSid: data.callSid,
      type: 'call_ended',
      data: { duration },
      timestamp: new Date()
    });

    // Clean up after 24 hours
    setTimeout(() => {
      this.callProgress.delete(data.callSid);
    }, 24 * 60 * 60 * 1000);
  }

  @OnEvent('call.terminated')
  handleCallTerminated(data: any) {
    this.logAndEmit({
      callSid: data.callSid,
      type: 'call_terminated',
      data: { reason: data.reason },
      timestamp: new Date()
    });
  }

  // Get call progress for frontend
  getCallProgress(callSid: string): CallProgressEvent[] {
    return this.callProgress.get(callSid) || [];
  }

  // Get all active calls progress
  getAllCallsProgress(): Record<string, CallProgressEvent[]> {
    const result: Record<string, CallProgressEvent[]> = {};
    this.callProgress.forEach((progress, callSid) => {
      result[callSid] = progress;
    });
    return result;
  }
}