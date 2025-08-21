# Unified Complete Workflow - Example Usage

## 🚀 Complete Form-Based Workflow Endpoint

**Endpoint**: `POST /scraper/execute-complete-workflow`

This unified endpoint connects all individual features into one complete workflow:
1. **Searches** for businesses matching your criteria
2. **Generates custom scripts** for each business based on their services
3. **Automatically initiates calls** to each business using AI
4. **Extracts and stores** the intended information from conversations
5. **Provides progress tracking** and results review

## 📝 Example Form Data

```json
{
  "industry": "restaurants",
  "location": "Austin, TX",
  "businessType": "italian restaurants",
  "targetPerson": "manager",
  "callingGoal": "Discuss catering services for corporate events",
  "maxBusinesses": 5,
  "requirePhone": true,
  "informationToGather": [
    "catering menu options",
    "pricing per person",
    "minimum order size",
    "delivery areas",
    "contact information"
  ],
  "callerIdentity": "John Smith from ABC Corporate Events",
  "contactInfo": "john@abccorp.com or (555) 123-4567",
  "startCallingImmediately": true,
  "callDelay": 45,
  "maxConcurrentCalls": 1,
  "notificationEmail": "john@abccorp.com"
}
```

## 🔄 Workflow Process

### Phase 1: Business Discovery (20-40% progress)
- Searches DuckDuckGo and Google for matching businesses
- Extracts contact info, addresses, services
- Filters out irrelevant results (blogs, reviews, etc.)
- Stores businesses in database

### Phase 2: Script Generation (40-50% progress)
- Generates custom calling scripts for each business
- Tailors scripts based on:
  - Business type and services offered
  - Target person (manager, owner, etc.)
  - Your specific goals and information needs
  - Your caller identity and contact info
- Assigns scripts to respective businesses

### Phase 3: Automated Calling (50-100% progress)
- Initiates calls with proper delays between them
- Uses AI to navigate IVR systems
- Conducts conversations based on generated scripts
- Adapts to different scenarios (voicemail, transfers, etc.)

### Phase 4: Data Extraction & Storage
- Real-time extraction of key information during calls
- Structured storage of:
  - Contact details gathered
  - Pricing information
  - Service capabilities
  - Availability and scheduling
  - Next steps and follow-ups

## 📊 Response Format

```json
{
  "workflowId": "workflow_1642781234_abc123xyz",
  "status": "calling",
  "scrapeResults": {
    "totalFound": 5,
    "businessesWithScripts": 5,
    "readyForCalling": 4
  },
  "callingResults": {
    "totalCalls": 4,
    "completed": 0,
    "inProgress": 1,
    "queued": 3,
    "failed": 0
  },
  "extractedData": {
    "businessesWithData": 0,
    "totalInformationGathered": 0,
    "successfulCalls": 0
  },
  "estimatedCompletionTime": "2025-01-21T18:30:00Z",
  "nextSteps": [
    "Calls are being executed in background",
    "Check workflow status: GET /scraper/workflow/workflow_1642781234_abc123xyz/status",
    "View results when complete: GET /scraper/workflow/workflow_1642781234_abc123xyz/results"
  ]
}
```

## 🔍 Progress Tracking

**Check Status**: `GET /scraper/workflow/{workflowId}/status`
```json
{
  "workflowId": "workflow_1642781234_abc123xyz",
  "status": "calling",
  "progress": 75,
  "currentStep": "Call 3 of 4 in progress",
  "scrapeResults": { ... },
  "callingResults": { ... },
  "extractedData": { ... }
}
```

## 📋 Results Review

**Get Results**: `GET /scraper/workflow/{workflowId}/results`
```json
{
  "workflowId": "workflow_1642781234_abc123xyz",
  "status": "completed",
  "totalBusinesses": 5,
  "totalCalls": 4,
  "businesses": [
    {
      "id": "bus123",
      "name": "Tony's Italian Kitchen",
      "phoneNumber": "+15121234567",
      "industry": "restaurant",
      "callStatus": "completed",
      "assignedScript": {
        "id": "script456",
        "name": "Information Gathering Script - restaurant for manager",
        "goal": "Discuss catering services for corporate events"
      },
      "extractedData": {
        "contactInfo": {
          "managerName": "Maria Rodriguez",
          "directPhone": "+15121234568",
          "email": "maria@tonysitalian.com"
        },
        "operationalInfo": {
          "cateringAvailable": true,
          "minimumOrder": 15,
          "pricePerPerson": "$18-25",
          "deliveryRadius": "20 miles"
        }
      },
      "lastCalled": "2025-01-21T17:45:00Z",
      "callCount": 1
    }
  ],
  "callSessions": [...],
  "summary": {
    "successfulCalls": 4,
    "businessesWithData": 4,
    "totalInformationGathered": 12
  }
}
```

## ✨ Key Benefits

1. **One-Click Solution**: Submit form data once, get complete results
2. **Intelligent Automation**: AI handles complex phone conversations
3. **Structured Data**: All information organized and ready for analysis
4. **Progress Transparency**: Real-time status updates and progress tracking
5. **Comprehensive Results**: Detailed call transcripts, extracted data, and next steps
6. **Scalable**: Handle 1-100 businesses with the same simplicity

## 🔧 Configuration Options

- **Call timing**: Adjust delays between calls
- **Information focus**: Specify exactly what data to gather
- **Caller identity**: Professional introduction for each call
- **Quality control**: Set minimum business standards and filters
- **Notification**: Email updates on completion
- **Concurrency**: Control how many calls run simultaneously

This unified workflow eliminates the need to manage multiple separate processes and provides a complete business research and data collection solution through a single API call.