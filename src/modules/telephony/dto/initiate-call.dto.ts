import { IsString, IsNotEmpty, IsPhoneNumber } from 'class-validator';
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
}