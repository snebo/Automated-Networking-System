"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var WebScraperController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebScraperController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const web_scraper_service_1 = require("./web-scraper.service");
const scraper_query_dto_1 = require("./dto/scraper-query.dto");
const business_filter_dto_1 = require("./dto/business-filter.dto");
const business_script_dto_1 = require("./dto/business-script.dto");
const unified_workflow_dto_1 = require("./dto/unified-workflow.dto");
let WebScraperController = WebScraperController_1 = class WebScraperController {
    constructor(scraperService) {
        this.scraperService = scraperService;
        this.logger = new common_1.Logger(WebScraperController_1.name);
    }
    async scrapeBusinesses(query) {
        this.logger.log(`Starting scrape with query: ${JSON.stringify(query)}`);
        return await this.scraperService.scrapeBusinesses(query);
    }
    async getStoredBusinesses(filters) {
        const notCalledSince = filters.notCalledDays
            ? new Date(Date.now() - filters.notCalledDays * 24 * 60 * 60 * 1000)
            : undefined;
        return await this.scraperService.getStoredBusinesses({
            industry: filters.industry,
            location: filters.location,
            notCalledSince,
        });
    }
    async getTestData(filters) {
        return this.scraperService.generateTestData(filters);
    }
    async enrichBusinessData(body) {
        const enrichedData = await this.scraperService.enrichBusinessData(body.phoneNumber);
        if (!enrichedData) {
            return { message: 'No additional data found' };
        }
        return enrichedData;
    }
    async getBusinessesWithScripts(status, hasScript, hasPhone) {
        return this.scraperService.getBusinessesWithScripts({
            status,
            hasScript,
            hasPhone,
        });
    }
    async assignScript(businessId, assignScriptDto) {
        return this.scraperService.assignScriptToBusiness(businessId, assignScriptDto.scriptId, assignScriptDto.customGoal);
    }
    async bulkCall(bulkCallDto) {
        return this.scraperService.executeBulkCalls(bulkCallDto);
    }
    async scrapeIntegrated(query) {
        this.logger.log(`Starting integrated scrape with query: ${JSON.stringify(query)}`);
        return await this.scraperService.scrapeWithIntegratedWorkflow(query);
    }
    async startVerificationWorkflow(body) {
        const { businessIds, ...options } = body;
        return this.scraperService.startVerificationWorkflowForBusinesses(businessIds, options);
    }
    async getContentTypes() {
        return {
            contentTypes: [
                {
                    value: 'blog_articles',
                    description: 'Blog posts and articles',
                    examples: ['Top 10 Best Restaurants', 'Ultimate Guide to Hospitals', 'How to Choose a Doctor']
                },
                {
                    value: 'news_articles',
                    description: 'News and current events',
                    examples: ['Breaking: Hospital Opens', 'News Update: Restaurant Closure']
                },
                {
                    value: 'social_media',
                    description: 'Social media profiles',
                    examples: ['Facebook pages', 'Twitter profiles', 'Instagram accounts']
                },
                {
                    value: 'directories',
                    description: 'Generic directory listings',
                    examples: ['Yellow Pages', 'Business Directory', 'Local Listings']
                },
                {
                    value: 'reviews_only',
                    description: 'Review-only content',
                    examples: ['Yelp Reviews', 'Google Reviews', 'Rating Pages']
                },
                {
                    value: 'top_lists',
                    description: 'Top/best lists and rankings',
                    examples: ['Best 10 Restaurants', '5 Top Hospitals', 'Ranked: Best Doctors']
                },
                {
                    value: 'generic_info',
                    description: 'Generic informational content',
                    examples: ['About Us pages', 'General information', 'FAQ pages']
                }
            ]
        };
    }
    async getScriptById(scriptId) {
        return this.scraperService.getScriptById(scriptId);
    }
    async getAllScripts() {
        return this.scraperService.getAllScripts();
    }
    async executeCompleteWorkflow(workflowData) {
        this.logger.log(`Starting complete workflow: ${workflowData.industry} in ${workflowData.location}`);
        this.logger.log(`Target: ${workflowData.targetPerson} | Goal: ${workflowData.callingGoal}`);
        return await this.scraperService.executeCompleteWorkflow(workflowData);
    }
    async getWorkflowStatus(workflowId) {
        return this.scraperService.getWorkflowStatus(workflowId);
    }
    async getWorkflowResults(workflowId) {
        return this.scraperService.getWorkflowResults(workflowId);
    }
};
exports.WebScraperController = WebScraperController;
__decorate([
    (0, common_1.Post)('scrape'),
    (0, swagger_1.ApiOperation)({
        summary: 'Scrape business information from various sources',
        description: 'Searches and scrapes business contact information based on specified criteria'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Scraping completed successfully',
        schema: {
            properties: {
                businesses: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            phoneNumber: { type: 'string' },
                            address: { type: 'object' },
                            website: { type: 'string' },
                            industry: { type: 'string' },
                        }
                    }
                },
                totalFound: { type: 'number' },
                executionTime: { type: 'number' },
            }
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid query parameters' }),
    (0, swagger_1.ApiResponse)({ status: 500, description: 'Scraping failed' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [scraper_query_dto_1.ScraperQueryDto]),
    __metadata("design:returntype", Promise)
], WebScraperController.prototype, "scrapeBusinesses", null);
__decorate([
    (0, common_1.Get)('businesses'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get stored businesses from database',
        description: 'Retrieves previously scraped businesses with optional filters'
    }),
    (0, swagger_1.ApiQuery)({ name: 'industry', required: false, description: 'Filter by industry' }),
    (0, swagger_1.ApiQuery)({ name: 'location', required: false, description: 'Filter by location' }),
    (0, swagger_1.ApiQuery)({ name: 'notCalledDays', required: false, type: 'number', description: 'Not called in X days' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'List of stored businesses',
        isArray: true,
    }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [business_filter_dto_1.BusinessFilterDto]),
    __metadata("design:returntype", Promise)
], WebScraperController.prototype, "getStoredBusinesses", null);
__decorate([
    (0, common_1.Get)('test-data'),
    (0, swagger_1.ApiOperation)({
        summary: 'Generate test business data for development',
        description: 'Returns mock business data for testing filtering functionality'
    }),
    (0, swagger_1.ApiQuery)({ name: 'industry', required: false, description: 'Filter by industry' }),
    (0, swagger_1.ApiQuery)({ name: 'location', required: false, description: 'Filter by location' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WebScraperController.prototype, "getTestData", null);
__decorate([
    (0, common_1.Post)('enrich'),
    (0, swagger_1.ApiOperation)({
        summary: 'Enrich business data',
        description: 'Enriches existing business data with additional information'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Enriched business data',
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Business not found' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WebScraperController.prototype, "enrichBusinessData", null);
__decorate([
    (0, common_1.Get)('businesses/with-scripts'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get businesses with their assigned scripts',
        description: 'Fetches all businesses along with their script assignments for calling operations'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'List of businesses with scripts',
        schema: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    phoneNumber: { type: 'string' },
                    industry: { type: 'string' },
                    callStatus: { type: 'string' },
                    assignedScript: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                            goal: { type: 'string' },
                        }
                    },
                    customGoal: { type: 'string' }
                }
            }
        }
    }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, description: 'Filter by call status' }),
    (0, swagger_1.ApiQuery)({ name: 'hasScript', required: false, type: Boolean, description: 'Filter by script assignment' }),
    (0, swagger_1.ApiQuery)({ name: 'hasPhone', required: false, type: Boolean, description: 'Filter by phone number presence' }),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('hasScript')),
    __param(2, (0, common_1.Query)('hasPhone')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean, Boolean]),
    __metadata("design:returntype", Promise)
], WebScraperController.prototype, "getBusinessesWithScripts", null);
__decorate([
    (0, common_1.Put)('businesses/:businessId/assign-script'),
    (0, swagger_1.ApiOperation)({
        summary: 'Assign a script to a business',
        description: 'Assigns a calling script to a specific business'
    }),
    (0, swagger_1.ApiParam)({ name: 'businessId', description: 'Business ID' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Script assigned successfully',
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Business or script not found' }),
    __param(0, (0, common_1.Param)('businessId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, business_script_dto_1.AssignScriptDto]),
    __metadata("design:returntype", Promise)
], WebScraperController.prototype, "assignScript", null);
__decorate([
    (0, common_1.Post)('businesses/bulk-call'),
    (0, swagger_1.ApiOperation)({
        summary: 'Execute bulk calling for multiple businesses',
        description: 'Initiates phone calls to multiple businesses using their assigned scripts'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Bulk calling initiated',
        schema: {
            type: 'object',
            properties: {
                totalBusinesses: { type: 'number' },
                validBusinesses: { type: 'number' },
                callsInitiated: { type: 'number' },
                errors: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            businessId: { type: 'string' },
                            error: { type: 'string' }
                        }
                    }
                }
            }
        }
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [business_script_dto_1.BulkCallDto]),
    __metadata("design:returntype", Promise)
], WebScraperController.prototype, "bulkCall", null);
__decorate([
    (0, common_1.Post)('scrape-integrated'),
    (0, swagger_1.ApiOperation)({
        summary: 'Enhanced scraping with integrated workflow',
        description: 'Scrape businesses with automatic script generation, filtering, and workflow setup. This replaces the need for a frontend form by providing all filtering options in the API.'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Integrated scraping completed',
        schema: {
            type: 'object',
            properties: {
                scrapeResult: {
                    type: 'object',
                    properties: {
                        businesses: { type: 'array' },
                        totalFound: { type: 'number' },
                        executionTime: { type: 'number' }
                    }
                },
                businesses: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                            phoneNumber: { type: 'string' },
                            assignedScript: { type: 'object' },
                            workflowEnabled: { type: 'boolean' },
                            targetPerson: { type: 'string' },
                            specificGoal: { type: 'string' }
                        }
                    }
                },
                summary: {
                    type: 'object',
                    properties: {
                        totalFound: { type: 'number' },
                        processed: { type: 'number' },
                        withScripts: { type: 'number' },
                        workflowEnabled: { type: 'boolean' },
                        targetPerson: { type: 'string' }
                    }
                }
            }
        }
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [scraper_query_dto_1.ScraperQueryDto]),
    __metadata("design:returntype", Promise)
], WebScraperController.prototype, "scrapeIntegrated", null);
__decorate([
    (0, common_1.Post)('start-verification-workflow'),
    (0, swagger_1.ApiOperation)({
        summary: 'Start verification workflow for businesses',
        description: 'Initiates the two-phase verification workflow (verify number then gather info) for selected businesses'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Verification workflow started',
        schema: {
            type: 'object',
            properties: {
                totalBusinesses: { type: 'number' },
                queued: { type: 'number' },
                errors: { type: 'number' },
                results: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            businessId: { type: 'string' },
                            businessName: { type: 'string' },
                            phoneNumber: { type: 'string' },
                            status: { type: 'string' },
                            targetPerson: { type: 'string' },
                            specificGoal: { type: 'string' },
                            hasScript: { type: 'boolean' }
                        }
                    }
                }
            }
        }
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WebScraperController.prototype, "startVerificationWorkflow", null);
__decorate([
    (0, common_1.Get)('content-types'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get available content types for filtering',
        description: 'Returns the available content types that can be excluded during scraping'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'List of content types',
        schema: {
            type: 'object',
            properties: {
                contentTypes: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            value: { type: 'string' },
                            description: { type: 'string' },
                            examples: { type: 'array', items: { type: 'string' } }
                        }
                    }
                }
            }
        }
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], WebScraperController.prototype, "getContentTypes", null);
__decorate([
    (0, common_1.Get)('scripts/:scriptId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get full script content by ID',
        description: 'Returns the complete script including phases, rules, and conversation flow'
    }),
    (0, swagger_1.ApiParam)({ name: 'scriptId', description: 'Script ID' }),
    __param(0, (0, common_1.Param)('scriptId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WebScraperController.prototype, "getScriptById", null);
__decorate([
    (0, common_1.Get)('scripts'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get all scripts',
        description: 'Returns all generated scripts in the system'
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], WebScraperController.prototype, "getAllScripts", null);
__decorate([
    (0, common_1.Post)('execute-complete-workflow'),
    (0, swagger_1.ApiOperation)({
        summary: 'Execute complete business research and calling workflow',
        description: 'Form-based endpoint that searches for businesses, generates scripts, executes calls, and extracts data - all in one unified workflow'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Workflow initiated successfully',
        type: () => Object,
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid form data' }),
    (0, swagger_1.ApiResponse)({ status: 500, description: 'Workflow execution failed' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [unified_workflow_dto_1.UnifiedWorkflowDto]),
    __metadata("design:returntype", Promise)
], WebScraperController.prototype, "executeCompleteWorkflow", null);
__decorate([
    (0, common_1.Get)('workflow/:workflowId/status'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get workflow execution status',
        description: 'Check the current status and progress of a running workflow'
    }),
    (0, swagger_1.ApiParam)({ name: 'workflowId', description: 'Workflow ID' }),
    __param(0, (0, common_1.Param)('workflowId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WebScraperController.prototype, "getWorkflowStatus", null);
__decorate([
    (0, common_1.Get)('workflow/:workflowId/results'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get workflow results and extracted data',
        description: 'Retrieve all extracted information from completed workflow calls'
    }),
    (0, swagger_1.ApiParam)({ name: 'workflowId', description: 'Workflow ID' }),
    __param(0, (0, common_1.Param)('workflowId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WebScraperController.prototype, "getWorkflowResults", null);
exports.WebScraperController = WebScraperController = WebScraperController_1 = __decorate([
    (0, swagger_1.ApiTags)('web-scraper'),
    (0, common_1.Controller)('scraper'),
    __metadata("design:paramtypes", [web_scraper_service_1.WebScraperService])
], WebScraperController);
//# sourceMappingURL=web-scraper.controller.js.map