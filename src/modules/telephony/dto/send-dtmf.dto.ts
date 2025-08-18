import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendDTMFDto {
  @ApiProperty({
    description: 'DTMF digits to send',
    example: '1234#',
    pattern: '^[0-9*#]+$',
    required: true,
  })
  @IsString()
  @Matches(/^[0-9*#]+$/, {
    message: 'Digits must only contain 0-9, *, and #',
  })
  digits: string;
}