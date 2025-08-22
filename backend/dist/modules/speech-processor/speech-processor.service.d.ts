import { EventEmitter2 } from '@nestjs/event-emitter';
export declare class SpeechProcessorService {
    private readonly eventEmitter;
    private readonly logger;
    private activeStreams;
    constructor(eventEmitter: EventEmitter2);
    startAudioStream(callSid: string, streamSid: string): void;
    processAudioChunk(callSid: string, audioData: Buffer): void;
    stopAudioStream(callSid: string): void;
    getActiveStreams(): string[];
    getStreamInfo(callSid: string): any;
}
