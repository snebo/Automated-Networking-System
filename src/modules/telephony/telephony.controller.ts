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
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InitiateCallDto } from './dto/initiate-call.dto';
import { SendDTMFDto } from './dto/send-dtmf.dto';

@ApiTags('telephony')
@Controller('telephony')
export class TelephonyController {
  private readonly logger = new Logger(TelephonyController.name);
  private waitingCalls = new Set<string>(); // Track calls in waiting state
  private humanConversationCalls = new Set<string>(); // Track calls in human conversation

  constructor(
    private readonly telephonyService: TelephonyService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    // Listen for waiting state changes
    this.eventEmitter.on('ai.entering_wait_state', (event: { callSid: string }) => {
      console.log(`📋 Telephony controller: Call ${event.callSid.slice(-8)} entering wait state`);
      this.waitingCalls.add(event.callSid);
    });

    this.eventEmitter.on('ai.human_reached', (event: { callSid: string }) => {
      console.log(`📋 Telephony controller: Call ${event.callSid.slice(-8)} exiting wait state`);
      this.waitingCalls.delete(event.callSid);
      this.humanConversationCalls.add(event.callSid);
    });

    // Clean up when call ends
    this.eventEmitter.on('call.ended', (event: { callSid: string }) => {
      this.waitingCalls.delete(event.callSid);
      this.humanConversationCalls.delete(event.callSid);
    });
  }

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

  // ===== PHASE 2: WEBHOOK AND MEDIA STREAM HANDLERS =====

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
    
    // Check call state to determine appropriate TwiML
    const isWaiting = this.isCallInWaitingState(CallSid);
    const isHumanConversation = this.humanConversationCalls.has(CallSid);
    
    if (isWaiting) {
      console.log(`⏸️  Main webhook: Call in WAITING state - using silent extended timeout (120s, resets on speech)`);
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="${appUrl}/telephony/webhook/gather" method="POST" timeout="120" speechTimeout="10" input="dtmf speech">
    <Pause length="115"/>
  </Gather>
  <Redirect>${appUrl}/telephony/webhook</Redirect>
</Response>`;
    }
    
    if (isHumanConversation) {
      console.log(`🗣️  Main webhook: Call in HUMAN CONVERSATION - staying silent and listening`);
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="${appUrl}/telephony/webhook/gather" method="POST" timeout="30" speechTimeout="5" input="dtmf speech">
    <Pause length="25"/>
  </Gather>
  <Redirect>${appUrl}/telephony/webhook</Redirect>
</Response>`;
    }
    
    // TwiML to keep the call alive and gather speech/DTMF input - SILENT to avoid beeps
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="${appUrl}/telephony/webhook/gather" method="POST" timeout="30" speechTimeout="5" input="dtmf speech">
    <Pause length="25"/>
  </Gather>
  <Redirect>${appUrl}/telephony/webhook</Redirect>
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
    
    const { CallSid, CallStatus, Duration, CallDuration } = body;
    
    // Make call ending VERY noticeable
    if (CallStatus === 'completed' || CallStatus === 'failed' || CallStatus === 'busy' || CallStatus === 'no-answer') {
      console.log('\n' + '🔴'.repeat(80));
      console.log(`📞 CALL ENDED | ${CallSid.slice(-8)} | Status: ${CallStatus.toUpperCase()}`);
      const actualDuration = CallDuration || Duration;
      if (actualDuration) console.log(`⏰ Duration: ${actualDuration} seconds`);
      console.log('🔴'.repeat(80));
      console.log('');
    }
    
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

  @Post('media-stream')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'text/plain')
  @ApiExcludeEndpoint()
  async handleMediaStream(@Body() body: any) {
    // This handles Twilio Media Stream messages
    // For now, just log and return success
    // In the future, this will handle real-time audio processing
    this.logger.log('Media stream message received:', JSON.stringify(body, null, 2));
    
    if (body.event === 'connected') {
      this.logger.log('Media stream connected for call:', body.streamSid);
    } else if (body.event === 'start') {
      this.logger.log('Media stream started for call:', body.start?.callSid);
    } else if (body.event === 'media') {
      // Handle audio data
      const { payload, timestamp, sequenceNumber } = body.media || {};
      this.logger.debug(`Received audio payload: ${payload?.length} bytes, seq: ${sequenceNumber}`);
    } else if (body.event === 'stop') {
      this.logger.log('Media stream stopped for call:', body.stop?.callSid);
    }
    
    return 'OK';
  }

  @Post('webhook/recording')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'application/xml')
  @ApiExcludeEndpoint()
  async handleRecordingCallback(@Body() body: any) {
    this.logger.log('\n🎙️ RECORDING CALLBACK RECEIVED (Legacy - not used with streaming):');
    this.logger.log(JSON.stringify(body, null, 2));
    
    const { CallSid, RecordingUrl, RecordingDuration } = body;
    
    // Update call with recording information
    const activeCall = this.telephonyService.getActiveCall(CallSid);
    if (activeCall) {
      activeCall.recordingUrl = RecordingUrl;
      activeCall.recordingDuration = RecordingDuration ? parseInt(RecordingDuration) : undefined;
    }
    
    // Return empty response since we're using streaming
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
</Response>`;
  }

  @Post('webhook/gather')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'application/xml')
  @ApiExcludeEndpoint()
  async handleGatherCallback(@Body() body: any) {
    this.logger.log('Gather callback received:', body);
    
    const { CallSid, Digits, SpeechResult } = body;
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    
    if (Digits) {
      // User pressed a key - handle it
      this.logger.log(`User pressed: ${Digits} for call ${CallSid}`);
      this.telephonyService.handleDTMFReceived(CallSid, Digits);
    }
    
    if (SpeechResult) {
      // Speech was detected - process for IVR detection
      this.logger.log(`Speech detected for call ${CallSid}: "${SpeechResult}"`);
      this.telephonyService.handleTranscriptionReceived(CallSid, SpeechResult);
    }
    
    // Check call state to return appropriate TwiML
    const activeCall = this.telephonyService.getActiveCall(CallSid);
    const isWaiting = this.isCallInWaitingState(CallSid);
    const isHumanConversation = this.humanConversationCalls.has(CallSid);
    
    if (isWaiting) {
      // In waiting state - use extended timeout that resets on speech
      console.log(`⏸️  Call in WAITING state - using extended timeout (120s, resets on speech)`);
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="${appUrl}/telephony/webhook/gather" method="POST" timeout="120" speechTimeout="10" input="dtmf speech">
    <Pause length="115"/>
  </Gather>
  <Redirect>${appUrl}/telephony/webhook</Redirect>
</Response>`;
    } else if (isHumanConversation) {
      // In human conversation - stay silent and listen
      console.log(`🗣️  Gather callback: Call in HUMAN CONVERSATION - staying silent`);
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="${appUrl}/telephony/webhook/gather" method="POST" timeout="30" speechTimeout="5" input="dtmf speech">
    <Pause length="25"/>
  </Gather>
  <Redirect>${appUrl}/telephony/webhook</Redirect>
</Response>`;
    } else {
      // Normal active listening state (IVR navigation) - SILENT to avoid beep
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="${appUrl}/telephony/webhook/gather" method="POST" timeout="30" speechTimeout="5" input="dtmf speech">
    <Pause length="25"/>
  </Gather>
  <Redirect>${appUrl}/telephony/webhook</Redirect>
</Response>`;
    }
  }

  private isCallInWaitingState(callSid: string): boolean {
    return this.waitingCalls.has(callSid);
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