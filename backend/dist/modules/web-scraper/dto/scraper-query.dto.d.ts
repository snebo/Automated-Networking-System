import { DataSource, ContentType } from '../interfaces/scraper.interface';
export declare class ScraperQueryDto {
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
