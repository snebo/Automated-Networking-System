import { EventEmitter2 } from '@nestjs/event-emitter';
import { AIDecision } from '../conversation-engine/services/openai.service';
export declare class IvrNavigatorService {
    private readonly eventEmitter;
    private readonly logger;
    constructor(eventEmitter: EventEmitter2);
    executeDecision(event: {
        callSid: string;
        decision: AIDecision;
        session: {
            goal: string;
            actionHistory: string[];
        };
    }): Promise<void>;
    private handleKeyPress;
    private handleSpeak;
    private handleWait;
    private handleHangup;
    pressDTMF(callSid: string, digits: string): Promise<void>;
    speakToCall(callSid: string, text: string): Promise<void>;
    private delay;
    getNavigationStats(): {
        message: string;
        timestamp: string;
    };
}
