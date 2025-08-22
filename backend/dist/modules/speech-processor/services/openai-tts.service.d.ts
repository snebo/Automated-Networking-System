import { ConfigService } from '@nestjs/config';
export interface TTSOptions {
    voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
    speed?: number;
    model?: 'tts-1' | 'tts-1-hd';
}
export declare class OpenAITTSService {
    private readonly configService;
    private readonly logger;
    private openaiClient;
    private isConfigured;
    constructor(configService: ConfigService);
    private initializeOpenAI;
    generateSpeech(text: string, options?: TTSOptions): Promise<Buffer>;
    generateSpeechToFile(text: string, filePath: string, options?: TTSOptions): Promise<string>;
    generateSpeechStream(text: string, options?: TTSOptions): Promise<ReadableStream<Uint8Array> | null>;
    isAvailable(): boolean;
    cleanupFile(filePath: string): void;
}
