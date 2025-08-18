import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import * as cheerio from 'cheerio';
import { firstValueFrom } from 'rxjs';
import {
  ScraperQuery,
  BusinessInfo,
  ScrapeResult,
  DataSource,
  Address,
} from './interfaces/scraper.interface';

@Injectable()
export class WebScraperService {
  private readonly logger = new Logger(WebScraperService.name);
  private readonly requestDelays = new Map<string, number>();
  private readonly maxRetries = 3;
  private readonly baseDelay = 1000; // 1 second

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async scrapeBusinesses(query: ScraperQuery): Promise<ScrapeResult> {
    const startTime = Date.now();
    const businesses: BusinessInfo[] = [];
    const errors: string[] = [];

    try {
      // Determine which sources to use - default to Google Search for better results
      const sources = query.sources || [DataSource.GOOGLE_SEARCH, DataSource.GOOGLE_MAPS];

      for (const source of sources) {
        try {
          const sourceResults = await this.scrapeFromSource(source, query);
          businesses.push(...sourceResults);
        } catch (error) {
          this.logger.error(`Failed to scrape from ${source}: ${error.message}`);
          errors.push(`${source}: ${error.message}`);
        }
      }

      // Save to database
      await this.saveBusinessesToDatabase(businesses);

      // Deduplicate by phone number
      const uniqueBusinesses = this.deduplicateBusinesses(businesses);

      return {
        businesses: uniqueBusinesses.slice(0, query.limit || 50),
        totalFound: uniqueBusinesses.length,
        errors,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`Scraping failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async scrapeFromSource(
    source: DataSource,
    query: ScraperQuery,
  ): Promise<BusinessInfo[]> {
    switch (source) {
      case DataSource.GOOGLE_SEARCH:
        return this.scrapeGoogleSearch(query);
      case DataSource.GOOGLE_MAPS:
        return this.scrapeGoogleMaps(query);
      case DataSource.YELLOW_PAGES:
        return this.scrapeYellowPages(query);
      case DataSource.YELP:
        return this.scrapeYelp(query);
      case DataSource.CUSTOM_WEBSITE:
        return this.scrapeCustomWebsite(query);
      case DataSource.BING_SEARCH:
        return this.scrapeBingSearch(query);
      case DataSource.DUCKDUCKGO:
        return this.scrapeDuckDuckGo(query);
      default:
        throw new Error(`Unsupported data source: ${source}`);
    }
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
      $('.g').each(async (index, element) => {
        if (businesses.length >= (query.limit || 50)) return;
        
        const $elem = $(element);
        const link = $elem.find('a').first().attr('href');
        const title = $elem.find('h3').first().text().trim();
        const snippet = $elem.find('.VwiC3b').text().trim();
        
        // Look for phone numbers in snippets
        const phoneMatch = snippet.match(/(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/);
        
        if (title && link) {
          // Try to extract more info from the website
          if (link.startsWith('http')) {
            try {
              const businessInfo = await this.extractBusinessInfoFromUrl(link, title, snippet);
              if (businessInfo) {
                businesses.push(businessInfo);
              }
            } catch (err) {
              // If extraction fails, still add basic info
              businesses.push({
                name: title,
                website: link,
                description: snippet,
                phoneNumber: phoneMatch ? this.normalizePhoneNumber(phoneMatch[0]) : undefined,
                scrapedAt: new Date(),
                source: DataSource.GOOGLE_SEARCH,
                confidence: 0.6,
              });
            }
          }
        }
      });

      // Also check for Google Maps results in the search page
      $('.rllt__link').each((index, element) => {
        if (businesses.length >= (query.limit || 50)) return;
        
        const $elem = $(element);
        const name = $elem.find('.OSrXXb').text().trim();
        const address = $elem.find('.rllt__details div:first-child').text().trim();
        const phone = $elem.find('.rllt__details div:contains("·")').text().split('·').pop()?.trim();
        
        if (name) {
          businesses.push({
            name,
            phoneNumber: phone ? this.normalizePhoneNumber(phone) : undefined,
            address: address ? { formatted: address, country: 'USA' } : undefined,
            scrapedAt: new Date(),
            source: DataSource.GOOGLE_SEARCH,
            confidence: 0.8,
          });
        }
      });

      this.logger.log(`Scraped ${businesses.length} businesses from Google Search`);
    } catch (error) {
      this.logger.error(`Google Search scraping error: ${error.message}`);
      
      // Fallback to DuckDuckGo if Google blocks us
      if (error.message.includes('403') || error.message.includes('429')) {
        this.logger.warn('Google blocking detected, falling back to DuckDuckGo');
        return this.scrapeDuckDuckGo(query);
      }
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
        timeout: 5000,
      });

      const $ = cheerio.load(response.data);
      const phoneNumber = this.findPhoneNumber($);
      const email = this.findEmail($);
      const address = this.findAddress($);
      const services = this.findServices($, domain);
      const businessHours = this.findBusinessHours($);

      return {
        name,
        phoneNumber: phoneNumber ? this.normalizePhoneNumber(phoneNumber) : undefined,
        email: email || undefined,
        address: address ? { formatted: address, country: 'USA' } : undefined,
        website: url,
        industry: this.determineIndustry($, domain, name),
        description: snippet || this.findDescription($) || undefined,
        services,
        businessHours,
        scrapedAt: new Date(),
        source: DataSource.GOOGLE_SEARCH,
        confidence: 0.75,
      };
    } catch (error) {
      return null;
    }
  }

  private async scrapeGoogleMaps(query: ScraperQuery): Promise<BusinessInfo[]> {
    // Note: Google Maps requires API key for proper access
    // This is a placeholder for Google Places API integration
    this.logger.warn('Google Maps scraping requires API key configuration');
    
    // Would integrate with Google Places API
    // const apiKey = this.configService.get('scraper.googleMapsApiKey');
    
    return [];
  }

  private async scrapeYellowPages(query: ScraperQuery): Promise<BusinessInfo[]> {
    const businesses: BusinessInfo[] = [];
    const searchUrl = this.buildYellowPagesUrl(query);

    try {
      await this.respectRateLimit('yellowpages.com');
      const response = await this.makeHttpRequest(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const $ = cheerio.load(response.data);
      
      $('.result').each((index, element) => {
        const business = this.parseYellowPagesListing($, element);
        if (business && business.phoneNumber) {
          businesses.push(business);
        }
      });

      this.logger.log(`Scraped ${businesses.length} businesses from Yellow Pages`);
    } catch (error) {
      this.logger.error(`Yellow Pages scraping error: ${error.message}`);
    }

    return businesses;
  }

  private buildYellowPagesUrl(query: ScraperQuery): string {
    const baseUrl = 'https://www.yellowpages.com/search';
    const params = new URLSearchParams();
    
    if (query.keywords) {
      params.append('search_terms', query.keywords.join(' '));
    }
    if (query.businessType) {
      params.append('search_terms', query.businessType);
    }
    if (query.location) {
      params.append('geo_location_terms', query.location);
    }

    return `${baseUrl}?${params.toString()}`;
  }

  private buildYelpUrl(query: ScraperQuery): string {
    const baseUrl = 'https://www.yelp.com/search';
    const params = new URLSearchParams();
    
    // Build search term
    const searchTerms = [];
    if (query.businessType) {
      searchTerms.push(query.businessType);
    }
    if (query.keywords && query.keywords.length > 0) {
      searchTerms.push(...query.keywords);
    }
    if (query.industry) {
      searchTerms.push(query.industry);
    }
    
    if (searchTerms.length > 0) {
      params.append('find_desc', searchTerms.join(' '));
    }
    
    if (query.location) {
      params.append('find_loc', query.location);
    }

    return `${baseUrl}?${params.toString()}`;
  }

  private parseYelpListing($: any, element: any): BusinessInfo | null {
    try {
      const $elem = $(element);
      
      // Extract business name
      const name = $elem.find('h3 a span, .businessName span').first().text().trim();
      if (!name) return null;

      // Extract phone number
      const phoneText = $elem.find('[data-testid="phone-number"], .phone').text().trim();
      const phoneNumber = this.normalizePhoneNumber(phoneText);

      // Extract address
      const addressElem = $elem.find('[data-testid="address"]').first();
      const street = addressElem.find('span').first().text().trim();
      const cityStateZip = addressElem.find('span').last().text().trim();
      
      // Parse city, state, zip from "City, ST ZIP" format
      const cityStateMatch = cityStateZip.match(/^(.+?),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
      
      return {
        name,
        phoneNumber: phoneNumber || undefined,
        address: {
          street,
          city: cityStateMatch?.[1],
          state: cityStateMatch?.[2],
          zipCode: cityStateMatch?.[3],
          country: 'USA',
          formatted: `${street}, ${cityStateZip}`,
        },
        website: $elem.find('a[href*="biz_redir"]').first().attr('href'),
        industry: $elem.find('[data-testid="category-link"], .category-link').first().text().trim(),
        description: $elem.find('.snippet p').text().trim(),
        scrapedAt: new Date(),
        source: DataSource.YELP,
        confidence: 0.85,
      };
    } catch (error) {
      this.logger.warn(`Failed to parse Yelp listing: ${error.message}`);
      return null;
    }
  }

  private parseYelpListingAlternative($: any, element: any): BusinessInfo | null {
    try {
      const $elem = $(element);
      
      const name = $elem.find('.businessName').text().trim() || 
                   $elem.find('h3').text().trim();
      
      if (!name) return null;

      const phoneNumber = this.normalizePhoneNumber(
        $elem.find('.phone').text().trim()
      );

      const addressText = $elem.find('.address').text().trim();
      
      return {
        name,
        phoneNumber: phoneNumber || undefined,
        address: {
          formatted: addressText,
          country: 'USA',
        },
        industry: $elem.find('.category').first().text().trim(),
        description: $elem.find('.snippet').text().trim(),
        scrapedAt: new Date(),
        source: DataSource.YELP,
        confidence: 0.75,
      };
    } catch (error) {
      this.logger.warn(`Failed to parse Yelp listing (alternative): ${error.message}`);
      return null;
    }
  }

  private parseYellowPagesListing($: any, element: any): BusinessInfo | null {
    try {
      const $elem = $(element);
      
      return {
        name: $elem.find('.business-name').text().trim(),
        phoneNumber: this.normalizePhoneNumber(
          $elem.find('.phones').text().trim()
        ),
        address: {
          street: $elem.find('.street-address').text().trim(),
          city: $elem.find('.locality').text().trim(),
          state: $elem.find('.state').text().trim(),
          zipCode: $elem.find('.postal-code').text().trim(),
          country: 'USA',
          formatted: $elem.find('.adr').text().trim(),
        },
        website: $elem.find('.track-visit-website').attr('href'),
        industry: $elem.find('.categories a').first().text().trim(),
        description: $elem.find('.snippet').text().trim(),
        scrapedAt: new Date(),
        source: DataSource.YELLOW_PAGES,
        confidence: 0.8,
      };
    } catch (error) {
      this.logger.warn(`Failed to parse listing: ${error.message}`);
      return null;
    }
  }

  private async scrapeYelp(query: ScraperQuery): Promise<BusinessInfo[]> {
    const businesses: BusinessInfo[] = [];
    const searchUrl = this.buildYelpUrl(query);

    try {
      await this.respectRateLimit('yelp.com');
      const response = await this.makeHttpRequest(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      
      // Yelp uses different selectors than Yellow Pages
      $('div[data-testid="serp-ia-card"]').each((index, element) => {
        const business = this.parseYelpListing($, element);
        if (business && business.phoneNumber) {
          businesses.push(business);
        }
      });

      // Also try alternative selector structure
      if (businesses.length === 0) {
        $('.searchResult').each((index, element) => {
          const business = this.parseYelpListingAlternative($, element);
          if (business && business.phoneNumber) {
            businesses.push(business);
          }
        });
      }

      this.logger.log(`Scraped ${businesses.length} businesses from Yelp`);
    } catch (error) {
      this.logger.error(`Yelp scraping error: ${error.message}`);
    }

    return businesses;
  }

  private async scrapeDuckDuckGo(query: ScraperQuery): Promise<BusinessInfo[]> {
    const businesses: BusinessInfo[] = [];
    const searchResults: Array<{title: string, link: string, snippet: string}> = [];
    
    // Build search query
    const searchTerms = [];
    if (query.businessType) searchTerms.push(query.businessType);
    if (query.keywords?.length) searchTerms.push(...query.keywords);
    if (query.location) searchTerms.push(query.location);
    
    const searchQuery = searchTerms.join(' ');
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;
    
    try {
      await this.respectRateLimit('duckduckgo.com');
      
      const response = await this.makeHttpRequest(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      
      // Step 1: Extract search results
      $('.result').each((index, element) => {
        if (searchResults.length >= (query.limit || 50)) return;
        
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
          searchResults.push({ title, link, snippet });
        }
      });

      this.logger.log(`Found ${searchResults.length} search results from DuckDuckGo`);

      // Step 2: Deep scrape each result
      for (const result of searchResults) {
        try {
          this.logger.debug(`Deep scraping: ${result.link}`);
          
          // Extract detailed business info from the website
          const businessInfo = await this.extractBusinessInfoFromUrl(
            result.link, 
            result.title, 
            result.snippet
          );
          
          if (businessInfo) {
            businesses.push(businessInfo);
          } else {
            // If deep scrape fails, still save basic info
            businesses.push({
              name: result.title,
              website: result.link,
              description: result.snippet,
              scrapedAt: new Date(),
              source: DataSource.DUCKDUCKGO,
              confidence: 0.5,
            });
          }
        } catch (err) {
          this.logger.warn(`Failed to deep scrape ${result.link}: ${err.message}`);
          
          // Add basic info even if deep scrape fails
          businesses.push({
            name: result.title,
            website: result.link,
            description: result.snippet,
            scrapedAt: new Date(),
            source: DataSource.DUCKDUCKGO,
            confidence: 0.4,
          });
        }

        // Add delay between deep scrapes to be respectful
        if (searchResults.indexOf(result) < searchResults.length - 1) {
          await this.sleep(1000);
        }
      }

      this.logger.log(`Deep scraped ${businesses.length} businesses from DuckDuckGo`);
    } catch (error) {
      this.logger.error(`DuckDuckGo scraping error: ${error.message}`);
    }

    return businesses;
  }

  private async scrapeBingSearch(query: ScraperQuery): Promise<BusinessInfo[]> {
    const businesses: BusinessInfo[] = [];
    
    // Build search query
    const searchTerms = [];
    if (query.businessType) searchTerms.push(query.businessType);
    if (query.keywords?.length) searchTerms.push(...query.keywords);
    if (query.location) searchTerms.push(query.location);
    
    const searchQuery = searchTerms.join(' ');
    const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(searchQuery)}&count=20`;
    
    try {
      await this.respectRateLimit('bing.com');
      
      const response = await this.makeHttpRequest(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      
      // Extract search results from Bing
      $('.b_algo').each((index, element) => {
        if (businesses.length >= (query.limit || 50)) return;
        
        const $elem = $(element);
        const link = $elem.find('h2 a').attr('href');
        const title = $elem.find('h2').text().trim();
        const snippet = $elem.find('.b_caption p').text().trim();
        
        // Look for phone numbers
        const phoneMatch = snippet.match(/(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/);
        
        if (title && link) {
          businesses.push({
            name: title,
            website: link,
            description: snippet,
            phoneNumber: phoneMatch ? this.normalizePhoneNumber(phoneMatch[0]) : undefined,
            scrapedAt: new Date(),
            source: DataSource.BING_SEARCH,
            confidence: 0.65,
          });
        }
      });

      this.logger.log(`Scraped ${businesses.length} businesses from Bing`);
    } catch (error) {
      this.logger.error(`Bing scraping error: ${error.message}`);
    }

    return businesses;
  }

  private async scrapeCustomWebsite(query: ScraperQuery): Promise<BusinessInfo[]> {
    const businesses: BusinessInfo[] = [];
    
    // Custom website scraping requires a URL in the query
    if (!query.keywords || !query.keywords.some(keyword => keyword.startsWith('http'))) {
      this.logger.warn('Custom website scraping requires a URL in keywords');
      return [];
    }

    const url = query.keywords.find(keyword => keyword.startsWith('http'));
    if (!url) return [];

    try {
      const domain = new URL(url).hostname;
      await this.respectRateLimit(domain);
      const response = await this.makeHttpRequest(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 15000,
      });

      const $ = cheerio.load(response.data);
      
      // Try to extract business information using common patterns
      const business = this.parseCustomWebsite($, url);
      if (business) {
        businesses.push(business);
      }

      this.logger.log(`Scraped ${businesses.length} businesses from custom website`);
    } catch (error) {
      this.logger.error(`Custom website scraping error: ${error.message}`);
    }

    return businesses;
  }

  private parseCustomWebsite($: any, url: string): BusinessInfo | null {
    try {
      // Try various selectors to find business information
      const name = this.findBusinessName($);
      const phoneNumber = this.findPhoneNumber($);
      const address = this.findAddress($);
      const email = this.findEmail($);
      const description = this.findDescription($);

      if (!name && !phoneNumber) {
        return null;
      }

      return {
        name: name || 'Unknown Business',
        phoneNumber: phoneNumber ? this.normalizePhoneNumber(phoneNumber) : undefined,
        address: address ? { formatted: address, country: 'USA' } : undefined,
        email: email || undefined,
        website: url,
        description: description || undefined,
        scrapedAt: new Date(),
        source: DataSource.CUSTOM_WEBSITE,
        confidence: 0.7,
      };
    } catch (error) {
      this.logger.warn(`Failed to parse custom website: ${error.message}`);
      return null;
    }
  }

  private findBusinessName($: any): string | null {
    const selectors = [
      'h1',
      '.business-name',
      '.company-name',
      '.site-title',
      'title',
      '.logo img[alt]',
      '.header h1',
      '.brand',
      '.business-title',
    ];

    for (const selector of selectors) {
      const text = $(selector).first().text().trim();
      if (text && text.length > 0 && text.length < 100) {
        return text;
      }
      
      // Check alt text for images
      const alt = $(selector).first().attr('alt');
      if (alt && alt.length > 0 && alt.length < 100) {
        return alt;
      }
    }

    return null;
  }

  private findPhoneNumber($: any): string | null {
    const selectors = [
      'a[href^="tel:"]',
      '.phone',
      '.telephone',
      '.contact-phone',
      '.phone-number',
      '.tel',
    ];

    for (const selector of selectors) {
      const href = $(selector).attr('href');
      if (href && href.startsWith('tel:')) {
        return href.replace('tel:', '');
      }
      
      const text = $(selector).text().trim();
      if (text && this.isPhoneNumber(text)) {
        return text;
      }
    }

    // Search for phone patterns in all text
    const phoneRegex = /(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;
    const bodyText = $('body').text();
    const match = phoneRegex.exec(bodyText);
    
    return match ? match[0] : null;
  }

  private findAddress($: any): string | null {
    const selectors = [
      '.address',
      '.location',
      '.contact-address',
      '.business-address',
      '.street-address',
      '[itemtype*="PostalAddress"]',
    ];

    for (const selector of selectors) {
      const text = $(selector).text().trim();
      if (text && text.length > 10 && text.length < 200) {
        return text;
      }
    }

    return null;
  }

  private findEmail($: any): string | null {
    const selectors = [
      'a[href^="mailto:"]',
      '.email',
      '.contact-email',
    ];

    for (const selector of selectors) {
      const href = $(selector).attr('href');
      if (href && href.startsWith('mailto:')) {
        return href.replace('mailto:', '');
      }
      
      const text = $(selector).text().trim();
      if (text && this.isEmail(text)) {
        return text;
      }
    }

    // Search for email patterns in text
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const bodyText = $('body').text();
    const match = emailRegex.exec(bodyText);
    
    return match ? match[0] : null;
  }

  private findDescription($: any): string | null {
    const selectors = [
      'meta[name="description"]',
      '.description',
      '.about',
      '.intro',
      '.summary',
    ];

    for (const selector of selectors) {
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

  private isPhoneNumber(text: string): boolean {
    const phoneRegex = /^\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/;
    return phoneRegex.test(text.trim());
  }

  private isEmail(text: string): boolean {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$/;
    return emailRegex.test(text.trim());
  }

  private findServices($: any, domain: string): string[] {
    const services: Set<string> = new Set();
    
    // Common selectors for services/departments sections
    const serviceSelectors = [
      // Navigation and menu items
      'nav a',
      '.services a',
      '.departments a',
      '.specialties a',
      '.medical-services li',
      '.service-list li',
      '.our-services li',
      
      // For hospital sites specifically
      '[class*="service"] li',
      '[class*="department"] li',
      '[class*="specialty"] li',
      '[id*="service"] li',
      '[id*="department"] li',
      
      // Headers that indicate services
      'h3:contains("Services")',
      'h3:contains("Departments")',
      'h3:contains("Specialties")',
      'h3:contains("Centers")',
    ];

    // Hospital-specific service keywords to look for
    const medicalKeywords = [
      'Emergency', 'Surgery', 'Cardiology', 'Oncology', 'Pediatrics',
      'Maternity', 'ICU', 'Radiology', 'Laboratory', 'Pharmacy',
      'Rehabilitation', 'Physical Therapy', 'Mental Health', 'Orthopedics',
      'Neurology', 'Gastroenterology', 'Pulmonology', 'Endocrinology',
      'Urology', 'Nephrology', 'Dermatology', 'Ophthalmology',
      'Cancer Center', 'Heart Center', 'Trauma Center', 'Stroke Center',
      'Women\'s Health', 'Men\'s Health', 'Urgent Care', 'Primary Care',
      'Imaging', 'MRI', 'CT Scan', 'X-Ray', 'Ultrasound',
      'Blood Bank', 'Dialysis', 'Chemotherapy', 'Radiation',
      'Transplant', 'Bariatric', 'Robotics', 'Telemedicine'
    ];

    // Try to find services from navigation/menus
    for (const selector of serviceSelectors) {
      $(selector).each((i: number, elem: any) => {
        const text = $(elem).text().trim();
        if (text && text.length > 2 && text.length < 50) {
          // Check if it contains medical keywords
          for (const keyword of medicalKeywords) {
            if (text.toLowerCase().includes(keyword.toLowerCase())) {
              services.add(text);
              break;
            }
          }
        }
      });
    }

    // Look for services in the page content
    const bodyText = $('body').text();
    for (const keyword of medicalKeywords) {
      const regex = new RegExp(`\\b${keyword}\\s*(Center|Department|Unit|Service|Clinic)?\\b`, 'gi');
      const matches = bodyText.match(regex);
      if (matches) {
        matches.forEach((match: string) => {
          if (match.length < 50) {
            services.add(match.trim());
          }
        });
      }
    }

    // Limit to 20 most relevant services
    return Array.from(services).slice(0, 20);
  }

  private findBusinessHours($: any): any {
    const hours: any = {};
    
    // Common selectors for hours
    const hourSelectors = [
      '.hours',
      '.business-hours',
      '.opening-hours',
      '.store-hours',
      '[class*="hour"]',
      '[id*="hour"]',
      'table:contains("Monday")',
      'dl:contains("Monday")',
    ];

    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    for (const selector of hourSelectors) {
      const element = $(selector).first();
      if (element.length) {
        const text = element.text();
        
        // Try to parse hours for each day
        for (const day of dayNames) {
          const dayRegex = new RegExp(`${day}[:\s]+([0-9]{1,2}(?::[0-9]{2})?\\s*(?:am|pm)?)[^0-9]*([0-9]{1,2}(?::[0-9]{2})?\\s*(?:am|pm)?)`, 'i');
          const match = text.match(dayRegex);
          
          if (match) {
            hours[day] = {
              open: match[1],
              close: match[2],
              isClosed: false
            };
          } else if (text.toLowerCase().includes(`${day}.*closed`)) {
            hours[day] = {
              open: '',
              close: '',
              isClosed: true
            };
          }
        }
        
        if (Object.keys(hours).length > 0) {
          break;
        }
      }
    }

    // Check for 24/7 operations (common for hospitals)
    if ($('body').text().match(/24[\s\/]*7|24\s*hours|always\s*open/i)) {
      dayNames.forEach(day => {
        hours[day] = {
          open: '00:00',
          close: '23:59',
          isClosed: false
        };
      });
      hours.timezone = 'CST'; // Default to CST for Texas
    }

    return Object.keys(hours).length > 0 ? hours : undefined;
  }

  private determineIndustry($: any, domain: string, name: string): string {
    // For hospitals, determine specific type
    const text = $('body').text().toLowerCase();
    const nameL = name.toLowerCase();
    
    if (nameL.includes('children') || text.includes('pediatric')) {
      return 'Pediatric Hospital';
    }
    if (nameL.includes('cancer') || text.includes('oncology')) {
      return 'Cancer Treatment Center';
    }
    if (nameL.includes('heart') || text.includes('cardiac')) {
      return 'Cardiac Hospital';
    }
    if (nameL.includes('mental') || text.includes('psychiatric')) {
      return 'Mental Health Facility';
    }
    if (nameL.includes('rehabilitation') || nameL.includes('rehab')) {
      return 'Rehabilitation Hospital';
    }
    if (nameL.includes('veteran') || nameL.includes('va ')) {
      return 'Veterans Hospital';
    }
    if (text.includes('academic medical center') || text.includes('teaching hospital')) {
      return 'Academic Medical Center';
    }
    if (text.includes('trauma center')) {
      return 'Trauma Center';
    }
    
    // Default for medical facilities
    return 'General Hospital';
  }

  private async respectRateLimit(domain: string): Promise<void> {
    const lastRequest = this.requestDelays.get(domain);
    const now = Date.now();
    
    if (lastRequest) {
      const timeSinceLastRequest = now - lastRequest;
      const minDelay = this.getMinDelayForDomain(domain);
      
      if (timeSinceLastRequest < minDelay) {
        const waitTime = minDelay - timeSinceLastRequest;
        this.logger.debug(`Rate limiting: waiting ${waitTime}ms for ${domain}`);
        await this.sleep(waitTime);
      }
    }
    
    this.requestDelays.set(domain, Date.now());
  }

  private getMinDelayForDomain(domain: string): number {
    // Different delays for different domains to be respectful
    const domainDelays: Record<string, number> = {
      'yelp.com': 2000,
      'yellowpages.com': 1500,
      'google.com': 3000,
    };
    
    return domainDelays[domain] || this.baseDelay;
  }

  private async makeHttpRequest(url: string, config: any, retryCount = 0): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          ...config,
          validateStatus: (status) => status < 500, // Don't throw on 4xx errors
        }),
      );
      
      if (response.status >= 400) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      if (retryCount < this.maxRetries && this.isRetryableError(error)) {
        const delay = this.baseDelay * Math.pow(2, retryCount); // Exponential backoff
        this.logger.warn(`Request failed, retrying in ${delay}ms (attempt ${retryCount + 1}/${this.maxRetries}): ${error.message}`);
        
        await this.sleep(delay);
        return this.makeHttpRequest(url, config, retryCount + 1);
      }
      
      throw error;
    }
  }

  private isRetryableError(error: any): boolean {
    // Retry on network errors, timeouts, and certain HTTP status codes
    if (error.code === 'ECONNRESET' || 
        error.code === 'ETIMEDOUT' || 
        error.code === 'ENOTFOUND') {
      return true;
    }
    
    if (error.response?.status) {
      const status = error.response.status;
      // Retry on 5xx errors and some 4xx errors
      return status >= 500 || status === 429 || status === 408;
    }
    
    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private normalizePhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Format as +1XXXXXXXXXX for US numbers
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`;
    }
    
    return phone;
  }

  private deduplicateBusinesses(businesses: BusinessInfo[]): BusinessInfo[] {
    const seen = new Set<string>();
    return businesses.filter((business) => {
      const key = business.phoneNumber || business.name;
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
        // Check for duplicates based on website URL (primary identifier)
        if (business.website) {
          const existing = await this.prisma.business.findUnique({
            where: { website: business.website },
          });

          if (existing) {
            // Update existing business with new/better information
            await this.prisma.business.update({
              where: { website: business.website },
              data: {
                name: business.name || existing.name,
                phoneNumber: business.phoneNumber || existing.phoneNumber,
                email: business.email || existing.email,
                addressStreet: business.address?.street || existing.addressStreet,
                addressCity: business.address?.city || existing.addressCity,
                addressState: business.address?.state || existing.addressState,
                addressZip: business.address?.zipCode || existing.addressZip,
                addressCountry: business.address?.country || existing.addressCountry,
                addressFormatted: business.address?.formatted || existing.addressFormatted,
                industry: business.industry || existing.industry,
                description: business.description || existing.description,
                services: business.services || existing.services,
                businessHours: business.businessHours ? JSON.parse(JSON.stringify(business.businessHours)) : existing.businessHours,
                source: business.source.toString(),
                confidence: Math.max(business.confidence, existing.confidence),
                lastScraped: new Date(),
                scrapeCount: existing.scrapeCount + 1,
                metadata: {
                  ...(existing.metadata as any || {}),
                  ...(business.metadata || {}),
                  alternatePhones: business.alternatePhones,
                },
              },
            });
            
            this.logger.debug(`Updated existing business: ${business.name}`);
            continue;
          }
        }

        // Create new business entry
        await this.prisma.business.create({
          data: {
            name: business.name,
            website: business.website,
            phoneNumber: business.phoneNumber,
            email: business.email,
            addressStreet: business.address?.street,
            addressCity: business.address?.city,
            addressState: business.address?.state,
            addressZip: business.address?.zipCode,
            addressCountry: business.address?.country,
            addressFormatted: business.address?.formatted,
            industry: business.industry,
            description: business.description,
            services: business.services || [],
            businessHours: business.businessHours ? JSON.parse(JSON.stringify(business.businessHours)) : undefined,
            source: business.source.toString(),
            confidence: business.confidence,
            metadata: {
              ...business.metadata,
              alternatePhones: business.alternatePhones,
            },
          },
        });
        
        this.logger.debug(`Saved new business: ${business.name}`);
      } catch (error) {
        this.logger.warn(`Failed to save business ${business.name}: ${error.message}`);
      }
    }
  }

  async getStoredBusinesses(filters?: {
    industry?: string;
    location?: string;
    notCalledSince?: Date;
  }): Promise<BusinessInfo[]> {
    const businesses = await this.prisma.business.findMany({
      where: {
        ...(filters?.industry && {
          industry: {
            contains: filters.industry,
            mode: 'insensitive',
          },
        }),
        ...(filters?.location && {
          OR: [
            { addressCity: { contains: filters.location, mode: 'insensitive' } },
            { addressState: { contains: filters.location, mode: 'insensitive' } },
            { addressFormatted: { contains: filters.location, mode: 'insensitive' } },
          ],
        }),
        ...(filters?.notCalledSince && {
          OR: [
            { lastCalled: null },
            { lastCalled: { lt: filters.notCalledSince } },
          ],
        }),
      },
      orderBy: { lastScraped: 'desc' },
      take: 100,
    });

    return businesses.map((b) => ({
      id: b.id,
      name: b.name,
      phoneNumber: b.phoneNumber || undefined,
      email: b.email || undefined,
      address: b.addressFormatted ? {
        street: b.addressStreet || undefined,
        city: b.addressCity || undefined,
        state: b.addressState || undefined,
        zipCode: b.addressZip || undefined,
        country: b.addressCountry || undefined,
        formatted: b.addressFormatted || undefined,
      } : undefined,
      website: b.website || undefined,
      industry: b.industry || undefined,
      description: b.description || undefined,
      services: b.services,
      businessHours: b.businessHours as any,
      metadata: b.metadata as any,
      scrapedAt: b.lastScraped,
      source: b.source as DataSource,
      confidence: b.confidence,
    }));
  }

  async enrichBusinessData(phoneNumber: string): Promise<BusinessInfo | null> {
    // This would perform additional lookups to enrich existing data
    // Could use APIs like Clearbit, FullContact, etc.
    this.logger.log(`Enriching data for ${phoneNumber}`);
    
    // Placeholder implementation
    return null;
  }
}