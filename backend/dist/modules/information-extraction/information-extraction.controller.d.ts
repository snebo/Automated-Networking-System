import { InformationExtractionService } from './information-extraction.service';
import { CallInformation, InformationSearchResult } from './interfaces/extracted-info.interface';
import { ExtractInformationDto, SearchInformationDto } from './dto/information-extraction.dto';
export declare class InformationExtractionController {
    private readonly informationService;
    constructor(informationService: InformationExtractionService);
    extractInformation(dto: ExtractInformationDto): Promise<CallInformation>;
    searchInformation(query: SearchInformationDto): Promise<InformationSearchResult[]>;
    getBusinessInformation(businessId: string): Promise<CallInformation[]>;
    getStatistics(): Promise<{
        totalExtractions: number;
        averageConfidence: number;
        successRate: number;
        qualityDistribution: Record<string, number>;
    }>;
    searchEntities(entityType: string, entityValue?: string, businessId?: string): Promise<any[]>;
    getRecentExtractions(limit?: string, successfulOnly?: string): Promise<InformationSearchResult[]>;
    getContactSummary(businessId: string): Promise<{
        businessId: string;
        totalExtractions: number;
        targetPersonsFound: {
            name: string;
            title?: string;
            phone?: string;
            email?: string;
        }[];
        alternativeContacts: {
            name: string;
            role?: string;
            phone?: string;
            email?: string;
        }[];
        mainContacts: {
            phone?: string;
            email?: string;
        };
        lastUpdated: Date;
    }>;
    private deduplicateContacts;
}
