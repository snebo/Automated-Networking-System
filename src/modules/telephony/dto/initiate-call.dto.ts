import { IsString, IsNotEmpty, IsPhoneNumber } from 'class-validator';

export class InitiateCallDto {
  @IsPhoneNumber()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  scriptId: string;
}