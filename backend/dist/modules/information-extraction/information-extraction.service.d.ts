import { PrismaService } from '../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CallInformation, InformationSearchQuery, InformationSearchResult } from './interfaces/extracted-info.interface';
export declare class InformationExtractionService {
    private readonly prisma;
    private readonly configService;
    private readonly logger;
    private readonly openai;
    constructor(prisma: PrismaService, configService: ConfigService);
    extractAndStoreInformation(callId: string, businessId: string, transcript: string, targetPerson?: string, goal?: string): Promise<CallInformation>;
    private aiExtractInformation;
    private buildExtractionPrompt;
    private storeExtractedInformation;
    private storeInformationEntities;
    searchExtractedInformation(query: InformationSearchQuery): Promise<InformationSearchResult[]>;
    getBusinessInformation(businessId: string): Promise<CallInformation[]>;
    getExtractionStatistics(): Promise<{
        totalExtractions: number;
        averageConfidence: number;
        successRate: number;
        qualityDistribution: Record<string, number>;
    }>;
    private calculateOverallConfidence;
    private determineInformationQuality;
    private determinePersonCategory;
    private determinePhoneCategory;
    private calculateRelevanceScore;
}
