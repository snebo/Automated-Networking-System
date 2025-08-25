import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';

export class ManualCallDto {
  @ApiProperty({ 
    description: 'Business name',
    example: 'Acme Corporation'
  })
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @ApiProperty({ 
    description: 'Phone number to call (with or without country code)',
    example: '+14155551234'
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid phone number format' })
  phoneNumber: string;

  @ApiProperty({ 
    description: 'Goal for the call',
    example: 'Get the contact information of the HR manager'
  })
  @IsString()
  @IsNotEmpty()
  goal: string;

  @ApiProperty({ 
    description: 'Optional script ID to use',
    example: 'script_123',
    required: false
  })
  @IsString()
  @IsOptional()
  scriptId?: string;
}