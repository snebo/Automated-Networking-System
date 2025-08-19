import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignScriptDto {
  @ApiProperty({
    description: 'Script ID to assign to the business',
    example: 'script-uuid-here',
  })
  @IsString()
  scriptId: string;

  @ApiProperty({
    description: 'Custom goal to override the script default goal',
    example: 'I need to schedule an appointment with a cardiologist',
    required: false,
  })
  @IsString()
  @IsOptional()
  customGoal?: string;
}

export class BulkCallDto {
  @ApiProperty({
    description: 'Array of business IDs to call',
    example: ['business-uuid-1', 'business-uuid-2'],
  })
  @IsArray()
  @IsString({ each: true })
  businessIds: string[];

  @ApiProperty({
    description: 'Script ID to use for all calls (optional if businesses have assigned scripts)',
    example: 'script-uuid-here',
    required: false,
  })
  @IsString()
  @IsOptional()
  overrideScriptId?: string;

  @ApiProperty({
    description: 'Custom goal to use for all calls',
    example: 'I need technical support',
    required: false,
  })
  @IsString()
  @IsOptional()
  overrideGoal?: string;

  @ApiProperty({
    description: 'Whether to call businesses concurrently or sequentially',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  concurrent?: boolean = false;
}

export interface BusinessWithScript {
  id: string;
  name: string;
  phoneNumber: string | null;
  email: string | null;
  industry: string | null;
  callStatus: string;
  callCount: number;
  lastCalled: Date | null;
  assignedScript: {
    id: string;
    name: string;
    goal: string;
    description: string | null;
  } | null;
  customGoal: string | null;
}