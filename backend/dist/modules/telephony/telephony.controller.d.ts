import { TelephonyService } from './telephony.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InitiateCallDto } from './dto/initiate-call.dto';
import { SendDTMFDto } from './dto/send-dtmf.dto';
export declare class TelephonyController {
    private readonly telephonyService;
    private readonly eventEmitter;
    private readonly logger;
    private waitingCalls;
    private humanConversationCalls;
    constructor(telephonyService: TelephonyService, eventEmitter: EventEmitter2);
    initiateCall(dto: InitiateCallDto): Promise<{
        callSid: string;
    }>;
    endCall(callSid: string): Promise<void>;
    sendDTMF(callSid: string, dto: SendDTMFDto): Promise<{
        success: boolean;
    }>;
    getActiveCalls(): Promise<any[]>;
    getCallStatus(callSid: string): Promise<any>;
    handleWebhook(body: any): Promise<string>;
    handleStatusCallback(body: any): Promise<{
        received: boolean;
    }>;
    handleMediaStream(body: any): Promise<string>;
    handleRecordingCallback(body: any): Promise<string>;
    handleGatherCallback(body: any): Promise<string>;
    private isCallInWaitingState;
    handleTranscriptionCallback(body: any): Promise<{
        received: boolean;
    }>;
    private mapTwilioStatus;
}
