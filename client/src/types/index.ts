export interface PhoneNumber {
  formatted: string;
  country: string;
}

export interface Address {
  formatted?: string;
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export interface Business {
  id: string;
  name: string;
  phoneNumber?: string | PhoneNumber;
  address?: string | Address;
  website?: string;
  category?: string;
  industry?: string;
  description?: string;
  services?: string[];
  rating?: number;
  reviews?: number;
  scrapedAt: Date;
  source?: string;
  confidence?: number;
  enriched?: boolean;
  script?: string;
  email?: string;
}

export interface CallSession {
  callSid: string;
  phoneNumber: string;
  businessId?: string;
  business?: Business;
  status: 'queued' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'no-answer' | 'busy';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  transcript?: TranscriptEntry[];
  ivrDecisions?: IVRDecision[];
  script?: string;
  goal?: string;
}

export interface TranscriptEntry {
  id: string;
  speaker: 'agent' | 'human';
  text: string;
  timestamp: Date;
}

export interface IVRDecision {
  id: string;
  prompt: string;
  selectedOption: string;
  timestamp: Date;
  reasoning?: string;
}

export interface WorkflowResult {
  id: string;
  businessId: string;
  businessName: string;
  verifiedPhone: string;
  contacts: Contact[];
  completedAt: Date;
}

export interface Contact {
  name: string;
  role: string;
  department?: string;
  directPhone?: string;
  email?: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  result?: any;
  error?: string;
}

export interface WorkflowExecution {
  id: string;
  query: string;
  location: string;
  script: string;
  goal: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  steps: WorkflowStep[];
  results: {
    businessesFound: number;
    callsAttempted: number;
    successfulCalls: number;
    contactsExtracted: number;
  };
}

export interface ScrapingResult {
  businesses: Business[];
  totalFound: number;
  query: string;
  location: string;
  timestamp: Date;
}

export interface CallProgress {
  callSid: string;
  business: Business;
  status: CallSession['status'];
  startTime: Date;
  duration?: number;
  transcript: TranscriptEntry[];
  ivrDecisions: IVRDecision[];
  extractedInfo?: {
    contacts: Contact[];
    verifiedPhone?: string;
    businessInfo?: any;
  };
}