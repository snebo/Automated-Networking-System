import { PrismaService } from '../database/prisma.service';
import { ConfigService } from '@nestjs/config';
export interface ScriptGenerationRequest {
    businessType: string;
    industry: string;
    specificGoal?: string;
    targetPerson?: string;
    verificationMode?: boolean;
}
export interface GeneratedScript {
    name: string;
    description: string;
    goal: string;
    context: string;
    phases: ScriptPhase[];
    adaptationRules: AdaptationRule[];
    targetPerson?: string;
    personFindingStrategy?: PersonFindingStrategy;
}
export interface ScriptPhase {
    step: number;
    action: string;
    text: string;
    expectedResponses?: string[];
    fallbackText?: string;
}
export interface AdaptationRule {
    trigger: string;
    action: string;
    parameters?: Record<string, any>;
}
export interface PersonFindingStrategy {
    department: string;
    titles: string[];
    ivrKeywords: string[];
    questions: string[];
    fallbackApproach: string;
}
export declare class ScriptManagerService {
    private readonly prisma;
    private readonly configService;
    private readonly logger;
    private readonly scriptTemplates;
    private readonly personFindingStrategies;
    constructor(prisma: PrismaService, configService: ConfigService);
    generateScript(request: ScriptGenerationRequest): Promise<GeneratedScript>;
    createAndStoreScript(request: ScriptGenerationRequest): Promise<any>;
    private categorizeBusinessType;
    private generateScriptName;
    private generateScriptDescription;
    private populateTemplate;
    private getDepartmentName;
    private generateContext;
    private generatePhases;
    private generateExpectedResponses;
    private generateFallbackText;
    private generateAdaptationRules;
    getOrCreateScriptForBusiness(businessId: string, targetPerson?: string, specificGoal?: string, verificationMode?: boolean): Promise<any>;
}
