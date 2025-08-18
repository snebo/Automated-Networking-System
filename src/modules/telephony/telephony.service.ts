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
}