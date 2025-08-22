import { IsOptional, IsString, IsArray, IsNumber, IsEnum, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DataSource, ContentType } from '../interfaces/scraper.interface';

export class ScraperQueryDto {
  @ApiProperty({
    description: 'Industry or business category to search for',
    example: 'restaurants',
    required: false,
  })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiProperty({
    description: 'Geographic location to search in',
    example: 'New York, NY',
    required: false,
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({
    description: 'Specific business type',
    example: 'pizza restaurant',
    required: false,
  })
  @IsOptional()
  @IsString()
  businessType?: string;

  @ApiProperty({
    description: 'Keywords to search for',
    example: ['pizza', 'delivery', 'italian'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiProperty({
    description: 'Maximum number of results to return',
    example: 50,
    minimum: 1,
    maximum: 500,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(500)
  limit?: number;

  @ApiProperty({
    description: 'Data sources to scrape from',
    enum: DataSource,
    enumName: 'DataSource',
    example: [DataSource.GOOGLE_SEARCH, DataSource.DUCKDUCKGO],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(DataSource, { each: true })
  sources?: DataSource[];

  // Enhanced filtering options
  @ApiProperty({
    description: 'Target person to find (e.g., head doctor, manager, owner)',
    example: 'head doctor',
    required: false,
  })
  @IsOptional()
  @IsString()
  targetPerson?: string;

  @ApiProperty({
    description: 'Specific goal for calling these businesses',
    example: 'Schedule cardiology appointment',
    required: false,
  })
  @IsOptional()
  @IsString()
  specificGoal?: string;

  @ApiProperty({
    description: 'Minimum business rating (1-5)',
    example: 4,
    minimum: 1,
    maximum: 5,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(5)
  minRating?: number;

  @ApiProperty({
    description: 'Business size filter',
    enum: ['small', 'medium', 'large', 'enterprise'],
    example: 'medium',
    required: false,
  })
  @IsOptional()
  @IsString()
  businessSize?: 'small' | 'medium' | 'large' | 'enterprise';

  @ApiProperty({
    description: 'Only include businesses with websites',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  hasWebsite?: boolean;

  @ApiProperty({
    description: 'Only include businesses with phone numbers',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  hasPhone?: boolean;

  @ApiProperty({
    description: 'Only businesses established since this year',
    example: 2010,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  establishedSince?: number;

  @ApiProperty({
    description: 'Content types to exclude from results',
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

  @ApiProperty({
    description: 'Only return actual business listings (excludes blog articles, news, etc.)',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  onlyBusinessListings?: boolean;

  @ApiProperty({
    description: 'Require businesses to have a physical location/address',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  requirePhysicalLocation?: boolean;

  @ApiProperty({
    description: 'Enable two-phase verification workflow (verify number then gather info)',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  enableVerificationWorkflow?: boolean;

  @ApiProperty({
    description: 'Automatically generate tailored scripts for each business',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  autoGenerateScripts?: boolean;

  @ApiProperty({
    description: 'Priority for processing these businesses',
    enum: ['low', 'normal', 'high', 'urgent'],
    example: 'normal',
    required: false,
  })
  @IsOptional()
  @IsString()
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}