"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var WebScraperService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebScraperService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../database/prisma.service");
const telephony_service_1 = require("../telephony/telephony.service");
const call_manager_service_1 = require("../call-manager/call-manager.service");
const cheerio = require("cheerio");
const rxjs_1 = require("rxjs");
const scraper_interface_1 = require("./interfaces/scraper.interface");
let WebScraperService = WebScraperService_1 = class WebScraperService {
    constructor(httpService, configService, prisma, telephonyService, callManager) {
        this.httpService = httpService;
        this.configService = configService;
        this.prisma = prisma;
        this.telephonyService = telephonyService;
        this.callManager = callManager;
        this.logger = new common_1.Logger(WebScraperService_1.name);
        this.requestDelays = new Map();
        this.maxRetries = 3;
        this.baseDelay = 1500;
        this.workflowStatuses = new Map();
    }
    async scrapeBusinesses(query) {
        const startTime = Date.now();
        const businesses = [];
        const errors = [];
        this.logger.log(`Starting scrape for query: ${JSON.stringify(query)}`);
        try {
            try {
                const yellowPagesResults = await this.scrapeYellowPages(query);
                businesses.push(...yellowPagesResults);
                this.logger.log(`YellowPages found ${yellowPagesResults.length} businesses`);
            }
            catch (error) {
                this.logger.warn(`YellowPages scraping failed: ${error.message}`);
                errors.push(`YellowPages: ${error.message}`);
            }
            if (businesses.length < (query.limit || 20)) {
                try {
                    const yelpResults = await this.scrapeYelp(query);
                    businesses.push(...yelpResults);
                    this.logger.log(`Yelp found ${yelpResults.length} businesses`);
                }
                catch (error) {
                    this.logger.warn(`Yelp scraping failed: ${error.message}`);
                    errors.push(`Yelp: ${error.message}`);
                }
            }
            if (businesses.length < (query.limit || 10)) {
                try {
                    const googleResults = await this.scrapeGoogleBusiness(query);
                    businesses.push(...googleResults);
                    this.logger.log(`Google found ${googleResults.length} businesses`);
                }
                catch (error) {
                    this.logger.warn(`Google scraping failed: ${error.message}`);
                    errors.push(`Google: ${error.message}`);
                }
            }
            if (businesses.length < (query.limit || 5)) {
                try {
                    const duckDuckGoResults = await this.scrapeDuckDuckGo(query);
                    businesses.push(...duckDuckGoResults);
                    this.logger.log(`DuckDuckGo found ${duckDuckGoResults.length} businesses`);
                }
                catch (error) {
                    this.logger.warn(`DuckDuckGo scraping failed: ${error.message}`);
                    errors.push(`DuckDuckGo: ${error.message}`);
                }
            }
            const uniqueBusinesses = this.removeDuplicates(businesses);
            await this.saveBusinessesToDatabase(uniqueBusinesses);
            const finalResults = uniqueBusinesses.slice(0, query.limit || 50);
            this.logger.log(`Scraping completed. Found ${finalResults.length} businesses`);
            return {
                businesses: finalResults,
                totalFound: finalResults.length,
                errors,
                executionTime: Date.now() - startTime,
            };
        }
        catch (error) {
            this.logger.error(`Scraping failed: ${error.message}`, error.stack);
            throw error;
        }
    }
    async scrapeDuckDuckGo(query) {
        const businesses = [];
        const searchTerms = [];
        if (query.businessType)
            searchTerms.push(query.businessType);
        if (query.keywords?.length)
            searchTerms.push(...query.keywords);
        if (query.location)
            searchTerms.push(query.location);
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
            const searchResults = [];
            $('.result').each((index, element) => {
                if (searchResults.length >= (query.limit || 20))
                    return;
                const $elem = $(element);
                let link = $elem.find('.result__url').attr('href');
                const title = $elem.find('.result__title').text().trim();
                const snippet = $elem.find('.result__snippet').text().trim();
                if (link && link.startsWith('//duckduckgo.com/l/?uddg=')) {
                    const match = link.match(/uddg=([^&]+)/);
                    if (match) {
                        link = decodeURIComponent(match[1]);
                    }
                }
                if (title && link && link.startsWith('http')) {
                    if (!this.isObviouslyNonBusiness(title, snippet)) {
                        searchResults.push({ title, link, snippet });
                    }
                }
            });
            this.logger.log(`Found ${searchResults.length} search results from DuckDuckGo`);
            for (const result of searchResults.slice(0, query.limit || 10)) {
                try {
                    const businessInfo = await this.extractBusinessInfoFromUrl(result.link, result.title, result.snippet);
                    if (businessInfo && this.isValidBusiness(businessInfo)) {
                        businesses.push(businessInfo);
                    }
                }
                catch (err) {
                    this.logger.debug(`Failed to extract from ${result.link}: ${err.message}`);
                    const basicBusiness = {
                        name: result.title,
                        website: result.link,
                        description: result.snippet,
                        scrapedAt: new Date(),
                        source: scraper_interface_1.DataSource.DUCKDUCKGO,
                        confidence: 0.5,
                    };
                    if (this.isValidBusiness(basicBusiness)) {
                        businesses.push(basicBusiness);
                    }
                }
                if (searchResults.indexOf(result) < searchResults.length - 1) {
                    await this.sleep(800);
                }
            }
        }
        catch (error) {
            this.logger.error(`DuckDuckGo scraping error: ${error.message}`);
            throw error;
        }
        return businesses;
    }
    async scrapeGoogleSearch(query) {
        const businesses = [];
        const searchTerms = [];
        if (query.businessType)
            searchTerms.push(query.businessType);
        if (query.keywords?.length)
            searchTerms.push(...query.keywords);
        if (query.location)
            searchTerms.push(query.location);
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
            $('.g').each((index, element) => {
                if (businesses.length >= (query.limit || 20))
                    return;
                const $elem = $(element);
                const link = $elem.find('a').first().attr('href');
                const title = $elem.find('h3').first().text().trim();
                const snippet = $elem.find('.VwiC3b, .s3v9rd, .st').text().trim();
                if (title && link && link.startsWith('http')) {
                    if (!this.isObviouslyNonBusiness(title, snippet)) {
                        const basicBusiness = {
                            name: title,
                            website: link,
                            description: snippet,
                            scrapedAt: new Date(),
                            source: scraper_interface_1.DataSource.GOOGLE_SEARCH,
                            confidence: 0.6,
                        };
                        if (this.isValidBusiness(basicBusiness)) {
                            businesses.push(basicBusiness);
                        }
                    }
                }
            });
        }
        catch (error) {
            this.logger.error(`Google scraping error: ${error.message}`);
            throw error;
        }
        return businesses;
    }
    async extractBusinessInfoFromUrl(url, name, snippet) {
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
                source: scraper_interface_1.DataSource.GOOGLE_SEARCH,
                confidence: this.calculateConfidence(phoneNumber || undefined, email || undefined, address || undefined, extractedName),
            };
        }
        catch (error) {
            this.logger.debug(`Failed to extract from ${url}: ${error.message}`);
            return null;
        }
    }
    findPhoneNumber($) {
        const telLink = $('a[href^="tel:"]').first();
        if (telLink.length) {
            const phone = telLink.attr('href')?.replace('tel:', '').trim();
            if (phone && this.isValidPhoneNumber(phone)) {
                return this.normalizePhoneNumber(phone);
            }
        }
        const phoneSelectors = [
            '.phone', '.telephone', '.contact-phone', '.phone-number',
            '.contact-info', '.contact', 'footer'
        ];
        for (const selector of phoneSelectors) {
            const text = $(selector).text().trim();
            const phone = this.extractPhoneFromText(text);
            if (phone)
                return phone;
        }
        const bodyText = $('body').text().substring(0, 2000);
        return this.extractPhoneFromText(bodyText);
    }
    extractPhoneFromText(text) {
        if (!text)
            return null;
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
    isValidPhoneNumber(phone) {
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length < 10 || cleaned.length > 11)
            return false;
        const areaCode = parseInt(cleaned.substring(cleaned.length === 11 ? 1 : 0, cleaned.length === 11 ? 4 : 3));
        return areaCode >= 200 && areaCode < 900;
    }
    normalizePhoneNumber(phone) {
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 10) {
            return `+1${cleaned}`;
        }
        else if (cleaned.length === 11 && cleaned.startsWith('1')) {
            return `+${cleaned}`;
        }
        return phone;
    }
    findEmail($) {
        const mailtoLink = $('a[href^="mailto:"]').first();
        if (mailtoLink.length) {
            return mailtoLink.attr('href')?.replace('mailto:', '').trim();
        }
        const emailSelectors = ['.email', '.contact-email', '.contact-info', '.contact'];
        for (const selector of emailSelectors) {
            const text = $(selector).text().trim();
            const email = this.extractEmailFromText(text);
            if (email)
                return email;
        }
        return null;
    }
    extractEmailFromText(text) {
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        const match = text.match(emailRegex);
        return match ? match[0] : null;
    }
    findAddress($) {
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
        $('script[type="application/ld+json"]').each((i, elem) => {
            try {
                const data = JSON.parse($(elem).text());
                if (data.address) {
                    if (typeof data.address === 'string') {
                        return data.address;
                    }
                    else if (data.address.streetAddress || data.address.addressLocality) {
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
            }
            catch (e) {
            }
        });
        const bodyText = $('body').text();
        const addressPattern = /\b\d+\s+[A-Za-z\s]+(Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Boulevard|Blvd|Lane|Ln)[,\s]+[A-Za-z\s]+[,\s]+[A-Z]{2}\s+\d{5}/gi;
        const addressMatch = bodyText.match(addressPattern);
        if (addressMatch && addressMatch[0]) {
            return addressMatch[0].trim();
        }
        return null;
    }
    isValidAddress(text) {
        if (!text || text.length < 10 || text.length > 300)
            return false;
        const addressIndicators = [
            /\d+\s+[A-Za-z]/,
            /\b(street|st|avenue|ave|road|rd|drive|dr|boulevard|blvd|lane|ln)\b/i,
            /\b[A-Z]{2}\s+\d{5}/,
            /\d{5}(-\d{4})?$/,
        ];
        return addressIndicators.some(pattern => pattern.test(text));
    }
    findBusinessName($) {
        const nameSelectors = ['h1', '.business-name', '.company-name', '.site-title', 'title'];
        for (const selector of nameSelectors) {
            const text = $(selector).first().text().trim();
            if (text && text.length > 0 && text.length < 100) {
                return text;
            }
        }
        return null;
    }
    findDescription($) {
        const descSelectors = [
            'meta[name="description"]', '.description', '.about', '.intro'
        ];
        for (const selector of descSelectors) {
            if (selector.startsWith('meta')) {
                const content = $(selector).attr('content');
                if (content && content.length > 10) {
                    return content.trim();
                }
            }
            else {
                const text = $(selector).text().trim();
                if (text && text.length > 10 && text.length < 500) {
                    return text;
                }
            }
        }
        return null;
    }
    findServices($) {
        const services = new Set();
        const serviceSelectors = [
            '.services li', '.service-list li', '.our-services li',
            'nav a', '.menu a'
        ];
        for (const selector of serviceSelectors) {
            $(selector).each((i, elem) => {
                const text = $(elem).text().trim();
                if (text && text.length > 2 && text.length < 50) {
                    services.add(text);
                }
            });
        }
        return Array.from(services).slice(0, 10);
    }
    determineIndustry($, domain, name) {
        const text = $('body').text().toLowerCase();
        const nameL = name.toLowerCase();
        if (nameL.includes('hospital') || text.includes('hospital'))
            return 'Hospital';
        if (nameL.includes('restaurant') || text.includes('restaurant'))
            return 'Restaurant';
        if (nameL.includes('clinic') || text.includes('clinic'))
            return 'Medical Clinic';
        if (nameL.includes('dental') || text.includes('dental'))
            return 'Dental';
        if (nameL.includes('hotel') || text.includes('hotel'))
            return 'Hotel';
        return 'Business';
    }
    calculateConfidence(phoneNumber, email, address, name) {
        let confidence = 0.5;
        if (phoneNumber)
            confidence += 0.3;
        if (address)
            confidence += 0.2;
        if (email)
            confidence += 0.1;
        if (name && name.length > 5)
            confidence += 0.1;
        return Math.min(confidence, 1.0);
    }
    isObviouslyNonBusiness(title, snippet) {
        const text = `${title} ${snippet}`.toLowerCase();
        const nonBusinessPatterns = [
            'wikipedia', 'guide to', 'ultimate guide',
            'article', 'blog post', 'news'
        ];
        return nonBusinessPatterns.some(pattern => text.includes(pattern));
    }
    isValidBusiness(business) {
        if (!business.name || business.name.length < 3)
            return false;
        const hasContact = !!(business.phoneNumber || business.email || business.address || business.website);
        return hasContact;
    }
    removeDuplicates(businesses) {
        const seen = new Set();
        return businesses.filter((business) => {
            const key = business.website || business.phoneNumber || business.name.toLowerCase();
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }
    async saveBusinessesToDatabase(businesses) {
        for (const business of businesses) {
            try {
                await this.prisma.business.upsert({
                    where: {
                        website: business.website || `temp_${Date.now()}_${Math.random()}`,
                    },
                    update: {
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
            }
            catch (error) {
                this.logger.warn(`Failed to save/update business ${business.name}: ${error.message}`);
            }
        }
    }
    async respectRateLimit(domain) {
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
    getMinDelayForDomain(domain) {
        const domainDelays = {
            'google.com': 3000,
            'duckduckgo.com': 1500,
        };
        return domainDelays[domain] || this.baseDelay;
    }
    async makeHttpRequest(url, config, retryCount = 0) {
        try {
            return await (0, rxjs_1.firstValueFrom)(this.httpService.get(url, config));
        }
        catch (error) {
            if (retryCount < this.maxRetries && this.isRetryableError(error)) {
                const delay = this.baseDelay * Math.pow(2, retryCount);
                this.logger.warn(`Request failed, retrying in ${delay}ms: ${error.message}`);
                await this.sleep(delay);
                return this.makeHttpRequest(url, config, retryCount + 1);
            }
            throw error;
        }
    }
    isRetryableError(error) {
        return error.code === 'ECONNRESET' ||
            error.code === 'ETIMEDOUT' ||
            error.response?.status >= 500;
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async getStoredBusinesses(filters) {
        this.logger.log(`Getting stored businesses with filters: ${JSON.stringify(filters)}`);
        try {
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
            this.logger.log(`Found ${businesses.length} businesses`);
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
                source: b.source,
                confidence: b.confidence,
            }));
        }
        catch (error) {
            this.logger.error(`Error getting stored businesses: ${error.message}`, error.stack);
            if (error.message.includes('fetch failed') || error.message.includes('Cannot fetch data')) {
                this.logger.warn('Database connection issue, returning empty business list');
                return [];
            }
            throw error;
        }
    }
    async generateTestData(filters) {
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
        let filteredBusinesses = testBusinesses;
        if (filters?.industry) {
            filteredBusinesses = testBusinesses.filter(b => b.industry.toLowerCase().includes(filters.industry.toLowerCase()));
        }
        return {
            businesses: filteredBusinesses,
            totalFound: filteredBusinesses.length,
            note: "This is test data for development. Use /scraper/scrape for live scraping.",
            executionTime: 1
        };
    }
    async enrichBusinessData(phoneNumber) {
        this.logger.log(`Enriching data for ${phoneNumber}`);
        return null;
    }
    async getBusinessesWithScripts(filters) {
        return [];
    }
    async assignScriptToBusiness(businessId, scriptId, customGoal) {
        return { message: 'Not implemented in clean scraper' };
    }
    async executeBulkCalls(bulkCallDto) {
        return { message: 'Not implemented in clean scraper' };
    }
    async scrapeWithIntegratedWorkflow(query) {
        const startTime = Date.now();
        this.logger.log(`Starting integrated workflow: scrape + script generation for ${query.businessType || 'businesses'} in ${query.location || 'any location'}`);
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
        const savedBusinesses = await this.prisma.business.findMany({
            where: {
                OR: scrapeResult.businesses.map(b => ({ website: b.website }))
            }
        });
        this.logger.log(`Found ${savedBusinesses.length} saved businesses, generating scripts...`);
        const businessesWithScripts = [];
        let scriptsGenerated = 0;
        for (const savedBusiness of savedBusinesses) {
            const scrapedBusiness = scrapeResult.businesses.find(b => b.website === savedBusiness.website);
            if (!scrapedBusiness)
                continue;
            try {
                const scriptRequest = {
                    businessType: query.businessType || savedBusiness.industry || 'business',
                    industry: savedBusiness.industry || query.businessType || 'general',
                    specificGoal: query.specificGoal || this.generateGoalFromServices(scrapedBusiness),
                    targetPerson: query.targetPerson || this.inferTargetPersonFromIndustry(savedBusiness.industry || undefined),
                    businessServices: savedBusiness.services || [],
                    businessName: savedBusiness.name
                };
                if (query.specificGoal) {
                    await this.prisma.business.update({
                        where: { id: savedBusiness.id },
                        data: {
                            customGoal: query.specificGoal
                        }
                    });
                }
                businessesWithScripts.push({
                    ...scrapedBusiness,
                    id: savedBusiness.id,
                    assignedScript: null,
                    workflowEnabled: true,
                    readyForCalling: !!savedBusiness.phoneNumber
                });
                this.logger.log(`Business ready for calling: ${savedBusiness.name}`);
            }
            catch (error) {
                this.logger.warn(`Failed to generate script for ${savedBusiness.name}: ${error.message}`);
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
    generateGoalFromServices(business) {
        if (!business.services || business.services.length === 0) {
            return 'General business inquiry about services and capabilities';
        }
        const services = business.services.slice(0, 3).join(', ');
        return `Inquire about ${services} and discuss potential collaboration`;
    }
    inferTargetPersonFromIndustry(industry) {
        if (!industry)
            return 'manager or representative';
        const industryLower = industry.toLowerCase();
        if (industryLower.includes('hospital') || industryLower.includes('medical')) {
            return 'department coordinator';
        }
        else if (industryLower.includes('restaurant') || industryLower.includes('food')) {
            return 'manager';
        }
        else if (industryLower.includes('dental')) {
            return 'office manager';
        }
        else if (industryLower.includes('hotel')) {
            return 'events coordinator';
        }
        return 'manager or representative';
    }
    async startVerificationWorkflowForBusinesses(businessIds, options) {
        return { message: 'Not implemented in clean scraper' };
    }
    async executeCompleteWorkflow(workflowData) {
        const workflowId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const startTime = Date.now();
        this.logger.log(`🚀 Starting complete workflow ${workflowId}`);
        this.logger.log(`   Industry: ${workflowData.industry} | Location: ${workflowData.location}`);
        this.logger.log(`   Target: ${workflowData.targetPerson} | Goal: ${workflowData.callingGoal}`);
        const workflowStatus = {
            id: workflowId,
            status: 'scraping',
            startTime: new Date(),
            scrapeResults: { totalFound: 0, businessesWithScripts: 0, readyForCalling: 0 },
            callingResults: { totalCalls: 0, completed: 0, inProgress: 0, queued: 0, failed: 0 },
            extractedData: { businessesWithData: 0, totalInformationGathered: 0, successfulCalls: 0 },
            currentStep: 'Searching for businesses...',
            progress: 10,
            businessIds: [],
            callIds: [],
            config: workflowData,
            error: undefined,
            completedAt: undefined
        };
        this.workflowStatuses.set(workflowId, workflowStatus);
        try {
            this.logger.log(`📊 Phase 1: Scraping businesses...`);
            workflowStatus.currentStep = 'Scraping businesses...';
            workflowStatus.progress = 20;
            const scraperQuery = this.convertToScraperQuery(workflowData);
            const scrapeResult = await this.scrapeWithIntegratedWorkflow(scraperQuery);
            workflowStatus.scrapeResults = {
                totalFound: scrapeResult.summary.totalFound,
                businessesWithScripts: scrapeResult.summary.withScripts,
                readyForCalling: scrapeResult.summary.readyForCalling
            };
            workflowStatus.businessIds = scrapeResult.businesses.map((b) => b.id).filter(Boolean);
            workflowStatus.progress = 40;
            workflowStatus.currentStep = 'Businesses scraped, preparing calls...';
            if (scrapeResult.businesses.length === 0) {
                workflowStatus.status = 'completed';
                workflowStatus.currentStep = 'No businesses found matching criteria';
                workflowStatus.progress = 100;
                return this.buildWorkflowResponse(workflowStatus, startTime);
            }
            if (workflowData.startCallingImmediately !== false) {
                this.logger.log(`📞 Phase 2: Initiating calls for ${scrapeResult.businesses.length} businesses...`);
                workflowStatus.status = 'calling';
                workflowStatus.currentStep = 'Starting calls...';
                workflowStatus.progress = 50;
                const readyBusinesses = scrapeResult.businesses.filter((b) => b.readyForCalling && b.assignedScript?.id);
                this.logger.log(`🎯 ${readyBusinesses.length} businesses ready for calling`);
                const callPromises = [];
                let delay = 0;
                for (const business of readyBusinesses) {
                    const callPromise = this.scheduleBusinessCall(business, workflowData, delay, workflowId);
                    callPromises.push(callPromise);
                    delay += (workflowData.callDelay || 30) * 1000;
                }
                workflowStatus.callingResults.queued = readyBusinesses.length;
                workflowStatus.progress = 70;
                workflowStatus.currentStep = `${readyBusinesses.length} calls queued`;
                this.processCallsInBackground(callPromises, workflowId);
            }
            workflowStatus.status = workflowData.startCallingImmediately !== false ? 'calling' : 'completed';
            workflowStatus.progress = workflowData.startCallingImmediately !== false ? 75 : 100;
            this.logger.log(`✅ Workflow ${workflowId} initiated successfully`);
            return this.buildWorkflowResponse(workflowStatus, startTime);
        }
        catch (error) {
            this.logger.error(`❌ Workflow ${workflowId} failed: ${error.message}`, error.stack);
            workflowStatus.status = 'failed';
            workflowStatus.currentStep = `Failed: ${error.message}`;
            workflowStatus.error = error.message;
            return this.buildWorkflowResponse(workflowStatus, startTime);
        }
    }
    convertToScraperQuery(workflowData) {
        return {
            industry: workflowData.industry,
            location: workflowData.location,
            businessType: workflowData.businessType,
            keywords: workflowData.keywords,
            limit: workflowData.maxBusinesses || 20,
            targetPerson: workflowData.targetPerson,
            specificGoal: workflowData.callingGoal,
            hasPhone: workflowData.requirePhone ?? true,
            requirePhysicalLocation: workflowData.requireAddress,
            excludeContentTypes: workflowData.excludeContentTypes,
            priority: workflowData.priority || 'normal'
        };
    }
    async scheduleBusinessCall(business, workflowData, delay, workflowId) {
        this.logger.log(`📅 Scheduling call to ${business.name} in ${delay / 1000}s`);
        if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        try {
            let enhancedGoal = workflowData.callingGoal;
            if (workflowData.callerIdentity) {
                enhancedGoal = `${workflowData.callerIdentity}: ${enhancedGoal}`;
            }
            if (workflowData.informationToGather && workflowData.informationToGather.length > 0) {
                enhancedGoal += `. Gather: ${workflowData.informationToGather.join(', ')}`;
            }
            const callSid = await this.telephonyService.initiateCall(business.phoneNumber, business.assignedScript.id, enhancedGoal, business.name);
            const workflowStatus = this.workflowStatuses.get(workflowId);
            if (workflowStatus) {
                workflowStatus.callIds.push(callSid);
                workflowStatus.callingResults.inProgress++;
                workflowStatus.callingResults.queued--;
            }
            this.logger.log(`☎️ Call initiated: ${callSid} to ${business.name}`);
            return callSid;
        }
        catch (error) {
            this.logger.error(`Failed to initiate call to ${business.name}: ${error.message}`);
            const workflowStatus = this.workflowStatuses.get(workflowId);
            if (workflowStatus) {
                workflowStatus.callingResults.failed++;
                workflowStatus.callingResults.queued--;
            }
            throw error;
        }
    }
    async processCallsInBackground(callPromises, workflowId) {
        this.logger.log(`🔄 Processing ${callPromises.length} calls in background for workflow ${workflowId}`);
        try {
            await Promise.allSettled(callPromises);
            const workflowStatus = this.workflowStatuses.get(workflowId);
            if (workflowStatus) {
                workflowStatus.status = 'completed';
                workflowStatus.progress = 100;
                workflowStatus.currentStep = 'All calls completed';
                workflowStatus.completedAt = new Date();
                this.logger.log(`✅ All calls completed for workflow ${workflowId}`);
            }
        }
        catch (error) {
            this.logger.error(`Background call processing failed for workflow ${workflowId}: ${error.message}`);
        }
    }
    buildWorkflowResponse(workflowStatus, startTime) {
        const executionTime = Date.now() - startTime;
        const nextSteps = [];
        if (workflowStatus.status === 'calling') {
            nextSteps.push('Calls are being executed in background');
            nextSteps.push(`Check workflow status: GET /scraper/workflow/${workflowStatus.id}/status`);
            nextSteps.push(`View results when complete: GET /scraper/workflow/${workflowStatus.id}/results`);
        }
        else if (workflowStatus.status === 'completed') {
            nextSteps.push(`Review extracted data: GET /scraper/workflow/${workflowStatus.id}/results`);
            nextSteps.push('Analyze call outcomes and information gathered');
        }
        return {
            workflowId: workflowStatus.id,
            status: workflowStatus.status,
            scrapeResults: workflowStatus.scrapeResults,
            callingResults: workflowStatus.callingResults,
            extractedData: workflowStatus.extractedData,
            estimatedCompletionTime: workflowStatus.status === 'calling' ?
                new Date(Date.now() + (workflowStatus.callingResults.queued * (workflowStatus.config?.callDelay || 30) * 1000)) :
                undefined,
            nextSteps
        };
    }
    async getWorkflowStatus(workflowId) {
        const status = this.workflowStatuses.get(workflowId);
        if (!status) {
            throw new Error(`Workflow ${workflowId} not found`);
        }
        if (status.status === 'calling' && status.callIds.length > 0) {
            await this.updateCallStatuses(status);
        }
        return {
            workflowId,
            status: status.status,
            progress: status.progress,
            currentStep: status.currentStep,
            startTime: status.startTime,
            completedAt: status.completedAt,
            scrapeResults: status.scrapeResults,
            callingResults: status.callingResults,
            extractedData: status.extractedData,
            error: status.error
        };
    }
    async getWorkflowResults(workflowId) {
        const status = this.workflowStatuses.get(workflowId);
        if (!status) {
            throw new Error(`Workflow ${workflowId} not found`);
        }
        const businesses = await this.prisma.business.findMany({
            where: { id: { in: status.businessIds } },
            include: {
                assignedScript: true,
                extractedInformation: {
                    orderBy: { extractedAt: 'desc' },
                    take: 1,
                    include: {
                        entities: true
                    }
                }
            }
        });
        const callSessions = await this.prisma.callSession.findMany({
            where: { callSid: { in: status.callIds } },
            include: {
                transcript: true,
                extractedInformation: {
                    include: { entities: true }
                }
            }
        });
        return {
            workflowId,
            status: status.status,
            totalBusinesses: businesses.length,
            totalCalls: callSessions.length,
            businesses: businesses.map(business => ({
                id: business.id,
                name: business.name,
                phoneNumber: business.phoneNumber,
                industry: business.industry,
                callStatus: business.callStatus,
                assignedScript: business.assignedScript ? {
                    id: business.assignedScript.id,
                    name: business.assignedScript.name,
                    goal: business.assignedScript.goal
                } : null,
                extractedData: business.extractedInformation[0] || null,
                lastCalled: business.lastCalled,
                callCount: business.callCount
            })),
            callSessions: callSessions.map(call => ({
                callSid: call.callSid,
                phoneNumber: call.phoneNumber,
                status: call.status,
                duration: call.duration,
                outcome: call.outcome,
                extractedInformation: call.extractedInformation,
                transcriptPreview: call.transcript?.slice(0, 3) || []
            })),
            summary: {
                successfulCalls: callSessions.filter(c => c.status === 'completed').length,
                businessesWithData: businesses.filter(b => b.extractedInformation.length > 0).length,
                totalInformationGathered: businesses.reduce((sum, b) => sum + b.extractedInformation.length, 0)
            }
        };
    }
    async updateCallStatuses(workflowStatus) {
        const activeCalls = this.telephonyService.getAllActiveCalls();
        let inProgress = 0;
        let completed = 0;
        for (const callSid of workflowStatus.callIds) {
            const activeCall = activeCalls.find(call => call.callSid === callSid);
            if (activeCall) {
                inProgress++;
            }
            else {
                completed++;
            }
        }
        workflowStatus.callingResults.inProgress = inProgress;
        workflowStatus.callingResults.completed = completed;
        try {
            const extractedCount = await this.prisma.extractedInformation.count({
                where: { businessId: { in: workflowStatus.businessIds } }
            });
            workflowStatus.extractedData.businessesWithData = extractedCount;
        }
        catch (error) {
            this.logger.warn(`Failed to update extracted data count: ${error.message}`);
        }
    }
    async getScriptById(scriptId) {
        const script = await this.prisma.script.findUnique({
            where: { id: scriptId }
        });
        if (!script) {
            throw new Error(`Script ${scriptId} not found`);
        }
        return script;
    }
    async getAllScripts() {
        return await this.prisma.script.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                businesses: {
                    select: {
                        id: true,
                        name: true,
                        phoneNumber: true,
                        callStatus: true
                    }
                }
            }
        });
    }
    async deleteBusiness(businessId) {
        this.logger.log(`Deleting business: ${businessId}`);
        try {
            const business = await this.prisma.business.findUnique({
                where: { id: businessId }
            });
            if (!business) {
                throw new Error(`Business with ID ${businessId} not found`);
            }
            await this.prisma.business.delete({
                where: { id: businessId }
            });
            this.logger.log(`Successfully deleted business: ${business.name} (${businessId})`);
            return {
                message: `Business "${business.name}" deleted successfully`,
                deletedId: businessId
            };
        }
        catch (error) {
            this.logger.error(`Failed to delete business ${businessId}: ${error.message}`, error.stack);
            if (error.code === 'P2025') {
                throw new Error(`Business with ID ${businessId} not found`);
            }
            if (error.message.includes('fetch failed') || error.message.includes('Cannot fetch data')) {
                throw new Error('Database connection error. Please try again later.');
            }
            if (error.message.includes('not found')) {
                throw new Error(`Business with ID ${businessId} not found`);
            }
            throw new Error(`Failed to delete business: ${error.message}`);
        }
    }
    async scrapeYellowPages(query) {
        const businesses = [];
        const searchUrl = this.buildYellowPagesUrl(query);
        try {
            await this.respectRateLimit('yellowpages.com');
            const response = await this.makeHttpRequest(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Upgrade-Insecure-Requests': '1',
                },
                timeout: 15000,
            });
            const $ = cheerio.load(response.data);
            const selectors = ['.result', '.organic', '.listing', '.business-card'];
            for (const selector of selectors) {
                $(selector).each((index, element) => {
                    if (businesses.length < (query.limit || 50)) {
                        const business = this.parseYellowPagesListing($, element);
                        if (business && business.phoneNumber && this.isLikelyBusiness(business)) {
                            businesses.push(business);
                        }
                    }
                });
                if (businesses.length > 0)
                    break;
            }
            this.logger.log(`Scraped ${businesses.length} businesses from YellowPages`);
        }
        catch (error) {
            this.logger.error(`YellowPages scraping error: ${error.message}`);
            throw error;
        }
        return businesses;
    }
    async scrapeYelp(query) {
        const businesses = [];
        const searchUrl = this.buildYelpUrl(query);
        try {
            await this.respectRateLimit('yelp.com');
            const response = await this.makeHttpRequest(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Referer': 'https://www.yelp.com/',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'same-origin',
                    'Upgrade-Insecure-Requests': '1',
                },
                timeout: 15000,
            });
            const $ = cheerio.load(response.data);
            const selectors = [
                'div[data-testid="serp-ia-card"]',
                '.searchResult',
                '[data-testid="biz-card"]',
                '.businessName',
                '.container__09f24__mpR8_'
            ];
            for (const selector of selectors) {
                $(selector).each((index, element) => {
                    if (businesses.length < (query.limit || 50)) {
                        const business = this.parseYelpListing($, element);
                        if (business && this.isLikelyBusiness(business)) {
                            businesses.push(business);
                        }
                    }
                });
                if (businesses.length > 0)
                    break;
            }
            this.logger.log(`Scraped ${businesses.length} businesses from Yelp`);
        }
        catch (error) {
            this.logger.error(`Yelp scraping error: ${error.message}`);
            throw error;
        }
        return businesses;
    }
    async scrapeGoogleBusiness(query) {
        const businesses = [];
        const searchUrl = this.buildGoogleBusinessUrl(query);
        try {
            await this.respectRateLimit('google.com');
            const response = await this.makeHttpRequest(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                },
            });
            const $ = cheerio.load(response.data);
            const selectors = ['.g', '.tF2Cxc', '.commercial-unit-desktop-top'];
            for (const selector of selectors) {
                $(selector).each((index, element) => {
                    if (businesses.length < (query.limit || 50)) {
                        const business = this.parseGoogleBusinessListing($, element);
                        if (business && this.isLikelyBusiness(business)) {
                            businesses.push(business);
                        }
                    }
                });
                if (businesses.length > 0)
                    break;
            }
            this.logger.log(`Scraped ${businesses.length} businesses from Google`);
        }
        catch (error) {
            this.logger.error(`Google Business scraping error: ${error.message}`);
            throw error;
        }
        return businesses;
    }
    buildYellowPagesUrl(query) {
        const baseUrl = 'https://www.yellowpages.com/search';
        const params = new URLSearchParams();
        const searchTerms = [];
        if (query.businessType)
            searchTerms.push(query.businessType);
        if (query.industry)
            searchTerms.push(query.industry);
        if (query.keywords?.length)
            searchTerms.push(...query.keywords);
        params.append('search_terms', searchTerms.join(' '));
        if (query.location) {
            params.append('geo_location_terms', query.location);
        }
        return `${baseUrl}?${params.toString()}`;
    }
    buildYelpUrl(query) {
        const baseUrl = 'https://www.yelp.com/search';
        const params = new URLSearchParams();
        const searchTerms = [];
        if (query.businessType)
            searchTerms.push(query.businessType);
        if (query.industry)
            searchTerms.push(query.industry);
        if (query.keywords?.length)
            searchTerms.push(...query.keywords);
        params.append('find_desc', searchTerms.join(' '));
        if (query.location) {
            params.append('find_loc', query.location);
        }
        return `${baseUrl}?${params.toString()}`;
    }
    buildGoogleBusinessUrl(query) {
        const searchTerms = [];
        if (query.businessType)
            searchTerms.push(query.businessType);
        if (query.industry)
            searchTerms.push(query.industry);
        if (query.keywords?.length)
            searchTerms.push(...query.keywords);
        if (query.location)
            searchTerms.push(`in ${query.location}`);
        searchTerms.push('phone number');
        const searchQuery = searchTerms.join(' ');
        return `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
    }
    parseYellowPagesListing($, element) {
        const $el = $(element);
        try {
            const name = $el.find('.business-name, .n, h3, .listing-name').first().text().trim();
            const phoneText = $el.find('.phones, .phone, [class*="phone"]').first().text().trim();
            const phone = this.extractPhoneNumber(phoneText);
            const address = $el.find('.adr, .locality, .street-address').text().trim();
            const website = $el.find('a[href*="http"]').attr('href');
            if (!name || !phone)
                return null;
            return {
                name,
                phoneNumber: phone,
                website: website || undefined,
                address: address ? { formatted: address } : undefined,
                source: scraper_interface_1.DataSource.YELLOW_PAGES,
                scrapedAt: new Date(),
                confidence: 0.8,
            };
        }
        catch (error) {
            this.logger.debug(`Error parsing YellowPages listing: ${error.message}`);
            return null;
        }
    }
    parseYelpListing($, element) {
        const $el = $(element);
        try {
            const name = $el.find('[data-testid="biz-name"], .businessName, h3, a[class*="businessName"]').first().text().trim();
            const ratingText = $el.find('[aria-label*="star"], .rating, [class*="rating"]').first().attr('aria-label') || '';
            const rating = parseFloat(ratingText.match(/[\d.]+/)?.[0] || '0');
            const address = $el.find('[data-testid="address"], .address, [class*="address"]').text().trim();
            const phoneText = $el.find('[data-testid="phone"], .phone, [class*="phone"]').text().trim();
            const phone = this.extractPhoneNumber(phoneText);
            if (!name)
                return null;
            return {
                name,
                phoneNumber: phone || undefined,
                address: address ? { formatted: address } : undefined,
                metadata: rating > 0 ? { rating } : undefined,
                source: scraper_interface_1.DataSource.YELP,
                scrapedAt: new Date(),
                confidence: 0.7,
            };
        }
        catch (error) {
            this.logger.debug(`Error parsing Yelp listing: ${error.message}`);
            return null;
        }
    }
    parseGoogleBusinessListing($, element) {
        const $el = $(element);
        try {
            const name = $el.find('h3, [role="heading"]').first().text().trim();
            const snippet = $el.find('.VwiC3b, .s, .st').text();
            const phone = this.extractPhoneNumber(snippet);
            const link = $el.find('a').first().attr('href');
            const website = link?.startsWith('http') ? link : undefined;
            if (!name)
                return null;
            return {
                name,
                phoneNumber: phone || undefined,
                website,
                description: snippet?.slice(0, 200),
                source: scraper_interface_1.DataSource.GOOGLE_SEARCH,
                scrapedAt: new Date(),
                confidence: 0.6,
            };
        }
        catch (error) {
            this.logger.debug(`Error parsing Google listing: ${error.message}`);
            return null;
        }
    }
    isLikelyBusiness(business) {
        if (!business.name)
            return false;
        const lowercaseName = business.name.toLowerCase();
        const excludePatterns = [
            /^(find|search|directory|yellow pages|white pages)$/i,
            /^(home|about|contact|blog|news)$/i,
            /^(facebook|twitter|instagram|linkedin)$/i,
        ];
        return !excludePatterns.some(pattern => pattern.test(lowercaseName));
    }
    extractPhoneNumber(text) {
        if (!text)
            return null;
        const phonePatterns = [
            /\((\d{3})\)\s*(\d{3})-(\d{4})/,
            /(\d{3})-(\d{3})-(\d{4})/,
            /(\d{3})\.(\d{3})\.(\d{4})/,
            /(\d{3})\s+(\d{3})\s+(\d{4})/,
            /(\d{10})/,
            /\+1\s*(\d{3})\s*(\d{3})\s*(\d{4})/,
        ];
        for (const pattern of phonePatterns) {
            const match = text.match(pattern);
            if (match) {
                const digits = match[0].replace(/\D/g, '');
                if (digits.length === 10) {
                    return `+1${digits}`;
                }
                else if (digits.length === 11 && digits.startsWith('1')) {
                    return `+${digits}`;
                }
            }
        }
        const digitMatch = text.match(/\d{10}/);
        if (digitMatch) {
            return `+1${digitMatch[0]}`;
        }
        return null;
    }
};
exports.WebScraperService = WebScraperService;
exports.WebScraperService = WebScraperService = WebScraperService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        config_1.ConfigService,
        prisma_service_1.PrismaService,
        telephony_service_1.TelephonyService,
        call_manager_service_1.CallManagerService])
], WebScraperService);
//# sourceMappingURL=web-scraper.service.js.map