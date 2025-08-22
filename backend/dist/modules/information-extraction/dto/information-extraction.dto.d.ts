export declare class ExtractInformationDto {
    callId: string;
    businessId: string;
    transcript: string;
    targetPerson?: string;
    goal?: string;
}
declare class DateRangeDto {
    from: string;
    to: string;
}
export declare class SearchInformationDto {
    businessId?: string;
    businessName?: string;
    targetPerson?: string;
    contactType?: 'phone' | 'email' | 'in-person';
    dateRange?: DateRangeDto;
    successfulOnly?: boolean;
    hasContactInfo?: boolean;
    department?: string;
    businessType?: string;
}
export declare class BulkExtractionDto {
    callIds: string[];
    concurrent?: boolean;
}
export {};
