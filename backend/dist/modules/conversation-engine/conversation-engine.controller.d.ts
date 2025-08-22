import { EventEmitter2 } from '@nestjs/event-emitter';
import { DecisionEngineService } from './services/decision-engine.service';
import { HumanConversationService } from './services/human-conversation.service';
export declare class ConversationEngineController {
    private readonly decisionEngine;
    private readonly humanConversation;
    private readonly eventEmitter;
    constructor(decisionEngine: DecisionEngineService, humanConversation: HumanConversationService, eventEmitter: EventEmitter2);
    testHumanConversation(body: {
        callSid?: string;
        goal: string;
        targetPerson?: string;
        businessName?: string;
    }): Promise<{
        callSid: string;
        message: string;
        goal: string;
        targetPerson: string;
        businessName: string | undefined;
        instructions: string;
    }>;
    simulateHumanResponse(body: {
        callSid: string;
        transcript: string;
        confidence?: number;
    }): Promise<{
        message: string;
        callSid: string;
        transcript: string;
    }>;
    getConversationStatus(callSid: string): {
        callSid: string;
        status: string;
        message: string;
        hasReachedHuman?: undefined;
        hasAskedQuestion?: undefined;
        questionAsked?: undefined;
        humanResponse?: undefined;
        goal?: undefined;
        targetPerson?: undefined;
        businessName?: undefined;
        duration?: undefined;
    } | {
        callSid: string;
        status: string;
        hasReachedHuman: boolean;
        hasAskedQuestion: boolean;
        questionAsked: string | undefined;
        humanResponse: string | undefined;
        goal: string;
        targetPerson: string;
        businessName: string | undefined;
        duration: number;
        message?: undefined;
    };
    getActiveConversations(): {
        count: number;
        sessions: {
            callSid: string;
            goal: string;
            targetPerson: string;
            businessName: string | undefined;
            hasReachedHuman: boolean;
            hasAskedQuestion: boolean;
            hasResponse: boolean;
            duration: number;
        }[];
    };
    private simulateHumanGreeting;
}
