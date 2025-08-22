export interface ScraperQuery {
  industry?: string;
  location?: string;
  businessType?: string;
  keywords?: string[];
  limit?: number;
  sources?: DataSource[];
  
  // Enhanced filtering options
  targetPerson?: string; // 'head doctor', 'manager', 'owner', etc.
  specificGoal?: string; // What to achieve when calling
  minRating?: number; // Minimum business rating (1-5)
  businessSize?: 'small' | 'medium' | 'large' | 'enterprise';
  hasWebsite?: boolean; // Only businesses with websites
  hasPhone?: boolean; // Only businesses with phone numbers
  establishedSince?: number; // Year business was established
  
  // Content filtering (to exclude blog posts, etc.)
  excludeContentTypes?: ContentType[];
  onlyBusinessListings?: boolean; // Exclude blog articles, news, etc.
  requirePhysicalLocation?: boolean; // Must have physical address
  
  // Call workflow options
  enableVerificationWorkflow?: boolean; // Use two-phase calling
  autoGenerateScripts?: boolean; // Create tailored scripts
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export enum ContentType {
  BLOG_ARTICLES = 'blog_articles',
  NEWS_ARTICLES = 'news_articles', 
  SOCIAL_MEDIA = 'social_media',
  DIRECTORIES = 'directories',
  REVIEWS_ONLY = 'reviews_only',
  TOP_LISTS = 'top_lists', // "Top 10 best..." articles
  GENERIC_INFO = 'generic_info',
}

export enum DataSource {
  GOOGLE_SEARCH = 'google_search',
  GOOGLE_MAPS = 'google_maps',
  YELP = 'yelp',
  YELLOW_PAGES = 'yellow_pages',
  CUSTOM_WEBSITE = 'custom_website',
  BING_SEARCH = 'bing_search',
  DUCKDUCKGO = 'duckduckgo',
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