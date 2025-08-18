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
import { TelephonyService } from './telephony.service';
import { InitiateCallDto } from './dto/initiate-call.dto';
import { SendDTMFDto } from './dto/send-dtmf.dto';

@Controller('telephony')
export class TelephonyController {
  private readonly logger = new Logger(TelephonyController.name);

  constructor(private readonly telephonyService: TelephonyService) {}

  @Post('call')
  async initiateCall(@Body() dto: InitiateCallDto) {
    const callSid = await this.telephonyService.initiateCall(
      dto.phoneNumber,
      dto.scriptId,
    );
    return { callSid };
  }

  @Delete('call/:callSid')
  @HttpCode(HttpStatus.NO_CONTENT)
  async endCall(@Param('callSid') callSid: string) {
    await this.telephonyService.endCall(callSid);
  }

  @Post('call/:callSid/dtmf')
  async sendDTMF(
    @Param('callSid') callSid: string,
    @Body() dto: SendDTMFDto,
  ) {
    await this.telephonyService.sendDTMF(callSid, dto.digits);
    return { success: true };
  }

  @Get('calls')
  async getActiveCalls() {
    return this.telephonyService.getAllActiveCalls();
  }

  @Get('call/:callSid')
  async getCallStatus(@Param('callSid') callSid: string) {
    return this.telephonyService.getActiveCall(callSid);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: any) {
    this.logger.log('Received Twilio webhook', body);
    
    // Handle incoming audio stream and other webhook events
    // This will be implemented with WebSocket gateway
    
    return '<Response></Response>';
  }

  @Post('webhook/status')
  @HttpCode(HttpStatus.OK)
  async handleStatusCallback(@Body() body: any) {
    this.logger.log('Call status update', body);
    return { received: true };
  }

  @Post('webhook/recording')
  @HttpCode(HttpStatus.OK)
  async handleRecordingCallback(@Body() body: any) {
    this.logger.log('Recording callback', body);
    return { received: true };
  }
}