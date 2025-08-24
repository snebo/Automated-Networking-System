import { TwilioService } from './twilio.service';
import { CallStatus } from '../../common/interfaces/call.interface';
import { EventEmitter2 } from '@nestjs/event-emitter';
export declare class TelephonyService {
    private readonly twilioService;
    private readonly eventEmitter;
    private readonly logger;
    private activeCalls;
    private processedTranscripts;
    constructor(twilioService: TwilioService, eventEmitter: EventEmitter2);
    initiateCall(phoneNumber: string, scriptId?: string, goal?: string, companyName?: string): Promise<string>;
    endCall(callSid: string): Promise<void>;
    sendDTMF(callSid: string, digits: string): Promise<void>;
    getActiveCall(callSid: string): any;
    getAllActiveCalls(): any[];
    handleDTMFReceived(callSid: string, digits: string): void;
    updateCallStatus(callSid: string, status: CallStatus, metadata?: any): void;
    handleTranscriptionReceived(callSid: string, text: string): void;
    handleGetSession(event: {
        callSid: string;
        callback: (session: any) => void;
    }): void;
    handleIVRMenuDetected(event: any): void;
    handleAIDecisionMade(event: any): void;
    handleAISendDTMF(event: {
        callSid: string;
        digits: string;
        reasoning: string;
    }): Promise<void>;
    handleAISpeak(event: {
        callSid: string;
        text: string;
        action: string;
    }): Promise<void>;
    handleAIHangup(event: {
        callSid: string;
        reason: string;
    }): Promise<void>;
    handleCallAnswered(event: {
        callSid: string;
        phoneNumber: string;
    }): void;
    handleCallEnded(event: {
        callSid: string;
    }): void;
}
