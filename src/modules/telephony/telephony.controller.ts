import { 
  Controller, 
  Post, 
  Body, 
  Get, 
  Param, 
  Delete,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam,
  ApiBody,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { TelephonyService } from './telephony.service';
import { InitiateCallDto } from './dto/initiate-call.dto';
import { SendDTMFDto } from './dto/send-dtmf.dto';

@ApiTags('telephony')
@Controller('telephony')
export class TelephonyController {
  private readonly logger = new Logger(TelephonyController.name);

  constructor(private readonly telephonyService: TelephonyService) {}

  @Post('call')
  @ApiOperation({ summary: 'Initiate an outbound call' })
  @ApiResponse({ 
    status: 201, 
    description: 'Call initiated successfully',
    schema: {
      properties: {
        callSid: { type: 'string', example: 'CA1234567890abcdef1234567890abcdef' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 500, description: 'Twilio not configured or call failed' })
  async initiateCall(@Body() dto: InitiateCallDto) {
    const callSid = await this.telephonyService.initiateCall(
      dto.phoneNumber,
      dto.scriptId,
    );
    return { callSid };
  }

  @Delete('call/:callSid')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'End an active call' })
  @ApiParam({ name: 'callSid', description: 'Twilio Call SID' })
  @ApiResponse({ status: 204, description: 'Call ended successfully' })
  @ApiResponse({ status: 404, description: 'Call not found' })
  async endCall(@Param('callSid') callSid: string) {
    await this.telephonyService.endCall(callSid);
  }

  @Post('call/:callSid/dtmf')
  @ApiOperation({ summary: 'Send DTMF tones to an active call' })
  @ApiParam({ name: 'callSid', description: 'Twilio Call SID' })
  @ApiResponse({ 
    status: 200, 
    description: 'DTMF sent successfully',
    schema: {
      properties: {
        success: { type: 'boolean', example: true }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Call not found' })
  async sendDTMF(
    @Param('callSid') callSid: string,
    @Body() dto: SendDTMFDto,
  ) {
    await this.telephonyService.sendDTMF(callSid, dto.digits);
    return { success: true };
  }

  @Get('calls')
  @ApiOperation({ summary: 'Get all active calls' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of active calls',
    isArray: true,
  })
  async getActiveCalls() {
    return this.telephonyService.getAllActiveCalls();
  }

  @Get('call/:callSid')
  @ApiOperation({ summary: 'Get status of a specific call' })
  @ApiParam({ name: 'callSid', description: 'Twilio Call SID' })
  @ApiResponse({ status: 200, description: 'Call status retrieved' })
  @ApiResponse({ status: 404, description: 'Call not found' })
  async getCallStatus(@Param('callSid') callSid: string) {
    return this.telephonyService.getActiveCall(callSid);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handleWebhook(@Body() body: any) {
    this.logger.log('Received Twilio webhook', body);
    
    // Handle incoming audio stream and other webhook events
    // This will be implemented with WebSocket gateway
    
    return '<Response></Response>';
  }

  @Post('webhook/status')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handleStatusCallback(@Body() body: any) {
    this.logger.log('Call status update', body);
    return { received: true };
  }

  @Post('webhook/recording')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handleRecordingCallback(@Body() body: any) {
    this.logger.log('Recording callback', body);
    return { received: true };
  }
}