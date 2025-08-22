import { ContentType } from '../interfaces/scraper.interface';
export declare class UnifiedWorkflowDto {
    industry: string;
    location: string;
    businessType?: string;
    keywords?: string[];
    maxBusinesses?: number;
    requirePhone?: boolean;
    requireAddress?: boolean;
    excludeContentTypes?: ContentType[];
    targetPerson: string;
    callingGoal: string;
    informationToGather?: string[];
    startCallingImmediately?: boolean;
    callDelay?: number;
    maxConcurrentCalls?: number;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    callerIdentity?: string;
    contactInfo?: string;
    notificationEmail?: string;
    sendProgressUpdates?: boolean;
}
export interface WorkflowExecutionResponse {
    workflowId: string;
    status: 'initiated' | 'scraping' | 'calling' | 'completed' | 'failed';
    scrapeResults: {
        totalFound: number;
        businessesWithScripts: number;
        readyForCalling: number;
    };
    callingResults: {
        totalCalls: number;
        completed: number;
        inProgress: number;
        queued: number;
        failed: number;
    };
    extractedData: {
        businessesWithData: number;
        totalInformationGathered: number;
        successfulCalls: number;
    };
    estimatedCompletionTime?: Date;
    nextSteps: string[];
}
