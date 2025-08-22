import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
interface SimpleHumanSession {
    callSid: string;
    goal: string;
    targetPerson: string;
    businessName?: string;
    hasReachedHuman: boolean;
    hasAskedQuestion: boolean;
    questionAsked?: string;
    humanResponse?: string;
    startTime: Date;
}
export declare class HumanConversationService {
    private readonly eventEmitter;
    private readonly prisma;
    private readonly logger;
    private activeSessions;
    constructor(eventEmitter: EventEmitter2, prisma: PrismaService);
    handleSessionStarted(event: {
        callSid: string;
        goal: string;
        targetPerson?: string;
        companyName?: string;
    }): void;
    handleVoicemailDetected(event: {
        callSid: string;
        transcript: string;
        confidence: number;
        timestamp: Date;
    }): Promise<void>;
    handleTTSCompleted(event: {
        callSid: string;
        context?: string;
    }): Promise<void>;
    private saveVoicemailStatus;
    private generateVoicemailMessage;
    private extractCallerInfo;
    private extractPurposeInfo;
    handleIVRDetectionCompleted(event: {
        callSid: string;
        transcript: string;
        ivrDetected: boolean;
        confidence: number;
        timestamp: Date;
    }): Promise<void>;
    private processTranscriptForHuman;
    private isHumanSpeech;
    private respondToHuman;
    private askSimpleQuestion;
    private analyzeResponse;
    private handleHumanQuestion;
    private askFollowUpQuestion;
    private extractService;
    private saveResponseAndEnd;
    getActiveSession(callSid: string): SimpleHumanSession | undefined;
    getActiveSessions(): SimpleHumanSession[];
    handleCallEnded(event: {
        callSid: string;
    }): void;
}
export {};
