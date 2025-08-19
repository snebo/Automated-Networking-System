import { Injectable, Logger } from '@nestjs/common';
import { TwilioService } from './twilio.service';
import { CallStatus } from '../../common/interfaces/call.interface';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class TelephonyService {
  private readonly logger = new Logger(TelephonyService.name);
  private activeCalls = new Map<string, any>();

  constructor(
    private readonly twilioService: TwilioService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async initiateCall(phoneNumber: string, scriptId: string): Promise<string> {
    try {
      this.logger.log(`Initiating call to ${phoneNumber} with script ${scriptId}`);
      
      const call = await this.twilioService.makeCall(phoneNumber);
      
      this.activeCalls.set(call.sid, {
        callSid: call.sid,
        phoneNumber,
        scriptId,
        status: CallStatus.INITIATING,
        startTime: new Date(),
      });

      this.eventEmitter.emit('call.initiated', {
        callSid: call.sid,
        phoneNumber,
        scriptId,
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
      this.logger.log(`Sending DTMF digits ${digits} to call ${callSid}`);
      await this.twilioService.sendDTMF(callSid, digits);
      
      this.eventEmitter.emit('dtmf.sent', {
        callSid,
        digits,
        timestamp: new Date(),
      });
    } catch (error) {
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
}