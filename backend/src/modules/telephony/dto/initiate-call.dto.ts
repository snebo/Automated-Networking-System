import { IsString, IsNotEmpty, IsPhoneNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitiateCallDto {
  @ApiProperty({
    description: 'The phone number to call',
    example: '+14155552671',
    required: true,
  })
  @IsPhoneNumber()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({
    description: 'The ID of the script to use for this call',
    example: 'script-123e4567-e89b-12d3-a456-426614174000',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  scriptId: string;

  @ApiProperty({
    description: 'The goal for this call - what the AI should try to achieve',
    example: 'I need to find a cardiologist for an appointment',
    required: false,
  })
  @IsString()
  @IsOptional()
  goal?: string;

  @ApiProperty({
    description: 'The name of the company/facility being called',
    example: 'Memorial Hospital',
    required: false,
  })
  @IsString()
  @IsOptional()
  companyName?: string;
}