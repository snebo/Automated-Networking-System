import { IsString, IsOptional, IsUUID, IsBoolean, IsEnum, ValidateNested, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ExtractInformationDto {
  @ApiProperty({
    description: 'Call ID to extract information from',
    example: 'call-uuid-here'
  })
  @IsUUID()
  callId: string;

  @ApiProperty({
    description: 'Business ID this call was made to',
    example: 'business-uuid-here'
  })
  @IsUUID()
  businessId: string;

  @ApiProperty({
    description: 'Full call transcript to analyze',
    example: 'Hello, thank you for calling ABC Hospital. How can I help you today?'
  })
  @IsString()
  transcript: string;

  @ApiProperty({
    description: 'Target person that was being sought',
    example: 'head doctor',
    required: false
  })
  @IsString()
  @IsOptional()
  targetPerson?: string;

  @ApiProperty({
    description: 'Goal of the call',
    example: 'Schedule an appointment with a cardiologist',
    required: false
  })
  @IsString()
  @IsOptional()
  goal?: string;
}

class DateRangeDto {
  @ApiProperty({
    description: 'Start date for search range',
    example: '2024-01-01T00:00:00.000Z'
  })
  @IsDateString()
  from: string;

  @ApiProperty({
    description: 'End date for search range',
    example: '2024-12-31T23:59:59.999Z'
  })
  @IsDateString()
  to: string;
}

export class SearchInformationDto {
  @ApiProperty({
    description: 'Search by specific business ID',
    example: 'business-uuid-here',
    required: false
  })
  @IsUUID()
  @IsOptional()
  businessId?: string;

  @ApiProperty({
    description: 'Search by business name',
    example: 'ABC Hospital',
    required: false
  })
  @IsString()
  @IsOptional()
  businessName?: string;

  @ApiProperty({
    description: 'Search for specific target person',
    example: 'Dr. Smith',
    required: false
  })
  @IsString()
  @IsOptional()
  targetPerson?: string;

  @ApiProperty({
    description: 'Filter by contact type',
    enum: ['phone', 'email', 'in-person'],
    required: false
  })
  @IsEnum(['phone', 'email', 'in-person'])
  @IsOptional()
  contactType?: 'phone' | 'email' | 'in-person';

  @ApiProperty({
    description: 'Date range for search',
    type: DateRangeDto,
    required: false
  })
  @ValidateNested()
  @Type(() => DateRangeDto)
  @IsOptional()
  dateRange?: DateRangeDto;

  @ApiProperty({
    description: 'Only return successful extractions',
    example: true,
    required: false
  })
  @IsBoolean()
  @IsOptional()
  successfulOnly?: boolean;

  @ApiProperty({
    description: 'Only return extractions with contact information',
    example: true,
    required: false
  })
  @IsBoolean()
  @IsOptional()
  hasContactInfo?: boolean;

  @ApiProperty({
    description: 'Search by department',
    example: 'cardiology',
    required: false
  })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiProperty({
    description: 'Search by business type',
    example: 'hospital',
    required: false
  })
  @IsString()
  @IsOptional()
  businessType?: string;
}

export class BulkExtractionDto {
  @ApiProperty({
    description: 'Array of call IDs to process',
    example: ['call-uuid-1', 'call-uuid-2']
  })
  @IsUUID(undefined, { each: true })
  callIds: string[];

  @ApiProperty({
    description: 'Process extractions concurrently',
    example: false,
    default: false,
    required: false
  })
  @IsBoolean()
  @IsOptional()
  concurrent?: boolean = false;
}