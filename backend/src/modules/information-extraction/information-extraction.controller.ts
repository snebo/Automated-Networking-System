import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Query, 
  ParseUUIDPipe,
  ValidationPipe,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { InformationExtractionService } from './information-extraction.service';
import { 
  InformationSearchQuery, 
  CallInformation,
  InformationSearchResult 
} from './interfaces/extracted-info.interface';
import { ExtractInformationDto, SearchInformationDto } from './dto/information-extraction.dto';

@ApiTags('information-extraction')
@Controller('information')
export class InformationExtractionController {
  constructor(
    private readonly informationService: InformationExtractionService
  ) {}

  @Post('extract')
  @ApiOperation({ 
    summary: 'Extract information from call transcript',
    description: 'Uses AI to analyze a call transcript and extract structured contact and business information'
  })
  @ApiResponse({ status: 201, description: 'Information extracted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 404, description: 'Call or business not found' })
  async extractInformation(
    @Body(ValidationPipe) dto: ExtractInformationDto
  ): Promise<CallInformation> {
    try {
      return await this.informationService.extractAndStoreInformation(
        dto.callId,
        dto.businessId,
        dto.transcript,
        dto.targetPerson,
        dto.goal
      );
    } catch (error) {
      throw new HttpException(
        `Failed to extract information: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('search')
  @ApiOperation({ 
    summary: 'Search extracted information',
    description: 'Search through extracted call information with various filters'
  })
  @ApiResponse({ status: 200, description: 'Search results returned' })
  @ApiResponse({ status: 400, description: 'Invalid search criteria' })
  async searchInformation(
    @Body(ValidationPipe) query: SearchInformationDto
  ): Promise<InformationSearchResult[]> {
    const searchQuery: InformationSearchQuery = {
      businessId: query.businessId,
      businessName: query.businessName,
      targetPerson: query.targetPerson,
      contactType: query.contactType,
      dateRange: query.dateRange ? {
        from: new Date(query.dateRange.from),
        to: new Date(query.dateRange.to)
      } : undefined,
      successfulOnly: query.successfulOnly,
      hasContactInfo: query.hasContactInfo,
      department: query.department,
      businessType: query.businessType
    };

    return await this.informationService.searchExtractedInformation(searchQuery);
  }

  @Get('business/:businessId')
  @ApiOperation({ 
    summary: 'Get all extracted information for a business',
    description: 'Retrieve all call information extractions for a specific business'
  })
  @ApiParam({ name: 'businessId', description: 'UUID of the business' })
  @ApiResponse({ status: 200, description: 'Business information returned' })
  @ApiResponse({ status: 404, description: 'Business not found' })
  async getBusinessInformation(
    @Param('businessId', ParseUUIDPipe) businessId: string
  ): Promise<CallInformation[]> {
    return await this.informationService.getBusinessInformation(businessId);
  }

  @Get('statistics')
  @ApiOperation({ 
    summary: 'Get extraction statistics',
    description: 'Get overall statistics about information extraction performance'
  })
  @ApiResponse({ status: 200, description: 'Statistics returned' })
  async getStatistics(): Promise<{
    totalExtractions: number;
    averageConfidence: number;
    successRate: number;
    qualityDistribution: Record<string, number>;
  }> {
    return await this.informationService.getExtractionStatistics();
  }

  @Get('search-entities')
  @ApiOperation({ 
    summary: 'Search information entities',
    description: 'Search for specific entities (people, phones, emails, etc.) across all extractions'
  })
  @ApiQuery({ name: 'entityType', description: 'Type of entity to search for' })
  @ApiQuery({ name: 'entityValue', description: 'Value to search for', required: false })
  @ApiQuery({ name: 'businessId', description: 'Limit search to specific business', required: false })
  async searchEntities(
    @Query('entityType') entityType: string,
    @Query('entityValue') entityValue?: string,
    @Query('businessId') businessId?: string
  ): Promise<any[]> {
    // This would be implemented to search the InformationEntity table
    // For now, return a placeholder response
    return [];
  }

  @Get('recent')
  @ApiOperation({ 
    summary: 'Get recent extractions',
    description: 'Get the most recently extracted information'
  })
  @ApiQuery({ name: 'limit', description: 'Number of results to return', required: false })
  @ApiQuery({ name: 'successfulOnly', description: 'Only return successful extractions', required: false })
  async getRecentExtractions(
    @Query('limit') limit = '10',
    @Query('successfulOnly') successfulOnly?: string
  ): Promise<InformationSearchResult[]> {
    const searchQuery: InformationSearchQuery = {
      successfulOnly: successfulOnly === 'true',
      dateRange: {
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        to: new Date()
      }
    };

    const results = await this.informationService.searchExtractedInformation(searchQuery);
    return results.slice(0, parseInt(limit));
  }

  @Get('contacts/:businessId/summary')
  @ApiOperation({ 
    summary: 'Get contact summary for business',
    description: 'Get a summary of all contact information gathered for a specific business'
  })
  @ApiParam({ name: 'businessId', description: 'UUID of the business' })
  @ApiResponse({ status: 200, description: 'Contact summary returned' })
  async getContactSummary(
    @Param('businessId', ParseUUIDPipe) businessId: string
  ): Promise<{
    businessId: string;
    totalExtractions: number;
    targetPersonsFound: { name: string; title?: string; phone?: string; email?: string; }[];
    alternativeContacts: { name: string; role?: string; phone?: string; email?: string; }[];
    mainContacts: { phone?: string; email?: string; };
    lastUpdated: Date;
  }> {
    const extractions = await this.informationService.getBusinessInformation(businessId);
    
    const targetPersonsFound = extractions
      .filter(e => e.contactInfo.targetPerson?.found)
      .map(e => ({
        name: e.contactInfo.targetPerson!.name!,
        title: e.contactInfo.targetPerson!.title,
        phone: e.contactInfo.targetPerson!.directPhone,
        email: e.contactInfo.targetPerson!.email
      }));

    const alternativeContacts = extractions
      .flatMap(e => e.contactInfo.alternativeContacts || [])
      .filter(c => c.name)
      .map(c => ({
        name: c.name!,
        role: c.title,
        phone: c.phone,
        email: c.email
      }));

    const mainContacts = extractions.reduce((acc, e) => {
      if (e.contactInfo.mainReceptionPhone) acc.phone = e.contactInfo.mainReceptionPhone;
      if (e.contactInfo.mainEmail) acc.email = e.contactInfo.mainEmail;
      return acc;
    }, { phone: undefined, email: undefined } as { phone?: string; email?: string; });

    return {
      businessId,
      totalExtractions: extractions.length,
      targetPersonsFound: this.deduplicateContacts(targetPersonsFound),
      alternativeContacts: this.deduplicateContacts(alternativeContacts),
      mainContacts,
      lastUpdated: extractions.length > 0 ? extractions[0].extractedAt : new Date()
    };
  }

  private deduplicateContacts(contacts: any[]): any[] {
    const seen = new Set();
    return contacts.filter(contact => {
      const key = `${contact.name}-${contact.phone || ''}-${contact.email || ''}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}