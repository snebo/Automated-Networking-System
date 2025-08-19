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
  Header,
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

  // ===== PHASE 1: BASIC CALL MANAGEMENT API (CURRENTLY ACTIVE) =====

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
      dto.goal,
      dto.companyName,
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

  // ===== PHASE 2: WEBHOOK HANDLERS (FOR FUTURE USE WITH REAL-TIME AUDIO) =====

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'application/xml')
  @ApiExcludeEndpoint()
  async handleWebhook(@Body() body: any) {
    // Phase 2: Real-time audio streaming and IVR navigation
    this.logger.log('Main webhook called for media streaming:', JSON.stringify(body));
    
    const { CallSid, CallStatus, Direction, From, To } = body;
    this.logger.log(`Call ${CallSid}: Status=${CallStatus}, Direction=${Direction}, From=${From}, To=${To}`);
    
    // Generate TwiML that starts media streaming and keeps call alive
    // Use ngrok URL from APP_URL environment variable for WebSocket
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const streamUrl = appUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    
    this.logger.log(`Setting up media stream to: ${streamUrl}/media-stream`);
    
    // Simple TwiML to keep the call alive and test basic functionality
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">IVR Navigation Agent connected. Starting test.</Say>
  <Pause length="2"/>
  <Say voice="Polly.Joanna">Now recording your voice for 10 seconds. Please speak after the beep.</Say>
  <Record 
    action="${appUrl}/telephony/webhook/recording" 
    method="POST"
    timeout="10"
    transcribe="true"
    transcribeCallback="${appUrl}/telephony/webhook/transcription"
    playBeep="true"
    maxLength="10"
    finishOnKey="#"
  />
</Response>`;
    
    this.logger.log('TwiML Response:', twimlResponse);
    
    return twimlResponse;
  }
  

  @Post('webhook/status')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'application/json')
  @ApiExcludeEndpoint()
  async handleStatusCallback(@Body() body: any) {
    // Currently active - receives call status updates for monitoring
    this.logger.log('Call status update:', body);
    
    const { CallSid, CallStatus, Duration } = body;
    
    // Update call status in active calls
    const activeCall = this.telephonyService.getActiveCall(CallSid);
    if (activeCall) {
      activeCall.status = this.mapTwilioStatus(CallStatus);
      activeCall.duration = Duration ? parseInt(Duration) : undefined;
      
      if (CallStatus === 'completed' || CallStatus === 'failed' || CallStatus === 'busy' || CallStatus === 'no-answer') {
        activeCall.endTime = new Date();
      }
    }
    
    return { received: true };
  }

  @Post('webhook/recording')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'application/xml')
  @ApiExcludeEndpoint()
  async handleRecordingCallback(@Body() body: any) {
    this.logger.log('\n🎙️ RECORDING CALLBACK RECEIVED:');
    this.logger.log(JSON.stringify(body, null, 2));
    
    const { CallSid, RecordingUrl, RecordingDuration } = body;
    
    // Update call with recording information
    const activeCall = this.telephonyService.getActiveCall(CallSid);
    if (activeCall) {
      activeCall.recordingUrl = RecordingUrl;
      activeCall.recordingDuration = RecordingDuration ? parseInt(RecordingDuration) : undefined;
    }
    
    // Continue the call with another recording or hang up
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Thank you for testing the IVR system. Goodbye!</Say>
  <Hangup/>
</Response>`;
  }

  @Post('webhook/gather')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handleGatherCallback(@Body() body: any) {
    this.logger.log('Gather callback:', body);
    
    const { CallSid, Digits } = body;
    
    if (Digits) {
      // Emit DTMF event for processing
      this.telephonyService.handleDTMFReceived(CallSid, Digits);
    }
    
    // Return TwiML to continue call flow
    return '<Response><Say>Thank you for your input.</Say></Response>';
  }

  @Post('webhook/transcription')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handleTranscriptionCallback(@Body() body: any) {
    this.logger.log('\n📝 TWILIO TRANSCRIPTION RECEIVED:');
    this.logger.log(JSON.stringify(body, null, 2));
    
    const { CallSid, TranscriptionText, TranscriptionStatus } = body;
    
    if (TranscriptionStatus === 'completed' && TranscriptionText) {
      this.logger.log(`\n🎤 TRANSCRIPTION for call ${CallSid}:`);
      this.logger.log(`   Text: "${TranscriptionText}"`);
      
      // Store transcript
      const activeCall = this.telephonyService.getActiveCall(CallSid);
      if (activeCall) {
        if (!activeCall.transcript) {
          activeCall.transcript = [];
        }
        activeCall.transcript.push({
          timestamp: new Date(),
          speaker: 'human',
          text: TranscriptionText,
          source: 'twilio-transcription'
        });
      }
      
      // Emit for IVR detection
      this.telephonyService.handleTranscriptionReceived(CallSid, TranscriptionText);
    }
    
    return { received: true };
  }

  private mapTwilioStatus(twilioStatus: string): string {
    const statusMap: Record<string, string> = {
      'queued': 'initiating',
      'ringing': 'ringing',
      'in-progress': 'in-progress',
      'completed': 'completed',
      'busy': 'busy',
      'failed': 'failed',
      'no-answer': 'no-answer',
    };
    
    return statusMap[twilioStatus] || twilioStatus;
  }
}