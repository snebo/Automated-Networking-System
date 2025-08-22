import { ConfigService } from '@nestjs/config';
export declare class TwilioService {
    private readonly configService;
    private readonly logger;
    private twilioClient;
    private accountSid;
    private authToken;
    private phoneNumber;
    private isConfigured;
    constructor(configService: ConfigService);
    private ensureConfigured;
    makeCall(to: string): Promise<any>;
    endCall(callSid: string): Promise<void>;
    sendDTMF(callSid: string, digits: string): Promise<void>;
    updateCallWithTwiML(callSid: string, twiml: string): Promise<void>;
    getCallStatus(callSid: string): Promise<any>;
    generateTwiML(text: string): string;
    generateStreamTwiML(streamUrl: string): string;
    generateInitialTwiML(): string;
    generateGatherTwiML(prompt: string, numDigits?: number, timeout?: number): string;
    generatePlayTwiML(audioUrl: string): string;
    generateHangupTwiML(message?: string): string;
    isReady(): boolean;
}
