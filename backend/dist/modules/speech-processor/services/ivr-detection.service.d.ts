import { EventEmitter2 } from '@nestjs/event-emitter';
interface IVROption {
    key: string;
    description: string;
    confidence: number;
}
export declare class IVRDetectionService {
    private readonly eventEmitter;
    private readonly logger;
    private readonly ivrPatterns;
    private readonly departmentKeywords;
    constructor(eventEmitter: EventEmitter2);
    handleFinalTranscript(event: {
        callSid: string;
        transcript: string;
        confidence: number;
        timestamp: Date;
    }): void;
    private detectIVRMenu;
    private isVoicemailPrompt;
    private normalizeIVRText;
    private isLikelyIVRMenu;
    private cleanDescription;
    private calculateOptionConfidence;
    private calculateMenuConfidence;
    private deduplicateOptions;
    suggestOption(options: IVROption[], goal: string): IVROption | null;
    getDetectionStats(): any;
}
export {};
