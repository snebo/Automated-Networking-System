import { Injectable, Logger } from '@nestjs/common';
import { TwilioService } from './twilio.service';
import { CallStatus } from '../../common/interfaces/call.interface';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class TelephonyService {
  private readonly logger = new Logger(TelephonyService.name);
  private activeCalls = new Map<string, any>();

  constructor(
    private readonly twilioService: TwilioService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async initiateCall(phoneNumber: string, scriptId: string, goal?: string, companyName?: string): Promise<string> {
    try {
      this.logger.log(`Initiating call to ${phoneNumber} with script ${scriptId}`);
      if (goal) {
        this.logger.log(`Call goal: ${goal}`);
      }
      if (companyName) {
        this.logger.log(`Company: ${companyName}`);
      }
      
      const call = await this.twilioService.makeCall(phoneNumber);
      
      this.activeCalls.set(call.sid, {
        callSid: call.sid,
        phoneNumber,
        scriptId,
        goal: goal || 'Navigate to customer support',
        companyName: companyName || 'Unknown Company',
        status: CallStatus.INITIATING,
        startTime: new Date(),
      });

      this.eventEmitter.emit('call.initiated', {
        callSid: call.sid,
        phoneNumber,
        scriptId,
        goal: goal || 'Navigate to customer support',
        companyName: companyName || 'Unknown Company',
      });

      return call.sid;
    } catch (error) {
      this.logger.error(`Failed to initiate call: ${error.message}`, error.stack);
      throw error;
    }
  }

  async endCall(callSid: string): Promise<void> {
    try {
      await this.twilioService.endCall(callSid);
      
      const callData = this.activeCalls.get(callSid);
      if (callData) {
        callData.status = CallStatus.COMPLETED;
        callData.endTime = new Date();
        
        this.eventEmitter.emit('call.ended', callData);
        this.activeCalls.delete(callSid);
      }
    } catch (error) {
      this.logger.error(`Failed to end call ${callSid}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async sendDTMF(callSid: string, digits: string): Promise<void> {
    try {
      await this.twilioService.sendDTMF(callSid, digits);
      console.log(`✅ DTMF sent successfully: [${digits}]`);
      
      // Track DTMF send time for waiting state detection
      const callData = this.activeCalls.get(callSid);
      if (callData) {
        callData.lastDTMFTime = new Date();
      }

      this.eventEmitter.emit('dtmf.sent', {
        callSid,
        digits,
        timestamp: new Date(),
      });
    } catch (error) {
      console.log(`❌ DTMF send failed: ${error.message}`);
      this.logger.error(`Failed to send DTMF: ${error.message}`, error.stack);
      throw error;
    }
  }

  getActiveCall(callSid: string): any {
    return this.activeCalls.get(callSid);
  }

  getAllActiveCalls(): any[] {
    return Array.from(this.activeCalls.values());
  }

  handleDTMFReceived(callSid: string, digits: string): void {
    try {
      this.logger.log(`DTMF received for call ${callSid}: ${digits}`);
      
      const callData = this.activeCalls.get(callSid);
      if (callData) {
        // Add to call transcript
        if (!callData.transcript) {
          callData.transcript = [];
        }
        
        callData.transcript.push({
          timestamp: new Date(),
          speaker: 'human',
          text: `[DTMF: ${digits}]`,
          metadata: { type: 'dtmf', digits }
        });
      }

      this.eventEmitter.emit('dtmf.received', {
        callSid,
        digits,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Failed to handle DTMF received: ${error.message}`, error.stack);
    }
  }

  updateCallStatus(callSid: string, status: CallStatus, metadata?: any): void {
    try {
      const callData = this.activeCalls.get(callSid);
      if (callData) {
        const oldStatus = callData.status;
        callData.status = status;
        
        if (metadata) {
          callData.metadata = { ...callData.metadata, ...metadata };
        }

        this.eventEmitter.emit('call.status-updated', {
          callSid,
          oldStatus,
          newStatus: status,
          metadata,
          timestamp: new Date(),
        });

        this.logger.log(`Call ${callSid} status updated: ${oldStatus} -> ${status}`);
      }
    } catch (error) {
      this.logger.error(`Failed to update call status: ${error.message}`, error.stack);
    }
  }

  handleTranscriptionReceived(callSid: string, text: string): void {
    this.logger.log(`Transcription received for call ${callSid}: "${text}"`);
    
    // Emit as if it's from STT for IVR detection
    this.eventEmitter.emit('stt.final', {
      callSid,
      transcript: text,
      confidence: 0.95, // Twilio transcriptions are generally accurate
      timestamp: new Date(),
    });
  }

  // ===== AI ENGINE EVENT HANDLERS =====

  @OnEvent('ai.send_dtmf')
  async handleAISendDTMF(event: { callSid: string; digits: string; reasoning: string }) {
    console.log(`📞 Sending DTMF [${event.digits}] to call ...${event.callSid.slice(-8)}`);
    console.log(`💭 Reason: ${event.reasoning}`);
    
    this.logger.log(`Sending DTMF ${event.digits} to ${event.callSid}`);
    await this.sendDTMF(event.callSid, event.digits);
  }

  @OnEvent('ai.speak')
  async handleAISpeak(event: { callSid: string; text: string; action: string }) {
    this.logger.log(`\n🎤 AI requesting TTS: "${event.text}" for call ${event.callSid}`);
    this.logger.log(`   Action context: ${event.action}`);
    
    // Emit to TTS service
    this.eventEmitter.emit('tts.generate', {
      callSid: event.callSid,
      text: event.text,
      priority: 'high',
      context: event.action,
    });
  }

  @OnEvent('ai.hangup')
  async handleAIHangup(event: { callSid: string; reason: string }) {
    this.logger.log(`\n📞 AI requesting hangup for call ${event.callSid}`);
    this.logger.log(`   Reason: ${event.reason}`);
    
    await this.endCall(event.callSid);
  }

  @OnEvent('call.answered')
  handleCallAnswered(event: { callSid: string; phoneNumber: string }) {
    this.logger.log(`\n📞 Call answered: ${event.callSid} to ${event.phoneNumber}`);
    
    // Get call data to retrieve custom goal and company name
    const callData = this.activeCalls.get(event.callSid);
    const goal = callData?.goal || 'Navigate to customer support';
    const companyName = callData?.companyName || 'Unknown Company';
    
    this.logger.log(`   🎯 Call goal: ${goal}`);
    this.logger.log(`   🏢 Company: ${companyName}`);
    
    // Start AI decision session with custom goal
    this.eventEmitter.emit('ai.start_session', {
      callSid: event.callSid,
      phoneNumber: event.phoneNumber,
      goal: goal,
      companyName: companyName
    });
  }

  @OnEvent('call.ended')
  handleCallEnded(event: { callSid: string }) {
    this.logger.log(`\n📞 Call ended: ${event.callSid}`);
    
    // Notify AI Engine to clean up session
    this.eventEmitter.emit('ai.session_ended', {
      callSid: event.callSid,
    });
  }
}