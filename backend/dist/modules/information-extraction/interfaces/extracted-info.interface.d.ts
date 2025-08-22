export interface CallInformation {
    callId: string;
    businessId: string;
    extractedAt: Date;
    extractionConfidence: number;
    rawTranscript: string;
    contactInfo: ContactInformation;
    operationalInfo: OperationalInformation;
    callOutcome: CallOutcome;
    metadata: ExtractionMetadata;
}
export interface ContactInformation {
    targetPerson?: {
        found: boolean;
        name?: string;
        title?: string;
        department?: string;
        directPhone?: string;
        extension?: string;
        email?: string;
        availability?: string;
        bestTimeToCall?: string;
        notes?: string;
    };
    alternativeContacts: Array<{
        name?: string;
        title?: string;
        department?: string;
        phone?: string;
        extension?: string;
        email?: string;
        relationship?: string;
        notes?: string;
    }>;
    mainReceptionPhone?: string;
    mainEmail?: string;
    websiteContact?: string;
    onlineBookingUrl?: string;
    appointmentSystem?: string;
}
export interface OperationalInformation {
    businessHours?: {
        general?: string;
        departmentSpecific?: Record<string, string>;
        specialHours?: string;
    };
    servicesOffered?: string[];
    specialties?: string[];
    equipmentAvailable?: string[];
    locationDetails?: {
        parking?: string;
        accessibility?: string;
        directions?: string;
        multipleLocations?: string[];
    };
    policies?: {
        appointmentRequired?: boolean;
        referralNeeded?: boolean;
        insuranceAccepted?: string[];
        paymentMethods?: string[];
        cancellationPolicy?: string;
    };
    scheduling?: {
        averageWaitTime?: string;
        nextAvailableAppointment?: string;
        urgentCareAvailability?: string;
        bookingMethod?: string;
    };
}
export interface CallOutcome {
    success: boolean;
    goalAchieved: boolean;
    reason?: string;
    accomplishments: {
        numberVerified: boolean;
        contactReached: boolean;
        informationGathered: boolean;
        appointmentScheduled: boolean;
        callbackArranged: boolean;
        referralReceived: boolean;
    };
    nextSteps?: string[];
    followUpRequired?: boolean;
    followUpDate?: Date;
    callQuality: {
        duration: number;
        ivrNavigationSuccess: boolean;
        humanInteractionTime: number;
        disconnections: number;
        transfersRequired: number;
    };
}
export interface ExtractionMetadata {
    extractionMethod: 'ai_powered' | 'rule_based' | 'hybrid';
    aiModel?: string;
    processingTime: number;
    confidenceScores: {
        contactInfo: number;
        operationalInfo: number;
        callOutcome: number;
        overall: number;
    };
    challenges?: {
        poorAudioQuality?: boolean;
        multipleTransfers?: boolean;
        languageBarriers?: boolean;
        uncooperativeStaff?: boolean;
        technicalIssues?: boolean;
    };
    detectedEntities: {
        people: string[];
        departments: string[];
        phoneNumbers: string[];
        emails: string[];
        times: string[];
        locations: string[];
    };
    sentimentAnalysis?: {
        overallSentiment: 'positive' | 'neutral' | 'negative';
        staffHelpfulness: number;
        businessProfessionalism: number;
        likelyToRecommend: boolean;
    };
}
export interface HospitalInformation extends CallInformation {
    medicalInfo: {
        departments: string[];
        specializations: string[];
        doctorsAvailable: Array<{
            name: string;
            specialty: string;
            availability: string;
            acceptingNewPatients: boolean;
        }>;
        emergencyServices: boolean;
        insuranceAccepted: string[];
        referralRequired: boolean;
    };
}
export interface RestaurantInformation extends CallInformation {
    restaurantInfo: {
        cuisineType: string[];
        servingHours: {
            breakfast?: string;
            lunch?: string;
            dinner?: string;
            lateNight?: string;
        };
        services: {
            dineIn: boolean;
            takeout: boolean;
            delivery: boolean;
            catering: boolean;
            reservations: boolean;
        };
        capacity: {
            seatingCapacity?: number;
            privateRooms?: boolean;
            eventHosting?: boolean;
        };
        pricing: {
            priceRange?: string;
            averageMealCost?: string;
            cateringMinimum?: string;
        };
    };
}
export interface OfficeInformation extends CallInformation {
    officeInfo: {
        businessType: string;
        keyPersonnel: Array<{
            name: string;
            position: string;
            contactInfo: string;
            responsibilities: string[];
        }>;
        services: string[];
        clientTypes: string[];
        meetingAvailability: string;
        consultationProcess: string;
    };
}
export interface InformationSearchQuery {
    businessId?: string;
    businessName?: string;
    targetPerson?: string;
    contactType?: 'phone' | 'email' | 'in-person';
    dateRange?: {
        from: Date;
        to: Date;
    };
    successfulOnly?: boolean;
    hasContactInfo?: boolean;
    department?: string;
    businessType?: string;
}
export interface InformationSearchResult {
    callInformation: CallInformation;
    business: {
        id: string;
        name: string;
        industry: string;
        location: string;
    };
    relevanceScore: number;
    lastUpdated: Date;
}
