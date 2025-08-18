import { IsString, Matches } from 'class-validator';

export class SendDTMFDto {
  @IsString()
  @Matches(/^[0-9*#]+$/, {
    message: 'Digits must only contain 0-9, *, and #',
  })
  digits: string;
}