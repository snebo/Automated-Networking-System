import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { ScriptManagerService } from '../script-manager/script-manager.service';
import * as cheerio from 'cheerio';
import { firstValueFrom } from 'rxjs';
import {
  ScraperQuery,
  BusinessInfo,
  ScrapeResult,
  DataSource,
} from './interfaces/scraper.interface';

@Injectable()
export class WebScraperService {
  private readonly logger = new Logger(WebScraperService.name);
  private readonly requestDelays = new Map<string, number>();
  private readonly maxRetries = 3;
  private readonly baseDelay = 1500; // 1.5 seconds

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly scriptManager: ScriptManagerService,
  ) {}

  async scrapeBusinesses(query: ScraperQuery): Promise<ScrapeResult> {
    const startTime = Date.now();
    const businesses: BusinessInfo[] = [];
    const errors: string[] = [];

    this.logger.log(`Starting scrape for query: ${JSON.stringify(query)}`);

    try {
      // Use DuckDuckGo as primary source (more reliable than Google)
      const duckDuckGoResults = await this.scrapeDuckDuckGo(query);
      businesses.push(...duckDuckGoResults);

      // If not enough results, try Google
      if (businesses.length < (query.limit || 10)) {
        try {
          const googleResults = await this.scrapeGoogleSearch(query);
          businesses.push(...googleResults);
        } catch (error) {
          this.logger.warn(`Google scraping failed: ${error.message}`);
          errors.push(`Google: ${error.message}`);
        }
      }

      // Remove duplicates based on website or phone
      const uniqueBusinesses = this.removeDuplicates(businesses);

      // Save to database
      await this.saveBusinessesToDatabase(uniqueBusinesses);

      const finalResults = uniqueBusinesses.slice(0, query.limit || 50);

      this.logger.log(`Scraping completed. Found ${finalResults.length} businesses`);

      return {
        businesses: finalResults,
        totalFound: finalResults.length,
        errors,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`Scraping failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async scrapeDuckDuckGo(query: ScraperQuery): Promise<BusinessInfo[]> {
    const businesses: BusinessInfo[] = [];
    
    // Build search query
    const searchTerms = [];
    if (query.businessType) searchTerms.push(query.businessType);
    if (query.keywords?.length) searchTerms.push(...query.keywords);
    if (query.location) searchTerms.push(query.location);
    
    const searchQuery = searchTerms.join(' ');
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;
    
    this.logger.log(`Searching DuckDuckGo: ${searchQuery}`);

    try {
      await this.respectRateLimit('duckduckgo.com');
      
      const response = await this.makeHttpRequest(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      
      // Extract search results
      const searchResults: Array<{title: string, link: string, snippet: string}> = [];
      
      $('.result').each((index, element) => {
        if (searchResults.length >= (query.limit || 20)) return;
        
        const $elem = $(element);
        let link = $elem.find('.result__url').attr('href');
        const title = $elem.find('.result__title').text().trim();
        const snippet = $elem.find('.result__snippet').text().trim();
        
        // Fix DuckDuckGo's redirect URLs
        if (link && link.startsWith('//duckduckgo.com/l/?uddg=')) {
          const match = link.match(/uddg=([^&]+)/);
          if (match) {
            link = decodeURIComponent(match[1]);
          }
        }
        
        if (title && link && link.startsWith('http')) {
          // Basic filtering - skip obvious non-business results
          if (!this.isObviouslyNonBusiness(title, snippet)) {
            searchResults.push({ title, link, snippet });
          }
        }
      });

      this.logger.log(`Found ${searchResults.length} search results from DuckDuckGo`);

      // Extract detailed business info from each result
      for (const result of searchResults.slice(0, query.limit || 10)) {
        try {
          const businessInfo = await this.extractBusinessInfoFromUrl(
            result.link, 
            result.title, 
            result.snippet
          );
          
          if (businessInfo && this.isValidBusiness(businessInfo)) {
            businesses.push(businessInfo);
          }
        } catch (err) {
          this.logger.debug(`Failed to extract from ${result.link}: ${err.message}`);
          
          // Add basic info if extraction fails
          const basicBusiness: BusinessInfo = {
            name: result.title,
            website: result.link,
            description: result.snippet,
            scrapedAt: new Date(),
            source: DataSource.DUCKDUCKGO,
            confidence: 0.5,
          };
          
          if (this.isValidBusiness(basicBusiness)) {
            businesses.push(basicBusiness);
          }
        }

        // Add delay between extractions
        if (searchResults.indexOf(result) < searchResults.length - 1) {
          await this.sleep(800);
        }
      }

    } catch (error) {
      this.logger.error(`DuckDuckGo scraping error: ${error.message}`);
      throw error;
    }

    return businesses;
  }

  private async scrapeGoogleSearch(query: ScraperQuery): Promise<BusinessInfo[]> {
    const businesses: BusinessInfo[] = [];
    
    // Build search query
    const searchTerms = [];
    if (query.businessType) searchTerms.push(query.businessType);
    if (query.keywords?.length) searchTerms.push(...query.keywords);
    if (query.location) searchTerms.push(query.location);
    
    const searchQuery = searchTerms.join(' ');
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&num=20`;
    
    this.logger.log(`Searching Google: ${searchQuery}`);

    try {
      await this.respectRateLimit('google.com');
      
      const response = await this.makeHttpRequest(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      
      // Extract organic search results
      $('.g').each((index, element) => {
        if (businesses.length >= (query.limit || 20)) return;
        
        const $elem = $(element);
        const link = $elem.find('a').first().attr('href');
        const title = $elem.find('h3').first().text().trim();
        const snippet = $elem.find('.VwiC3b, .s3v9rd, .st').text().trim();
        
        if (title && link && link.startsWith('http')) {
          // Basic filtering
          if (!this.isObviouslyNonBusiness(title, snippet)) {
            // Add basic business info
            const basicBusiness: BusinessInfo = {
              name: title,
              website: link,
              description: snippet,
              scrapedAt: new Date(),
              source: DataSource.GOOGLE_SEARCH,
              confidence: 0.6,
            };
            
            if (this.isValidBusiness(basicBusiness)) {
              businesses.push(basicBusiness);
            }
          }
        }
      });

    } catch (error) {
      this.logger.error(`Google scraping error: ${error.message}`);
      throw error;
    }

    return businesses;
  }

  private async extractBusinessInfoFromUrl(url: string, name: string, snippet: string): Promise<BusinessInfo | null> {
    try {
      const domain = new URL(url).hostname;
      await this.respectRateLimit(domain);
      
      const response = await this.makeHttpRequest(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 8000,
      });

      const $ = cheerio.load(response.data);
      
      // Extract business information
      const phoneNumber = this.findPhoneNumber($);
      const email = this.findEmail($);
      const address = this.findAddress($);
      const services = this.findServices($);
      const extractedName = this.findBusinessName($) || name;

      return {
        name: extractedName,
        phoneNumber: phoneNumber || undefined,
        email: email || undefined,
        address: address ? { formatted: address, country: 'USA' } : undefined,
        website: url,
        industry: this.determineIndustry($, domain, extractedName),
        description: this.findDescription($) || snippet || undefined,
        services: services && services.length > 0 ? services : undefined,
        scrapedAt: new Date(),
        source: DataSource.GOOGLE_SEARCH,
        confidence: this.calculateConfidence(phoneNumber || undefined, email || undefined, address || undefined, extractedName),
      };
      
    } catch (error) {
      this.logger.debug(`Failed to extract from ${url}: ${error.message}`);
      return null;
    }
  }

  private findPhoneNumber($: any): string | null {
    // Look for tel: links first
    const telLink = $('a[href^="tel:"]').first();
    if (telLink.length) {
      const phone = telLink.attr('href')?.replace('tel:', '').trim();
      if (phone && this.isValidPhoneNumber(phone)) {
        return this.normalizePhoneNumber(phone);
      }
    }

    // Look in common selectors
    const phoneSelectors = [
      '.phone', '.telephone', '.contact-phone', '.phone-number',
      '.contact-info', '.contact', 'footer'
    ];

    for (const selector of phoneSelectors) {
      const text = $(selector).text().trim();
      const phone = this.extractPhoneFromText(text);
      if (phone) return phone;
    }

    // Last resort: scan page text
    const bodyText = $('body').text().substring(0, 2000); // First 2000 chars only
    return this.extractPhoneFromText(bodyText);
  }

  private extractPhoneFromText(text: string): string | null {
    if (!text) return null;

    const phonePatterns = [
      /\b\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
      /\b\d{3}-\d{3}-\d{4}\b/g,
      /\b\(\d{3}\)\s?\d{3}-\d{4}\b/g,
    ];

    for (const regex of phonePatterns) {
      const matches = text.match(regex);
      if (matches) {
        for (const match of matches) {
          if (this.isValidPhoneNumber(match)) {
            return this.normalizePhoneNumber(match);
          }
        }
      }
    }

    return null;
  }

  private isValidPhoneNumber(phone: string): boolean {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 10 || cleaned.length > 11) return false;
    
    const areaCode = parseInt(cleaned.substring(cleaned.length === 11 ? 1 : 0, cleaned.length === 11 ? 4 : 3));
    return areaCode >= 200 && areaCode < 900;
  }

  private normalizePhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`;
    }
    return phone;
  }

  private findEmail($: any): string | null {
    // Look for mailto links
    const mailtoLink = $('a[href^="mailto:"]').first();
    if (mailtoLink.length) {
      return mailtoLink.attr('href')?.replace('mailto:', '').trim();
    }

    // Look in common selectors
    const emailSelectors = ['.email', '.contact-email', '.contact-info', '.contact'];
    
    for (const selector of emailSelectors) {
      const text = $(selector).text().trim();
      const email = this.extractEmailFromText(text);
      if (email) return email;
    }

    return null;
  }

  private extractEmailFromText(text: string): string | null {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const match = text.match(emailRegex);
    return match ? match[0] : null;
  }

  private findAddress($: any): string | null {
    // Priority selectors for addresses
    const addressSelectors = [
      '.address', '.location', '.contact-address', 
      '.business-address', '.street-address', '.location-info',
      '.contact-location', '.address-info', '.full-address',
      '[itemtype*="PostalAddress"]', '[itemprop="address"]'
    ];

    for (const selector of addressSelectors) {
      const text = $(selector).text().trim();
      if (text && this.isValidAddress(text)) {
        return text;
      }
    }

    // Check JSON-LD structured data for address
    $('script[type="application/ld+json"]').each((i: number, elem: any) => {
      try {
        const data = JSON.parse($(elem).text());
        if (data.address) {
          if (typeof data.address === 'string') {
            return data.address;
          } else if (data.address.streetAddress || data.address.addressLocality) {
            const parts = [
              data.address.streetAddress,
              data.address.addressLocality,
              data.address.addressRegion,
              data.address.postalCode
            ].filter(Boolean);
            if (parts.length >= 2) {
              return parts.join(', ');
            }
          }
        }
      } catch (e) {
        // Invalid JSON, continue
      }
    });

    // Look for address patterns in text
    const bodyText = $('body').text();
    const addressPattern = /\b\d+\s+[A-Za-z\s]+(Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Boulevard|Blvd|Lane|Ln)[,\s]+[A-Za-z\s]+[,\s]+[A-Z]{2}\s+\d{5}/gi;
    const addressMatch = bodyText.match(addressPattern);
    if (addressMatch && addressMatch[0]) {
      return addressMatch[0].trim();
    }

    return null;
  }

  private isValidAddress(text: string): boolean {
    if (!text || text.length < 10 || text.length > 300) return false;
    
    // Must contain some address-like patterns
    const addressIndicators = [
      /\d+\s+[A-Za-z]/,  // Number followed by street name
      /\b(street|st|avenue|ave|road|rd|drive|dr|boulevard|blvd|lane|ln)\b/i,
      /\b[A-Z]{2}\s+\d{5}/,  // State and ZIP
      /\d{5}(-\d{4})?$/,  // ZIP code at end
    ];
    
    return addressIndicators.some(pattern => pattern.test(text));
  }

  private findBusinessName($: any): string | null {
    const nameSelectors = ['h1', '.business-name', '.company-name', '.site-title', 'title'];

    for (const selector of nameSelectors) {
      const text = $(selector).first().text().trim();
      if (text && text.length > 0 && text.length < 100) {
        return text;
      }
    }

    return null;
  }

  private findDescription($: any): string | null {
    const descSelectors = [
      'meta[name="description"]', '.description', '.about', '.intro'
    ];

    for (const selector of descSelectors) {
      if (selector.startsWith('meta')) {
        const content = $(selector).attr('content');
        if (content && content.length > 10) {
          return content.trim();
        }
      } else {
        const text = $(selector).text().trim();
        if (text && text.length > 10 && text.length < 500) {
          return text;
        }
      }
    }

    return null;
  }

  private findServices($: any): string[] {
    const services: Set<string> = new Set();
    
    const serviceSelectors = [
      '.services li', '.service-list li', '.our-services li',
      'nav a', '.menu a'
    ];

    for (const selector of serviceSelectors) {
      $(selector).each((i: number, elem: any) => {
        const text = $(elem).text().trim();
        if (text && text.length > 2 && text.length < 50) {
          services.add(text);
        }
      });
    }

    return Array.from(services).slice(0, 10); // Limit to 10 services
  }

  private determineIndustry($: any, domain: string, name: string): string {
    const text = $('body').text().toLowerCase();
    const nameL = name.toLowerCase();
    
    if (nameL.includes('hospital') || text.includes('hospital')) return 'Hospital';
    if (nameL.includes('restaurant') || text.includes('restaurant')) return 'Restaurant';
    if (nameL.includes('clinic') || text.includes('clinic')) return 'Medical Clinic';
    if (nameL.includes('dental') || text.includes('dental')) return 'Dental';
    if (nameL.includes('hotel') || text.includes('hotel')) return 'Hotel';
    
    return 'Business';
  }

  private calculateConfidence(phoneNumber?: string, email?: string, address?: string, name?: string): number {
    let confidence = 0.5;
    
    if (phoneNumber) confidence += 0.3;
    if (address) confidence += 0.2;
    if (email) confidence += 0.1;
    if (name && name.length > 5) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  private isObviouslyNonBusiness(title: string, snippet: string): boolean {
    const text = `${title} ${snippet}`.toLowerCase();
    
    const nonBusinessPatterns = [
      'wikipedia', 'guide to', 'ultimate guide',
      'article', 'blog post', 'news'
    ];

    return nonBusinessPatterns.some(pattern => text.includes(pattern));
  }

  private isValidBusiness(business: BusinessInfo): boolean {
    // Must have a name
    if (!business.name || business.name.length < 3) return false;
    
    // Must have some contact info OR website
    const hasContact = !!(business.phoneNumber || business.email || business.address || business.website);
    
    return hasContact;
  }

  private removeDuplicates(businesses: BusinessInfo[]): BusinessInfo[] {
    const seen = new Set<string>();
    return businesses.filter((business) => {
      const key = business.website || business.phoneNumber || business.name.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private async saveBusinessesToDatabase(businesses: BusinessInfo[]): Promise<void> {
    for (const business of businesses) {
      try {
        // Use upsert to handle duplicates gracefully
        await this.prisma.business.upsert({
          where: {
            website: business.website || `temp_${Date.now()}_${Math.random()}`, // Handle null websites
          },
          update: {
            // Update with newer data if business already exists
            name: business.name,
            phoneNumber: business.phoneNumber,
            email: business.email,
            addressFormatted: business.address?.formatted,
            industry: business.industry,
            description: business.description,
            services: business.services || [],
            source: business.source.toString(),
            confidence: business.confidence,
            updatedAt: new Date(),
          },
          create: {
            name: business.name,
            website: business.website,
            phoneNumber: business.phoneNumber,
            email: business.email,
            addressFormatted: business.address?.formatted,
            industry: business.industry,
            description: business.description,
            services: business.services || [],
            source: business.source.toString(),
            confidence: business.confidence,
          },
        });
      } catch (error) {
        this.logger.warn(`Failed to save/update business ${business.name}: ${error.message}`);
      }
    }
  }

  private async respectRateLimit(domain: string): Promise<void> {
    const lastRequest = this.requestDelays.get(domain);
    const now = Date.now();
    
    if (lastRequest) {
      const timeSinceLastRequest = now - lastRequest;
      const minDelay = this.getMinDelayForDomain(domain);
      
      if (timeSinceLastRequest < minDelay) {
        const waitTime = minDelay - timeSinceLastRequest;
        await this.sleep(waitTime);
      }
    }
    
    this.requestDelays.set(domain, Date.now());
  }

  private getMinDelayForDomain(domain: string): number {
    const domainDelays: Record<string, number> = {
      'google.com': 3000,
      'duckduckgo.com': 1500,
    };
    
    return domainDelays[domain] || this.baseDelay;
  }

  private async makeHttpRequest(url: string, config: any, retryCount = 0): Promise<any> {
    try {
      return await firstValueFrom(this.httpService.get(url, config));
    } catch (error) {
      if (retryCount < this.maxRetries && this.isRetryableError(error)) {
        const delay = this.baseDelay * Math.pow(2, retryCount);
        this.logger.warn(`Request failed, retrying in ${delay}ms: ${error.message}`);
        await this.sleep(delay);
        return this.makeHttpRequest(url, config, retryCount + 1);
      }
      throw error;
    }
  }

  private isRetryableError(error: any): boolean {
    return error.code === 'ECONNRESET' || 
           error.code === 'ETIMEDOUT' || 
           error.response?.status >= 500;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Additional methods required by controller
  async getStoredBusinesses(filters?: { industry?: string; location?: string; notCalledSince?: Date }): Promise<BusinessInfo[]> {
    const businesses = await this.prisma.business.findMany({
      where: {
        ...(filters?.industry && { industry: { contains: filters.industry, mode: 'insensitive' } }),
        ...(filters?.location && { addressFormatted: { contains: filters.location, mode: 'insensitive' } }),
        ...(filters?.notCalledSince && { 
          OR: [
            { lastCalled: null },
            { lastCalled: { lt: filters.notCalledSince } }
          ]
        }),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return businesses.map(b => ({
      id: b.id,
      name: b.name,
      phoneNumber: b.phoneNumber || undefined,
      email: b.email || undefined,
      address: b.addressFormatted ? { formatted: b.addressFormatted, country: 'USA' } : undefined,
      website: b.website || undefined,
      industry: b.industry || undefined,
      description: b.description || undefined,
      services: b.services || undefined,
      scrapedAt: b.createdAt,
      source: b.source as DataSource,
      confidence: b.confidence,
    }));
  }

  async generateTestData(filters?: { industry?: string; location?: string }): Promise<any> {
    const testBusinesses = [
      {
        name: "Mario's Italian Bistro",
        phoneNumber: "+15551234567",
        industry: "restaurants",
        businessType: "Italian Restaurant",
        address: { formatted: "123 Main St, Los Angeles, CA 90210", city: "Los Angeles", state: "CA" },
        website: "https://mariositalian.com",
        services: ["Fine Dining", "Catering", "Wine Bar"],
        description: "Authentic Italian cuisine with fresh pasta and wine selection"
      },
      {
        name: "General Hospital of Los Angeles",
        phoneNumber: "+15551111111",
        industry: "healthcare",
        businessType: "Hospital",
        address: { formatted: "100 Medical Center Dr, Los Angeles, CA 90213", city: "Los Angeles", state: "CA" },
        website: "https://lageneralhospital.com",
        services: ["Emergency Care", "Surgery", "ICU", "Maternity"],
        description: "Full-service hospital with 24/7 emergency care"
      },
    ];

    // Apply filters
    let filteredBusinesses = testBusinesses;
    if (filters?.industry) {
      filteredBusinesses = testBusinesses.filter(b => 
        b.industry.toLowerCase().includes(filters.industry!.toLowerCase())
      );
    }

    return {
      businesses: filteredBusinesses,
      totalFound: filteredBusinesses.length,
      note: "This is test data for development. Use /scraper/scrape for live scraping.",
      executionTime: 1
    };
  }

  async enrichBusinessData(phoneNumber: string): Promise<BusinessInfo | null> {
    this.logger.log(`Enriching data for ${phoneNumber}`);
    return null; // Placeholder
  }

  async getBusinessesWithScripts(filters?: any): Promise<any[]> {
    return []; // Placeholder - would integrate with business/script management
  }

  async assignScriptToBusiness(businessId: string, scriptId: string, customGoal?: string): Promise<any> {
    return { message: 'Not implemented in clean scraper' }; // Placeholder
  }

  async executeBulkCalls(bulkCallDto: any): Promise<any> {
    return { message: 'Not implemented in clean scraper' }; // Placeholder
  }

  async scrapeWithIntegratedWorkflow(query: ScraperQuery): Promise<any> {
    const startTime = Date.now();
    this.logger.log(`Starting integrated workflow: scrape + script generation for ${query.businessType || 'businesses'} in ${query.location || 'any location'}`);
    
    // Step 1: Perform the scraping using our new system
    const scrapeResult = await this.scrapeBusinesses(query);
    
    if (scrapeResult.businesses.length === 0) {
      return {
        scrapeResult,
        businesses: [],
        summary: {
          totalFound: 0,
          processed: 0,
          withScripts: 0,
          workflowEnabled: false,
          message: 'No businesses found to process'
        }
      };
    }

    this.logger.log(`Found ${scrapeResult.businesses.length} businesses, generating custom scripts...`);
    
    // Step 2: Get saved businesses from database (they now have IDs)
    const savedBusinesses = await this.prisma.business.findMany({
      where: {
        OR: scrapeResult.businesses.map(b => ({ website: b.website }))
      }
    });

    this.logger.log(`Found ${savedBusinesses.length} saved businesses, generating scripts...`);

    // Step 3: Generate and assign scripts for each business
    const businessesWithScripts = [];
    let scriptsGenerated = 0;
    
    for (const savedBusiness of savedBusinesses) {
      // Find corresponding scraped business data
      const scrapedBusiness = scrapeResult.businesses.find(b => b.website === savedBusiness.website);
      if (!scrapedBusiness) continue;
      
      try {

        // Create script generation request based on business and query
        const scriptRequest = {
          businessType: query.businessType || savedBusiness.industry || 'business',
          industry: savedBusiness.industry || query.businessType || 'general',
          specificGoal: query.specificGoal || this.generateGoalFromServices(scrapedBusiness),
          targetPerson: query.targetPerson || this.inferTargetPersonFromIndustry(savedBusiness.industry || undefined),
          businessServices: savedBusiness.services || [],
          businessName: savedBusiness.name
        };

        // Generate tailored script
        const generatedScript = await this.scriptManager.generateScript(scriptRequest);
        
        // Save script to database
        const savedScript = await this.prisma.script.create({
          data: {
            name: generatedScript.name,
            description: generatedScript.description,
            goal: generatedScript.goal,
            context: generatedScript.context,
            phases: generatedScript.phases as any, // JSON field
            adaptationRules: generatedScript.adaptationRules as any, // JSON field
            isActive: true
          }
        });

        // Update business with assigned script
        await this.prisma.business.update({
          where: { id: savedBusiness.id },
          data: {
            assignedScriptId: savedScript.id,
            customGoal: query.specificGoal
          }
        });

        // Combine saved business data with scraped data and script info
        businessesWithScripts.push({
          ...scrapedBusiness,
          id: savedBusiness.id, // Add the database ID
          assignedScript: {
            id: savedScript.id,
            name: savedScript.name,
            goal: savedScript.goal,
            targetPerson: generatedScript.targetPerson
          },
          workflowEnabled: true,
          readyForCalling: !!(savedBusiness.phoneNumber && savedScript.id)
        });

        scriptsGenerated++;
        this.logger.log(`Generated script "${savedScript.name}" for ${savedBusiness.name}`);
        
      } catch (error) {
        this.logger.warn(`Failed to generate script for ${savedBusiness.name}: ${error.message}`);
        
        // Add business without script
        businessesWithScripts.push({
          ...(scrapedBusiness || {}),
          id: savedBusiness.id,
          name: savedBusiness.name,
          assignedScript: null,
          workflowEnabled: false,
          readyForCalling: false,
          scriptError: error.message
        });
      }
    }

    const summary = {
      totalFound: scrapeResult.totalFound,
      processed: scrapeResult.businesses.length,
      withScripts: scriptsGenerated,
      readyForCalling: businessesWithScripts.filter(b => b.readyForCalling).length,
      workflowEnabled: true,
      executionTime: Date.now() - startTime,
      targetPerson: query.targetPerson || 'business representative',
      specificGoal: query.specificGoal || 'tailored business inquiry'
    };

    this.logger.log(`Integrated workflow completed: ${summary.withScripts}/${summary.processed} businesses have custom scripts`);

    return {
      scrapeResult,
      businesses: businessesWithScripts,
      summary,
      workflow: {
        enabled: true,
        scriptsGenerated: scriptsGenerated,
        nextSteps: [
          'Review generated scripts for accuracy',
          'Initiate calling workflow for businesses with scripts',
          'Monitor call outcomes and script effectiveness'
        ]
      }
    };
  }

  private generateGoalFromServices(business: BusinessInfo): string {
    if (!business.services || business.services.length === 0) {
      return 'General business inquiry about services and capabilities';
    }

    const services = business.services.slice(0, 3).join(', ');
    return `Inquire about ${services} and discuss potential collaboration`;
  }

  private inferTargetPersonFromIndustry(industry?: string): string {
    if (!industry) return 'manager or representative';
    
    const industryLower = industry.toLowerCase();
    
    if (industryLower.includes('hospital') || industryLower.includes('medical')) {
      return 'department coordinator';
    } else if (industryLower.includes('restaurant') || industryLower.includes('food')) {
      return 'manager';
    } else if (industryLower.includes('dental')) {
      return 'office manager';
    } else if (industryLower.includes('hotel')) {
      return 'events coordinator';
    }
    
    return 'manager or representative';
  }

  async startVerificationWorkflowForBusinesses(businessIds: string[], options: any): Promise<any> {
    return { message: 'Not implemented in clean scraper' }; // Placeholder
  }

  async getScriptById(scriptId: string): Promise<any> {
    return null; // Placeholder
  }

  async getAllScripts(): Promise<any[]> {
    return []; // Placeholder
  }
}