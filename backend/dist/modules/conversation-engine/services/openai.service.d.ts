import { ConfigService } from '@nestjs/config';
export interface IVRMenuOption {
    key: string;
    description: string;
    confidence: number;
}
export interface DecisionContext {
    callSid: string;
    phoneNumber: string;
    goal: string;
    companyName?: string;
    previousActions: string[];
    detectedMenu: {
        options: IVRMenuOption[];
        fullText: string;
    };
}
export interface AIDecision {
    selectedOption: string;
    reasoning: string;
    response: string;
    confidence: number;
    nextAction: 'press_key' | 'speak' | 'wait' | 'hangup';
}
export declare class OpenAIService {
    private readonly configService;
    private readonly logger;
    private openaiClient;
    private isConfigured;
    constructor(configService: ConfigService);
    private initializeOpenAI;
    makeIVRDecision(context: DecisionContext): Promise<AIDecision>;
    private buildDecisionPrompt;
    private makeHeuristicDecision;
    generateContextualResponse(situation: string, context: DecisionContext): Promise<string>;
    isAvailable(): boolean;
}
