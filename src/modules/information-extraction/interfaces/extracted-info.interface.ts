export interface CallInformation {
  callId: string;
  businessId: string;
  extractedAt: Date;
  extractionConfidence: number;
  rawTranscript: string;
  
  // Primary contact information
  contactInfo: ContactInformation;
  
  // Business operational details
  operationalInfo: OperationalInformation;
  
  // Call outcome and success metrics
  callOutcome: CallOutcome;
  
  // Additional context
  metadata: ExtractionMetadata;
}

export interface ContactInformation {
  // Target person information
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
  
  // Alternative contacts discovered
  alternativeContacts: Array<{
    name?: string;
    title?: string;
    department?: string;
    phone?: string;
    extension?: string;
    email?: string;
    relationship?: string; // 'assistant', 'colleague', 'supervisor'
    notes?: string;
  }>;
  
  // General contact methods
  mainReceptionPhone?: string;
  mainEmail?: string;
  websiteContact?: string;
  onlineBookingUrl?: string;
  appointmentSystem?: string;
}

export interface OperationalInformation {
  // Business hours and availability
  businessHours?: {
    general?: string;
    departmentSpecific?: Record<string, string>;
    specialHours?: string; // holidays, emergency hours
  };
  
  // Services and capabilities
  servicesOffered?: string[];
  specialties?: string[];
  equipmentAvailable?: string[];
  
  // Access and location details
  locationDetails?: {
    parking?: string;
    accessibility?: string;
    directions?: string;
    multipleLocations?: string[];
  };
  
  // Policies and procedures
  policies?: {
    appointmentRequired?: boolean;
    referralNeeded?: boolean;
    insuranceAccepted?: string[];
    paymentMethods?: string[];
    cancellationPolicy?: string;
  };
  
  // Wait times and scheduling
  scheduling?: {
    averageWaitTime?: string;
    nextAvailableAppointment?: string;
    urgentCareAvailability?: string;
    bookingMethod?: string; // 'phone', 'online', 'in-person'
  };
}

export interface CallOutcome {
  success: boolean;
  goalAchieved: boolean;
  reason?: string;
  
  // What was accomplished
  accomplishments: {
    numberVerified: boolean;
    contactReached: boolean;
    informationGathered: boolean;
    appointmentScheduled: boolean;
    callbackArranged: boolean;
    referralReceived: boolean;
  };
  
  // Next steps identified
  nextSteps?: string[];
  followUpRequired?: boolean;
  followUpDate?: Date;
  
  // Call quality metrics
  callQuality: {
    duration: number; // in seconds
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
  
  // Confidence scores for different extraction types
  confidenceScores: {
    contactInfo: number;
    operationalInfo: number;
    callOutcome: number;
    overall: number;
  };
  
  // Extraction challenges
  challenges?: {
    poorAudioQuality?: boolean;
    multipleTransfers?: boolean;
    languageBarriers?: boolean;
    uncooperativeStaff?: boolean;
    technicalIssues?: boolean;
  };
  
  // Keywords and entities detected
  detectedEntities: {
    people: string[];
    departments: string[];
    phoneNumbers: string[];
    emails: string[];
    times: string[];
    locations: string[];
  };
  
  // Sentiment and tone analysis
  sentimentAnalysis?: {
    overallSentiment: 'positive' | 'neutral' | 'negative';
    staffHelpfulness: number; // 1-10 scale
    businessProfessionalism: number; // 1-10 scale
    likelyToRecommend: boolean;
  };
}

// Specialized interfaces for different business types
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

// Search and query interfaces
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