import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  Query,
  Param,
  Put,
  Logger,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { WebScraperService } from './web-scraper.service';
import { ScraperQueryDto } from './dto/scraper-query.dto';
import { BusinessFilterDto } from './dto/business-filter.dto';
import { AssignScriptDto, BulkCallDto } from './dto/business-script.dto';
import { UnifiedWorkflowDto, WorkflowExecutionResponse } from './dto/unified-workflow.dto';

@ApiTags('web-scraper')
@Controller('scraper')
export class WebScraperController {
  private readonly logger = new Logger(WebScraperController.name);

  constructor(private readonly scraperService: WebScraperService) {}

  @Post('scrape')
  @ApiOperation({ 
    summary: 'Scrape business information from various sources',
    description: 'Searches and scrapes business contact information based on specified criteria'
  })
  @ApiResponse({ 
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
  })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  @ApiResponse({ status: 500, description: 'Scraping failed' })
  async scrapeBusinesses(@Body() query: ScraperQueryDto) {
    this.logger.log(`Starting scrape with query: ${JSON.stringify(query)}`);
    return await this.scraperService.scrapeBusinesses(query);
  }

  @Get('businesses')
  @ApiOperation({ 
    summary: 'Get stored businesses from database',
    description: 'Retrieves previously scraped businesses with optional filters'
  })
  @ApiQuery({ name: 'industry', required: false, description: 'Filter by industry' })
  @ApiQuery({ name: 'location', required: false, description: 'Filter by location' })
  @ApiQuery({ name: 'notCalledDays', required: false, type: 'number', description: 'Not called in X days' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of stored businesses',
    isArray: true,
  })
  async getStoredBusinesses(@Query() filters: BusinessFilterDto) {
    const notCalledSince = filters.notCalledDays 
      ? new Date(Date.now() - filters.notCalledDays * 24 * 60 * 60 * 1000)
      : undefined;

    return await this.scraperService.getStoredBusinesses({
      industry: filters.industry,
      location: filters.location,
      notCalledSince,
    });
  }

  @Get('test-data')
  @ApiOperation({ 
    summary: 'Generate test business data for development',
    description: 'Returns mock business data for testing filtering functionality'
  })
  @ApiQuery({ name: 'industry', required: false, description: 'Filter by industry' })
  @ApiQuery({ name: 'location', required: false, description: 'Filter by location' })
  async getTestData(@Query() filters: { industry?: string; location?: string }) {
    return this.scraperService.generateTestData(filters);
  }

  @Post('enrich')
  @ApiOperation({ 
    summary: 'Enrich business data',
    description: 'Enriches existing business data with additional information'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Enriched business data',
  })
  @ApiResponse({ status: 404, description: 'Business not found' })
  async enrichBusinessData(@Body() body: { phoneNumber: string }) {
    const enrichedData = await this.scraperService.enrichBusinessData(body.phoneNumber);
    
    if (!enrichedData) {
      return { message: 'No additional data found' };
    }
    
    return enrichedData;
  }

  // ===== BUSINESS MANAGEMENT ENDPOINTS =====

  @Get('businesses/with-scripts')
  @ApiOperation({ 
    summary: 'Get businesses with their assigned scripts',
    description: 'Fetches all businesses along with their script assignments for calling operations'
  })
  @ApiResponse({ 
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
  })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by call status' })
  @ApiQuery({ name: 'hasScript', required: false, type: Boolean, description: 'Filter by script assignment' })
  @ApiQuery({ name: 'hasPhone', required: false, type: Boolean, description: 'Filter by phone number presence' })
  async getBusinessesWithScripts(
    @Query('status') status?: string,
    @Query('hasScript') hasScript?: boolean,
    @Query('hasPhone') hasPhone?: boolean,
  ) {
    return this.scraperService.getBusinessesWithScripts({
      status,
      hasScript,
      hasPhone,
    });
  }

