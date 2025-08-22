export interface ScraperQuery {
    industry?: string;
    location?: string;
    businessType?: string;
    keywords?: string[];
    limit?: number;
    sources?: DataSource[];
    targetPerson?: string;
    specificGoal?: string;
    minRating?: number;
    businessSize?: 'small' | 'medium' | 'large' | 'enterprise';
    hasWebsite?: boolean;
    hasPhone?: boolean;
    establishedSince?: number;
    excludeContentTypes?: ContentType[];
    onlyBusinessListings?: boolean;
    requirePhysicalLocation?: boolean;
    enableVerificationWorkflow?: boolean;
    autoGenerateScripts?: boolean;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
}
export declare enum ContentType {
    BLOG_ARTICLES = "blog_articles",
    NEWS_ARTICLES = "news_articles",
    SOCIAL_MEDIA = "social_media",
    DIRECTORIES = "directories",
    REVIEWS_ONLY = "reviews_only",
    TOP_LISTS = "top_lists",
    GENERIC_INFO = "generic_info"
}
export declare enum DataSource {
    GOOGLE_SEARCH = "google_search",
    GOOGLE_MAPS = "google_maps",
    YELP = "yelp",
    YELLOW_PAGES = "yellow_pages",
    CUSTOM_WEBSITE = "custom_website",
    BING_SEARCH = "bing_search",
    DUCKDUCKGO = "duckduckgo"
}
export interface BusinessInfo {
    id?: string;
    name: string;
    phoneNumber?: string;
    alternatePhones?: string[];
    address?: Address;
    website?: string;
    email?: string;
    businessHours?: BusinessHours;
    industry?: string;
    description?: string;
    services?: string[];
    metadata?: Record<string, any>;
    scrapedAt: Date;
    source: DataSource;
    confidence: number;
}
export interface Address {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    formatted?: string;
}
export interface BusinessHours {
    monday?: HoursRange;
    tuesday?: HoursRange;
    wednesday?: HoursRange;
    thursday?: HoursRange;
    friday?: HoursRange;
    saturday?: HoursRange;
    sunday?: HoursRange;
    timezone?: string;
}
export interface HoursRange {
    open: string;
    close: string;
    isClosed?: boolean;
}
export interface ScrapeResult {
    businesses: BusinessInfo[];
    totalFound: number;
    errors?: string[];
    executionTime: number;
}
