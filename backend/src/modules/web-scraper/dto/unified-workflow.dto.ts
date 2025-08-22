import { IsOptional, IsString, IsArray, IsNumber, IsEnum, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DataSource, ContentType } from '../interfaces/scraper.interface';

export class UnifiedWorkflowDto {
  // ===== SEARCH CRITERIA =====
  @ApiProperty({
    description: 'Industry or business category to search for',
    example: 'restaurants',
    required: true,
  })
  @IsString()
  industry: string;

  @ApiProperty({
    description: 'Geographic location to search in',
    example: 'New York, NY',
    required: true,
  })
  @IsString()
  location: string;

  @ApiProperty({
    description: 'Specific business type or subcategory',
    example: 'italian restaurants',
    required: false,
  })
  @IsOptional()
  @IsString()
  businessType?: string;

  @ApiProperty({
    description: 'Keywords to include in search',
    example: ['delivery', 'catering', 'organic'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiProperty({
    description: 'Maximum number of businesses to find',
    example: 20,
    minimum: 1,
    maximum: 100,
    required: false,
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  maxBusinesses?: number;

  // ===== FILTERING OPTIONS =====
  @ApiProperty({
    description: 'Only include businesses with phone numbers',
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  requirePhone?: boolean;

  @ApiProperty({
    description: 'Only include businesses with physical addresses',
    example: true,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  requireAddress?: boolean;

  @ApiProperty({
    description: 'Content types to exclude from search results',
    enum: ContentType,
    enumName: 'ContentType',
    example: [ContentType.BLOG_ARTICLES, ContentType.TOP_LISTS],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(ContentType, { each: true })
  excludeContentTypes?: ContentType[];

  // ===== CALLING GOALS & TARGET =====
  @ApiProperty({
    description: 'Target person to find during the call',
    example: 'manager',
    required: true,
  })
  @IsString()
  targetPerson: string;

  @ApiProperty({
    description: 'Primary goal/purpose for calling these businesses',
    example: 'Discuss catering services for corporate events',
    required: true,
  })
  @IsString()
  callingGoal: string;

  @ApiProperty({
    description: 'Specific information to gather from each business',
    example: ['menu pricing', 'catering capacity', 'delivery areas', 'contact information'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  informationToGather?: string[];

  // ===== EXECUTION SETTINGS =====
  @ApiProperty({
    description: 'Start calling immediately after scraping',
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  startCallingImmediately?: boolean;

  @ApiProperty({
    description: 'Delay between calls in seconds',
    example: 30,
    minimum: 10,
    maximum: 300,
    required: false,
    default: 30,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(10)
  @Max(300)
  callDelay?: number;

  @ApiProperty({
    description: 'Maximum concurrent calls',
    example: 1,
    minimum: 1,
    maximum: 5,
    required: false,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(5)
  maxConcurrentCalls?: number;

  @ApiProperty({
    description: 'Workflow priority level',
    enum: ['low', 'normal', 'high', 'urgent'],
    example: 'normal',
    required: false,
    default: 'normal',
  })
  @IsOptional()
  @IsString()
  priority?: 'low' | 'normal' | 'high' | 'urgent';

  // ===== CONTACT PREFERENCES =====
  @ApiProperty({
    description: 'Your name/company for introductions',
    example: 'John Smith from ABC Catering Solutions',
    required: false,
  })
  @IsOptional()
  @IsString()
  callerIdentity?: string;

  @ApiProperty({
    description: 'Your contact information to share if requested',
    example: 'john@abccatering.com or (555) 123-4567',
    required: false,
  })
  @IsOptional()
  @IsString()
  contactInfo?: string;

  // ===== NOTIFICATION SETTINGS =====
  @ApiProperty({
    description: 'Email to notify when workflow completes',
    example: 'user@company.com',
    required: false,
  })
  @IsOptional()
  @IsString()
  notificationEmail?: string;

  @ApiProperty({
    description: 'Send progress updates during execution',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  sendProgressUpdates?: boolean;
}

export interface WorkflowExecutionResponse {
  workflowId: string;
  status: 'initiated' | 'scraping' | 'calling' | 'completed' | 'failed';
  scrapeResults: {
    totalFound: number;
    businessesWithScripts: number;
    readyForCalling: number;
  };
  callingResults: {
    totalCalls: number;
    completed: number;
    inProgress: number;
    queued: number;
    failed: number;
  };
  extractedData: {
    businessesWithData: number;
    totalInformationGathered: number;
    successfulCalls: number;
  };
  estimatedCompletionTime?: Date;
  nextSteps: string[];
}