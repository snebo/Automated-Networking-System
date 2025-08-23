import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const scraperApi = {
  scrapeBusinesses: async (query: string, location: string, maxResults?: number) => {
    const response = await api.post('/scraper/scrape-integrated', { 
      industry: query,  // Map query to industry field
      location: location,
      businessType: query,  // Also send as businessType for better matching
      keywords: [query, 'phone', 'contact', 'address', 'hours'],  // Add relevant keywords
      hasPhone: true,  // Hardcoded: always require phone numbers
      limit: maxResults || 50,  // User configurable: default 50
      minRating: 3.0,  // Hardcoded: only get businesses with decent ratings
      excludeContentTypes: ['blog_articles', 'news_articles', 'social_media', 'directories', 'reviews_only'],  // Use correct enum values
      onlyBusinessListings: true,  // Hardcoded: only get actual business listings
      requirePhysicalLocation: true,  // Hardcoded: require businesses to have addresses
      hasWebsite: true,  // Hardcoded: prefer businesses with websites
      enableVerificationWorkflow: false,  // Disabled: don't enable verification workflow yet
      autoGenerateScripts: false,  // Disabled: don't auto-generate scripts yet
      priority: 'high'  // Hardcoded: high priority processing
    });
    return response.data;
  },
  
  getScrapedBusinesses: async () => {
    const response = await api.get('/scraper/businesses');
    console.log('Raw API Response from /scraper/businesses:', response.data);
    return response.data;
  },

  enrichBusinessData: async (businessId: string) => {
    const response = await api.post('/scraper/enrich', { businessId });
    return response.data;
  },

  getBusinessesWithScripts: async () => {
    const response = await api.get('/scraper/businesses/with-scripts');
    return response.data;
  },

  executeCompleteWorkflow: async (data: {
    query: string;
    location: string;
    script: string;
    goal: string;
    maxBusinesses?: number;
  }) => {
    const response = await api.post('/scraper/execute-complete-workflow', data);
    return response.data;
  },

  getWorkflowStatus: async (workflowId: string) => {
    const response = await api.get(`/scraper/workflow/${workflowId}/status`);
    return response.data;
  },

  getWorkflowResults: async (workflowId: string) => {
    const response = await api.get(`/scraper/workflow/${workflowId}/results`);
    return response.data;
  },

  deleteBusiness: async (businessId: string) => {
    console.log(`Calling DELETE /scraper/businesses/${businessId}`);
    try {
      const response = await api.delete(`/scraper/businesses/${businessId}`);
      console.log('Delete response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Delete API error:', error);
      throw error;
    }
  },
};

export const telephonyApi = {
  initiateCall: async (phoneNumber: string, scriptId?: string) => {
    const response = await api.post('/telephony/call', { phoneNumber, scriptId });
    return response.data;
  },
  
  getCalls: async () => {
    const response = await api.get('/telephony/calls');
    return response.data;
  },
  
  getCallStatus: async (callSid: string) => {
    const response = await api.get(`/telephony/call/${callSid}`);
    return response.data;
  },
  
  sendDTMF: async (callSid: string, digits: string) => {
    const response = await api.post(`/telephony/call/${callSid}/dtmf`, { digits });
    return response.data;
  },

  getCalledBusinesses: async () => {
    const response = await api.get('/telephony/called-businesses');
    return response.data;
  },
};

export const informationApi = {
  extractInformation: async (callTranscript: string) => {
    const response = await api.post('/information/extract', { transcript: callTranscript });
    return response.data;
  },
  
  searchBusinesses: async (query: string) => {
    const response = await api.post('/information/search', { query });
    return response.data;
  },

  getBusinessById: async (businessId: string) => {
    const response = await api.get(`/information/business/${businessId}`);
    return response.data;
  },

  getStatistics: async () => {
    const response = await api.get('/information/statistics');
    return response.data;
  },

  getRecentExtractions: async () => {
    const response = await api.get('/information/recent');
    return response.data;
  },

  getContactsSummary: async (businessId: string) => {
    const response = await api.get(`/information/contacts/${businessId}/summary`);
    return response.data;
  },
};

export const conversationApi = {
  testHumanConversation: async (phoneNumber: string, script: string, goal: string) => {
    const response = await api.post('/conversation/test-human-conversation', {
      phoneNumber,
      script,
      goal
    });
    return response.data;
  },

  simulateHumanResponse: async (callSid: string, message: string) => {
    const response = await api.post('/conversation/simulate-human-response', {
      callSid,
      message
    });
    return response.data;
  },

  getConversationStatus: async (callSid: string) => {
    const response = await api.get(`/conversation/conversation-status/${callSid}`);
    return response.data;
  },

  getActiveConversations: async () => {
    const response = await api.get('/conversation/active-conversations');
    return response.data;
  },
};