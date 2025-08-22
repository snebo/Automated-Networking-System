import { WebScraperService } from './web-scraper.service';
import { ScraperQueryDto } from './dto/scraper-query.dto';
import { BusinessFilterDto } from './dto/business-filter.dto';
import { AssignScriptDto, BulkCallDto } from './dto/business-script.dto';
import { UnifiedWorkflowDto, WorkflowExecutionResponse } from './dto/unified-workflow.dto';
export declare class WebScraperController {
    private readonly scraperService;
    private readonly logger;
    constructor(scraperService: WebScraperService);
    scrapeBusinesses(query: ScraperQueryDto): Promise<import("./interfaces/scraper.interface").ScrapeResult>;
    getStoredBusinesses(filters: BusinessFilterDto): Promise<import("./interfaces/scraper.interface").BusinessInfo[]>;
    getTestData(filters: {
        industry?: string;
        location?: string;
    }): Promise<any>;
    enrichBusinessData(body: {
        phoneNumber: string;
    }): Promise<import("./interfaces/scraper.interface").BusinessInfo | {
        message: string;
    }>;
    getBusinessesWithScripts(status?: string, hasScript?: boolean, hasPhone?: boolean): Promise<any[]>;
    assignScript(businessId: string, assignScriptDto: AssignScriptDto): Promise<any>;
    bulkCall(bulkCallDto: BulkCallDto): Promise<any>;
    scrapeIntegrated(query: ScraperQueryDto): Promise<any>;
    startVerificationWorkflow(body: {
        businessIds: string[];
        targetPerson?: string;
        specificGoal?: string;
        priority?: string;
        skipVerification?: boolean;
    }): Promise<any>;
    getContentTypes(): Promise<{
        contentTypes: {
            value: string;
            description: string;
            examples: string[];
        }[];
    }>;
    getScriptById(scriptId: string): Promise<any>;
    getAllScripts(): Promise<any[]>;
    executeCompleteWorkflow(workflowData: UnifiedWorkflowDto): Promise<WorkflowExecutionResponse>;
    getWorkflowStatus(workflowId: string): Promise<any>;
    getWorkflowResults(workflowId: string): Promise<any>;
}
