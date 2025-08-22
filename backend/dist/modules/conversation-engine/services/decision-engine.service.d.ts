import { EventEmitter2 } from '@nestjs/event-emitter';
import { OpenAIService, AIDecision, IVRMenuOption } from './openai.service';
interface CallSession {
    callSid: string;
    phoneNumber: string;
    goal: string;
    companyName?: string;
    currentState: 'listening' | 'deciding' | 'acting' | 'waiting';
    actionHistory: string[];
    lastDecision?: AIDecision;
    startTime: Date;
}
export declare class DecisionEngineService {
    private readonly openaiService;
    private readonly eventEmitter;
    private readonly logger;
    private activeSessions;
    constructor(openaiService: OpenAIService, eventEmitter: EventEmitter2);
    startCallSession(callSid: string, phoneNumber: string, goal: string, companyName?: string, targetPerson?: string): void;
    handleCallInitiated(event: {
        callSid: string;
        phoneNumber: string;
        scriptId: string;
        goal: string;
        companyName?: string;
    }): void;
    handleStartSession(event: {
        callSid: string;
        phoneNumber: string;
        goal: string;
        companyName?: string;
        targetPerson?: string;
    }): void;
    handleSessionEnded(event: {
        callSid: string;
    }): void;
    handleEnteringWaitState(event: {
        callSid: string;
        action: string;
        key: string;
    }): void;
    handleHumanReached(event: {
        callSid: string;
        transcript: string;
    }): void;
    handleIVRMenuDetected(event: {
        callSid: string;
        options: IVRMenuOption[];
        fullText: string;
        confidence: number;
    }): Promise<void>;
    handleCallCompleted(callSid: string): Promise<void>;
    private generateCallSummary;
    getActiveSession(callSid: string): CallSession | undefined;
    getActiveSessions(): CallSession[];
    makeManualDecision(callSid: string, menuOptions: IVRMenuOption[], fullText: string): Promise<AIDecision | null>;
    private extractTargetPersonFromGoal;
}
export {};
