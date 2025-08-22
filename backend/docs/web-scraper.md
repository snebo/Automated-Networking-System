# Web Scraper API Documentation

The Web Scraper module provides comprehensive business information scraping from multiple data sources including Google Search, DuckDuckGo, Yelp, Yellow Pages, and custom websites.

## Table of Contents
- [Overview](#overview)
- [API Endpoints](#api-endpoints)
- [Data Sources](#data-sources)
- [Request/Response Examples](#requestresponse-examples)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

## Overview

The Web Scraper extracts business information such as:
- Company name and contact details
- Phone numbers and email addresses
- Physical addresses
- Website URLs
- Business hours and services
- Industry classification

All scraped data is automatically stored in the database and deduplicated based on phone numbers and websites.

## API Endpoints

### 1. Scrape Business Information

**Endpoint:** `POST /scraper/scrape`

Searches and scrapes business information from various sources based on specified criteria.

#### Request Body
```typescript
{
  industry?: string;        // Business category (e.g., "restaurants")
  location?: string;        // Geographic location (e.g., "New York, NY")
  businessType?: string;    // Specific business type (e.g., "pizza restaurant")
  keywords?: string[];      // Search keywords (e.g., ["pizza", "delivery"])
  limit?: number;          // Max results (1-500, default: 50)
  sources?: DataSource[];  // Specific sources to use
}
```

#### Response
```typescript
{
  businesses: BusinessInfo[];
  totalFound: number;
  errors?: string[];
  executionTime: number;
}
```

### 2. Get Stored Businesses

**Endpoint:** `GET /scraper/businesses`

Retrieves previously scraped businesses with optional filters.

#### Query Parameters
- `industry` (optional): Filter by industry
- `location` (optional): Filter by location
- `notCalledDays` (optional): Filter businesses not called in X days

#### Response
Returns an array of stored `BusinessInfo` objects.

### 3. Enrich Business Data

**Endpoint:** `POST /scraper/enrich`

Enriches existing business data with additional information.

#### Request Body
```typescript
{
  phoneNumber: string;
}
```

## Data Sources

The scraper supports multiple data sources:

| Source | Enum Value | Description |
|--------|------------|-------------|
| Google Search | `google_search` | Primary search engine results |
| DuckDuckGo | `duckduckgo` | Privacy-focused search engine |
| Yelp | `yelp` | Business reviews and listings |
| Yellow Pages | `yellow_pages` | Business directory |
| Bing Search | `bing_search` | Microsoft search engine |
| Google Maps | `google_maps` | Google Places (requires API key) |
| Custom Website | `custom_website` | Direct website scraping |

## Request/Response Examples

### Example 1: Basic Restaurant Search

**Request:**
```bash
curl -X POST http://localhost:3000/scraper/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "businessType": "restaurant",
    "location": "Austin, TX",
    "keywords": ["pizza", "italian"],
    "limit": 20
  }'
```

**Response:**
```json
{
  "businesses": [
    {
      "name": "Tony's Italian Pizza",
      "phoneNumber": "+15125551234",
      "email": "info@tonyspizza.com",
      "address": {
        "street": "123 Main St",
        "city": "Austin",
        "state": "TX",
        "zipCode": "78701",
        "country": "USA",
        "formatted": "123 Main St, Austin, TX 78701"
      },
      "website": "https://tonyspizza.com",
      "industry": "Restaurant",
      "description": "Authentic Italian pizza and pasta",
      "services": ["Dine-in", "Takeout", "Delivery"],
      "businessHours": {
        "monday": { "open": "11:00", "close": "22:00" },
        "tuesday": { "open": "11:00", "close": "22:00" },
        "wednesday": { "open": "11:00", "close": "22:00" },
        "thursday": { "open": "11:00", "close": "22:00" },
        "friday": { "open": "11:00", "close": "23:00" },
        "saturday": { "open": "11:00", "close": "23:00" },
        "sunday": { "open": "12:00", "close": "21:00" }
      },
      "scrapedAt": "2024-01-15T10:30:00Z",
      "source": "google_search",
      "confidence": 0.85
    }
  ],
  "totalFound": 15,
  "executionTime": 12500
}
```

### Example 2: Multi-Source Hospital Search

**Request:**
```bash
curl -X POST http://localhost:3000/scraper/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "businessType": "hospital",
    "location": "Dallas, TX",
    "sources": ["google_search", "duckduckgo", "yelp"],
    "limit": 10
  }'
```

**Response:**
```json
{
  "businesses": [
    {
      "name": "Presbyterian Hospital of Dallas",
      "phoneNumber": "+12148651000",
      "address": {
        "street": "8200 Walnut Hill Ln",
        "city": "Dallas",
        "state": "TX",
        "zipCode": "75231",
        "country": "USA",
        "formatted": "8200 Walnut Hill Ln, Dallas, TX 75231"
      },
      "website": "https://www.presbyteriandallas.com",
      "industry": "General Hospital",
      "services": [
        "Emergency Services",
        "Surgery Center",
        "Cardiology",
        "Oncology",
        "Maternity Services",
        "ICU",
        "Radiology"
      ],
      "businessHours": {
        "monday": { "open": "00:00", "close": "23:59" },
        "tuesday": { "open": "00:00", "close": "23:59" },
        "wednesday": { "open": "00:00", "close": "23:59" },
        "thursday": { "open": "00:00", "close": "23:59" },
        "friday": { "open": "00:00", "close": "23:59" },
        "saturday": { "open": "00:00", "close": "23:59" },
        "sunday": { "open": "00:00", "close": "23:59" }
      },
      "scrapedAt": "2024-01-15T10:30:00Z",
      "source": "google_search",
      "confidence": 0.90
    }
  ],
  "totalFound": 8,
  "executionTime": 18750
}
```

### Example 3: Get Stored Businesses with Filters

**Request:**
```bash
curl "http://localhost:3000/scraper/businesses?industry=restaurant&location=Austin&notCalledDays=30"
```

**Response:**
```json
[
  {
    "id": "clr123456789",
    "name": "Tony's Italian Pizza",
    "phoneNumber": "+15125551234",
    "email": "info@tonyspizza.com",
    "address": {
      "formatted": "123 Main St, Austin, TX 78701"
    },
    "website": "https://tonyspizza.com",
    "industry": "Restaurant",
    "scrapedAt": "2024-01-15T10:30:00Z",
    "source": "google_search",
    "confidence": 0.85
  }
]
```

### Example 4: Custom Website Scraping

**Request:**
```bash
curl -X POST http://localhost:3000/scraper/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "sources": ["custom_website"],
    "keywords": ["https://example-restaurant.com"],
    "limit": 1
  }'
```

### Example 5: Industry-Specific Search

**Request:**
```bash
curl -X POST http://localhost:3000/scraper/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "industry": "healthcare",
    "businessType": "dental clinic",
    "location": "Houston, TX",
    "keywords": ["dentist", "oral surgery"],
    "sources": ["google_search", "yelp"],
    "limit": 25
  }'
```

## Error Handling

The API returns appropriate HTTP status codes and error messages:

### HTTP Status Codes
- `200 OK`: Request successful
- `400 Bad Request`: Invalid query parameters
- `500 Internal Server Error`: Scraping failed

### Error Response Format
```json
{
  "statusCode": 400,
  "message": "Invalid query parameters",
  "error": "Bad Request"
}
```

### Common Error Scenarios
1. **Rate Limiting**: When a source blocks requests, the scraper automatically falls back to alternative sources
2. **Network Timeouts**: Requests timeout after 10 seconds with automatic retries
3. **Invalid URLs**: Custom website scraping requires valid HTTP/HTTPS URLs
4. **No Results Found**: Returns empty array with `totalFound: 0`

## Best Practices

### 1. Source Selection
- Use `google_search` and `duckduckgo` for broad coverage
- Include `yelp` for businesses with customer reviews
- Add `yellow_pages` for traditional business listings
- Use `custom_website` only when you have specific URLs

### 2. Query Optimization
```javascript
// Good: Specific and focused
{
  "businessType": "pediatric dentist",
  "location": "Austin, TX",
  "keywords": ["children", "dental"],
  "limit": 20
}

// Better: More targeted
{
  "industry": "healthcare",
  "businessType": "pediatric dental clinic",
  "location": "Austin, TX",
  "sources": ["google_search", "yelp"],
  "limit": 15
}
```

### 3. Rate Limiting Awareness
- The scraper automatically handles rate limiting
- Different delays per source (Google: 3s, Yelp: 2s, Others: 1s)
- Exponential backoff on failures

### 4. Result Validation
```javascript
// Always check confidence scores
const highQualityResults = response.businesses.filter(
  business => business.confidence >= 0.7 && business.phoneNumber
);
```

### 5. Data Persistence
- All results are automatically saved to database
- Duplicates are handled based on website URL and phone number
- Existing records are updated with new information

### 6. Performance Optimization
- Use appropriate `limit` values (recommended: 10-50)
- Consider using stored businesses for repeat queries
- Filter stored results by `notCalledDays` for lead management

### 7. Error Handling in Your Application
```javascript
try {
  const response = await fetch('/scraper/scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query)
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // Check for partial failures
  if (data.errors && data.errors.length > 0) {
    console.warn('Some sources failed:', data.errors);
  }
  
  return data.businesses;
} catch (error) {
  console.error('Scraping failed:', error);
  // Handle error appropriately
}
```

## Data Schema

### BusinessInfo Interface
```typescript
interface BusinessInfo {
  id?: string;
  name: string;
  phoneNumber?: string;
  alternatePhones?: string[];
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    formatted?: string;
  };
  website?: string;
  email?: string;
  businessHours?: {
    monday?: { open: string; close: string; isClosed?: boolean };
    tuesday?: { open: string; close: string; isClosed?: boolean };
    wednesday?: { open: string; close: string; isClosed?: boolean };
    thursday?: { open: string; close: string; isClosed?: boolean };
    friday?: { open: string; close: string; isClosed?: boolean };
    saturday?: { open: string; close: string; isClosed?: boolean };
    sunday?: { open: string; close: string; isClosed?: boolean };
    timezone?: string;
  };
  industry?: string;
  description?: string;
  services?: string[];
  metadata?: Record<string, any>;
  scrapedAt: Date;
  source: DataSource;
  confidence: number; // 0-1 reliability score
}
```

## Rate Limits and Quotas

The scraper implements respectful rate limiting:
- **Google Search**: 3 second delay between requests
- **Yelp**: 2 second delay between requests
- **Other sources**: 1 second delay between requests
- **Max retries**: 3 attempts with exponential backoff
- **Request timeout**: 10 seconds

## Swagger Documentation

The API includes full Swagger documentation available at `/api` when the application is running. This provides an interactive interface for testing endpoints and viewing detailed schema information.