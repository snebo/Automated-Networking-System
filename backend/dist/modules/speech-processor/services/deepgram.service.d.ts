import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
export declare class DeepgramService {
    private readonly configService;
    private readonly eventEmitter;
    private readonly logger;
    private deepgramClient;
    private activeSessions;
    constructor(configService: ConfigService, eventEmitter: EventEmitter2);
    private initializeDeepgram;
    startSTTSession(callSid: string): Promise<void>;
    processAudioChunk(callSid: string, audioData: Buffer): void;
    stopSTTSession(callSid: string): Promise<void>;
    getActiveSessions(): string[];
    getSessionInfo(callSid: string): any;
    isAvailable(): boolean;
}
