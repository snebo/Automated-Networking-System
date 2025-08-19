import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { OpenAI } from 'openai';
import { ConfigService } from '@nestjs/config';
import {
  CallInformation,
  ContactInformation,
  OperationalInformation,
  CallOutcome,
  ExtractionMetadata,
  InformationSearchQuery,
  InformationSearchResult,
  HospitalInformation,
  RestaurantInformation,
  OfficeInformation
} from './interfaces/extracted-info.interface';

@Injectable()
export class InformationExtractionService {
  private readonly logger = new Logger(InformationExtractionService.name);
  private readonly openai: OpenAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  /**
   * Extract information from a call transcript and store it
   */
  async extractAndStoreInformation(
    callId: string,
    businessId: string,
    transcript: string,
    targetPerson?: string,
    goal?: string
  ): Promise<CallInformation> {
    this.logger.log(`Extracting information from call ${callId} for business ${businessId}`);

    const startTime = Date.now();

    try {
      // Get business details for context
      const business = await this.prisma.business.findUnique({
        where: { id: businessId }
      });

      if (!business) {
        throw new Error(`Business ${businessId} not found`);
      }

      // Extract information using AI
      const extractedInfo = await this.aiExtractInformation(
        transcript,
        business,
        targetPerson,
        goal
      );

      // Calculate processing metrics
      const processingTime = Date.now() - startTime;
      const extractionConfidence = this.calculateOverallConfidence(extractedInfo);

      // Create CallInformation object
      const callInformation: CallInformation = {
        callId,
        businessId,
        extractedAt: new Date(),
        extractionConfidence,
        rawTranscript: transcript,
        contactInfo: extractedInfo.contactInfo,
        operationalInfo: extractedInfo.operationalInfo,
        callOutcome: extractedInfo.callOutcome,
        metadata: {
          extractionMethod: 'ai_powered',
          aiModel: 'gpt-4',
          processingTime,
          confidenceScores: extractedInfo.confidenceScores,
          detectedEntities: extractedInfo.detectedEntities,
          sentimentAnalysis: extractedInfo.sentimentAnalysis
        }
      };

      // Store in database
      await this.storeExtractedInformation(callInformation);

      // Store individual entities for advanced search
      await this.storeInformationEntities(callInformation);

      this.logger.log(`Information extraction completed for call ${callId} with confidence ${extractionConfidence}`);
      return callInformation;

    } catch (error) {
      this.logger.error(`Failed to extract information from call ${callId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Use AI to extract structured information from transcript
   */
  private async aiExtractInformation(
    transcript: string,
    business: any,
    targetPerson?: string,
    goal?: string
  ): Promise<{
    contactInfo: ContactInformation;
    operationalInfo: OperationalInformation;
    callOutcome: CallOutcome;
    confidenceScores: any;
    detectedEntities: any;
    sentimentAnalysis: any;
  }> {
    const prompt = this.buildExtractionPrompt(transcript, business, targetPerson, goal);

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at extracting structured information from business phone call transcripts. Return only valid JSON without markdown formatting or code blocks.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 2000
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }

    try {
      return JSON.parse(responseContent);
    } catch (error) {
      this.logger.error(`Failed to parse AI response: ${responseContent}`);
      throw new Error('Invalid JSON response from AI extraction');
    }
  }

  /**
   * Build the extraction prompt for AI
   */
  private buildExtractionPrompt(
    transcript: string,
    business: any,
    targetPerson?: string,
    goal?: string
  ): string {
    return `
Analyze this phone call transcript and extract structured information. The call was made to:
- Business: ${business.name}
- Industry: ${business.industry || 'Unknown'}
- Phone: ${business.phoneNumber}
${targetPerson ? `- Target Person: ${targetPerson}` : ''}
${goal ? `- Call Goal: ${goal}` : ''}

TRANSCRIPT:
${transcript}

Extract information and return a JSON object with this exact structure:

{
  "contactInfo": {
    "targetPerson": {
      "found": boolean,
      "name": string (if found),
      "title": string (if found),
      "department": string (if found),
      "directPhone": string (if found),
      "extension": string (if found),
      "email": string (if found),
      "availability": string (if found),
      "bestTimeToCall": string (if found),
      "notes": string (if relevant)
    },
    "alternativeContacts": [
      {
        "name": string,
        "title": string,
        "department": string,
        "phone": string,
        "extension": string,
        "email": string,
        "relationship": string,
        "notes": string
      }
    ],
    "mainReceptionPhone": string (if different from original),
    "mainEmail": string (if found),
    "websiteContact": string (if found),
    "onlineBookingUrl": string (if found),
    "appointmentSystem": string (if found)
  },
  "operationalInfo": {
    "businessHours": {
      "general": string,
      "departmentSpecific": object,
      "specialHours": string
    },
    "servicesOffered": [string],
    "specialties": [string],
    "equipmentAvailable": [string],
    "locationDetails": {
      "parking": string,
      "accessibility": string,
      "directions": string,
      "multipleLocations": [string]
    },
    "policies": {
      "appointmentRequired": boolean,
      "referralNeeded": boolean,
      "insuranceAccepted": [string],
      "paymentMethods": [string],
      "cancellationPolicy": string
    },
    "scheduling": {
      "averageWaitTime": string,
      "nextAvailableAppointment": string,
      "urgentCareAvailability": string,
      "bookingMethod": string
    }
  },
  "callOutcome": {
    "success": boolean,
    "goalAchieved": boolean,
    "reason": string,
    "accomplishments": {
      "numberVerified": boolean,
      "contactReached": boolean,
      "informationGathered": boolean,
      "appointmentScheduled": boolean,
      "callbackArranged": boolean,
      "referralReceived": boolean
    },
    "nextSteps": [string],
    "followUpRequired": boolean,
    "followUpDate": string (ISO date if applicable),
    "callQuality": {
      "duration": number (estimated seconds),
      "ivrNavigationSuccess": boolean,
      "humanInteractionTime": number (estimated seconds),
      "disconnections": number,
      "transfersRequired": number
    }
  },
  "confidenceScores": {
    "contactInfo": number (0-1),
    "operationalInfo": number (0-1),
    "callOutcome": number (0-1),
    "overall": number (0-1)
  },
  "detectedEntities": {
    "people": [string],
    "departments": [string],
    "phoneNumbers": [string],
    "emails": [string],
    "times": [string],
    "locations": [string]
  },
  "sentimentAnalysis": {
    "overallSentiment": "positive" | "neutral" | "negative",
    "staffHelpfulness": number (1-10),
    "businessProfessionalism": number (1-10),
    "likelyToRecommend": boolean
  }
}

Rules:
1. Only include information explicitly mentioned in the transcript
2. Use null for missing information, don't make assumptions
3. Be conservative with confidence scores - only high scores for very clear information
4. Extract all phone numbers, emails, and names mentioned
5. Note any transfers, holds, or navigation challenges
6. Focus on actionable information that would be useful for future contacts
`;
  }

  /**
   * Store extracted information in database
   */
  private async storeExtractedInformation(callInfo: CallInformation): Promise<void> {
    const extractedRecord = await this.prisma.extractedInformation.create({
      data: {
        businessId: callInfo.businessId,
        callId: callInfo.callId,
        extractedAt: callInfo.extractedAt,
        extractionConfidence: callInfo.extractionConfidence,
        rawTranscript: callInfo.rawTranscript,
        contactInfo: callInfo.contactInfo as any,
        operationalInfo: callInfo.operationalInfo as any,
        callOutcome: callInfo.callOutcome as any,
        metadata: callInfo.metadata as any,
        
        // Denormalized search fields for performance
        targetPersonFound: callInfo.contactInfo.targetPerson?.found || false,
        targetPersonName: callInfo.contactInfo.targetPerson?.name,
        targetPersonPhone: callInfo.contactInfo.targetPerson?.directPhone,
        targetPersonEmail: callInfo.contactInfo.targetPerson?.email,
        mainContactPhone: callInfo.contactInfo.mainReceptionPhone,
        mainContactEmail: callInfo.contactInfo.mainEmail,
        
        goalAchieved: callInfo.callOutcome.goalAchieved,
        informationQuality: this.determineInformationQuality(callInfo.extractionConfidence),
        followUpRequired: callInfo.callOutcome.followUpRequired || false
      }
    });

    this.logger.log(`Stored extracted information with ID ${extractedRecord.id}`);
  }

  /**
   * Store individual entities for advanced search capabilities
   */
  private async storeInformationEntities(callInfo: CallInformation): Promise<void> {
    const extractedRecord = await this.prisma.extractedInformation.findFirst({
      where: {
        businessId: callInfo.businessId,
        callId: callInfo.callId
      }
    });

    if (!extractedRecord) return;

    const entities = [];
    const detected = callInfo.metadata.detectedEntities;

    // Store people entities
    for (const person of detected.people || []) {
      entities.push({
        extractionId: extractedRecord.id,
        entityType: 'person',
        entityValue: person,
        confidence: 0.8,
        category: this.determinePersonCategory(person, callInfo)
      });
    }

    // Store phone number entities
    for (const phone of detected.phoneNumbers || []) {
      entities.push({
        extractionId: extractedRecord.id,
        entityType: 'phone',
        entityValue: phone,
        confidence: 0.9,
        category: this.determinePhoneCategory(phone, callInfo)
      });
    }

    // Store email entities
    for (const email of detected.emails || []) {
      entities.push({
        extractionId: extractedRecord.id,
        entityType: 'email',
        entityValue: email,
        confidence: 0.9,
        category: 'contact_method'
      });
    }

    // Store department entities
    for (const dept of detected.departments || []) {
      entities.push({
        extractionId: extractedRecord.id,
        entityType: 'department',
        entityValue: dept,
        confidence: 0.7,
        category: 'organizational'
      });
    }

    // Batch insert entities
    if (entities.length > 0) {
      await this.prisma.informationEntity.createMany({
        data: entities
      });
      this.logger.log(`Stored ${entities.length} information entities`);
    }
  }

  /**
   * Search for extracted information with advanced filtering
   */
  async searchExtractedInformation(query: InformationSearchQuery): Promise<InformationSearchResult[]> {
    const whereClause: any = {};

    if (query.businessId) {
      whereClause.businessId = query.businessId;
    }

    if (query.businessName) {
      whereClause.business = {
        name: {
          contains: query.businessName,
          mode: 'insensitive'
        }
      };
    }

    if (query.targetPerson) {
      whereClause.targetPersonName = {
        contains: query.targetPerson,
        mode: 'insensitive'
      };
    }

    if (query.successfulOnly) {
      whereClause.goalAchieved = true;
    }

    if (query.hasContactInfo) {
      whereClause.OR = [
        { targetPersonPhone: { not: null } },
        { targetPersonEmail: { not: null } },
        { mainContactPhone: { not: null } },
        { mainContactEmail: { not: null } }
      ];
    }

    if (query.dateRange) {
      whereClause.extractedAt = {
        gte: query.dateRange.from,
        lte: query.dateRange.to
      };
    }

    if (query.department) {
      whereClause.entities = {
        some: {
          entityType: 'department',
          entityValue: {
            contains: query.department,
            mode: 'insensitive'
          }
        }
      };
    }

    const results = await this.prisma.extractedInformation.findMany({
      where: whereClause,
      include: {
        business: {
          select: {
            id: true,
            name: true,
            industry: true,
            addressFormatted: true
          }
        },
        call: {
          select: {
            startTime: true,
            duration: true,
            status: true
          }
        }
      },
      orderBy: { extractedAt: 'desc' },
      take: 50 // Limit results
    });

    return results.map(result => ({
      callInformation: {
        callId: result.callId,
        businessId: result.businessId,
        extractedAt: result.extractedAt,
        extractionConfidence: result.extractionConfidence,
        rawTranscript: result.rawTranscript,
        contactInfo: result.contactInfo as unknown as ContactInformation,
        operationalInfo: result.operationalInfo as unknown as OperationalInformation,
        callOutcome: result.callOutcome as unknown as CallOutcome,
        metadata: result.metadata as unknown as ExtractionMetadata
      },
      business: {
        id: result.business.id,
        name: result.business.name,
        industry: result.business.industry || 'Unknown',
        location: result.business.addressFormatted || 'Unknown'
      },
      relevanceScore: this.calculateRelevanceScore(result, query),
      lastUpdated: result.updatedAt
    }));
  }

  /**
   * Get extracted information for a specific business
   */
  async getBusinessInformation(businessId: string): Promise<CallInformation[]> {
    const results = await this.prisma.extractedInformation.findMany({
      where: { businessId },
      orderBy: { extractedAt: 'desc' }
    });

    return results.map(result => ({
      callId: result.callId,
      businessId: result.businessId,
      extractedAt: result.extractedAt,
      extractionConfidence: result.extractionConfidence,
      rawTranscript: result.rawTranscript,
      contactInfo: result.contactInfo as unknown as ContactInformation,
      operationalInfo: result.operationalInfo as unknown as OperationalInformation,
      callOutcome: result.callOutcome as unknown as CallOutcome,
      metadata: result.metadata as unknown as ExtractionMetadata
    }));
  }

  /**
   * Get information extraction statistics
   */
  async getExtractionStatistics() {
    const stats = await this.prisma.extractedInformation.aggregate({
      _count: { id: true },
      _avg: { extractionConfidence: true }
    });

    const qualityDistribution = await this.prisma.extractedInformation.groupBy({
      by: ['informationQuality'],
      _count: { informationQuality: true }
    });

    const successfulExtractions = await this.prisma.extractedInformation.count({
      where: { goalAchieved: true }
    });

    return {
      totalExtractions: stats._count.id,
      averageConfidence: stats._avg.extractionConfidence || 0,
      successRate: stats._count.id > 0 ? successfulExtractions / stats._count.id : 0,
      qualityDistribution: qualityDistribution.reduce((acc, item) => {
        acc[item.informationQuality] = item._count.informationQuality;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  // Helper methods

  private calculateOverallConfidence(extractedInfo: any): number {
    const scores = extractedInfo.confidenceScores;
    return (scores.contactInfo + scores.operationalInfo + scores.callOutcome) / 3;
  }

  private determineInformationQuality(confidence: number): string {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.6) return 'medium';
    return 'low';
  }

  private determinePersonCategory(person: string, callInfo: CallInformation): string {
    if (callInfo.contactInfo.targetPerson?.name === person) {
      return 'target_person';
    }
    return 'mentioned_person';
  }

  private determinePhoneCategory(phone: string, callInfo: CallInformation): string {
    if (callInfo.contactInfo.targetPerson?.directPhone === phone) {
      return 'target_direct';
    }
    if (callInfo.contactInfo.mainReceptionPhone === phone) {
      return 'main_reception';
    }
    return 'alternative';
  }

  private calculateRelevanceScore(result: any, query: InformationSearchQuery): number {
    let score = 0.5; // Base score

    // Boost for successful calls
    if (result.goalAchieved) score += 0.2;

    // Boost for high quality information
    if (result.informationQuality === 'high') score += 0.2;
    else if (result.informationQuality === 'medium') score += 0.1;

    // Boost for recent extractions
    const daysSinceExtraction = (Date.now() - result.extractedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceExtraction < 7) score += 0.1;

    return Math.min(score, 1.0);
  }
}