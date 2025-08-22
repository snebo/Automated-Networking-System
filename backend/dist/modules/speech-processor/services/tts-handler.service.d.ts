import { EventEmitter2 } from '@nestjs/event-emitter';
import { OpenAITTSService } from './openai-tts.service';
import { TwilioService } from '../../telephony/twilio.service';
import { ConfigService } from '@nestjs/config';
export declare class TTSHandlerService {
    private readonly openaiTTS;
    private readonly twilioService;
    private readonly configService;
    private readonly eventEmitter;
    private readonly logger;
    private activeSessions;
    constructor(openaiTTS: OpenAITTSService, twilioService: TwilioService, configService: ConfigService, eventEmitter: EventEmitter2);
    handleGenerateRequest(event: {
        callSid: string;
        text: string;
        priority?: 'low' | 'medium' | 'high';
        voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
        context?: string;
    }): Promise<void>;
    handleSpeakRequest(event: {
        callSid: string;
        text: string;
        priority?: 'low' | 'medium' | 'high';
        voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
        context?: string;
    }): Promise<void>;
    private queueTTSRequest;
    private processNextTTSRequest;
    private playAudioOnCall;
    private escapeForTwiML;
    private finishCurrentRequest;
    handleCallEnded(event: {
        callSid: string;
    }): void;
    handleInterrupt(event: {
        callSid: string;
    }): void;
    isTTSActive(callSid: string): boolean;
    getTTSStatus(callSid: string): {
        isPlaying: boolean;
        queueLength: number;
        currentText?: string;
    };
    getActiveSessions(): string[];
}
