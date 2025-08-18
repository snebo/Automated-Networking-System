import { IsOptional, IsString, IsArray, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DataSource } from '../interfaces/scraper.interface';

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
    example: [DataSource.YELLOW_PAGES, DataSource.YELP],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(DataSource, { each: true })
  sources?: DataSource[];
}