  @Put('businesses/:businessId/assign-script')
  @ApiOperation({ 
    summary: 'Assign a script to a business',
    description: 'Assigns a calling script to a specific business'
  })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Script assigned successfully',
  })
  @ApiResponse({ status: 404, description: 'Business or script not found' })
  async assignScript(
    @Param('businessId') businessId: string,
    @Body() assignScriptDto: AssignScriptDto
  ) {
    return this.scraperService.assignScriptToBusiness(
      businessId, 
      assignScriptDto.scriptId, 
      assignScriptDto.customGoal
    );
  }

  @Post('businesses/bulk-call')
  @ApiOperation({ 
    summary: 'Execute bulk calling for multiple businesses',
    description: 'Initiates phone calls to multiple businesses using their assigned scripts'
  })
  @ApiResponse({ 
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
  })
  async bulkCall(@Body() bulkCallDto: BulkCallDto) {
    return this.scraperService.executeBulkCalls(bulkCallDto);
  }

  // ===== ENHANCED INTEGRATED ENDPOINTS =====

  @Post('scrape-integrated')
  @ApiOperation({ 
    summary: 'Enhanced scraping with integrated workflow',
    description: 'Scrape businesses with automatic script generation, filtering, and workflow setup. This replaces the need for a frontend form by providing all filtering options in the API.'
  })
  @ApiResponse({ 
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
  })
  async scrapeIntegrated(@Body() query: ScraperQueryDto) {
    this.logger.log(`Starting integrated scrape with query: ${JSON.stringify(query)}`);
    return await this.scraperService.scrapeWithIntegratedWorkflow(query);
  }

  @Post('start-verification-workflow')
  @ApiOperation({ 
    summary: 'Start verification workflow for businesses',
    description: 'Initiates the two-phase verification workflow (verify number then gather info) for selected businesses'
  })
  @ApiResponse({ 
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
  })
  async startVerificationWorkflow(@Body() body: {
    businessIds: string[];
    targetPerson?: string;
    specificGoal?: string;
    priority?: string;
    skipVerification?: boolean;
  }) {
    const { businessIds, ...options } = body;
    return this.scraperService.startVerificationWorkflowForBusinesses(businessIds, options);
  }

  @Get('content-types')
  @ApiOperation({ 
    summary: 'Get available content types for filtering',
    description: 'Returns the available content types that can be excluded during scraping'
  })
  @ApiResponse({ 
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
  })
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

  @Get('scripts/:scriptId')
  @ApiOperation({ 
    summary: 'Get full script content by ID',
    description: 'Returns the complete script including phases, rules, and conversation flow'
  })
  @ApiParam({ name: 'scriptId', description: 'Script ID' })
  async getScriptById(@Param('scriptId') scriptId: string) {
    return this.scraperService.getScriptById(scriptId);
  }

  @Get('scripts')
  @ApiOperation({ 
    summary: 'Get all scripts',
    description: 'Returns all generated scripts in the system'
  })
  async getAllScripts() {
    return this.scraperService.getAllScripts();
  }

  // ===== UNIFIED WORKFLOW ENDPOINT =====

  @Post('execute-complete-workflow')
  @ApiOperation({
    summary: 'Execute complete business research and calling workflow',
    description: 'Form-based endpoint that searches for businesses, generates scripts, executes calls, and extracts data - all in one unified workflow'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Workflow initiated successfully',
    type: () => Object, // WorkflowExecutionResponse
  })
  @ApiResponse({ status: 400, description: 'Invalid form data' })
  @ApiResponse({ status: 500, description: 'Workflow execution failed' })
  async executeCompleteWorkflow(@Body() workflowData: UnifiedWorkflowDto): Promise<WorkflowExecutionResponse> {
    this.logger.log(`Starting complete workflow: ${workflowData.industry} in ${workflowData.location}`);
    this.logger.log(`Target: ${workflowData.targetPerson} | Goal: ${workflowData.callingGoal}`);
    
    return await this.scraperService.executeCompleteWorkflow(workflowData);
  }

  @Get('workflow/:workflowId/status')
  @ApiOperation({
    summary: 'Get workflow execution status',
    description: 'Check the current status and progress of a running workflow'
  })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  async getWorkflowStatus(@Param('workflowId') workflowId: string) {
    return this.scraperService.getWorkflowStatus(workflowId);
  }

  @Get('workflow/:workflowId/results')
  @ApiOperation({
    summary: 'Get workflow results and extracted data',
    description: 'Retrieve all extracted information from completed workflow calls'
  })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  async getWorkflowResults(@Param('workflowId') workflowId: string) {
    return this.scraperService.getWorkflowResults(workflowId);
  }
}