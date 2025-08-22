import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../database/prisma.service';
import { TelephonyService } from '../telephony/telephony.service';
import { ScriptManagerService } from '../script-manager/script-manager.service';
import { InformationExtractionService } from '../information-extraction/information-extraction.service';
import { Queue } from 'bull';
export interface VerificationWorkflowRequest {
    businessId: string;
    targetPerson?: string;
    specificGoal?: string;
    priority?: number;
    skipVerification?: boolean;
}
export interface WorkflowStatus {
    businessId: string;
    status: 'pending' | 'verifying' | 'verified' | 'failed_verification' | 'gathering_info' | 'completed' | 'failed';
    verificationCallSid?: string;
    informationCallSid?: string;
    verificationResult?: VerificationResult;
    informationResult?: InformationResult;
    error?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface VerificationResult {
    numberValid: boolean;
    businessConfirmed: boolean;
    alternativeNumber?: string;
    notes?: string;
}
export interface InformationResult {
    targetPersonFound: boolean;
    contactInformation?: {
        directPhone?: string;
        email?: string;
        extension?: string;
        department?: string;
        availableHours?: string;
    };
    alternativeContacts?: Array<{
        name?: string;
        role?: string;
        phone?: string;
        email?: string;
    }>;
    notes?: string;
}
export declare class VerificationWorkflowService {
    private readonly prisma;
    private readonly telephonyService;
    private readonly scriptManager;
    private readonly informationExtraction;
    private readonly eventEmitter;
    private verificationQueue;
    private readonly logger;
    private activeWorkflows;
    constructor(prisma: PrismaService, telephonyService: TelephonyService, scriptManager: ScriptManagerService, informationExtraction: InformationExtractionService, eventEmitter: EventEmitter2, verificationQueue: Queue);
    startWorkflow(request: VerificationWorkflowRequest): Promise<WorkflowStatus>;
    private startVerification;
    private startInformationGathering;
    handleCallEnded(event: {
        callSid: string;
        outcome?: any;
    }): Promise<void>;
    private handleVerificationComplete;
    private handleInformationComplete;
    private analyzeVerificationOutcome;
    private analyzeInformationOutcome;
    private checkVerificationTimeout;
    private checkInformationTimeout;
    private getOriginalRequest;
    getWorkflowStatus(businessId: string): Promise<WorkflowStatus | null>;
    getAllActiveWorkflows(): Promise<WorkflowStatus[]>;
    cancelWorkflow(businessId: string): Promise<boolean>;
    startBatchWorkflow(requests: VerificationWorkflowRequest[]): Promise<WorkflowStatus[]>;
}
