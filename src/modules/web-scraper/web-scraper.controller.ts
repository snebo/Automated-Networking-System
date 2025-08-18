import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  Query,
  Logger,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { WebScraperService } from './web-scraper.service';
import { ScraperQueryDto } from './dto/scraper-query.dto';
import { BusinessFilterDto } from './dto/business-filter.dto';

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
}